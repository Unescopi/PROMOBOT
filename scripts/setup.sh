#!/bin/bash

# Script de inicialização para o ambiente de produção do PromoBot

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Inicializando ambiente de produção do PromoBot ===${NC}"

# Verificar se o Docker está instalado
if ! [ -x "$(command -v docker)" ]; then
  echo -e "${RED}Erro: Docker não está instalado.${NC}" >&2
  echo -e "Por favor, instale o Docker e tente novamente."
  exit 1
fi

# Verificar se o Docker Compose está instalado
if ! [ -x "$(command -v docker-compose)" ]; then
  echo -e "${RED}Erro: Docker Compose não está instalado.${NC}" >&2
  echo -e "Por favor, instale o Docker Compose e tente novamente."
  exit 1
fi

# Verificar se o arquivo .env do backend existe
if [ ! -f "backend/.env" ]; then
  echo -e "${YELLOW}Arquivo backend/.env não encontrado. Criando a partir do modelo...${NC}"
  cp backend/.env.example backend/.env
  echo -e "${YELLOW}Por favor, edite o arquivo backend/.env com suas configurações antes de continuar.${NC}"
  exit 1
fi

# Verificar se o arquivo .env do frontend existe
if [ ! -f "frontend/.env" ]; then
  echo -e "${YELLOW}Arquivo frontend/.env não encontrado. Criando a partir do modelo...${NC}"
  cp frontend/.env.example frontend/.env
  echo -e "${YELLOW}Por favor, edite o arquivo frontend/.env com suas configurações antes de continuar.${NC}"
  exit 1
fi

# Verificar se o docker-entrypoint.sh existe e tem permissão de execução
if [ -f "frontend/docker-entrypoint.sh" ]; then
  echo -e "${GREEN}Verificando permissões do docker-entrypoint.sh...${NC}"
  chmod +x frontend/docker-entrypoint.sh
  echo -e "${GREEN}Permissões atualizadas.${NC}"
else
  echo -e "${RED}Arquivo docker-entrypoint.sh não encontrado!${NC}"
  echo -e "${YELLOW}Criando arquivo docker-entrypoint.sh...${NC}"
  cat > frontend/docker-entrypoint.sh << 'EOF'
#!/bin/bash
set -e

# Substituir variáveis de ambiente no arquivo de configuração nginx
envsubst < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Executar o comando fornecido
exec "$@"
EOF
  chmod +x frontend/docker-entrypoint.sh
  echo -e "${GREEN}Arquivo docker-entrypoint.sh criado com sucesso.${NC}"
fi

# Construir os contêineres do backend
echo -e "${GREEN}Construindo contêineres do backend...${NC}"
cd backend
docker-compose build
cd ..

# Construir os contêineres do frontend
echo -e "${GREEN}Construindo contêineres do frontend...${NC}"
cd frontend
docker-compose build
cd ..

# Iniciar serviços do backend
echo -e "${GREEN}Iniciando serviços do backend...${NC}"
cd backend
docker-compose up -d
cd ..

# Iniciar serviços do frontend
echo -e "${GREEN}Iniciando serviços do frontend...${NC}"
cd frontend
docker-compose up -d
cd ..

# Verificar se os serviços estão funcionando
echo -e "${GREEN}Verificando serviços...${NC}"
sleep 5

BACKEND_UP=$(cd backend && docker-compose ps | grep -q "Up" && echo "true" || echo "false")
FRONTEND_UP=$(cd frontend && docker-compose ps | grep -q "Up" && echo "true" || echo "false")

if [ "$BACKEND_UP" = "true" ] && [ "$FRONTEND_UP" = "true" ]; then
  echo -e "${GREEN}Todos os serviços iniciados com sucesso!${NC}"
  echo -e "${GREEN}API disponível em: http://localhost:3001/api${NC}"
  echo -e "${GREEN}Frontend disponível em: http://localhost:80${NC}"
  echo -e "${GREEN}Para acessar os logs: cd backend && docker-compose logs -f${NC}"
  echo -e "${GREEN}                       cd frontend && docker-compose logs -f${NC}"
else
  echo -e "${RED}Erro ao iniciar serviços.${NC}"
  if [ "$BACKEND_UP" = "false" ]; then
    echo -e "${RED}Backend não está rodando. Verifique os logs: cd backend && docker-compose logs -f${NC}"
  fi
  if [ "$FRONTEND_UP" = "false" ]; then
    echo -e "${RED}Frontend não está rodando. Verifique os logs: cd frontend && docker-compose logs -f${NC}"
  fi
  exit 1
fi

exit 0 