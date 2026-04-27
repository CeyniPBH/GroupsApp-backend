const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const User = require('../modules/users/user.model'); 

const PROTO_PATH = path.join(__dirname, 'user.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const userProto = grpc.loadPackageDefinition(packageDefinition).users;

const getUser = async (call, callback) => {
    try {
        const userId = call.request.id;
        const user = await User.findByPk(userId);
        
        if (user) {
            callback(null, { id: user.id, name: user.name, tag: user.tag, email: user.email });
        } else {
            callback({ code: grpc.status.NOT_FOUND, details: "User not found" });
        }
    } catch (error) {
        callback({ code: grpc.status.INTERNAL, details: error.message });
    }
};

const startGrpcServer = () => {
    const server = new grpc.Server();
    server.addService(userProto.UserService.service, { GetUser: getUser });
    
    const PORT = process.env.GRPC_PORT || 50051;
    server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) console.error('Error starting gRPC server:', err);
        else console.log(`gRPC User Service is running on port ${port}`);
    });
};

module.exports = { startGrpcServer };