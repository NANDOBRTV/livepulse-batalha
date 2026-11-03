#!/data/data/com.termux/files/usr/bin/bash
# Requer que o repositório remoto já exista e que o GitHub esteja autenticado no Termux.
set -euo pipefail
REPO="${1:-}"
if [[ ! "$REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
  echo 'Uso: bash PUBLICAR_GITHUB_TERMUX.sh USUARIO/REPOSITORIO'
  echo 'Exemplo: bash PUBLICAR_GITHUB_TERMUX.sh NANDOBRTV/torre-live'
  exit 2
fi
if [[ ! -f batalha.js || ! -f .gitignore ]]; then echo 'Execute na pasta do jogo extraído'; exit 2; fi
if ! command -v git >/dev/null; then echo 'Instale: pkg install git'; exit 2; fi
git init
if ! git config user.name >/dev/null 2>&1; then echo 'Configure o autor: git config --global user.name SEU_NOME'; exit 2; fi
if ! git config user.email >/dev/null 2>&1; then echo 'Configure o email: git config --global user.email SEU_EMAIL'; exit 2; fi
BRANCH="livepulse-v12941-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$BRANCH"
git add -A
git diff --cached --quiet && { echo 'Sem arquivos para enviar'; exit 1; }
git commit -m 'LivePulse V12.9.4.1: jogo e recursos offline'
if git remote get-url origin >/dev/null 2>&1; then git remote set-url origin "https://github.com/$REPO.git"; else git remote add origin "https://github.com/$REPO.git"; fi
# Publica numa branch nova para nao alterar o main de um projeto existente
git push -u origin "HEAD:refs/heads/$BRANCH"
echo "PUBLICADO: https://github.com/$REPO/tree/$BRANCH"
