const { Message, Chat, User } = require('../../models');
const fs = require('fs');
const path = require('path');

const sendMessage = async (req, res) => {
    try {
        const { chatId, content, type = 'text' } = req.body;
        const senderId = req.user.id;

        const message = await Message.create({
            chatId,
            senderId,
            content,
            type
        });

        // Actualizar último mensaje en chat
        await Chat.update(
            { lastMessage: content, lastMessageTime: new Date() },
            { where: { id: chatId } }
        );

        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const messages = await Message.findAll({
            where: { chatId },
            include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'tag'] }],
            order: [['createdAt', 'ASC']]
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const markChatAsRead = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.id;

        const [updatedCount] = await Message.update(
            { isRead: true },
            {
                where: {
                    chatId,
                    senderId: { [require('sequelize').Op.ne]: userId }
                }
            }
        );

        res.json({ message: 'Messages marked as read', updated: updatedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { chatId } = req.body;
        
        if (!chatId) {
            return res.status(400).json({ error: 'chatId is required in form-data' });
        }

        const senderId = req.user.id;
        const filePath = req.file.path;
        const fileName = req.file.originalname;

        // Determinar tipo basado en mimetype
        let type = 'file';
        if (req.file.mimetype.startsWith('image/')) type = 'image';
        else if (req.file.mimetype.startsWith('audio/')) type = 'audio';
        else if (req.file.mimetype.startsWith('video/')) type = 'video';

        const message = await Message.create({
            chatId,
            senderId,
            content: fileName,
            type,
            mediaUrl: filePath,
            fileName
        });

        await Chat.update(
            { lastMessage: `Archivo: ${fileName}`, lastMessageTime: new Date() },
            { where: { id: chatId } }
        );

        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { sendMessage, getMessages, uploadFile, markChatAsRead };