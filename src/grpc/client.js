const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
 
// --- User Service Client ---
const USER_PROTO_PATH = path.join(__dirname, 'user.proto');
const userPackageDefinition = protoLoader.loadSync(USER_PROTO_PATH, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const userProto = grpc.loadPackageDefinition(userPackageDefinition).users;
const GRPC_PORT = process.env.GRPC_PORT || 50051;
const GRPC_HOST = process.env.GRPC_HOST || 'localhost';
const userClient = new userProto.UserService(`${GRPC_HOST}:${GRPC_PORT}`, grpc.credentials.createInsecure());

const getUserViaGrpc = (id) => {
    return new Promise((resolve, reject) => {
        userClient.GetUser({ id }, (error, response) => {
            if (error) {
                if (error.code === grpc.status.NOT_FOUND) return resolve(null);
                return reject(error);
            }
            resolve(response);
        });
    });
};

// --- Auth Service Client ---
const AUTH_PROTO_PATH = path.join(__dirname, 'auth.proto');
const authPackageDefinition = protoLoader.loadSync(AUTH_PROTO_PATH, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const authProto = grpc.loadPackageDefinition(authPackageDefinition).auth;

const AUTH_GRPC_PORT = process.env.AUTH_GRPC_PORT || 50052;
const AUTH_GRPC_HOST = process.env.AUTH_GRPC_HOST || 'localhost';

const authClient = new authProto.AuthService(`${AUTH_GRPC_HOST}:${AUTH_GRPC_PORT}`, grpc.credentials.createInsecure());

const registerViaGrpc = (name, email, password) => {
    return new Promise((resolve, reject) => {
        authClient.Register({ name, email, password }, (error, response) => {
            if (error) {
                return reject(error);
            }
            resolve(response);
        });
    });
};

const loginViaGrpc = (email, password) => {
    return new Promise((resolve, reject) => {
        authClient.Login({ email, password }, (error, response) => {
            if (error) {
                return reject(error);
            }
            resolve(response);
        });
    });
};

// --- Chat Service Client ---
const CHAT_PROTO_PATH = path.join(__dirname, 'chat.proto');
const chatPackageDefinition = protoLoader.loadSync(CHAT_PROTO_PATH, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const chatProto = grpc.loadPackageDefinition(chatPackageDefinition).chats;

const CHAT_GRPC_PORT = process.env.CHAT_GRPC_PORT || 50053;
const CHAT_GRPC_HOST = process.env.CHAT_GRPC_HOST || 'localhost';

const chatClient = new chatProto.ChatService(`${CHAT_GRPC_HOST}:${CHAT_GRPC_PORT}`, grpc.credentials.createInsecure());

const createChatViaGrpc = (type, name, participantIds, userId) => {
    return new Promise((resolve, reject) => {
        chatClient.CreateChat({ type, name, participantIds, userId }, (error, response) => {
            if (error) return reject(error);
            resolve(response);
        });
    });
};

const getChatsViaGrpc = (userId) => {
    return new Promise((resolve, reject) => {
        chatClient.GetChats({ userId }, (error, response) => {
            if (error) return reject(error);
            resolve(response.chats || []);
        });
    });
};

module.exports = { 
    getUserViaGrpc,
    registerViaGrpc,
    loginViaGrpc,
    createChatViaGrpc,
    getChatsViaGrpc
};