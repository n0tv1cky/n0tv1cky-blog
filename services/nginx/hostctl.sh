#!/usr/bin/env bash
set -euo pipefail

SITE_NAME=n0tv1cky_blog
NGINX_SITES_AVAILABLE=/etc/nginx/sites-available
NGINX_SITES_ENABLED=/etc/nginx/sites-enabled

function usage() {
  echo "Usage: $0 {enable|disable|reload|status|logs|test|cert}"
}

cmd=${1:-}
case "$cmd" in
  enable)
    ln -sf "${NGINX_SITES_AVAILABLE}/${SITE_NAME}" "${NGINX_SITES_ENABLED}/${SITE_NAME}"
    nginx -t && systemctl reload nginx
    ;;
  disable)
    rm -f "${NGINX_SITES_ENABLED}/${SITE_NAME}"
    nginx -t && systemctl reload nginx
    ;;
  reload)
    nginx -t && systemctl reload nginx
    ;;
  status)
    systemctl status nginx --no-pager
    ;;
  logs)
    journalctl -u nginx -f
    ;;
  test)
    nginx -t
    ;;
  cert)
    # Usage: hostctl.sh cert [domain] [email]
    DOMAIN=${2:-}
    EMAIL=${3:-itsvikhyathraj@gmail.com}
    if [ -z "$DOMAIN" ]; then
      echo "Running certbot renew..."
      certbot renew
    else
      echo "Requesting certificate for ${DOMAIN} and www.${DOMAIN} (email: ${EMAIL})"
      apt-get update && apt-get install -y certbot
      if [ -n "$EMAIL" ]; then
        certbot certonly --non-interactive --agree-tos --email "$EMAIL" --webroot -w /var/www/html -d "$DOMAIN" -d "www.$DOMAIN"
      else
        certbot certonly --non-interactive --agree-tos --register-unsafely-without-email --webroot -w /var/www/html -d "$DOMAIN" -d "www.$DOMAIN"
      fi
      nginx -t && systemctl reload nginx
    fi
    ;;
  *)
    usage
    exit 1
    ;;
esac
