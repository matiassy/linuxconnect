#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "${SCRIPT_DIR}/.." && pwd)

if ! command -v sudo >/dev/null 2>&1; then
    echo "ERROR: 'sudo' no está disponible; no puedo instalar en /usr/local/bin."
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
fi

# Asegura el grupo docker y agrega el usuario actual.
sudo groupadd docker 2>/dev/null || true
if ! id -nG "$USER" 2>/dev/null | tr ' ' '\n' | grep -qx docker; then
    sudo usermod -aG docker "$USER" || true
    echo "INFO: Se agregó el usuario al grupo docker."
    echo "INFO: Es necesario cerrar sesión o reiniciar para que tenga efecto."
fi

# Asegura el servicio de Docker activo (útil si Docker ya estaba instalado pero detenido).
if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl enable --now docker.service >/dev/null 2>&1 || true
    sudo systemctl enable --now docker.socket  >/dev/null 2>&1 || true
    sudo systemctl enable --now containerd.service >/dev/null 2>&1 || true
fi

# Asegura Docker Compose.
# Preferimos `docker compose` (plugin v2). Si no está disponible, instalamos `docker-compose` standalone.
if docker compose version >/dev/null 2>&1; then
    :
elif ! command -v docker-compose >/dev/null 2>&1; then
    tmp_compose=$(mktemp)
    curl -fsSL \
      "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
      -o "$tmp_compose"
    sudo install -m 755 "$tmp_compose" /usr/local/bin/docker-compose
    rm -f "$tmp_compose"
fi

# Instalacion basica en la notebook personal
sudo install -m 755 "${REPO_ROOT}/frontend/console/editclients.sh"      /usr/local/bin/editclients
sudo install -m 755 "${REPO_ROOT}/frontend/console/editpass.sh"         /usr/local/bin/editpass
sudo install -m 755 "${REPO_ROOT}/frontend/console/connect.sh"          /usr/local/bin/connect
sudo install -m 755 "${REPO_ROOT}/frontend/console/tunnel.sh"           /usr/local/bin/tunnel
sudo install -m 755 "${REPO_ROOT}/frontend/console/push.sh"             /usr/local/bin/push
sudo install -m 755 "${REPO_ROOT}/frontend/console/update.sh"           /usr/local/bin/update

echo "✔ Instalación Linux Connect finalizada"
