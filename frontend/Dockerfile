# NOTE ON VITE_API_BASE_URL: unlike the backend's env vars (read at container
# *start* time), Vite bakes import.meta.env.VITE_* values into the static JS
# bundle at *build* time - there's no running process left inside the nginx
# container to read an environment variable from. So this value must be
# supplied as a --build-arg, not a runtime `environment:` entry, and the
# image has to be rebuilt (not just restarted) whenever the backend's public
# URL changes.
FROM node:20-alpine AS build
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# nginx-unprivileged (not the standard nginx image) so this container never
# runs as root - it binds 8081 by default rather than the standard 80/8080,
# which unprivileged processes can't do.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=build /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8081
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
    CMD wget -qO- http://localhost:8081/ || exit 1
