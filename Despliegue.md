# Guía de Despliegue en AWS con Auto Scaling y Docker

Esta guía detalla la arquitectura y los pasos para desplegar el backend de **GroupsApp** en un entorno de alta disponibilidad utilizando Auto Scaling Groups (ASG), Application Load Balancer (ALB) y base de datos externa.

## Arquitectura de Producción
- **Aplicación (Backend):** Grupo de Auto Scaling con instancias EC2 corriendo la API en contenedores Docker (Stateless).
- **Base de Datos Centralizada:** Amazon RDS (PostgreSQL) o una instancia EC2 dedicada exclusivamente a la base de datos.
- **Almacenamiento de Archivos:** Amazon S3 (para garantizar que las imágenes de los chats estén disponibles para todas las instancias).
- **Gestor de Estados (WebSockets):** Amazon ElastiCache o un contenedor de Redis (puede ir en la misma EC2 de la BD) para sincronizar Socket.IO entre múltiples instancias.
- **Balanceador de Carga:** AWS Application Load Balancer (ALB) para distribuir el tráfico entre las instancias EC2 activas.

---

## 1. Base de Datos Centralizada

Dado que el backend escalará horizontalmente, la base de datos no puede estar acoplada a la instancia de la aplicación.

1. Crea una instancia de **Amazon RDS para PostgreSQL** (Recomendado para producción) O lanza un EC2 estático que ejecute únicamente el archivo `docker-compose.yml` de la base de datos.
2. Asegúrate de que el **Security Group** de la base de datos permita tráfico entrante en el puerto `5432` desde el Security Group que tendrán tus instancias del Auto Scaling.
3. Copia el **Endpoint** (Host) proporcionado, lo necesitarás para las variables de entorno.

---

## 2. Configurar IAM Role (Perfil de Instancia)

Tus instancias EC2 necesitarán permisos para subir archivos a Amazon S3 sin usar credenciales en texto plano.

1. Ve a **IAM > Roles** en AWS y crea un nuevo rol para el servicio **EC2**.
2. Adjunta las políticas `AmazonS3FullAccess` (para subir archivos) y `AmazonEC2ContainerRegistryReadOnly` (para que las instancias puedan descargar tu imagen privada desde AWS ECR).
3. Ponle un nombre al rol (ej. `GroupsApp-EC2-S3-Role`). Se lo asignaremos a la Plantilla de Lanzamiento en el siguiente paso.

---

## 3. Configurar la Plantilla de Lanzamiento (Launch Template)

Para el Auto Scaling, AWS creará servidores automáticamente. Para que estas instancias se configuren solas al nacer, usaremos un script de **User Data**.

1. Ve a EC2 > **Launch Templates** > Create Launch Template.
2. Elige la AMI (ej. Ubuntu 22.04) y el tipo de instancia (ej. t2.micro).
3. En la sección **Advanced Details > IAM instance profile**, selecciona el rol que creaste en el paso anterior (`GroupsApp-EC2-S3-Role`).
4. En **Security Groups**, permite el puerto 22 (SSH) y el puerto `3000` (al que apuntará el Load Balancer).
5. Ve al fondo hasta **User Data** y pega el siguiente script de inicio automático:

```bash
#!/bin/bash
# 1. Actualizar e instalar Docker y AWS CLI
apt-get update -y
apt-get install docker.io awscli -y
systemctl start docker
systemctl enable docker

cd /home/ubuntu

# 2. Crear el archivo de variables de entorno (.env)
# NOTA: En un entorno estricto, estos valores se traen de AWS Secrets Manager.
cat <<EOF > .env
PORT=3000
CORS_ORIGIN=*
JWT_SECRET=tu_secreto_jwt_super_seguro
DB_HOST=<ENDPOINT_DE_TU_RDS_O_DB_EXTERNA>
DB_NAME=groupsapp
DB_USER=postgres
DB_PASSWORD=password_seguro_postgres
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=tu-bucket-groupsapp
REDIS_HOST=<IP_DE_TU_INSTANCIA_REDIS_O_ELASTICACHE>
REDIS_PORT=6379
EOF

# 3. Autenticarse en ECR y descargar la imagen del backend (reemplaza TU_ACCOUNT_ID por tu ID de cuenta AWS)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <TU_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
docker pull <TU_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/groupsapp-backend:latest

# 4. Crear red interna de Docker para comunicación entre microservicios
docker network create groupsapp-network

# 5. Ejecutar los Microservicios gRPC (usando la misma imagen pero diferentes comandos)
docker run -d --name users-service --network groupsapp-network --env-file .env -e GRPC_PORT=50051 --restart always <TU_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/groupsapp-backend:latest node src/grpc/standalone.js
docker run -d --name auth-service --network groupsapp-network --env-file .env -e AUTH_GRPC_PORT=50052 --restart always <TU_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/groupsapp-backend:latest node src/grpc/auth_standalone.js
docker run -d --name chats-service --network groupsapp-network --env-file .env -e CHAT_GRPC_PORT=50053 -e GRPC_HOST=users-service --restart always <TU_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/groupsapp-backend:latest node src/grpc/chat_standalone.js

# 6. Ejecutar la API Principal (Actúa como API Gateway hacia el exterior)
docker run -d --name groupsapp-api -p 3000:3000 --network groupsapp-network --env-file .env -e GRPC_HOST=users-service -e AUTH_GRPC_HOST=auth-service -e AUTH_GRPC_PORT=50052 -e CHAT_GRPC_HOST=chats-service -e CHAT_GRPC_PORT=50053 -e RUN_INTERNAL_GRPC=false --restart always <TU_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/groupsapp-backend:latest npm start
```

---

## 4. Balanceador de Carga y Auto Scaling Group

1. Crea un **Application Load Balancer (ALB)** escuchando en el puerto `80` o `443` (HTTP/HTTPS).
2. Configura su *Target Group* para enrutar el tráfico al puerto `3000` de las instancias.
   - **Importante:** En los atributos del Target Group, busca y activa **Stickiness (Sticky Sessions)**. Esto es fundamental para evitar que el balanceador desconecte intermitentemente los WebSockets de los clientes.
3. Crea un **Auto Scaling Group (ASG)** vinculando tu *Launch Template* recién creada.
4. Selecciona el *Target Group* del ALB para adjuntarlo al ASG.
5. Define tus políticas de escalado (ej: si CPU > 70%, crear una nueva máquina).

---

## 5. Verificación

Copia el **DNS name** público de tu Application Load Balancer. Las peticiones enviadas allí serán balanceadas de forma automática hacia cualquier instancia EC2 que el Auto Scaling Group haya lanzado. 

Todas las instancias compartirán el mismo Bucket S3 para archivos multimedia y consultarán la misma Base de Datos PostgreSQL, logrando verdadera alta disponibilidad.