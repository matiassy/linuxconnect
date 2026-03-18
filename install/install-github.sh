#!/bin/bash

# Configurar GitHub y GHCR
USER_GITHUB=$(dialog --inputbox "Ingrese su nombre de usuario de GitHub" 10 60 3>&1 1>&2 2>&3)
PAT_GITHUB=$(dialog --inputbox "Ingrese su Personal Access Token (PAT) de GitHub" 10 60 3>&1 1>&2 2>&3)

if [[ -z "$USER_GITHUB" || -z "$PAT_GITHUB" ]]; then
    echo "Usuario o PAT de GitHub no proporcionados. Saliendo..."
    exit 1
fi

# Hacer login a GHCR
echo "$PAT_GITHUB" | docker login ghcr.io -u "$USER_GITHUB" --password-stdin

if [ $? -eq 0 ]; then
    echo "Login exitoso en GHCR"
else
    echo "Error al hacer login en GHCR"
    exit 1
fi

# Configurar git si es necesario
if ! git config --get user.name >/dev/null; then
    git config --global user.name "$USER_GITHUB"
fi
if ! git config --get user.email >/dev/null; then
    USER_EMAIL=$(dialog --inputbox "Ingrese su correo electrónico de GitHub" 10 60 3>&1 1>&2 2>&3)
    git config --global user.email "$USER_EMAIL"
fi

echo "Configuración de GitHub completada."