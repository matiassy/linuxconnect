#!/usr/bin/env bash
set -e

REPO_DIR="${LINUXCONNECT_REPO_DIR:-$HOME/linuxconnect}"

cd "$REPO_DIR" || exit
git checkout master
git branch | grep -v "master" | xargs -r git branch -D

git stash || true
git pull --rebase --prune "$@" && git submodule update --init --recursive
git stash clear || true
