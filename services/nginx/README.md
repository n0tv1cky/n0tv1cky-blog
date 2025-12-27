# Nginx service for n0tv1cky-blog

This folder contains a lightweight Nginx setup used to reverse-proxy the frontend and backend services in development and production.

Files:
- `conf.d/default.conf` — Nginx server configuration (proxies `/api/` to backend and other traffic to frontend). Default config is host-mode and proxies to `127.0.0.1:3000` and `127.0.0.1:8000`.
- `setup-host-nginx.sh` — installs Nginx on an Ubuntu host, copies the repo config to `/etc/nginx/sites-available/n0tv1cky_blog`, enables the site, symlinks `./blogs` into `/var/www/html` for ACME challenges, tests config and restarts nginx. Run with `sudo`.
- `hostctl.sh` — helper to `enable|disable|reload|status|logs|test` the host nginx site.

Example host install (run as root or via sudo):

```bash
sudo services/nginx/setup-host-nginx.sh

# view status
sudo services/nginx/hostctl.sh status

# tail logs
sudo services/nginx/hostctl.sh logs
```

Request/renew certificates (example for your domain):

```bash

# Request cert during setup (the script deploys an HTTP-only config first,
# obtains certificates, then replaces the config with the HTTPS-enabled one)
sudo services/nginx/setup-host-nginx.sh --domain n0tv1cky.com --cert

or use the combined installer with your email (default email: itsvikhyathraj@gmail.com):

```bash
sudo services/nginx/install-all.sh --domain n0tv1cky.com --email itsvikhyathraj@gmail.com
```

# Or request later (supply email if different from default)
sudo services/nginx/hostctl.sh cert n0tv1cky.com itsvikhyathraj@gmail.com

# Renew all existing certs
sudo services/nginx/hostctl.sh cert
```

Install automated renewal (systemd timer)

```bash
sudo services/nginx/install-systemd-renewal.sh

# check timer
systemctl status certbot-renew.timer
journalctl -u certbot-renew.service -n 200
```

Note: the installer will attempt to install `certbot` via `apt-get` if it is not present.

Notes:
- The `default.conf` is configured to proxy to services on the host (`127.0.0.1:3000` and `127.0.0.1:8000`). Update `default.conf` if your services are reachable at other addresses/ports.
- For TLS in production, provision certificates with Certbot or another ACME client and update the config with `listen 443 ssl` and `ssl_certificate` directives.
- To serve ACME challenges place challenge files into `/var/www/html/.well-known/acme-challenge/`.
