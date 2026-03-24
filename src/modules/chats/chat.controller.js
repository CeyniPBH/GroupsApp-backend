const { Chat, User, Group, Message, ChatMember } = require('../../models');

const createChat = async (req, res) => {
    try {
        const { type, name, participantIds } = req.body;
        const userId = req.user.id;

        // Validar parámetros requeridos
        if (!type) {
            return res.status(400).json({ error: 'Type is required (direct or group)' });
        }

        if (type === 'direct') {
            // Para direct, participantIds debería tener al menos un ID
            if (!participantIds || participantIds.length === 0) {
                return res.status(400).json({ error: 'participantIds is required for direct chat' });
            }

            const contactId = participantIds[0];

            // Verificar que el otro usuario existe
            const otherUser = await User.findByPk(contactId);
            if (!otherUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Verificar si ya existe un chat directo entre estos dos usuarios
            const myChats = await ChatMember.findAll({ where: { userId } });
            const myChatIds = myChats.map(m => m.chatId);
            if (myChatIds.length) {
                const shared = await ChatMember.findOne({ where: { userId: contactId, chatId: myChatIds } });
                if (shared) {
                    const existingChat = await Chat.findOne({ where: { id: shared.chatId, type: 'direct' } });
                    if (existingChat) {
                        return res.status(200).json({ id: existingChat.id, type: existingChat.type });
                    }
                }
            }

            const chat = await Chat.create({ type: 'direct' });

            // Agregar ambos usuarios como miembros
            await ChatMember.create({ userId, chatId: chat.id, role: 'member' });
            await ChatMember.create({ userId: contactId, chatId: chat.id, role: 'member' });
            
            res.status(201).json({
                id: chat.id,
                type: chat.type,
                participants: [userId, contactId],
                createdAt: chat.createdAt
            });
        } else if (type === 'group') {
            // Para grupos, nombre es obligatorio
            if (!name) {
                return res.status(400).json({ error: 'Name is required for group chat' });
            }

            const chat = await Chat.create({ 
                type: 'group', 
                name 
            });

            // Agregar creador como admin
            await ChatMember.create({ userId, chatId: chat.id, role: 'admin' });

            // Agregar otros participantes si existen
            if (participantIds && participantIds.length > 0) {
                for (const memberId of participantIds) {
                    if (memberId !== userId) {
                        await ChatMember.create({ userId: memberId, chatId: chat.id, role: 'member' });
                    }
                }
            }

            res.status(201).json({
                id: chat.id,
                type: chat.type,
                name: chat.name,
                creator: userId,
                createdAt: chat.createdAt
            });
        } else {
            return res.status(400).json({ error: 'Type must be "direct" or "group"' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getChats = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Obtener chats del usuario actual
        const userChats = await ChatMember.findAll({
            where: { userId },
            include: [
                {
                    model: Chat,
                    as: 'chat',
                    include: [
                        { model: Message, as: 'messages', limit: 1, order: [['createdAt', 'DESC']] }
                    ]
                }
            ],
            order: [[{ model: Chat, as: 'chat' }, 'lastMessageTime', 'DESC']]
        });

        const chats = userChats.map(cm => ({
            id: cm.chat.id,
            type: cm.chat.type,
            name: cm.chat.name,
            lastMessage: cm.chat.lastMessage,
            lastMessageTime: cm.chat.lastMessageTime
        }));

        res.json(chats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { createChat, getChats };