#!/usr/bin/env bash
set -euo pipefail

SSH_HOST="${SSH_HOST:-8.137.50.126}"
SSH_PORT="${SSH_PORT:-3004}"
SSH_USER="${SSH_USER:-codexdeploy}"
APP_DIR="${APP_DIR:-/www/wwwroot/it.nacl.fun}"
SERVICE_NAME="${SERVICE_NAME:-it-ticket-system}"

ARCHIVE="/tmp/it-ticket-system-code-update.tar.gz"

COPYFILE_DISABLE=1 tar \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='.venv' \
  --exclude='venv' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='*.tar.gz' \
  --exclude='._*' \
  -czf "$ARCHIVE" .

scp -P "$SSH_PORT" "$ARCHIVE" "$SSH_USER@$SSH_HOST:/tmp/it-ticket-system-code-update.tar.gz"

ssh -p "$SSH_PORT" "$SSH_USER@$SSH_HOST" "sudo bash -s" <<REMOTE
set -euo pipefail
APP_DIR="$APP_DIR"
SERVICE_NAME="$SERVICE_NAME"

TMP_DIR="/tmp/it-ticket-system-code-update"
BACKUP_DIR="/tmp/it-ticket-system-backup-\$(date +%Y%m%d%H%M%S)"

rm -rf "\$TMP_DIR"
mkdir -p "\$TMP_DIR"
tar -xzf /tmp/it-ticket-system-code-update.tar.gz -C "\$TMP_DIR"

mkdir -p "\$BACKUP_DIR"
cp -a "\$APP_DIR/main.py" "\$BACKUP_DIR/" 2>/dev/null || true
cp -a "\$APP_DIR/static" "\$BACKUP_DIR/" 2>/dev/null || true
cp -a "\$APP_DIR/requirements.txt" "\$BACKUP_DIR/" 2>/dev/null || true

tar --exclude='./.env' --exclude='./venv' --exclude='./._*' -C "\$TMP_DIR" -cf - . | tar -C "\$APP_DIR" -xf -

chown -R www:www "\$APP_DIR"
"\$APP_DIR/venv/bin/pip" install -r "\$APP_DIR/requirements.txt" -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com
systemctl restart "\$SERVICE_NAME"
systemctl --no-pager --full status "\$SERVICE_NAME" | sed -n '1,12p'
rm -rf "\$TMP_DIR" /tmp/it-ticket-system-code-update.tar.gz
echo "Backup saved at \$BACKUP_DIR"
REMOTE

rm -f "$ARCHIVE"
