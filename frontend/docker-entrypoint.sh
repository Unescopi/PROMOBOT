#!/bin/bash
set -e

# Substituir variáveis de ambiente no arquivo de configuração nginx
envsubst < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Executar o comando fornecido
exec "$@"
