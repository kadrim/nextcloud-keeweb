FROM node:20-bookworm-slim AS node

FROM ghcr.io/nextcloud/nextcloud-dev-php84@sha256:4488f6286b0cb588d4d859db71a105ceb1959256f4bf7e69f6499d12530ffda4

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY .devcontainer/xdebug.ini /usr/local/etc/php/conf.d/zzz-keeweb-dev.ini
RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && npm install --global npm@9.9.4 \
    && apt-get update \
    && apt-get install -y --no-install-recommends make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1000 vscode \
    && useradd --uid 1000 --gid vscode --create-home --shell /bin/bash vscode \
    && echo 'vscode ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/vscode \
    && chmod 0440 /etc/sudoers.d/vscode

ENV PATH="/usr/local/bin:${PATH}"
WORKDIR /var/www/html
