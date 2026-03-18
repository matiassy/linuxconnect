#!/bin/bash

###############
cd /etc/linux/linuxconnect || exit
git checkout main;
git branch | grep -v "main" | xargs git branch -D
sudo chown -R $USER:$USER backend/etc/linux
###############
sudo git stash
sudo chown -R $USER:$USER .git
git pull --rebase --prune $@ && git submodule update --init --recursive
git stash clear
sudo chown -R root:root backend/etc/linux/
###############
