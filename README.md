# Linux Connect Setup Guide

## Indice
1. Generar una llave GPG
2. Generar una llave SSH
3. Configurar Git
4. Configuración en github
5. Directorio de trabajo
6. Clonar repositorio
7. Mini Tutorial
8. Agregar un Nuevo Usuario
9. Interfaz Web
10. Solución de Problemas
11. Extras



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

Crear el directorio donde funcionará el sistema:

        sudo mkdir /etc/linux
        sudo chown -R "$USER":"$USER" /etc/linux
        cd /etc/linux

## 6 - Clonar repositorio

        git clone git@github.com:matiassy/linuxconnect.git linuxconnect && cd linuxconnect

### Instalar linux-connect:

        make install

## 7 - Mini Tutorial

### Comandos principales para operar el sistema

        connect CLIENTE equipo         # Conexión SSH
        tunnel CLIENTE equipo puerto  # Crear túnel SSH
        update                   # Actualizar datos de clientes
        editclients              # Editar clientes.xml para agregar equipos
        editpass                 # Editar claves por servidor
        push                     # Subir cambios a GitHub

### Modos de conexión (`connect`)

El modo de conexión se detecta automáticamente según lo que haya cargado en `editpass` para ese equipo. El CSV tiene el formato `DOMINIO,EQUIPO,USUARIO,PASSWORD`.

| # | Entradas en el CSV | Comportamiento |
|---|---|---|
| 1 | `usuario,pass` **+** `root,pass` | SSH como `usuario` con password → `su - root` con password |
| 2 | solo `usuario,pass` | SSH como `usuario` con password, queda como `usuario` |
| 3 | solo `root,pass` | SSH directo como `root` con password |
| 4 | `usuario,` (vacío) **+** `root,pass` | Llave SSH como `usuario` → `su - root` con password |
| 5 | solo `usuario,` (vacío) | Llave SSH como `usuario`, queda como `usuario` |
| 6 | solo `root,` (vacío) | Llave SSH directo como `root` |

> El usuario de salto puede ser cualquier nombre (`tux`, `admin`, `matias`, etc.) — se toma directamente del CSV. No hay usuario hardcodeado.

**Ejemplos en `editpass`:**

```
# Flujo normal: tux con password, luego su a root
ACME,srv-prod01,tux,<password_de_tux>
ACME,srv-prod01,root,<password_de_root>

# Root directo con password (sin usuario intermedio)
ACME,srv-prod01,root,<password_de_root>

# Llave SSH como tux, luego su a root con password
ACME,srv-prod01,tux,
ACME,srv-prod01,root,<password_de_root>

# Llave SSH directo como root (sin password)
ACME,srv-prod01,root,

# Llave SSH como tux, sin escalar a root
ACME,srv-prod01,tux,
```

> La llave SSH tiene que estar cargada en el agente del contenedor (`~/.ssh/`) y autorizada en el equipo destino.

### Actualizando info de CLIENTES

Editar servidor/contraseña con los comandos:

        update
        editpass
        editclients

Al finalizar los cambios, subirlos a GitHub:

        push

Se abrirá el navegador con el Pull Request en GitHub y aparecerá un cuadro de diálogo esperando confirmación.
Realizá el merge en el navegador y luego presioná **OK** en el cuadro. El sistema bajará automáticamente los cambios aceptados al repositorio local.

## 8 - Agregar un Nuevo Usuario

El círculo de confianza GPG se gestiona desde un único archivo CSV:

        backend/etc/linux/gpg-circle.csv

Formato del archivo:

        # nombre,email,fingerprint
        usuario,usuario@mail.com,<FINGERPRINT_COMPLETO>

### Pasos para agregar un nuevo usuario

**1. El nuevo usuario publica su llave GPG en el keyserver:**

        gpg --keyserver hkp://keyserver.ubuntu.com --send-keys <ID_DE_LA_LLAVE>

**2. El administrador agrega una línea en `gpg-circle.csv`:**

        usuario,usuario@mail.com,<FINGERPRINT_COMPLETO>

