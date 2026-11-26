# Etapa 1: build con Node (instala dependencias y genera dist/)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN apk add --no-cache git
RUN npm install
COPY . .
RUN npm run build

# Etapa 2: servir los archivos estáticos con nginx (sin Node en ejecución)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
