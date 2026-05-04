FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN --network=host npm install

COPY . .

RUN chmod -R 755 node_modules/.bin && npm run build

FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/dist /usr/share/nginx/html
RUN mkdir -p /var/cache/nginx/client_temp && \
    chown -R nginx:nginx /var/cache/nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/index.html || exit 1
# HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
#     CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]