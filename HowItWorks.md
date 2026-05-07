# Documentación Técnica y Arquitectura - GroupsApp

Este documento es el manifiesto técnico del backend de **GroupsApp**. Detalla la arquitectura de software, los flujos de comunicación interna entre microservicios y el análisis de los archivos críticos del sistema.

---

## 1. Propósito del Sistema (Domain)

**GroupsApp** es una plataforma de mensajería en tiempo real estructurada con soporte para interacciones uno-a-uno y comunidades (estilo WhatsApp/Discord). Sus capacidades centrales incluyen:
- **Sistema de Identidad:** Usuarios únicos identificados por un nombre y un tag (ej. `user#1234`).
- **Grafos de Relación:** Sistema de solicitudes de amistad (Contacts) con estados de `pending`, `accepted` y `blocked`.
- **Comunicaciones Híbridas:** Chats Directos (DM) y Grupos con sistema de membresías y roles (Admin/Member).
- **Multimedia:** Envío de mensajes de texto y archivos adjuntos (imágenes/documentos) almacenados en la nube.

---

## 2. Modelo de Datos Central (Esquema Relacional)

El estado del sistema reside en PostgreSQL, orquestado a través de Sequelize ORM. Las entidades principales y sus relaciones son:

- **User:** La entidad principal. Contiene `name`, `email`, `password` (hasheada) y `tag`. 
- **Contact:** Relación autorreferencial de `User` a `User`. Define quién es amigo de quién o quién tiene bloqueado a quién.
- **Chat:** Representa un hilo de conversación. Puede ser de tipo `direct` (2 personas) o `group` (N personas).
- **Message:** Relacionado a un `Chat` y a un `User` (remitente). Contiene texto o referencias URL a archivos multimedia alojados en Amazon S3.
- **Group:** Extiende la funcionalidad de un Chat cuando es comunitario. Define un `owner` (propietario) y metadatos del grupo (nombre, descripción).
- **Membership:** Tabla pivote (Join Table) entre `User` y `Group`. Define los privilegios de un usuario en un grupo específico mediante el campo `role` (admin, member).

---

## 3. Arquitectura de Software y Flujo de Comunicación

El proyecto utiliza un enfoque de **Monolito Modular desplegado como Microservicios**. Aunque el código fuente reside en un solo repositorio, `docker-compose.yml` se encarga de separar el sistema en 4 contenedores independientes que se comunican a través de la red.

### ¿Cómo se comunican los componentes?

1. **Tráfico Externo (HTTP/REST y WebSockets):**
   - El contenedor `api` (Express) actúa como el **API Gateway** del sistema. Recibe todas las peticiones HTTP del mundo exterior (Frontend/Postman) y gestiona las conexiones persistentes de Socket.IO.
   
2. **Comunicación Interna (gRPC):**
   - Para operaciones que requieren dominios diferentes, los contenedores usan **gRPC** (Remote Procedure Call de Google) sobre HTTP/2. Es mucho más rápido que REST.
   - *Ejemplo práctico:* Cuando el Gateway (`api`) recibe la orden de "Agregar un contacto", no toca la base de datos de usuarios directamente. En su lugar, usa un cliente gRPC para preguntarle al contenedor `users-service`: *"¿Existe este usuario?"*. Si la respuesta es sí, le ordena a `chats-service`: *"Crea un chat directo"*.

3. **Sincronización de WebSockets en Entornos Distribuidos (Redis Pub/Sub):**
   - Cuando AWS Auto Scaling crea 3 servidores (Instancias EC2), el Usuario A podría conectarse al Servidor 1 y el Usuario B al Servidor 2.
   - Si el Usuario A envía un mensaje, el Servidor 1 usa **Redis Pub/Sub** (a través de `@socket.io/redis-adapter`) para gritar a la red: *"¡Mensaje para el chat 123!"*. El Servidor 2 lo escucha en Redis y se lo entrega al Usuario B.

4. **Persistencia y Almacenamiento Estático (PostgreSQL + S3):**
   - Las bases de datos relacionales manejan el estado del sistema. En producción, se utiliza Amazon RDS.
   - Los archivos estáticos (Avatares, Imágenes en chats) NUNCA se guardan en el disco duro del servidor porque los contenedores son efímeros. Se envían directamente a **Amazon S3** mediante un middleware de Multer.

---

## 4. El Ciclo de Vida de un Mensaje (WebSockets + Redis)

Para entender el verdadero poder de esta arquitectura, veamos qué ocurre cuando el Usuario A envía un mensaje al Usuario B en un entorno AWS escalado a múltiples servidores:

