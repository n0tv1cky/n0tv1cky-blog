#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo $0" >&2
  exit 2
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SYSTEMD_DIR=/etc/systemd/system

echo "Installing certbot renewal systemd units..."
cp "${REPO_ROOT}/services/nginx/systemd/certbot-renew.service" "${SYSTEMD_DIR}/certbot-renew.service"
cp "${REPO_ROOT}/services/nginx/systemd/certbot-renew.timer" "${SYSTEMD_DIR}/certbot-renew.timer"

echo "Reloading systemd daemon and enabling timer"
systemctl daemon-reload
systemctl enable --now certbot-renew.timer

echo "Timer installed and started. Check status with: systemctl status certbot-renew.timer"

echo "Ensuring certbot is installed (for renewals)..."
apt-get update
apt-get install -y certbot || true
