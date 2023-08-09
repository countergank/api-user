# -d run in dettached mode
# -V force install dependencies (si hubo cambios en el package.json)
# --build rebuilds the image

if command -v docker compose; then
	docker compose down
  docker compose up -d -V --build
elif command -v docker-compose; then
  docker-compose down
  docker-compose up -d -V --build
else
  echo "Debe instalar docker-compose-plugin"
fi