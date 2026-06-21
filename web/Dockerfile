FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
# Rendered at container start by the nginx image's envsubst entrypoint using the
# API_PORT env var, so the upstream port isn't hard-coded. nginx's own $host/$uri
# vars are left untouched (they aren't environment variables).
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
