#!/bin/bash

# myaccuzzi -> 386AE307FFD01133851C731FD549A6026A1ED3C5

# Lista de usuarios GPG
gpg_list="
386AE307FFD01133851C731FD549A6026A1ED3C5
"

# Agregando llaves
for x in $gpg_list; do
    gpg --keyserver hkp://keyserver.ubuntu.com --recv-keys $x
done
for fpr in $(gpg --list-keys --with-colons  | awk -F: '/fpr:/ {print $10}' | sort -u); do  echo -e "5\ny\n" |  gpg --command-fd 0 --expert --edit-key $fpr trust; done
