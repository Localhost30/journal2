FROM node:20-alpine

LABEL maintainer="Trading Journal Pro"
LABEL description="Dockerfile pour le déploiement sur Render"

WORKDIR /app

# Copie des fichiers du backend et installation des déps
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copie de tout le projet (frontend + backend)
COPY . .

# Expose le port que Render définira via la variable d'env PORT
EXPOSE 3000

CMD ["node", "backend/server.js"]
