# Usar una imagen base ligera de Node.js (Alpine)
FROM node:18-alpine

# Definir el entorno como producción (Optimiza Express y otras librerías)
ENV NODE_ENV=production

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar los archivos de dependencias (package.json y package-lock.json si existe)
# Usamos --chown para que el usuario 'node' sea dueño de los archivos
COPY --chown=node:node package*.json ./

# Instalar dependencias omitiendo las de desarrollo (estándar moderno)
RUN npm install --omit=dev

# Copiar el resto del código fuente de la aplicación
COPY --chown=node:node . .

# Cambiar a un usuario sin privilegios por seguridad (Crucial para Kubernetes)
USER node

# Exponer el puerto en el que corre la API (según tu .env)
EXPOSE 3000

# Definir el comando para iniciar el servidor
CMD ["npm", "start"]