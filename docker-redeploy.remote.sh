# -d run in dettached mode
# -V force install dependencies (si hubo cambios en el package.json)
# --build rebuilds the image

NODE_ENV=development

if command -v docker compose; then
	docker compose -f docker-compose.remote.yml --env-file .env.$NODE_ENV down
  docker compose -f docker-compose.remote.yml --env-file .env.$NODE_ENV up -d -V --build
elif command -v docker-compose; then
  docker-compose -f docker-compose.remote.yml --env-file .env.$env down
  docker-compose -f docker-compose.remote.yml --env-file .env.$env up -d -V --build
else
  echo "Debe instalar docker-compose-plugin"
fi