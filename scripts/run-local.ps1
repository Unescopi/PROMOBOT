# Script para executar os serviços do PromoBot localmente
# Execute este script no PowerShell para iniciar cada serviço

param (
    [string]$service = "all",
    [switch]$down = $false
)

# Definir cores para melhor legibilidade
$colorGreen = 'Green'
$colorYellow = 'Yellow'
$colorRed = 'Red'

Write-Host "===== PromoBot - Executando serviços localmente =====" -ForegroundColor $colorGreen

function Stop-Services {
    Write-Host "`nParando serviços..." -ForegroundColor $colorYellow
    
    # Parar o serviço backend
    if (Test-Path "backend/docker-compose.yml") {
        Write-Host "Parando o serviço backend..." -ForegroundColor $colorYellow
        Set-Location backend
        docker-compose down
        Set-Location ..
    }
    
    # Parar o serviço frontend
    if (Test-Path "frontend/docker-compose.yml") {
        Write-Host "Parando o serviço frontend..." -ForegroundColor $colorYellow
        Set-Location frontend
        docker-compose down
        Set-Location ..
    }
    
    Write-Host "`nTodos os serviços foram parados!" -ForegroundColor $colorGreen
}

# Se a flag -down for especificada, apenas pare os serviços
if ($down) {
    Stop-Services
    exit 0
}

# Verificar qual serviço iniciar
switch ($service) {
    "backend" {
        Write-Host "Iniciando apenas o backend..." -ForegroundColor $colorYellow
        
        # Verificar se o diretório backend existe
        if (-not (Test-Path "backend")) {
            Write-Host "Erro: Diretório 'backend' não encontrado!" -ForegroundColor $colorRed
            exit 1
        }
        
        # Iniciar backend
        Set-Location backend
        docker-compose up -d
        Set-Location ..
        
        Write-Host "`nServiço backend iniciado com sucesso!" -ForegroundColor $colorGreen
        Write-Host "API disponível em: http://localhost:3001" -ForegroundColor $colorGreen
    }
    "frontend" {
        Write-Host "Iniciando apenas o frontend..." -ForegroundColor $colorYellow
        
        # Verificar se o diretório frontend existe
        if (-not (Test-Path "frontend")) {
            Write-Host "Erro: Diretório 'frontend' não encontrado!" -ForegroundColor $colorRed
            exit 1
        }
        
        # Iniciar frontend
        Set-Location frontend
        docker-compose up -d
        Set-Location ..
        
        Write-Host "`nServiço frontend iniciado com sucesso!" -ForegroundColor $colorGreen
        Write-Host "Interface disponível em: http://localhost:80" -ForegroundColor $colorGreen
    }
    "all" {
        Write-Host "Iniciando todos os serviços..." -ForegroundColor $colorYellow
        
        # Iniciar backend
        if (Test-Path "backend") {
            Write-Host "Iniciando backend..." -ForegroundColor $colorYellow
            Set-Location backend
            docker-compose up -d
            Set-Location ..
        } else {
            Write-Host "Erro: Diretório 'backend' não encontrado!" -ForegroundColor $colorRed
        }
        
        # Iniciar frontend
        if (Test-Path "frontend") {
            Write-Host "Iniciando frontend..." -ForegroundColor $colorYellow
            Set-Location frontend
            docker-compose up -d
            Set-Location ..
        } else {
            Write-Host "Erro: Diretório 'frontend' não encontrado!" -ForegroundColor $colorRed
        }
        
        Write-Host "`nTodos os serviços foram iniciados!" -ForegroundColor $colorGreen
        Write-Host "API disponível em: http://localhost:3001" -ForegroundColor $colorGreen
        Write-Host "Interface disponível em: http://localhost:80" -ForegroundColor $colorGreen
    }
    default {
        Write-Host "Erro: Serviço não reconhecido!" -ForegroundColor $colorRed
        Write-Host "Uso: ./run-local.ps1 [backend|frontend|all|stop]" -ForegroundColor $colorYellow
        exit 1
    }
}

Write-Host "`nPara parar os serviços, execute: ./run-local.ps1 -down" -ForegroundColor $colorYellow 