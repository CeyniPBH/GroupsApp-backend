# Usar una imagen base ligera de Node.js (Alpine)
FROM node:18-alpine

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar los archivos de dependencias (package.json y package-lock.json si existe)
COPY package*.json ./

# Instalar solo las dependencias necesarias para producción
RUN npm install --production

# Copiar el resto del código fuente de la aplicación
COPY . .

# Exponer el puerto en el que corre la API (según tu .env)
EXPOSE 3000

# Definir el comando para iniciar el servidor
CMD ["npm", "start"]