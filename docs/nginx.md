# Nginx Reverse Proxy Setup

This document explains the lightweight Nginx service added to the repository. Nginx is configured to reverse-proxy the frontend (Next.js) and backend (FastAPI) services and to serve static files needed for ACME challenges.

Location
- Nginx files: `services/nginx`
- Nginx config: `services/nginx/conf.d/default.conf`
- Management scripts: `services/nginx/setup-host-nginx.sh` and `services/nginx/hostctl.sh`

TLS and Production Notes
- This setup includes placeholders for TLS but does not automatically provision certificates. Use Certbot or another ACME client to provision certs and place them under `/etc/nginx/certs`, then update `conf.d/default.conf` to enable `listen 443 ssl` and `ssl_certificate` directives.

If you want me to wire up automatic LetsEncrypt certificate provisioning, tell me and I will add it (Certbot or a reverse-proxy companion).

Host (Ubuntu) installation

1. On the Ubuntu host, copy the repository and make sure it's accessible (for example, `/home/ubuntu/n0tv1cky-blog`).
2. Run the setup script as root (it will install `nginx`, deploy an HTTP-only site config, prepare `/var/www/html` for ACME challenges, request certificates using Certbot, then swap in the HTTPS config and reload nginx):

```bash
sudo services/nginx/setup-host-nginx.sh --domain n0tv1cky.com --cert
```

3. Use `hostctl.sh` to manage the site:

```bash
sudo services/nginx/hostctl.sh status
sudo services/nginx/hostctl.sh reload
sudo services/nginx/hostctl.sh logs
```

Automated renewal via systemd timer

```bash
sudo services/nginx/install-systemd-renewal.sh
systemctl status certbot-renew.timer
```

Notes:
 - `setup-host-nginx.sh` will back up an existing `/var/www/html` directory (if present) and create a new real `/var/www/html` directory owned by `www-data` with `755` permissions. This ensures that the Let's Encrypt CA can download challenge files.
 - If you prefer to serve blog content from the repo, copy or symlink specific files into `/var/www/html` (not the whole repo). For example:

```bash
sudo ln -sfn /home/ubuntu/n0tv1cky-blog/blogs /var/www/html/blogs
sudo chown -R www-data:www-data /var/www/html/blogs
```
- The host scripts assume Ubuntu/Debian package manager (`apt-get`). If you run a different distro replace the install step accordingly.
 - When running nginx on the host (non-Docker), `services/nginx/conf.d/default.conf` is configured to proxy to `127.0.0.1:3000` (frontend) and `127.0.0.1:8000` (backend). If your services are bound to other addresses/ports, update the file before running `setup-host-nginx.sh`.
