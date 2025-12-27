Frontend production Dockerfile and usage

Build and run locally with Docker Compose (production):

```bash
# from repo root
docker compose -f compose.prod.yaml build frontend
docker compose -f compose.prod.yaml up -d frontend
```

Or build image directly and run:

```bash
docker build -f services/frontend/Dockerfile.prod -t n0tv1cky-frontend:prod services/frontend
docker run -p 3000:3000 --env-file .env.prod --name blog_frontend n0tv1cky-frontend:prod
```

Notes:
- The production image runs `npm run start` which serves the optimized Next.js build on port 3000.
- Ensure `NEXT_PUBLIC_BACKEND_URL` is set in `.env.prod` so the client knows the backend URL.
