const { Contact } = require('../../models');
const { Op } = require('sequelize');
const { getUserViaGrpc, createChatViaGrpc } = require('../../grpc/client');

const addContact = async (req, res) => {
    try {
        const { contactId } = req.body;
        const userId = req.user.id;

        if (userId === contactId) {
            return res.status(400).json({ error: 'Cannot add yourself as contact' });
        }

        // Validar que el usuario que intentamos agregar realmente exista utilizando la llamada gRPC
        const contactUser = await getUserViaGrpc(contactId);
        if (!contactUser) {
            return res.status(404).json({ error: 'Contact user not found' });
        }

        // Si ya existe una solicitud en cualquier estado
        const existing = await Contact.findOne({
            where: { userId, contactId }
        });

        if (existing) {
            if (existing.status === 'accepted') {
                return res.status(400).json({ error: 'Already contacts' });
            }
            if (existing.status === 'pending') {
                return res.status(400).json({ error: 'Contact request already sent' });
            }
            if (existing.status === 'blocked') {
                return res.status(400).json({ error: 'Contact is blocked' });
            }
        }

        // Si el otro usuario ya te envió solicitud, auto-aceptar
        const reverseRequest = await Contact.findOne({
            where: { userId: contactId, contactId: userId, status: 'pending' }
        });

        if (reverseRequest) {
            reverseRequest.status = 'accepted';
            await reverseRequest.save();
            const myContact = await Contact.create({ userId, contactId, status: 'accepted' });
            return res.status(201).json({ message: 'Contact accepted', contact: myContact });
        }

        const contact = await Contact.create({ userId, contactId });

        // Delegar la creación/verificación del chat directo al microservicio de Chats vía gRPC
        await createChatViaGrpc('direct', '', [contactId], userId);

        res.status(201).json(contact);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getContacts = async (req, res) => {
    try {
        const userId = req.user.id;
        const contacts = await Contact.findAll({
            where: {
                [Op.or]: [{ userId }, { contactId: userId }]
            }
        });

        const result = await Promise.all(contacts.map(async (c) => {
            const plain = c.toJSON();
            const contactedById = plain.userId === userId ? plain.contactId : plain.userId;
            const contactedUser = await getUserViaGrpc(contactedById);
            
            plain.contactedBy = contactedUser ? { id: contactedUser.id, name: contactedUser.name, tag: contactedUser.tag } : null;
            return plain;
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const acceptContact = async (req, res) => {
    try {
        const { id } = req.params;
        const contact = await Contact.findByPk(id);
        if (!contact || contact.contactId !== req.user.id) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        contact.status = 'accepted';
        await contact.save();
        res.json(contact);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const blockContact = async (req, res) => {
    try {
        const { id } = req.params;
        const contact = await Contact.findByPk(id);
        if (!contact || contact.contactId !== req.user.id) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        contact.status = 'blocked';
        await contact.save();
        res.json(contact);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const removeContact = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const contact = await Contact.findOne({
            where: {
                id,
                [Op.or]: [{ userId }, { contactId: userId }]
            }
        });

        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        await contact.destroy();
        res.json({ message: 'Contact removed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { addContact, getContacts, acceptContact, blockContact, removeContact };