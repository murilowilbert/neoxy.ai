FROM node:24-alpine

WORKDIR /app

# Instala dependências
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npx prisma generate

# Copia código fonte
COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
