# Development
dev-up:
	docker compose -f compose.dev.yaml up --build

dev-up-bg:
	docker compose -f compose.dev.yaml up -d

dev-logs:
	docker compose -f compose.dev.yaml logs -f

dev-down:
	docker compose -f compose.dev.yaml down

dev-rebuild-frontend:
	docker compose -f compose.dev.yaml up --build frontend

# Production
prod-up:
	docker compose -f compose.prod.yaml up -d

prod-logs-backend:
	docker compose -f compose.prod.yaml logs -f backend

prod-restart-frontend:
	docker compose -f compose.prod.yaml restart frontend

prod-down:
	docker compose -f compose.prod.yaml down