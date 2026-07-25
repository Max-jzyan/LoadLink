FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

# ci insted of npm install for CI/CD
RUN npm ci

COPY . .

RUN npm run format:check

RUN npm run build

# Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80


# Keep alive
CMD ["nginx", "-g", "daemon off;"]