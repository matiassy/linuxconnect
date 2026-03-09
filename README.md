# Linux Connect Setup Guide

## Indice
1. Generar una llave GPG
2. Generar una llave SSH
3. Configurar Git
4. Configuración en github
5. Directorio de trabajo
6. Clonar repositorio
7. Agregar un Nuevo Usuario
8. Solución de Problemas
9. Extras



## 1 - Generar una llave GPG

El Docker hace uso de ~/.gnupg/. Primero necesitamos tener instaladas las herramientas gnupg. Luego generamos la llave con el comando:

        gpg --full-generate-key

### Listar las llaves para obtener el ID

        gpg --list-keys

### Exportar la clave pública para publicarla en GitHub o servidores

        gpg --armor --export <ID_DE_LA_LLAVE>

### Publicar la clave pública en el keyserver

        sudo gpg --keyserver hkp://keyserver.ubuntu.com --send-keys <ID_DE_LA_LLAVE>

## 2 - Generar una llave SSH

        ssh-keygen -t rsa -b 4096 -C "tu_email@example.com"

### Agregar la llave al agente SSH

        eval "$(ssh-agent -s)"
        ssh-add ~/.ssh/id_rsa

## 3 - Configurar Git

### Configurar usuario y correo para Git

Esto permitirá la configuración del usuario particular de github. Es necesario poseer una cuenta de github.

        read -p "USUARIO de github: " USR; git config --global user.name $USR
        read -p "EMAIL de github: " EMAIL; git config --global user.email $EMAIL

## 4 - Configuración en github

### Copiar la llave pública para subirla a GitHub

        cat ~/.ssh/id_rsa.pub

### Subir la llave SSH a la cuenta de GitHub

Ir a [Configuración de SSH en GitHub](https://github.com/settings/ssh/new)

Pegar la clave pública generada anteriormente.

### Subir la llave GPG a la cuenta de GitHub

Ir a [Configuración de GPG en GitHub](https://github.com/settings/gpg/new)

Pegar la clave pública generada anteriormente.

## 5 - Directorio de trabajo

Crear el directorio donde funcionará el sistema (dentro de tu HOME):

        mkdir -p "$HOME/linuxconnect"
        cd "$HOME/linuxconnect"

## 6 - Clonar repositorio

        git clone git@github.com:lunixsrl/linuxconnect.git && cd linuxconnect

### Instalar linux-connect:

        make install

## 7 - Mini Tutorial

### Comandos principales para operar el sistema

        lc CLIENTE equipo         # Conexión SSH
        lt CLIENTE equipo puerto  # Crear túnel SSH
        linux-update             # Actualizar datos de clientes
        linux-editconfig        # Editar config.xml para agregar equipos
        linux-editpass           # Editar claves por servidor
        linux-push               # Subir cambios a GitHub

### Actualizando info de CLIENTES

Editar servidor/contraseña con los comandos:

        linux-update
        linux-editpass
        linux-editconfig

Al finalizar los cambios, subirlos a GitHub:

        linux-push

Se abrirá un enlace con el Pull Request en GitHub. Aplicar los cambios con merge. Volver a bajar los cambios aceptados:

        linux-update

## 8 - Agregar un Nuevo Usuario

### Publicar la llave GPG del usuario en el keyserver

Por ejemplo, keys.openpgp.org

### Agregar el usuario en los scripts correspondientes

        backend/usr/local/sbin/linux-editpass
        -r USUARIONUEVO@lunix.com.ar

### Incluir la nueva llave en la lista gpg_list

Dentro de frontend/trust-gpg.sh

## 9 - Solución de Problemas

### Error al firmar los commits con GPG

#### Verificar las llaves GPG disponibles

        gpg --list-secret-keys --keyid-format=long
        gpg --list-keys


#### Configurar la llave GPG para Git

        git config --global user.signingkey <ID_DE_CLAVE_GPG>
        git config --global commit.gpgsign true

#### Verificar e iniciar el agente SSH

Verificar si el agente SSH está corriendo:

        eval "$(ssh-agent -s)"

#### Agregar la llave SSH al agente

        ssh-add ~/.ssh/id_rsa

## Extras

### Herramientas útiles

        sshto: https://github.com/vaniacer/sshto

### Desarrollo

Para los cambios que se generen a nivel de imagen, se debe hacer un push a GitHub y subirlo a ghcr.io.

        make build  # Construir imagen
        make push   # Subir imagen# linuxconnect
