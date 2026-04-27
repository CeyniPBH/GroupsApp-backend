const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { Chat, ChatMember, Message } = require('../models');
const { Op } = require('sequelize');
const { getUserViaGrpc } = require('./client'); // ¡Usamos nuestro propio cliente gRPC!

const CHAT_PROTO_PATH = path.join(__dirname, 'chat.proto');
const packageDefinition = protoLoader.loadSync(CHAT_PROTO_PATH, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const chatProto = grpc.loadPackageDefinition(packageDefinition).chats;

const createChat = async (call, callback) => {
    try {
        const { type, name, participantIds, userId } = call.request;

        if (!type) return callback({ code: grpc.status.INVALID_ARGUMENT, details: 'Type is required' });

        if (type === 'direct') {
            if (!participantIds || participantIds.length === 0) {
                return callback({ code: grpc.status.INVALID_ARGUMENT, details: 'participantIds is required for direct chat' });
            }

            const contactId = participantIds[0];
            // Comunicación Inter-Microservicio: Chats -> Users
            const otherUser = await getUserViaGrpc(contactId);
            if (!otherUser) {
                return callback({ code: grpc.status.NOT_FOUND, details: 'User not found' });
            }

            const myChats = await ChatMember.findAll({ where: { userId } });
            const myChatIds = myChats.map(m => m.chatId);
            if (myChatIds.length) {
                const directChats = await Chat.findAll({
                    where: { id: { [Op.in]: myChatIds }, type: 'direct' }
                });
                const directChatIds = directChats.map(c => c.id);
                if (directChatIds.length) {
                    const shared = await ChatMember.findOne({ where: { userId: contactId, chatId: { [Op.in]: directChatIds } } });
                    if (shared) {
                        return callback(null, { id: shared.chatId, type: 'direct' });
                    }
                }
            }

            const chat = await Chat.create({ type: 'direct' });
            await ChatMember.create({ userId, chatId: chat.id, role: 'member' });
            await ChatMember.create({ userId: contactId, chatId: chat.id, role: 'member' });
            
            callback(null, {
                id: chat.id, type: chat.type, participants: [userId, contactId],
                createdAt: chat.createdAt ? chat.createdAt.toISOString() : ''
            });
        } else if (type === 'group') {
            if (!name) return callback({ code: grpc.status.INVALID_ARGUMENT, details: 'Name is required for group chat' });

            const chat = await Chat.create({ type: 'group', name });
            await ChatMember.create({ userId, chatId: chat.id, role: 'admin' });

            if (participantIds && participantIds.length > 0) {
                for (const memberId of participantIds) {
                    if (memberId !== userId) {
                        await ChatMember.create({ userId: memberId, chatId: chat.id, role: 'member' });
                    }
                }
            }

            callback(null, {
                id: chat.id, type: chat.type, name: chat.name, creator: userId,
                createdAt: chat.createdAt ? chat.createdAt.toISOString() : ''
            });
        } else {
            callback({ code: grpc.status.INVALID_ARGUMENT, details: 'Type must be "direct" or "group"' });
        }
    } catch (error) {
        callback({ code: grpc.status.INTERNAL, details: error.message });
    }
};

const getChats = async (call, callback) => {
    try {
        const { userId } = call.request;
        const userChats = await ChatMember.findAll({
            where: { userId },
            include: [{
                model: Chat, as: 'chat', include: [{ model: Message, as: 'messages', limit: 1, order: [['createdAt', 'DESC']] }]
            }],
            order: [[{ model: Chat, as: 'chat' }, 'lastMessageTime', 'DESC']]
        });

        const chats = userChats.map(cm => ({
            id: cm.chat.id, type: cm.chat.type, name: cm.chat.name || '',
            lastMessage: (cm.chat.messages && cm.chat.messages.length > 0) ? cm.chat.messages[0].content : (cm.chat.lastMessage || ''),
            lastMessageTime: (cm.chat.messages && cm.chat.messages.length > 0) ? cm.chat.messages[0].createdAt.toISOString() : (cm.chat.lastMessageTime ? cm.chat.lastMessageTime.toISOString() : '')
        }));
        callback(null, { chats });
    } catch (error) {
        callback({ code: grpc.status.INTERNAL, details: error.message });
    }
};

const startChatGrpcServer = () => {
    const server = new grpc.Server();
    server.addService(chatProto.ChatService.service, { CreateChat: createChat, GetChats: getChats });
    
    const PORT = process.env.CHAT_GRPC_PORT || 50053;
    server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) console.error('Error starting Chat gRPC server:', err);
        else console.log(`gRPC Chat Service is running on port ${port}`);
    });
};

module.exports = { startChatGrpcServer };