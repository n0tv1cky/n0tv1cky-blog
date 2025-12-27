#!/usr/bin/env bash
#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Usage: $0 --domain <domain> [--no-timer] [--email <email>]

This script runs the full host setup:
- installs nginx (via setup-host-nginx.sh)
- deploys HTTP config, obtains certificates via certbot
- swaps to HTTPS config and reloads nginx
- installs a systemd timer for automated renewals (unless --no-timer)

Example:
  sudo $0 --domain n0tv1cky.com
EOF
}

DOMAIN=""
EMAIL="itsvikhyathraj@gmail.com"
INSTALL_TIMER=1

while [ "$#" -gt 0 ]; do
  case "$1" in
    --domain)
      shift; DOMAIN=${1:-};;
    --no-timer)
      INSTALL_TIMER=0;;
    --email)
      shift; EMAIL=${1:-};;
    -h|--help)
      usage; exit 0;;
    *)
      echo "Unknown arg: $1" >&2; usage; exit 2;;
  esac
  shift
done

if [ -z "$DOMAIN" ]; then
  echo "--domain is required" >&2; usage; exit 2
fi

echo "Running full install for domain: $DOMAIN"

# Ensure scripts are executable
chmod +x services/nginx/setup-host-nginx.sh services/nginx/install-systemd-renewal.sh services/nginx/hostctl.sh || true

# Ensure certbot is available before requesting certs
sudo apt-get update
sudo apt-get install -y certbot || true

# Export email for setup script
export CERTBOT_EMAIL="$EMAIL"

# Run the host setup (this will install nginx, deploy HTTP config, run certbot, then swap to HTTPS)
sudo CERTBOT_EMAIL="$EMAIL" services/nginx/setup-host-nginx.sh --domain "$DOMAIN" --cert

if [ "$INSTALL_TIMER" -eq 1 ]; then
  echo "Installing systemd timer for cert renewal"
  sudo services/nginx/install-systemd-renewal.sh
fi

echo "All done. Check nginx status and certs:"
echo "  sudo services/nginx/hostctl.sh status"
echo "  sudo services/nginx/hostctl.sh test"
echo "  sudo certbot certificates"
