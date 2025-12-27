FROM nginx:stable-alpine
COPY ./conf.d /etc/nginx/conf.d
RUN mkdir -p /var/www/html
VOLUME ["/var/www/html"]
EXPOSE 80 443
