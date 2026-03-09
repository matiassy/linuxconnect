#THIS_FILE := $(lastword $(MAKEFILE_LIST))

.PHONY: help build destroy prune up install-lc install-gpg install uninstall

.EXPORT_ALL_VARIABLES:
DOCKERIMAGE = ghcr.io/matiassy/linuxconnect
DOCKERTAG = 2.0.1

# Preferir Docker Compose v2 (plugin). docker-compose (v1) puede fallar con APIs viejas.
COMPOSE ?= docker compose


help:
	@echo 'Usage: make [TARGET] (DESCRIP)'
	@echo ''
	@echo 'Usage: make build (build image TEST)'
	@echo 'Usage: make destroy (stop & destroy docker TEST)'
	@echo 'Usage: make prune (prune docker)'
	@echo 'Usage: make up (start docker)'
	@echo 'Usage: make install-lc (install service lc)'
	@echo 'Usage: make install-gpg (install service gpg)'
	@echo 'Usage: make install (install all service linux-connect)'
	@echo 'Usage: make upgrade (upgrade service linux-connect)'
	@echo 'Usage: make uninstall (unistall service linux-connect)'

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
	frontend/install-dependencias.sh

install-github:
	frontend/install-github.sh

install-lc:
	frontend/install-lc.sh

install-gpg:
	frontend/install-gpg.sh

install:
	make install-dependencias; make install-github; make install-lc; make build; make up; make install-gpg

upgrade:
	$(COMPOSE) -f docker-compose.yml down -v; make install

unistall:
	@echo 'Que onda perri, al futuro sera...'
