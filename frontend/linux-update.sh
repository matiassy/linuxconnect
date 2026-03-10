#!/usr/bin/env bash
set -e

resolve_repo_dir() {
	if [ -n "${LINUXCONNECT_REPO_DIR:-}" ] && [ -d "$LINUXCONNECT_REPO_DIR/.git" ]; then
		echo "$LINUXCONNECT_REPO_DIR"
		return 0
	fi

	# Si se ejecuta desde adentro del repo
	if [ -d "$PWD/.git" ]; then
		echo "$PWD"
		return 0
	fi

	local candidates=(
		"$HOME/Documentos/linuxconnect"
		"$HOME/Documents/linuxconnect"
		"$HOME/linuxconnect"
	)

	local docs
	if command -v xdg-user-dir >/dev/null 2>&1; then
		docs=$(xdg-user-dir DOCUMENTS 2>/dev/null || true)
		if [ -n "$docs" ]; then
			candidates+=("$docs/linuxconnect")
		fi
	fi

	local d
	for d in "${candidates[@]}"; do
		if [ -d "$d/.git" ]; then
			echo "$d"
			return 0
		fi
	done

	return 1
}

REPO_DIR=$(resolve_repo_dir || true)
if [ -z "$REPO_DIR" ]; then
	echo "ERROR: No encuentro el repo 'linuxconnect'."
	echo "Tip: exportá LINUXCONNECT_REPO_DIR=/ruta/a/linuxconnect"
	exit 1
fi

cd "$REPO_DIR"

default_branch=$(git remote show origin 2>/dev/null | awk -F': ' '/HEAD branch/ {print $2}' | tail -n 1)
default_branch=${default_branch:-main}

git checkout "$default_branch"
git for-each-ref refs/heads --format='%(refname:short)' | grep -v -x "$default_branch" | xargs -r git branch -D

git stash || true
git pull --rebase --prune "$@" && git submodule update --init --recursive
git stash clear || true
