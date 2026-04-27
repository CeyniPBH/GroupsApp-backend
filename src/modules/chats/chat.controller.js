const { createChatViaGrpc, getChatsViaGrpc } = require('../../grpc/client');
const grpc = require('@grpc/grpc-js');

const createChat = async (req, res) => {
    try {
        const { type, name, participantIds } = req.body;
        const userId = req.user.id;

        const response = await createChatViaGrpc(type, name, participantIds, userId);
        res.status(201).json(response);
    } catch (error) {
        if (error.code === grpc.status.INVALID_ARGUMENT) {
            return res.status(400).json({ error: error.details });
        }
        if (error.code === grpc.status.NOT_FOUND) {
            return res.status(404).json({ error: error.details });
        }
        res.status(500).json({ error: error.details || error.message });
    }
};

const getChats = async (req, res) => {
    try {
        const userId = req.user.id;
        const chats = await getChatsViaGrpc(userId);
        res.json(chats);
    } catch (error) {
        res.status(500).json({ error: error.details || error.message });
    }
};

module.exports = { createChat, getChats };