**3. El administrador corre `make install-gpg` para:**
- Importar la llave del nuevo usuario desde el keyserver
- Marcarla como confiable dentro del contenedor
- Re-encriptar `passwords.csv.asc` para todos los del círculo

        make install-gpg

**4. El administrador sube los cambios a GitHub:**

        push

**5. El nuevo usuario clona el repo y corre la instalación normalmente** (`make install`).
Podrá descifrar `passwords.csv.asc` con su propia llave privada.

> Un usuario externo que baje el repositorio **no podrá descifrar** el archivo
> ya que su llave no figura como destinataria.

## 9 - Interfaz Web

LinuxConnect incluye una interfaz web para gestionar clientes y contraseñas sin necesidad de usar la terminal.

<img width="1415" height="905" alt="image" src="https://github.com/user-attachments/assets/b44b0d68-2a54-4858-8b8c-ac5a953b27c4" />


### Descripción

Es una aplicación React (compilada con Vite) servida por un backend Express en Node.js. La autenticación se basa en GPG: el usuario ingresa su passphrase GPG, el servidor intenta descifrar `passwords.csv.asc`, y si tiene éxito emite un JWT válido por **8 horas**.

### Acceso

Una vez levantado el stack con `make up`, la interfaz está disponible en:

        http://localhost:3000

> Solo accesible desde el host local (bind a `127.0.0.1`).

### Autenticación

El login requiere la **passphrase de la llave GPG** del usuario. No hay usuario/contraseña separados: si la llave GPG puede descifrar el archivo, la sesión se autoriza.

### Funcionalidades

| Sección | Descripción |
|---|---|
| **Clientes** | Visualizar y editar `clientes.xml` (dominios y equipos) |
| **Contraseñas** | Visualizar y editar `passwords.csv.asc` (descifrado en tiempo real) |

Los cambios en contraseñas se re-encriptan automáticamente para todos los destinatarios del círculo GPG antes de guardarse.

### Variables de entorno

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `PASSWORDS_FILE` | `/etc/linux/passwords.csv.asc` | Archivo de contraseñas encriptado |
| `CLIENTS_FILE` | `/etc/linux/clientes.xml` | Archivo de clientes XML |
| `GPG_CIRCLE_FILE` | `/etc/linux/gpg-circle.csv` | Círculo de confianza GPG |
| `JWT_SECRET` | (aleatorio al iniciar) | Secreto para firmar tokens JWT |

### Estructura

```
frontend/web/
├── server/          # Backend Express (Node.js)
│   ├── index.js     # Entry point, rutas y middleware de auth
│   ├── auth.js      # Login GPG + emisión de JWT
│   ├── clients.js   # CRUD de clientes.xml
│   └── passwords.js # CRUD de passwords.csv.asc (decrypt/encrypt GPG)
└── src/             # Frontend React
    ├── App.jsx
    └── components/
        ├── Login.jsx
        ├── Clients.jsx
        ├── Passwords.jsx
        ├── Sidebar.jsx
        └── Navbar.jsx
```

### API REST

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/auth` | Login (passphrase → JWT) |
| `GET` | `/api/clients` | Obtener clientes (JSON) |
| `PUT` | `/api/clients` | Guardar clientes |
| `GET` | `/api/passwords` | Obtener contraseñas (descifradas) |
| `PUT` | `/api/passwords` | Guardar contraseñas (re-encriptadas) |

Todas las rutas salvo `/api/auth` requieren el header `Authorization: Bearer <token>`.

---

## 10 - Solución de Problemas

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

## 11 - Extras

### Herramientas útiles

        sshto: https://github.com/vaniacer/sshto

### Desarrollo

Para los cambios que se generen a nivel de imagen, se debe hacer un push a GitHub y subirlo a ghcr.io.

        make build  # Construir imagen
        make push   # Subir imagen


### Créditos
- [MaximilianoBz](https://github.com/MaximilianoBz)
- [avillalba96](https://github.com/avillalba96)
- [matiassy](https://github.com/matiassy)
- [Pablo Ramos](https://github.com/matiassy)
- [fgrismado](https://github.com/fgrismado)
- [nicocesar](https://github.com/nicocesar)
- [mmilne2ar](https://github.com/mmilne2ar)
