# Development
setup-vm:
	@echo "Setting up VM development environment..."
	@./scripts/setup-vm-dev.sh

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
	sudo docker compose -f compose.prod.yaml --env-file .env.prod up --build -d

prod-logs-backend:
	sudo docker compose -f compose.prod.yaml --env-file .env.prod logs -f backend

prod-restart-frontend:
	sudo docker compose -f compose.prod.yaml --env-file .env.prod restart frontend

prod-down:
	sudo docker compose -f compose.prod.yaml --env-file .env.prod down