1. **Conexión:** El Usuario A abre la app y el Balanceador de Carga lo conecta al **Servidor 1**. El Usuario B hace lo mismo y cae en el **Servidor 2**.
2. **Suscripción (Rooms):** Ambos emiten el evento `joinChat(chatId)`. Socket.IO en cada servidor los inscribe en una "sala" virtual en la memoria RAM de su respectiva instancia.
3. **El Disparo:** Usuario A emite `sendMessage({ chatId: 123, text: 'Hola' })` al Servidor 1.
4. **Propagación (Redis Pub/Sub):** El Servidor 1 sabe que no tiene a todos los usuarios en su RAM. Por tanto, usa el cliente `pubClient` de Redis para publicar un mensaje interno: *"Mensaje para la sala 123"*.
5. **Recepción:** El Servidor 2, que está suscrito mediante `subClient`, escucha instantáneamente este evento de Redis.
6. **Entrega:** El Servidor 2 busca en su RAM a los sockets conectados a la sala 123 (ahí está el Usuario B) y le envía el evento `newMessage`. ¡El mensaje es entregado en milisegundos saltando entre servidores!

---

## 5. Análisis Hiper-Técnico de Archivos Críticos

A continuación, se detalla la responsabilidad de los archivos núcleo que hacen posible esta arquitectura:

### `src/app.js` (El API Gateway y Servidor WebSocket)
- **Función Principal:** Es el punto de entrada principal para el tráfico web. Inicia Express y envuelve el servidor con HTTP para Socket.IO.
- **Integración de Redis:** Instancia dos clientes Redis (`pubClient` y `subClient`) y los inyecta en Socket.IO para habilitar la mensajería a través de múltiples instancias en AWS.
- **Graceful Shutdown (Apagado Seguro):** Intercepta las señales `SIGTERM` y `SIGINT` (enviadas por Docker/K8s/AWS al destruir un contenedor) para cerrar las conexiones de BD y Redis limpiamente sin cortar peticiones a medias.
- **Control gRPC Interno:** En desarrollo local, evalúa `RUN_INTERNAL_GRPC`. Si es `true`, levanta los servidores gRPC en el mismo hilo. En Docker/AWS, esto se desactiva porque los microservicios viven en sus propios contenedores.

### `docker-compose.yml` (El Orquestador de Infraestructura)
- **Función Principal:** Define la topología de la red. Levanta 5 piezas de infraestructura virtualizadas en una misma red puente (`groupsapp-network`):
  - `redis`: Motor en memoria para Pub/Sub.
  - `auth-service`, `users-service`, `chats-service`: Construyen la misma imagen de Docker pero sobreescriben el comando de inicio para ejecutar sus respectivos archivos `standalone.js`.
  - `api`: El servidor central. Espera a que los gRPC y Redis estén listos (`depends_on`).

### `src/grpc/*_standalone.js` (Entrypoints de Microservicios)
- **Archivos:** `standalone.js`, `auth_standalone.js`, `chat_standalone.js`.
- **Función Principal:** Levantan **únicamente** un servidor TCP en un puerto específico (ej. 50051, 50052) esperando peticiones de RPC (Remote Procedure Call) generadas a partir de archivos `.proto`.
- **Gestión de Base de Datos Segura:** Usan un operador ternario para evaluar `NODE_ENV`. Si están en producción, ejecutan `sequelize.authenticate()` en lugar de `sync()`. Esto **evita condiciones de carrera (deadlocks)** en la base de datos cuando AWS levanta múltiples contenedores simultáneamente.

### `src/modules/contacts/contact.controller.js` (Ejemplo de Orquestación)
- **Función Principal:** Un controlador REST tradicional que actúa como director de orquesta.
- **Flujo Técnico:** 
  1. Recibe una petición HTTP de la `api`.
  2. Invoca `getUserViaGrpc(contactId)` para verificar la existencia del usuario en otro microservicio de forma asíncrona.
  3. Actualiza el estado en la base de datos local (PostgreSQL).
  4. Invoca `createChatViaGrpc(...)` para pedirle al servicio de Chats que instancie la sala de chat de Socket.IO en la BD.

### `src/config/s3.js` (Capa de Almacenamiento Distribuido)
- **Función Principal:** Reemplaza el almacenamiento local del disco duro.
- **Mecánica:** Utiliza `multer-s3` y el `@aws-sdk/client-s3`. Crea un stream directo desde la memoria RAM de la instancia EC2 hacia Amazon S3. Esto significa que si el contenedor se destruye 5 segundos después de la subida, la imagen ya está a salvo en la nube.