const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../modules/users/user.model');

const AUTH_PROTO_PATH = path.join(__dirname, 'auth.proto');
const packageDefinition = protoLoader.loadSync(AUTH_PROTO_PATH, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const authProto = grpc.loadPackageDefinition(packageDefinition).auth;

const generateUniqueTag = async (name) => {
    const MAX_ATTEMPTS = 20;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const tag = String(Math.floor(1000 + Math.random() * 9000));
        const exists = await User.findOne({ where: { name, tag } });
        if (!exists) {
            return tag;
        }
    }
    throw new Error('Unable to generate unique tag after multiple attempts');
};

const register = async (call, callback) => {
    try {
        const { name, email, password } = call.request;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return callback({ code: grpc.status.ALREADY_EXISTS, details: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const tag = await generateUniqueTag(name);
        const newUser = await User.create({ name, tag, email, password: hashedPassword });

        callback(null, {
            handle: `${newUser.name}#${newUser.tag}`,
            email: newUser.email,
            tag: newUser.tag
        });
    } catch (error) {
        callback({ code: grpc.status.INTERNAL, details: error.message });
    }
};

const login = async (call, callback) => {
    try {
        const { email, password } = call.request;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return callback({ code: grpc.status.NOT_FOUND, details: 'Invalid email or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return callback({ code: grpc.status.UNAUTHENTICATED, details: 'Invalid email or password' });
        }

        await user.update({ status: 'active' });

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, tag: user.tag },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        callback(null, {
            token,
            id: user.id,
            name: user.name,
            tag: user.tag,
            handle: `${user.name}#${user.tag}`,
            email: user.email,
            status: user.status,
            avatar: user.avatar || ""
        });
    } catch (error) {
        callback({ code: grpc.status.INTERNAL, details: error.message });
    }
};

const startAuthGrpcServer = () => {
    const server = new grpc.Server();
    server.addService(authProto.AuthService.service, { Register: register, Login: login });
    
    const PORT = process.env.AUTH_GRPC_PORT || 50052;
    server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error('Error starting Auth gRPC server:', err);
            process.exit(1);
        } else {
            console.log(`gRPC Auth Service is running on port ${port}`);
        }
    });
};

module.exports = { startAuthGrpcServer };