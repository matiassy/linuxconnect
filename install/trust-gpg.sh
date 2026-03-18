#!/bin/bash

set -euo pipefail

# Forzar pinentry-mode loopback; passphrase viene del entorno (GPG_PASS)
export GPG_TTY=$(tty 2>/dev/null || true)
GPG_OPTS="--batch --yes --no-tty --pinentry-mode loopback"

# Círculo de confianza GPG definido en backend/etc/linux/gpg-circle.csv
# Formato: nombre,fingerprint

# Localizar el CSV tanto en ejecución local como dentro del contenedor
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
if [[ -f "${SCRIPT_DIR}/../backend/etc/linux/gpg-circle.csv" ]]; then
    GPG_CIRCLE_CSV="${SCRIPT_DIR}/../backend/etc/linux/gpg-circle.csv"
elif [[ -f "/etc/linux/gpg-circle.csv" ]]; then
    GPG_CIRCLE_CSV="/etc/linux/gpg-circle.csv"
else
    echo "ERROR: No se encontró gpg-circle.csv" >&2
    exit 1
fi

# Leer fingerprints del CSV (ignorar comentarios y líneas vacías, columna 3)
gpg_list=$(grep -v '^\s*#' "$GPG_CIRCLE_CSV" | grep -v '^\s*$' | cut -d',' -f3)

# Agregando llaves y marcándolas como confiables (no-interactivo)
trusted_fprs=()
for keyid in $gpg_list; do
    gpg $GPG_OPTS --keyserver hkp://keyserver.ubuntu.com --recv-keys "$keyid"
    fpr=$(gpg $GPG_OPTS --with-colons --fingerprint "$keyid" | awk -F: '/^fpr:/ {print $10; exit}')
    if [[ -n "${fpr:-}" ]]; then
        trusted_fprs+=("$fpr")
    fi
done

if ((${#trusted_fprs[@]} > 0)); then
    {
        for fpr in "${trusted_fprs[@]}"; do
            printf '%s:6:\n' "$fpr"
        done
    } | gpg $GPG_OPTS --import-ownertrust
fi

# Re-encriptar passwords.csv.asc para todos los del círculo de confianza
PASSWORDS_FILE="/etc/linux/passwords.csv.asc"
if [[ -f "$PASSWORDS_FILE" ]]; then
    recipient_args=()
    for fpr in "${trusted_fprs[@]}"; do
        recipient_args+=("-r" "$fpr")
    done
    tmp=$(mktemp)
    gpg $GPG_OPTS --passphrase "${GPG_PASS:-}" --decrypt "$PASSWORDS_FILE" \
        | gpg $GPG_OPTS --encrypt "${recipient_args[@]}" --armor \
        > "$tmp"
    mv "$tmp" "$PASSWORDS_FILE"
    echo "✔ passwords.csv.asc re-encriptado para ${#trusted_fprs[@]} destinatario(s)."
else
    echo "WARN: No se encontró $PASSWORDS_FILE, saltando re-encriptado."
fi
