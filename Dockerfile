# Usamos una imagen ligera de Node.js versión 18
FROM node:18-alpine

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiamos los archivos de dependencias primero para aprovechar el caché de Docker
COPY package*.json ./

# Instalamos solo las dependencias de producción
RUN npm install --omit=dev

# Copiamos el resto del código de la aplicación
COPY . .

# Nos aseguramos de que exista el directorio de uploads
RUN mkdir -p uploads

# Exponemos el puerto en el que corre la aplicación
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]