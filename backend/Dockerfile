FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run format:check

RUN npm test

RUN npm run build

EXPOSE 5001

CMD ["node", "dist/index.js"]