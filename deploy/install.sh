#!/usr/bin/env bash
# Run on the server after copying deploy/ to /opt/open-pantry and filling in .env.
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo 'Run with sudo.' >&2; exit 1; }
source_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

[[ -f /opt/open-pantry/.env ]] || { echo 'Create /opt/open-pantry/.env from .env.example first.' >&2; exit 1; }
chmod 600 /opt/open-pantry/.env
docker network inspect home-apps >/dev/null 2>&1 || {
  echo 'Network home-apps is missing: deploy the home-infrastructure Caddy change first.' >&2
  exit 1
}

install -m 755 "$source_dir/deploy.sh" /usr/local/sbin/deploy-open-pantry
cat >/etc/systemd/system/open-pantry-deploy.service <<'EOF'
[Unit]
Description=Deploy the newest Open Pantry image from main
After=docker.service network-online.target
Wants=network-online.target
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/deploy-open-pantry
TimeoutStartSec=15min
Nice=10
EOF
cat >/etc/systemd/system/open-pantry-deploy.timer <<'EOF'
[Unit]
Description=Check for a new Open Pantry image every five minutes

[Timer]
OnBootSec=3min
OnUnitInactiveSec=5min
Unit=open-pantry-deploy.service

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now open-pantry-deploy.timer
echo 'Deployment timer enabled. Run the first deployment now with: sudo systemctl start open-pantry-deploy'
