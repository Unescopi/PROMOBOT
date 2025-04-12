#!/bin/bash

# Script para preparar o projeto para deploy no EasyPanel

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Preparando PromoBot para deploy no EasyPanel ===${NC}"

# Verificar arquivos essenciais do backend
BACKEND_FILES=(
  "backend/docker-compose.yml"
  "backend/Dockerfile"
  "backend/src/server.js"
  "backend/.env"
)

echo -e "\n${GREEN}Verificando arquivos do backend:${NC}"
for file in "${BACKEND_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓ $file existe${NC}"
  else
    echo -e "${RED}✗ $file não encontrado${NC}"
    if [[ "$file" == *".env" ]]; then
      if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo -e "${YELLOW}  Arquivo .env criado a partir do exemplo. Por favor, edite-o conforme necessário.${NC}"
      else
        echo -e "${RED}  Não foi possível criar o arquivo .env${NC}"
      fi
    fi
  fi
done

# Verificar arquivos essenciais do frontend
FRONTEND_FILES=(
  "frontend/docker-compose.yml"
  "frontend/Dockerfile"
  "frontend/nginx.conf"
  "frontend/docker-entrypoint.sh"
  "frontend/.env"
)

echo -e "\n${GREEN}Verificando arquivos do frontend:${NC}"
for file in "${FRONTEND_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓ $file existe${NC}"
  else
    echo -e "${RED}✗ $file não encontrado${NC}"
    if [[ "$file" == "frontend/docker-entrypoint.sh" ]]; then
      echo -e "${YELLOW}  Criando arquivo docker-entrypoint.sh...${NC}"
      cat > frontend/docker-entrypoint.sh << 'EOF'
#!/bin/bash
set -e

# Substituir variáveis de ambiente no arquivo de configuração nginx
envsubst < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Executar o comando fornecido
exec "$@"
EOF
      chmod +x frontend/docker-entrypoint.sh
      echo -e "${GREEN}  Arquivo docker-entrypoint.sh criado com sucesso.${NC}"
    elif [[ "$file" == *".env" ]]; then
      if [ -f "frontend/.env.example" ]; then
        cp frontend/.env.example frontend/.env
        echo -e "${YELLOW}  Arquivo .env criado a partir do exemplo. Por favor, edite-o conforme necessário.${NC}"
      else
        echo -e "${RED}  Não foi possível criar o arquivo .env${NC}"
      fi
    fi
  fi
done

# Verificar permissões
if [ -f "frontend/docker-entrypoint.sh" ]; then
  chmod +x frontend/docker-entrypoint.sh
  echo -e "\n${GREEN}Permissões de docker-entrypoint.sh atualizadas.${NC}"
fi

echo -e "\n${GREEN}=== Instruções para deploy no EasyPanel ===${NC}"
echo -e "\n${YELLOW}Backend:${NC}"
echo -e "1. Crie um novo serviço no EasyPanel"
echo -e "2. Escolha a opção GitHub"
echo -e "3. Selecione o diretório '/backend' como contexto"
echo -e "4. Configure as variáveis de ambiente conforme necessário"
echo -e "5. Configure o redirecionamento para /api"

echo -e "\n${YELLOW}Frontend:${NC}"
echo -e "1. Crie outro serviço no EasyPanel"
echo -e "2. Escolha a opção GitHub"
echo -e "3. Selecione o diretório '/frontend' como contexto"
echo -e "4. Configure as variáveis de ambiente: REACT_APP_API_URL=/api"
echo -e "5. Configure o redirecionamento para o caminho raiz /"

echo -e "\n${GREEN}Preparação concluída!${NC}"
echo -e "Consulte os arquivos README.md em cada diretório para instruções detalhadas."

exit 0 