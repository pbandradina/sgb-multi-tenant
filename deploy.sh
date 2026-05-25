#!/bin/bash

# Abortar se houver erro
set -e

echo "🚀 Iniciando processo de deploy..."

# 1. Validar TypeScript (Se falhar, o script para aqui)
echo "🔍 Checando erros de TypeScript..."
npm run check || { echo "❌ Erro no Type Check. Corrija antes de subir."; exit 1; }

# 2. Git
echo "📤 Preparando envio para o GitHub..."
git add .

# Solicitar mensagem de commit
read -p "O que você mudou? " msg
if [ -z "$msg" ]; then
    msg="Ajustes de sintaxe e configuracao de deploy"
fi

git commit -m "$msg"

# Pegar branch atual
BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "🌍 Enviando para a branch $BRANCH..."
git push origin "$BRANCH"

echo "✅ Sucesso! O GitHub Actions agora vai validar seu build."