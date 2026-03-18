#THIS_FILE := $(lastword $(MAKEFILE_LIST))

.PHONY: help build destroy prune up install-connect install-gpg install uninstall

.EXPORT_ALL_VARIABLES:
DOCKERIMAGE = ghcr.io/matiassy/linuxconnect
DOCKERTAG = 2.0.2

# Prefer docker compose (v2 plugin). Fallback to docker-compose if needed.
COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

help:
	@echo 'Usage: make [TARGET] (DESCRIP)'
	@echo ''
	@echo 'Usage: make build (build image TEST)'
	@echo 'Usage: make destroy (stop & destroy docker TEST)'
	@echo 'Usage: make prune (prune docker)'
	@echo 'Usage: make up (start docker)'
	@echo 'Usage: make install-connect (install service connect)'
	@echo 'Usage: make install-gpg (install service gpg)'
	@echo 'Usage: make install (install all service linux-connect)'
	@echo 'Usage: make upgrade (upgrade service linux-connect)'
	@echo 'Usage: make uninstall (uninstall service linux-connect)'

build:
	docker build --tag=$$DOCKERIMAGE:$$DOCKERTAG . $(c)
	docker tag $$DOCKERIMAGE:$$DOCKERTAG $$DOCKERIMAGE:latest

push:
	docker push $$DOCKERIMAGE:$$DOCKERTAG
	docker push $$DOCKERIMAGE:latest

destroy:
	$(COMPOSE) -f docker-compose.yml down -v $(c); sudo rm -r ./backend/root 2>/dev/null; #sudo rm -r ./backend/opt 2>/dev/null

prune:
	docker container prune && docker volume prune && docker system prune -a && docker image prune && docker network prune

up:
	$(COMPOSE) -f docker-compose.yml --compatibility up -d $(c)

install-dependencias:
	install/install-dependencias.sh

install-github:
	install/install-github.sh

install-connect:
	install/install-connect.sh

install-gpg:
	install/install-gpg.sh

install:
	$(MAKE) install-dependencias
	$(MAKE) install-github
	$(MAKE) install-connect
	$(MAKE) up
	$(MAKE) install-gpg

upgrade:
	$(COMPOSE) -f docker-compose.yml down -v && $(MAKE) install

unistall:
	$(MAKE) uninstall

uninstall:
	$(COMPOSE) -f docker-compose.yml down -v $(c) || true
	@sudo rm -f /usr/local/bin/editclients \
		/usr/local/bin/editpass \
		/usr/local/bin/connect \
		/usr/local/bin/tunnel \
		/usr/local/bin/push \
		/usr/local/bin/update
	@echo 'Linux Connect desinstalado (wrappers removidos y contenedor detenido).'
