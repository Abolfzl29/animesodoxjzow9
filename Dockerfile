# Neon Anime — static site served by nginx.
# Railway injects the $PORT env var; we substitute it into the nginx
# config at container boot so the service always listens on the right port.
FROM nginx:1.27-alpine

# Nginx site config (template — $PORT is filled in by envsubst below).
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Static site files.
COPY . /usr/share/nginx/html

EXPOSE 8080

CMD ["/bin/sh", "-c", ": \"${PORT:=8080}\"; envsubst '$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
