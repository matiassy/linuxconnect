#!/bin/bash

###############
cd /etc/linux/linuxconnect || exit
###############
git checkout main;
git branch | grep -v "main" | xargs git branch -D;
DATE=$(date +%d%m%Y-%H%M); git checkout -b "$DATE";
###############
DATE=$(date +%d%m%Y-%H%M%S); git add .gitignore backend/etc/linux/*; git commit -S -m "$DATE" .gitignore backend/etc/linux/*
sleep 1
remote=origin
branch=$(git symbolic-ref --short HEAD)

repo=$(git ls-remote --get-url ${remote} | sed 's|.*github\.com[:/]||' | sed 's|\.git$||')

set -x
git push ${remote} "${branch}"
xdg-open "https://github.com/${repo}/compare/${branch}?expand=1"
###############
set +x
dialog --msgbox "En el navegador, si no hay conflictos\nrealizá el merge y luego presioná OK\npara actualizar el repositorio local." 10 55
sudo chown -R "$USER":"$USER" backend/etc/linux
git checkout main
git pull --rebase --prune origin main
sudo chown -R root:root backend/etc/linux
git branch -D "${branch}" 2>/dev/null || true
###############
