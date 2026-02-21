# Stage 1: Build Image
FROM node:18-alpine AS build

RUN apk add git

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN mv vite.env .env
RUN npm run build

# Stage 2, use the compiled app, ready for production with Nginx
FROM nginx:1.21.6-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY /nginx.conf /etc/nginx/conf.d/default.conf
COPY /nginx-variables.conf.template /etc/nginx/templates/variables.conf.template
COPY env.sh /docker-entrypoint.d/env.sh

RUN chmod +x /docker-entrypoint.d/env.sh
