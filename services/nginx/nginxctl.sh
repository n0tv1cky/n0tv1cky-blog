#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILES=("${ROOT_DIR}/../compose.dev.yaml" "${ROOT_DIR}/../compose.prod.yaml")

# Default compose file: prefer dev if exists
COMPOSE_FILE="${ROOT_DIR}/../compose.dev.yaml"
if [ ! -f "${COMPOSE_FILE}" ]; then
  COMPOSE_FILE="${ROOT_DIR}/../compose.prod.yaml"
fi

function usage() {
  echo "Usage: $0 {up|down|restart|logs|status|exec}"
  echo "  up       - start nginx service"
  echo "  down     - stop nginx service"
  echo "  restart  - restart nginx service"
  echo "  logs     - tail nginx logs"
  echo "  status   - show service status"
  echo "  exec     - run a shell inside nginx container"
}

cmd=${1:-}
case "$cmd" in
  up)
    docker compose -f "$COMPOSE_FILE" up -d nginx
    ;;
  down)
    docker compose -f "$COMPOSE_FILE" stop nginx || true
    docker compose -f "$COMPOSE_FILE" rm -f nginx || true
    ;;
  restart)
    $0 down
    $0 up
    ;;
  logs)
    docker compose -f "$COMPOSE_FILE" logs -f nginx
    ;;
  status)
    docker compose -f "$COMPOSE_FILE" ps nginx
    ;;
  exec)
    docker compose -f "$COMPOSE_FILE" exec nginx sh
    ;;
  *)
    usage
    exit 1
    ;;
esac
