#!/usr/bin/env bash
set -e

# Interactivo: permite elegir usuario y PAT (default usuario: matiassy)
default_user=${GITHUB_USER:-matiassy}

if command -v dialog >/dev/null 2>&1; then
	USER_GITHUB=$(dialog --stdout --inputbox "Ingrese su nombre de usuario de GitHub" 10 60 "$default_user")
	PAT_GITHUB=$(dialog --stdout --insecure --passwordbox "Ingrese su Personal Access Token (PAT) de GitHub" 10 60 "")
else
	read -r -p "GitHub user [$default_user]: " USER_GITHUB
	USER_GITHUB=${USER_GITHUB:-$default_user}
	read -r -s -p "GitHub PAT: " PAT_GITHUB
	echo
fi

if [[ -z "$USER_GITHUB" || -z "$PAT_GITHUB" ]]; then
	echo "Usuario o PAT de GitHub no proporcionados. Saliendo..."
	exit 1
fi

echo "Haciendo login a GHCR como '$USER_GITHUB'..."
echo "$PAT_GITHUB" | docker login ghcr.io -u "$USER_GITHUB" --password-stdin

echo "Configurando git global si falta..."
if ! git config --global --get user.name >/dev/null 2>&1; then
	git config --global user.name "$USER_GITHUB"
fi

if ! git config --global --get user.email >/dev/null 2>&1; then
	USER_EMAIL_DEFAULT="${USER_GITHUB}@users.noreply.github.com"
	if command -v dialog >/dev/null 2>&1; then
		USER_EMAIL=$(dialog --stdout --inputbox "Ingrese su correo electrónico de GitHub" 10 60 "$USER_EMAIL_DEFAULT")
	else
		read -r -p "GitHub email [$USER_EMAIL_DEFAULT]: " USER_EMAIL
		USER_EMAIL=${USER_EMAIL:-$USER_EMAIL_DEFAULT}
	fi
	git config --global user.email "$USER_EMAIL"
fi

echo "Configuración de GitHub completada."