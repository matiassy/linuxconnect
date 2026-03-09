FROM ubuntu:24.04

RUN apt-get update \
    && apt-get install -y openssh-client \
    python3-pexpect \
    expect \
    dialog \
    gnupg-agent \
    pinentry-gtk2 \
    php-pear \
    vim \
    nano \
    less \
    software-properties-common \
    locales \
    tzdata \
    && ln -fs /usr/share/zoneinfo/America/Buenos_Aires /etc/localtime \
    && dpkg-reconfigure -f noninteractive tzdata \
    && add-apt-repository ppa:ondrej/php \
    && apt-get install -y php8.2 \
    php8.2-xml \
    && sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen \
    && localedef -i en_US -c -f UTF-8 -A /usr/share/locale/locale.alias en_US.UTF-8 \
    && update-locale LANG=en_US.UTF-8 \
    && dpkg-reconfigure --frontend=noninteractive locales \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get autoremove -y && apt-get autoclean -y

ENV TZ=America/Argentina/Buenos_Aires
ENV LANG=en_US.utf8

RUN pear install HTML_Template_IT

RUN mkdir -p /data/linuxconnect/config /data/linuxconnect/log && \
    chmod -R 777 /data/linuxconnect

EXPOSE 14350-14355/tcp
