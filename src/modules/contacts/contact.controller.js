const { Contact, User, Chat, ChatMember } = require('../../models');
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
        const myChats = await ChatMember.findAll({ where: { userId } });
        const myChatIds = myChats.map(m => m.chatId);
        let chatExists = false;

        if (myChatIds.length > 0) {
            const directChats = await Chat.findAll({
                where: { id: { [Op.in]: myChatIds }, type: 'direct' }
            });
            const directChatIds = directChats.map(c => c.id);
            
            if (directChatIds.length > 0) {
                const shared = await ChatMember.findOne({ where: { userId: contactId, chatId: { [Op.in]: directChatIds } } });
                if (shared) chatExists = true;
            }
        }

        if (!chatExists) {
            const chat = await Chat.create({ type: 'direct' });
            // Registrar a los miembros en la tabla intermedia
            await ChatMember.create({ userId, chatId: chat.id, role: 'member' });
            await ChatMember.create({ userId: contactId, chatId: chat.id, role: 'member' });
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