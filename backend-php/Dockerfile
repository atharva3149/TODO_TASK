FROM composer:2 AS dependencies

WORKDIR /app
COPY composer.json ./
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader

FROM php:8.2-cli-alpine

WORKDIR /app
RUN apk add --no-cache oniguruma \
    && apk add --no-cache --virtual .build-deps oniguruma-dev \
    && docker-php-ext-install pdo_mysql mbstring \
    && apk del .build-deps

COPY --from=dependencies /app/vendor ./vendor
COPY src ./src
COPY public ./public
COPY composer.json ./composer.json
COPY ca.pem ./public/ca.pem

EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public", "public/index.php"]
