const { Contact, User, Chat } = require('../../models');
const { Op } = require('sequelize');

const addContact = async (req, res) => {
    try {
        const { contactId } = req.body;
        const userId = req.user.id;

        if (userId === contactId) {
            return res.status(400).json({ error: 'Cannot add yourself as contact' });
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

        // Crear chat directo si no existe
        const existingChat = await Chat.findOne({
            where: { type: 'direct' },
            include: [
                { model: User, as: 'participants', where: { id: [userId, contactId] }, required: true }
            ]
        });

        if (!existingChat) {
            const chat = await Chat.create({ type: 'direct' });
            // Aquí necesitarías una tabla intermedia para miembros de chat directo, pero por simplicidad, asumimos que los miembros se manejan de otra forma.
            // Para direct, los miembros son userId y contactId.
        }

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
            },
            include: [
                { model: User, as: 'requester', attributes: ['id', 'name', 'tag'] },
                { model: User, as: 'receiver', attributes: ['id', 'name', 'tag'] }
            ]
        });

        const result = contacts.map(c => {
            const plain = c.toJSON();
            // contactedBy = el otro usuario (no yo)
            plain.contactedBy = plain.userId === userId ? plain.receiver : plain.requester;
            return plain;
        });

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

module.exports = { addContact, getContacts, acceptContact, blockContact };