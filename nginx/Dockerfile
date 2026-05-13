# Nginx serving the three Angular frontends as static assets and reverse-proxying
# /api/* and /.well-known/* to the Spring Boot backend.
#
# Build the Angular apps first:
#   cd frontend && npx nx run ops-console:build:production
#   cd frontend && npx nx run customer-portal:build:production
#   cd frontend && npx nx run shearer-pwa:build:production

FROM nginx:alpine

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/sites/ /etc/nginx/conf.d/

# Copy the three frontend bundles into their respective roots
COPY frontend/dist/apps/ops-console      /usr/share/nginx/html/ops-console
COPY frontend/dist/apps/customer-portal  /usr/share/nginx/html/customer-portal
COPY frontend/dist/apps/shearer-pwa      /usr/share/nginx/html/shearer-pwa

EXPOSE 80 443
