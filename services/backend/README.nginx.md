Production deployment recommendations

When deploying the backend to production, prefer placing an Nginx reverse proxy
in front of the app. This simplifies TLS termination, security headers,
CORS handling, and avoids exposing private network endpoints directly to
public origins.

Key recommendations

- Use Nginx (or another reverse proxy) to terminate TLS and proxy requests to
  the backend on localhost (e.g., `http://127.0.0.1:8000`). This keeps the
  backend on the private network and avoids the browser's Private Network
  Access (PNA) restrictions.

- Set `CORS_ORIGINS` in the environment to your exact production origin(s),
  e.g. `https://n0tv1cky.com`. Avoid using `*` in production.

- Ensure the Nginx config sets appropriate `proxy_set_header` values as in
  `services/nginx/conf.d/default.conf` and serves ACME challenges from
  `/var/www/html` during certificate issuance.

- Do not enable the PNA middleware in production. The application only
  registers the small PNA middleware in non-production to facilitate local
  development scenarios (e.g., frontend served from a different host).

Example Nginx snippets

server {
    listen 443 ssl http2;
    server_name n0tv1cky.com;

    ssl_certificate /etc/letsencrypt/live/n0tv1cky.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/n0tv1cky.com/privkey.pem;

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
