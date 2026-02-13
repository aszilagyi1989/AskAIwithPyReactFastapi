# 1. fázis: Build
FROM node:20-slim AS builder

WORKDIR /app

# Függőségek másolása és telepítése
COPY package*.json ./
RUN npm install

# Forráskód másolása és fordítása
COPY . .
RUN npm run build

# 2. fázis: Production (Nginx)
FROM nginx:stable-alpine

# A Vite alapértelmezetten a 'dist' mappába épít
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx konfiguráció (opcionális, de ajánlott az SPA routing miatt)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]