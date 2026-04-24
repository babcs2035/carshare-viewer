#!/bin/sh
set -eu

CRON_SCHEDULE="${CRON_SCHEDULE:-0 3 * * *}"
CRON_FILE="/app/crontabs/nextjs"

echo "🕒 Starting app with embedded cron scheduler..."
echo "${CRON_SCHEDULE} cd /app && pnpm run fetch >> /proc/1/fd/1 2>> /proc/1/fd/2" > "${CRON_FILE}"
chmod 600 "${CRON_FILE}"

crond -l 8 -c /app/crontabs
echo "✅ Cron is running. Launching Next.js server..."

exec node server.js
