ARG NODE_VERSION=24.13.0

FROM node:${NODE_VERSION}-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS development
COPY . .
EXPOSE 8080
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080", "--strictPort"]

FROM development AS build
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.31.3-alpine3.24 AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html
EXPOSE 8080
