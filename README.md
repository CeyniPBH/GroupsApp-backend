# GroupsApp Backend

Un backend monolítico para una aplicación de mensajería tipo WhatsApp/Discord.

## Características

- Autenticación de usuarios
- Búsqueda de usuarios por nickname y tag
- Sistema de contactos (amigos)
- Chats individuales y grupales
- Mensajes con soporte multimedia (imágenes, archivos, audio, video)
- Comunicación en tiempo real con Socket.IO
- Grupos con membresías y roles

## Estructura del Proyecto

```
src/
├── app.js                 # Configuración principal del servidor
├── config/
│   └── database.js        # Configuración de base de datos
├── models/
│   ├── index.js           # Asociaciones de modelos
│   ├── chat.model.js      # Modelo Chat
│   ├── contact.model.js   # Modelo Contact
│   └── ...                # Otros modelos
├── modules/
│   ├── auth/              # Autenticación
│   ├── users/             # Gestión de usuarios
│   ├── groups/            # Grupos
│   ├── membership/        # Membresías de grupo
│   ├── messages/          # Mensajes
│   ├── contacts/          # Contactos
│   └── chats/             # Chats
└── utils/                 # Utilidades
```

## Modelos

- **User**: Usuarios con name, email, password, tag (número identificador)
- **Group**: Grupos con owner, miembros
- **Membership**: Relación usuario-grupo con roles
- **Chat**: Chats (directos o grupales)
- **Message**: Mensajes con soporte multimedia
- **Contact**: Sistema de amigos

## API Endpoints

### Auth
- POST /auth/login
- POST /auth/register

### Users
- POST /users/search - Buscar usuario por handle (name#tag)
- GET /users/search/name - Buscar por nombre

### Contacts
- POST /contacts - Agregar contacto
- GET /contacts - Obtener contactos
- PUT /contacts/:id/accept - Aceptar solicitud
- PUT /contacts/:id/block - Bloquear

### Chats
- POST /chats - Crear chat
- GET /chats - Obtener chats del usuario

### Messages
- POST /messages - Enviar mensaje
- GET /messages/:chatId - Obtener mensajes de un chat
- POST /messages/upload - Subir archivo

### Groups
- POST /groups
- GET /groups
- etc.

## WebSockets

- joinChat: Unirse a un chat
- sendMessage: Enviar mensaje en tiempo real

## Postman Collection

Importa la colección y el environment desde `postman/`:

1. **Collection**: `postman/collections/GroupsApp.postman_collection.json`
2. **Environment**: `postman/environments/GroupsApp.postman_environment.json`

### Flujo de Prueba:

1. **Register/Login** → Obtén token
2. **Search Users** → Encuentra usuarios por nombre o handle
3. **Add Contact** → Envía solicitud de amistad
4. **Accept Contact** → Acepta la solicitud
5. **Create Chat** → Crea un chat directo
6. **Send Message** → Envía mensajes
7. **Upload File** → Sube archivos multimedia
8. **Create/Get Groups** → Gestiona grupos

Todas las requests incluyen tests automáticos para validar respuestas.