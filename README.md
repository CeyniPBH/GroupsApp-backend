# GroupsApp Backend.

A Node.js backend for a group messaging app (similar to WhatsApp), handling authentication, chats, contacts, groups, memberships, and messages using Express.js for REST APIs and gRPC for distributed services.

## Deployment
- **Monolith:** Deploy on a single server/EC2 instance.
- **Distributed:** Use Docker images on Kubernetes clusters (EKS) with S3 for storage.

## [Tecnologies](https://private-user-images.githubusercontent.com/176390796/555658973-3ea87522-cc91-40fe-bfac-e06cbff00982.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzgxMjQzMDcsIm5iZiI6MTc3ODEyNDAwNywicGF0aCI6Ii8xNzYzOTA3OTYvNTU1NjU4OTczLTNlYTg3NTIyLWNjOTEtNDBmZS1iZmFjLWUwNmNiZmYwMDk4Mi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTA3JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUwN1QwMzIwMDdaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1hNmExOThkYThkNGI3MDc5NWU3YmNkOTMwMzQwOWIzMTYyZTY2MGZmOGVjZGQ0NmZlMWVkMTA3NTZiZjhiMjRkJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.yCTJXz3lNlaIl7NhArnHLrH_ny7Zdiatkcu6rwScfqw/)

- `Node.js`, `Express`, `gRPC`, `Sequelize`, `Docker`, `Kubernetes`, `AWS S3`.

## Features.
- User Authentication.
- Search for users by nickname and tag.
- Contact system (friends).
- Individual and group chats.
- **Cloud Storage:** Native integration with Amazon S3 for files.
- **Distributed Architecture:** Microservices communicating via gRPC and WebSocket synchronization between instances using Redis Pub/Sub.

## Models.
- **User**: Username, email, password, tag (Id number).
- **Group**: Groups with owners and members.
- **Membership**: User-group relationships with roles.
- **Chat**: Chats (one-on-one or group).
- **Message**: Messages with multimedia support.
- **Contact**: Friends system.

## Project Evolution.
### Monolithic Version.
- **Structure:** Single-process Node.js app with Express server and gRPC services.
- **Components:**
    - `app.js:` Main Express app setup.
    - `modules:` Business logic (auth, chats, contacts, groups, messages, users).
    - `models:` Sequelize ORM models (users, chats, messages, etc.).
    - `grpc:` gRPC servers and clients for real-time communication.
    - `database.js:` Database connection.

- **[How It Works.](https://github.com/CeyniPBH/GroupsApp-backend/edit/main/HowItWorks.md/)**

### Deployed/Distributed Version.
- **Changes from Monolith:**
  1. Added Docker containerization (`Dockerfile`, `docker-compose.yml`, `.dockerignore`).
  2. Removed `node_modules/` from repo (installed at build time).
  3. Integrated AWS S3 for file storage (`s3.js`).
  4. Updated `.env` and `.gitignore` for cloud deployment.
  5. Documentation: `HowItWorks.md`, updated `README.md`.
  6. Prepared for Kubernetes orchestration (pods, services, scaling).
- **Architecture:**
  - Microservices evolution: gRPC services can run separately.
  - Containerized with Docker; orchestrated with K8s for horizontal scaling.
  - Cloud-ready with AWS (S3, EC2/EKS).
- **Benefits:** Scalable, resilient, efficient (smaller repo, faster builds).

## Installation & Usage.

### Monolithic Version
1. Clone the `main` branch.
2. Run `npm install`.
3. Set up database (configure `database.js`).
4. Run `npm start` (starts Express on port 3000, gRPC on 50051).
   
### Distributed Version.
1. Clone the `K8s-Deploy` branch.
2. For local dev: `docker-compose up` (builds and runs containers).
3. For K8s: Apply YAML manifests (e.g., `kubectl apply -f k8s/`).
4. Configure AWS S3 in `.env`.

### Test Flow.
1. **Register/Login** → Get token.
2. **Search Users** → Find users by name or handle.
3. **Add Contact** → Send a friend request.
4. **Accept Contact** → Accept the request.
5. **Create Chat** → Create a live chat.
6. **Send Message** → Send messages.
7. **Upload File** → Upload media files.
8. **Create/Get Groups** → Manage groups.

All requests include automated tests to validate responses.
