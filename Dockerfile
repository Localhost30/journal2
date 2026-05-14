FROM node:20-alpine

LABEL maintainer="Trading Journal Pro"
LABEL description="Plateforme de journal de trading - fullstack SPA"

WORKDIR /app

# Variables d'environnement pour Render
ENV PORT=3000
ENV NODE_ENV=production

# Installation des dependences backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Copie du projet complet (frontend + backend)
COPY . .

# Verification du backend
RUN ls -la backend/
RUN node -e "console.log('Node version:', process.version)"

EXPOSE 3000

CMD ["node", "backend/server.js"]
