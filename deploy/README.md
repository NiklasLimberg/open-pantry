# Deployment

Open Pantry runs on the home infrastructure VM (VM 101, `infra@192.168.178.42`) next to
the [home-infrastructure](https://github.com/NiklasLimberg/home-infrastructure) stack.
It is served at <https://pantry.limberg.dev>: on the LAN through Caddy, away from home
through the Cloudflare Tunnel.

## How a change goes live

1. Merge a pull request into `main`. `main` only accepts changes through pull requests
   whose CI `checks` job passed.
2. [CI](../.github/workflows/ci.yml) builds the image and pushes it to
   `ghcr.io/niklaslimberg/open-pantry` as `:main` and `:sha-<commit>`.
3. Within five minutes, `open-pantry-deploy.timer` on the VM notices the new `:main` image and:
   - backs up the database to `/opt/open-pantry/backups/` (the newest 14 are kept);
   - runs the migrations in a one-off `migrate` container; if they fail, the running app is left untouched;
   - starts the new app and waits for `/api/health`; if it does not become healthy, the previous image is restored.

An image that failed is not retried; merge a fix to deploy again. Migrations are never
reversed automatically, so keep them backward-compatible (add first, remove in a later
release) and restore a backup if the old app cannot use a new schema.

Changes to files in `deploy/` itself are not deployed automatically: copy them and rerun
`install.sh` as described below.

## First-time setup

The `home-apps` Docker network and the Caddy routes come from home-infrastructure, so
deploy that change first. Give the VM at least 4 GB of RAM in Proxmox; 2 GB is tight with
Postgres and Node added.

From this repository on your computer:

```sh
ssh infra@192.168.178.42 'sudo mkdir -p /opt/open-pantry && sudo chown infra:infra /opt/open-pantry'
rsync -av deploy/ infra@192.168.178.42:/opt/open-pantry/
```

On the VM:

```sh
cd /opt/open-pantry
cp .env.example .env
nano .env          # generate the secrets as described in the file
sudo bash install.sh
sudo systemctl start open-pantry-deploy
```

Then open <https://pantry.limberg.dev/setup> to create the owner account.

The image is pulled anonymously, so its GHCR package must be public: after the first CI
run, open the package from the repository's **Packages** sidebar → **Package settings** →
**Change visibility** → **Public**.

### Routing

- **LAN:** add an AdGuard DNS rewrite `pantry.limberg.dev` → `192.168.178.42`.
- **Away from home:** in Cloudflare Zero Trust → Networks → Tunnels → the existing tunnel →
  **Public hostnames**, add `pantry.limberg.dev` with service `http://caddy:8080`.

## Operating it

```sh
sudo systemctl list-timers open-pantry-deploy.timer
sudo journalctl -u open-pantry-deploy.service --since today
sudo journalctl CONTAINER_TAG=open-pantry/open-pantry-app-1 --since today
cd /opt/open-pantry && docker compose --env-file .env --env-file image.env ps
```

`image.env` holds the deployed image digest; `/var/lib/open-pantry-deploy/failed` holds the
last image that failed. Restore a backup with:

```sh
cd /opt/open-pantry
docker compose --env-file .env --env-file image.env stop app
docker compose --env-file .env --env-file image.env exec -T db \
  pg_restore -U pantry -d open_pantry --clean --if-exists <backups/FILE.dump
docker compose --env-file .env --env-file image.env start app
```

Back up the VM including `/opt/open-pantry/.env`, `backups/` and the `open-pantry_pgdata`
volume. Never run `docker compose down -v`: it deletes the database.
