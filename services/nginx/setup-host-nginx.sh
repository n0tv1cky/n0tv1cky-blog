#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root (sudo)." >&2
  exit 2
fi

SITE_NAME=n0tv1cky_blog
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NGINX_SITES_AVAILABLE=/etc/nginx/sites-available
NGINX_SITES_ENABLED=/etc/nginx/sites-enabled
WWW_DIR=/var/www/html

# Defaults
DOMAIN=n0tv1cky.com
DO_CERT=0
# Default certbot email (provided by user)
CERTBOT_EMAIL=itsvikhyathraj@gmail.com

while [ "$#" -gt 0 ]; do
  case "$1" in
    --domain)
      shift
      DOMAIN=${1:-}
      ;;
    --cert)
      DO_CERT=1
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2
      ;;
  esac
  shift
done

echo "Installing nginx (apt-get)..."
apt-get update
apt-get install -y nginx

echo "Creating site config: ${SITE_NAME} (domain: ${DOMAIN})"
mkdir -p "${NGINX_SITES_AVAILABLE}"
# Deploy HTTP-only config first so nginx can start before certificates exist
sed "s/n0tv1cky.com/${DOMAIN}/g" "${REPO_ROOT}/services/nginx/conf.d/default.conf.http" > "${NGINX_SITES_AVAILABLE}/${SITE_NAME}"

echo "Creating symlink in sites-enabled"
ln -sf "${NGINX_SITES_AVAILABLE}/${SITE_NAME}" "${NGINX_SITES_ENABLED}/${SITE_NAME}"

echo "Preparing ${WWW_DIR} for ACME challenges"
# If a real directory exists, back it up; if it's a symlink remove it
if [ -L "${WWW_DIR}" ]; then
  rm -f "${WWW_DIR}"
elif [ -e "${WWW_DIR}" ]; then
  mv "${WWW_DIR}" "${WWW_DIR}.backup.$(date +%s)" || true
fi

# Create a real webroot directory and ensure nginx can read it
mkdir -p "${WWW_DIR}/.well-known/acme-challenge"
chown -R www-data:www-data "${WWW_DIR}"
chmod -R 755 "${WWW_DIR}"

# If you want to expose site content from the repo, create a readable symlink
# under the webroot rather than symlinking the entire repo. Commented by default.
# ln -sfn "${REPO_ROOT}/blogs" "${WWW_DIR}/blogs"

echo "Testing nginx configuration"
nginx -t

echo "Restarting nginx"
systemctl restart nginx
systemctl enable nginx

if [ "$DO_CERT" -eq 1 ]; then
  echo "Requesting certificate via Certbot for ${DOMAIN}..."
  apt-get install -y certbot
  if [ -n "${CERTBOT_EMAIL}" ]; then
    certbot certonly --non-interactive --agree-tos --email "${CERTBOT_EMAIL}" --webroot -w "${WWW_DIR}" -d "${DOMAIN}" -d "www.${DOMAIN}"
  else
    certbot certonly --non-interactive --agree-tos --register-unsafely-without-email --webroot -w "${WWW_DIR}" -d "${DOMAIN}" -d "www.${DOMAIN}"
  fi

  # After obtaining certs, replace site config with HTTPS-enabled template
  sed "s/n0tv1cky.com/${DOMAIN}/g" "${REPO_ROOT}/services/nginx/conf.d/default.conf" > "${NGINX_SITES_AVAILABLE}/${SITE_NAME}"
  echo "Reloading nginx with HTTPS config"
  nginx -t && systemctl reload nginx
fi

echo "Done. Site enabled at /etc/nginx/sites-enabled/${SITE_NAME}"
echo "ACME challenge files can be placed in ${WWW_DIR}/.well-known/acme-challenge/"
