#!/bin/bash
set -e

if [[ ! -f /usr/local/bin/docker-compose ]]; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh

    sudo groupadd docker 2>/dev/null || true
    sudo usermod -aG docker "$USER" || true

    echo "INFO: Se agregó el usuario al grupo docker."
    echo "INFO: Es necesario cerrar sesión o reiniciar para que tenga efecto."

    sudo curl -L \
      "https://github.com/docker/compose/releases/download/v2.6.0/docker-compose-$(uname -s)-$(uname -m)" \
      -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose

    sudo systemctl enable --now docker.service
    sudo systemctl enable --now docker.socket
    sudo systemctl enable --now containerd.service
fi

# Instalacion basica en la notebook personal
sudo install -m 755 frontend/linux-editconfig.sh /usr/local/bin/linux-editconfig
sudo install -m 755 frontend/linux-editpass.sh   /usr/local/bin/linux-editpass
sudo install -m 755 frontend/linux-lc.sh         /usr/local/bin/lc
sudo install -m 755 frontend/linux-lt.sh         /usr/local/bin/lt
sudo install -m 755 frontend/linux-push.sh       /usr/local/bin/linux-push
sudo install -m 755 frontend/linux-update.sh     /usr/local/bin/linux-update

echo "✔ Instalación Linux Connect finalizada"
