# Development
dev-up:
	docker compose -f compose.dev.yaml --env-file .env.dev up --build

dev-up-bg:
	docker compose -f compose.dev.yaml --env-file .env.dev up -d

dev-logs:
	docker compose -f compose.dev.yaml --env-file .env.dev logs -f

dev-down:
	docker compose -f compose.dev.yaml --env-file .env.dev down

dev-rebuild-frontend:
	docker compose -f compose.dev.yaml --env-file .env.dev up --build frontend

# Production
prod-up:
	docker compose -f compose.prod.yaml --env-file .env.prod up -d

prod-logs-backend:
	docker compose -f compose.prod.yaml --env-file .env.prod logs -f backend

prod-restart-frontend:
	docker compose -f compose.prod.yaml --env-file .env.prod restart frontend

prod-down:
	docker compose -f compose.prod.yaml --env-file .env.prod down