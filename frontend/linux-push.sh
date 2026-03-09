#!/usr/bin/env bash
set -e

REPO_DIR="${LINUXCONNECT_REPO_DIR:-$HOME/linuxconnect}"

cd "$REPO_DIR" || exit

git checkout master
git branch | grep -v "master" | xargs -r git branch -D

DATE=$(date +%d%m%Y-%H%M)
git checkout -b "$DATE"

DATE=$(date +%d%m%Y-%H%M%S)
git add .gitignore backend/config/*
git commit -S -m "$DATE" .gitignore backend/config/*

sleep 1
remote=origin
branch=$(git symbolic-ref --short HEAD)

repo=$(git ls-remote --get-url "${remote}" | sed 's|^.github.com[:/]\(.*\)$|\1|' | sed 's|\(.*\)/$|\1|' | sed 's|\(.*\)\(\.git\)|\1|' | awk -F'[: ]+' '{print $2}')

set -x
git push "${remote}" "${branch}"
xdg-open "https://github.com/${repo}/compare/${branch}?expand=1"

git checkout master
git branch | grep -v "master" | xargs -r git branch -D
