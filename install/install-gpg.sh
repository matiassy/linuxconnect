#!/bin/bash

# Instalando en note personal
#sudo rsync -avh --progress ~/.gnupg backend/root/.
sudo cp -r ~/.gnupg backend/root/.
sudo chown -R 165536:165536 backend/root/.gnupg
sudo chown -R 165536:165536 backend/etc/linux/

# Instalando dentro del contenedor
docker cp install/trust-gpg.sh linuxconnect:/tmp/trust-gpg.sh
GPG_PASS=$(dialog --passwordbox "Passphrase GPG (para re-encriptar passwords.csv)" 8 60 3>&1 1>&2 2>&3)
clear
echo "$GPG_PASS" | docker exec -i linuxconnect bash -lc 'export GPG_PASS=$(cat); /tmp/trust-gpg.sh; rm -f /tmp/trust-gpg.sh'
