#!/usr/bin/env bash
# Deploy the newest image built from main: back up the database, run migrations,
# start the app and restore the previous image if it does not become healthy.
# Installed as /usr/local/sbin/deploy-open-pantry and run by a five-minute timer.
set -euo pipefail

root=/opt/open-pantry
repository=ghcr.io/niklaslimberg/open-pantry
state_dir=/var/lib/open-pantry-deploy
keep_backups=14

cd "$root"
mkdir -p "$state_dir" backups
exec 9>"$state_dir/deploy.lock"
flock -n 9 || { echo 'Another deployment is running.'; exit 0; }

compose() {
  docker compose --env-file .env --env-file "$1" "${@:2}"
}

current=$(sed -n 's/^OPEN_PANTRY_IMAGE=//p' image.env 2>/dev/null || true)
docker pull --quiet "$repository:main" >/dev/null
latest=$(docker image inspect --format '{{index .RepoDigests 0}}' "$repository:main")

if [[ "$latest" == "$current" ]]; then
  exit 0
fi
if [[ "$latest" == "$(cat "$state_dir/failed" 2>/dev/null)" ]]; then
  echo "Image $latest failed before; merge a fix to main to retry." >&2
  exit 1
fi

echo "Deploying $latest"
if [[ -n "$current" ]]; then
  backup="backups/$(date +%Y%m%d-%H%M%S).dump"
  compose image.env exec -T db pg_dump -U pantry -d open_pantry --format=custom >"$backup"
  echo "Database backed up to $root/$backup"
  ls -1t backups/*.dump | tail -n +$((keep_backups + 1)) | xargs -r rm --
fi

printf 'OPEN_PANTRY_IMAGE=%s\n' "$latest" >image.env.next
# Migrate before `up`: a failed migration then leaves the running app untouched.
if ! compose image.env.next run --rm migrate; then
  echo "Migrations in $latest failed; the running app was not changed." >&2
  printf '%s\n' "$latest" >"$state_dir/failed"
  rm -f image.env.next
  exit 1
fi
if compose image.env.next up -d --wait --wait-timeout 180 db app; then
  mv image.env.next image.env
  docker image prune --force --filter "label=org.opencontainers.image.source" >/dev/null
  echo "Deployed $latest"
  exit 0
fi

echo "Deployment of $latest failed." >&2
compose image.env.next logs --no-color --tail 100 app >&2 || true
printf '%s\n' "$latest" >"$state_dir/failed"
rm -f image.env.next
if [[ -n "$current" ]]; then
  # Migrations are not reversed: restore from the backup above if the old app cannot use the new schema.
  compose image.env up -d --wait --wait-timeout 180 db app
  echo "Restored $current" >&2
fi
exit 1
