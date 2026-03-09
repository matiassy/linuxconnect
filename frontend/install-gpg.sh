#!/usr/bin/env bash
set -e

GNUPG_DIR_HOST=backend/root/.gnupg
CONTAINER_NAME=${LINUXCONNECT_CONTAINER_NAME:-docker-lc}

# Asegura que el directorio exista para el mount, pero no lo chmod desde el host:
# si el contenedor ya corrió, probablemente sea root:root y el chmod falla.
mkdir -p "$GNUPG_DIR_HOST"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
	echo "ERROR: No encuentro el contenedor '$CONTAINER_NAME' corriendo. Ejecutá primero: make up"
	exit 1
fi

# Endurecer permisos desde adentro del contenedor (root), para evitar warnings de GPG.
docker exec "$CONTAINER_NAME" sh -lc 'mkdir -p /root/.gnupg && chmod 700 /root/.gnupg && chmod -R go-rwx /root/.gnupg || true'

if ! command -v dialog >/dev/null; then
	echo "ERROR: 'dialog' no está instalado"
	exit 1
fi

tmp_keys=$(mktemp)
trap 'rm -f "$tmp_keys"' EXIT

gpg --list-secret-keys --with-colons 2>/dev/null | awk -F: '
	$1=="fpr" {fpr=$10}
	$1=="uid" {
		uid=$10
		# Una sola fila por fingerprint (la primera UID que aparezca)
		if (fpr!="" && !(fpr in seen)) { seen[fpr]=1; print fpr "\t" uid }
	}
' | sort -u > "$tmp_keys"

if [ ! -s "$tmp_keys" ]; then
	echo "No se encontraron llaves secretas en tu GPG local."
	exit 1
fi

default_fpr=""

# Elegí cuál llave querés que aparezca preseleccionada por defecto en el checklist
menu_args=()
while IFS=$'\t' read -r fpr uid; do
	menu_args+=("$fpr" "$uid")
done < "$tmp_keys"

default_fpr=$(dialog --stdout --menu "Elegí la llave GPG (secreta) que querés que quede preseleccionada por defecto" 20 90 12 "${menu_args[@]}")
if [ -z "$default_fpr" ]; then
	# Si cancelan, no preselecciona ninguna
	default_fpr=""
fi

checklist_args=()
while IFS=$'\t' read -r fpr uid; do
	state="off"
	if [ -n "$default_fpr" ] && [ "$fpr" = "$default_fpr" ]; then
		state="on"
	fi
	checklist_args+=("$fpr" "$uid" "$state")
done < "$tmp_keys"

selected=$(dialog --stdout --checklist "Seleccioná las llaves GPG (secretas) a importar al contenedor" 20 90 12 "${checklist_args[@]}")
if [ -z "$selected" ]; then
	echo "No se seleccionaron llaves."
	exit 1
fi

for fpr in $selected; do
	fpr=${fpr%\"}; fpr=${fpr#\"}
	uid=$(awk -F'\t' -v f="$fpr" '$1==f {print $2; exit}' "$tmp_keys" || true)
	if [ -n "$uid" ]; then
		echo "Importando llave secreta: $uid ($fpr) → contenedor $CONTAINER_NAME"
	else
		echo "Importando llave secreta: $fpr → contenedor $CONTAINER_NAME"
	fi

	# Exporta desde el GPG local pero importa DENTRO del contenedor (evita permisos en el host)
	gpg --armor --export-secret-keys "$fpr" | docker exec -i "$CONTAINER_NAME" gpg --batch --yes --no-tty --import
done

docker exec "$CONTAINER_NAME" sh -lc 'chmod -R go-rwx /root/.gnupg || true'

docker cp frontend/trust-gpg.sh "$CONTAINER_NAME":/tmp/trust-gpg.sh

# trust-gpg.sh usa gpg --edit-key (puede requerir TTY); intentar con -it si hay terminal.
if [ -t 0 ] && [ -t 1 ]; then
	docker exec -it "$CONTAINER_NAME" bash -c '/tmp/trust-gpg.sh; rm /tmp/trust-gpg.sh'
else
	echo "Warning: sin TTY; ejecutando trust-gpg.sh sin -it (podría fallar si gpg necesita /dev/tty)."
	docker exec "$CONTAINER_NAME" bash -c '/tmp/trust-gpg.sh; rm /tmp/trust-gpg.sh'
fi
