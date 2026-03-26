# Guía de Despliegue en AWS EC2 con Docker

Esta guía detalla los pasos necesarios para desplegar el backend de **GroupsApp** en una instancia EC2 de Amazon Web Services (AWS) utilizando Docker y Docker Compose.

## Arquitectura de Producción
- **Aplicación:** Contenedor Node.js (Alpine)
- **Base de Datos:** Contenedor PostgreSQL 14 (o Amazon RDS, si se configura externamente)
- **Almacenamiento de Archivos:** Amazon S3 (mediante `multer-s3`)

---

## 1. Configuración de la Instancia EC2

1. Accede a tu consola de AWS y ve al servicio **EC2**.
2. Lanza una nueva instancia (Launch Instance) seleccionando **Ubuntu Server 22.04 LTS** (o superior).
3. En la sección de **Configuración de red (Security Groups)**, asegúrate de abrir los siguientes puertos:
   - **Puerto 22 (SSH):** Para poder conectarte a la terminal del servidor (Origen: Mi IP o Anywhere).
   - **Puerto 3000 (Custom TCP):** Para que el backend sea accesible desde el exterior (Origen: Anywhere - `0.0.0.0/0`).

---

## 2. Conexión e Instalación de Dependencias (Docker)

Conéctate a tu instancia EC2 mediante SSH usando tu terminal:

```bash
ssh -i "tu-llave.pem" ubuntu@<IP_PUBLICA_DE_TU_EC2>
```

Una vez dentro, actualiza el sistema e instala Docker y Docker Compose:

```bash
# Actualizar los paquetes del sistema
sudo apt-get update -y

# Instalar Docker
sudo apt-get install docker.io -y

# Instalar Docker Compose
sudo apt-get install docker-compose -y

# Otorgar permisos al usuario actual para usar Docker sin "sudo"
sudo usermod -aG docker $USER
```

*Nota: Es posible que necesites cerrar la conexión SSH (`exit`) y volver a entrar para que los cambios de permisos del usuario tengan efecto.*

---

## 3. Descarga del Código

Clona el repositorio en tu instancia EC2:

```bash
git clone <URL_DE_TU_REPOSITORIO>
cd GroupsApp-backend
```

---

## 4. Configuración de Variables de Entorno

Crea el archivo `.env` en la raíz del proyecto para definir las credenciales de producción.

```bash
nano .env
```

Pega el siguiente contenido y reemplaza los valores con tu información real (especialmente los de AWS S3 y JWT):

```env
# Configuración del Servidor
PORT=3000
CORS_ORIGIN=*
JWT_SECRET=tu_secreto_jwt_super_seguro_produccion

# Configuración de Base de Datos (Docker local)
DB_HOST=db
DB_NAME=groupsapp
DB_USER=postgres
DB_PASSWORD=password_seguro_postgres

# Configuración de AWS S3 (Para subida de archivos)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu_aws_access_key
AWS_SECRET_ACCESS_KEY=tu_aws_secret_key
AWS_S3_BUCKET_NAME=tu-bucket-groupsapp
```

Guarda el archivo presionando `Ctrl+O`, `Enter` y luego sal de nano con `Ctrl+X`.

---

## 5. Levantar los Servicios

Con todo configurado, utiliza Docker Compose para construir la imagen de la aplicación y levantar los contenedores (Base de datos y API) en segundo plano (`-d`):

```bash
docker-compose up -d --build
```

Para verificar que los contenedores están corriendo correctamente:

```bash
docker-compose ps
```

---

## 6. Verificación (Health Check)

Para comprobar que la API está funcionando, abre tu navegador web o usa una herramienta como Postman o cURL apuntando a la IP pública de tu EC2 en el puerto 3000:

`http://<IP_PUBLICA_DE_TU_EC2>:3000/`

Deberías recibir la respuesta: `Welcome to the API` (con código de estado 200 OK).