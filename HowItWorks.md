# Technical Documentation and Architecture - GroupsApp.

This document is the technical manifesto of the GroupsApp backend. It details the software architecture, the internal communication flows between microservices, and the analysis of the system’s critical files.

## 1. System Purpose (Domain).
**GroupsApp**is a real-time messaging platform structured to support one-to-one interactions and communities (WhatsApp/Discord style). Its core capabilities include:
- **Identity System:**Unique users identified by a name and a tag (e.g. `user#1234`).
- **Relationship Graphs:**Friend request system (Contacts) with `pending`, `accepted` and `blocked` states.
- **Hybrid Communications:** Direct Messages (DMs) and Groups with membership and role systems (Admin/Member).
- **Multimedia:** Sending text messages and file attachments (images/documents) stored in the cloud.


## 2. Core Data Model (Relational Schema).
The system state resides in PostgreSQL, orchestrated through Sequelize ORM. The main entities and their relationships are:

- **User:** The main entity. Contains `name`, `email`, `password` (hashed) and `tag`. 
- **Contact:** Self-referential relationship from `User` to `User`. Defines who is friends with whom or who has blocked whom.
- **Chat:**Represents a conversation thread. Can be of type `direct` (2 people) or `group`(N people).
- **Message:** Related to a `Chat` and a `User` (sender). Contains text or URL references to multimedia files hosted on Amazon S3.
- **Group:**Extends the functionality of a Chat when it is community-based. Defines an `owner`and group metadata (name, description).
- **Membership:**Pivot table (Join Table) between `User` and `Group`.Defines a user’s privileges within a specific group through the `role` field (admin, member).

---

## 3. Software Architecture and Communication Flow.

The project uses a Modular Monolith deployed as Microservices approach. Although the source code resides in a single repository, `docker-compose.yml` separates the system into 4 independent containers that communicate through the network.

### How do the components communicate?

1. **External Traffic (HTTP/REST and WebSockets):**
   - The `api`container (Express) acts as the system’s API Gateway. It receives all HTTP requests from the outside world (Frontend/Postman) and manages persistent Socket.IO connections.
   
2. **Internal Communication (gRPC):**
   - For operations that require different domains, containers use gRPC (Google Remote Procedure Call) over HTTP/2. It is much faster than REST.
   - *Practical example:* When the Gateway (`api`)receives the command to “Add a contact”, it does not access the users database directly. Instead, it uses a gRPC client to ask the `users-service` container: *"Does this user exist?"*. If the answer is yes, it then instructs `chats-service`: *"Create a direct chat."*.

3. **WebSocket Synchronization in Distributed Environments (Redis Pub/Sub):**
   - When AWS Auto Scaling creates 3 servers (EC2 Instances), User A may connect to Server 1 while User B connects to Server 2.
   - If User A sends a message, Server 1 uses Redis Pub/Sub (through `@socket.io/redis-adapter`)to broadcast across the network: *"Message for chat 123!"*.Server 2 listens to Redis and delivers it to User B.
   
4. **Persistence and Static Storage (PostgreSQL + S3):**
   - Relational databases handle the system state. In production, Amazon RDS is used.
   - Static files (Avatars, Chat Images) are NEVER stored on the server’s hard drive because containers are ephemeral. Instead, they are uploaded directly to Amazon S3 through a Multer middleware.

---

## 4. The Lifecycle of a Message (WebSockets + Redis).

To understand the true power of this architecture, let’s see what happens when User A sends a message to User B in an AWS environment scaled across multiple servers:

1. **Connection:** User A opens the app and the Load Balancer connects them to Server 1. User B does the same and lands on **Server 2**.
2. **Subscription (Rooms):** Both emit the `joinChat(chatId)`event. Socket.IO on each server subscribes them into a virtual “room” stored in the RAM memory of their respective instances.
3. **Trigger:**User A emits: `sendMessage({ chatId: 123, text: 'Hola' })` to Server 1.
4. **Propagation (Redis Pub/Sub):** Server 1 knows that not all users are connected to its RAM memory. Therefore, it uses Redis’ `pubClient` to publish an internal message: *"Mensaje para la sala 123"*.
5. **Reception:** Server 2, which is subscribed through `subClient`, instantly receives this Redis event.
6. **Delivery:**Server 2 looks in its RAM memory for sockets connected to room 123 (where User B is located) and emits the `newMessage`event. The message is delivered in milliseconds while hopping between servers!

---

## 5. Hyper-Technical Analysis of Critical Files.
Below is a detailed explanation of the responsibilities of the core files that make this architecture possible:

### `src/app.js` (API Gateway and WebSocket Server)
- **Main Function:** It is the main entry point for web traffic. It initializes Express and wraps the server with HTTP for Socket.IO.
- **Redis Integration:**Instantiates two Redis clients (`pubClient` and `subClient`) and injects them into Socket.IO to enable messaging across multiple AWS instances.
- **Graceful Shutdown (Safe Shutdown):**Intercepts `SIGTERM` and `SIGINT` signals (sent by Docker/K8s/AWS when destroying a container) to cleanly close database and Redis connections without interrupting requests midway.
- **Internal gRPC Control:**In local development, it evaluates `RUN_INTERNAL_GRPC`. If `true`,it starts the gRPC servers in the same thread. In Docker/AWS, this is disabled because microservices live in their own containers.

### `docker-compose.yml` (Infrastructure Orchestrator)
- **Main Function:** Defines the network topology. It launches 5 virtualized infrastructure components within the same bridge network (`groupsapp-network`):
  - `redis`: In-memory engine for Pub/Sub.
  - `auth-service`, `users-service`, `chats-service`: Build the same Docker image but override the startup command to execute their respective `standalone.js`files.
  - `api`: The central server. Waits for gRPC services and Redis to be ready (`depends_on`).

### `src/grpc/*_standalone.js` (Microservice Entrypoints)
- **Files:** `standalone.js`, `auth_standalone.js`, `chat_standalone.js`.
- **Main Function:** They only start a TCP server on a specific port (e.g. 50051, 50052)waiting for RPC (Remote Procedure Call) requests generated from `.proto` files.
- **Safe Database Management:** They use a ternary operator to evaluate `NODE_ENV`.If running in production, they execute: `sequelize.authenticate()`instead of: `sync()`.This prevents race conditions (deadlocks) in the database when AWS launches multiple containers simultaneously.

### `src/modules/contacts/contact.controller.js` (Orchestration Example)
- **Main Function:** A traditional REST controller acting as an orchestra conductor.
- **Technical Flow:** 
  1. Receives an HTTP request from the `api`.
  2. Invokes `getUserViaGrpc(contactId)`to asynchronously verify the user’s existence in another microservice.
  3. Updates the state in the local database (PostgreSQL).
  4. Invokes `createChatViaGrpc(...)` to instruct the Chats service to instantiate the Socket.IO chat room in the database.

### `src/config/s3.js` (Distributed Storage Layer)
- **Main Function:** Replaces local hard drive storage.
- **Mechanics:** Uses `multer-s3` and `@aws-sdk/client-s3`. It creates a direct stream from the EC2 instance RAM memory to Amazon S3. This means that even if the container is destroyed 5 seconds after the upload, the image is already safely stored in the cloud.
