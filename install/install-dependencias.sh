#!/usr/bin/env bash
set -e

echo "Instalando dependencias necesarias..."

# Detectar distro
if [ -f /etc/os-release ]; then
  . /etc/os-release
else
  echo "No se pudo detectar el sistema operativo"
  exit 1
fi

case "$ID" in
  ubuntu|debian)
    sudo apt-get update
    sudo apt-get install -y \
      make git curl xdg-utils build-essential gnupg dialog
    ;;
  fedora)
    sudo dnf install -y \
      make git curl xdg-utils \
      gcc gcc-c++ kernel-devel \
      gnupg2 dialog
    ;;
  rhel|centos|almalinux|rocky)
    sudo dnf install -y \
      make git curl xdg-utils \
      gcc gcc-c++ kernel-devel \
      gnupg2 dialog
    ;;
  *)
    echo "Distribución no soportada: $ID"
    exit 1
    ;;
esac

echo "Dependencias instaladas correctamente"
