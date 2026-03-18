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
    && apt-get install -y php8.5 \
    php8.5-xml \
    && update-alternatives --set php /usr/bin/php8.5 \
    && update-alternatives --set phar /usr/bin/phar8.5 2>/dev/null || true \
    && update-alternatives --set phar.phar /usr/bin/phar.phar8.5 2>/dev/null || true \
    && update-alternatives --set phpize /usr/bin/phpize8.5 2>/dev/null || true \
    && update-alternatives --set php-config /usr/bin/php-config8.5 2>/dev/null || true \
    && sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen \
    && localedef -i en_US -c -f UTF-8 -A /usr/share/locale/locale.alias en_US.UTF-8 \
    && update-locale LANG=en_US.UTF-8 \
    && dpkg-reconfigure --frontend=noninteractive locales \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get autoremove -y && apt-get autoclean -y

ENV TZ=America/Argentina/Buenos_Aires
ENV LANG=en_US.utf8

RUN pear install HTML_Template_IT

RUN mkdir /etc/linux && \
    chmod -R 777 /etc/linux && \
    mkdir -p /opt/linux/log/ && \
    chmod -R 777 /opt/linux

EXPOSE 14350-14355/tcp
