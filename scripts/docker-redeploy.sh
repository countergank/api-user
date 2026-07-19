# -d run in dettached mode
# -V force install dependencies (si hubo cambios en el package.json)
# --build rebuilds the image

if [ -z "$1" ]; then
    # If not provided, assign a default value
    NODE_ENV="local"
else
    # If provided, use the provided value
    NODE_ENV="$1"
fi

if command -v docker compose; then
	docker compose --env-file .env.$NODE_ENV down
  docker compose --env-file .env.$NODE_ENV up -d -V --build
elif command -v docker-compose; then
  docker-compose down
  docker-compose up -d -V --build
else
  echo "Debe instalar docker-compose-plugin"
fi