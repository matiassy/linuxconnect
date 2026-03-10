#!/usr/bin/env bash
set -e

resolve_repo_dir() {
	if [ -n "${LINUXCONNECT_REPO_DIR:-}" ] && [ -d "$LINUXCONNECT_REPO_DIR/.git" ]; then
		echo "$LINUXCONNECT_REPO_DIR"
		return 0
	fi

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

DATE=$(date +%d%m%Y-%H%M)
git checkout -b "$DATE"

DATE=$(date +%d%m%Y-%H%M%S)
git add .gitignore backend/config/* frontend/linux-push.sh frontend/linux-update.sh
git commit -S -m "$DATE" .gitignore backend/config/* frontend/linux-push.sh frontend/linux-update.sh

sleep 1
remote=origin
branch=$(git symbolic-ref --short HEAD)

set -x
git push "${remote}" "${branch}"

parse_github_repo() {
	local url="$1"
	local path=""

	# https://github.com/owner/repo(.git)
	if [[ "$url" == https://github.com/* ]]; then
		path="${url#https://github.com/}"
	elif [[ "$url" == git@github.com:* ]]; then
		# git@github.com:owner/repo(.git)
		path="${url#git@github.com:}"
	elif [[ "$url" == ssh://git@github.com/* ]]; then
		# ssh://git@github.com/owner/repo(.git)
		path="${url#ssh://git@github.com/}"
	fi

	path="${path%.git}"
	path="${path%/}"

	if [[ "$path" == */* ]]; then
		echo "$path"
		return 0
	fi

	return 1
}

remote_url=$(git remote get-url --push "${remote}" 2>/dev/null || git remote get-url "${remote}" 2>/dev/null || true)
repo=$(parse_github_repo "$remote_url" || true)

if [ -n "$repo" ]; then
	pr_url="https://github.com/${repo}/compare/${default_branch}...${branch}?expand=1"
	echo "PR: $pr_url"
	if command -v xdg-open >/dev/null 2>&1; then
		xdg-open "$pr_url" >/dev/null 2>&1 || true
	fi
else
	echo "INFO: No pude inferir el repo GitHub desde el remote '$remote' ($remote_url)."
	echo "Abrí manualmente un PR comparando '${default_branch}...${branch}'."
fi

git checkout "$default_branch"
git for-each-ref refs/heads --format='%(refname:short)' | grep -v -x "$default_branch" | xargs -r git branch -D
