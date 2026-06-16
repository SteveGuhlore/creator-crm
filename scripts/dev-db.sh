#!/usr/bin/env bash
# Native Postgres + Redis launcher (fallback when no Docker daemon is available).
# Mirrors docker-compose.yml but uses locally-installed postgresql-16 + redis-server.
#
#   scripts/dev-db.sh start   # init (first run) + start Postgres:5433 and Redis:6379
#   scripts/dev-db.sh stop
#   scripts/dev-db.sh status
#
# Postgres runs as the unprivileged 'pg' user (Postgres refuses to run as root).
set -euo pipefail

PG_BIN="/usr/lib/postgresql/16/bin"
PG_DATA="/var/lib/pgtest/data"
PG_PORT="5433"
PG_LOG="/var/lib/pgtest/log"
SOCK_DIR="/tmp"
DB_MAIN="creator_crm"
DB_TEST="creator_crm_test"

ensure_pg_user() {
  id pg >/dev/null 2>&1 || useradd -m pg
  mkdir -p /var/lib/pgtest
  chown -R pg:pg /var/lib/pgtest
}

start() {
  ensure_pg_user
  if [ ! -d "$PG_DATA" ]; then
    su pg -c "$PG_BIN/initdb -D $PG_DATA -U postgres --auth=trust"
  fi
  su pg -c "$PG_BIN/pg_ctl -D $PG_DATA -o '-p $PG_PORT -k $SOCK_DIR' -l $PG_LOG start" || true
  sleep 2
  psql -h 127.0.0.1 -p "$PG_PORT" -U postgres -tc \
    "SELECT 1 FROM pg_database WHERE datname='$DB_MAIN'" | grep -q 1 || \
    psql -h 127.0.0.1 -p "$PG_PORT" -U postgres -c "CREATE DATABASE $DB_MAIN"
  psql -h 127.0.0.1 -p "$PG_PORT" -U postgres -tc \
    "SELECT 1 FROM pg_database WHERE datname='$DB_TEST'" | grep -q 1 || \
    psql -h 127.0.0.1 -p "$PG_PORT" -U postgres -c "CREATE DATABASE $DB_TEST"
  redis-cli ping >/dev/null 2>&1 || redis-server --port 6379 --daemonize yes
  echo "Postgres ready on 127.0.0.1:$PG_PORT (db: $DB_MAIN, $DB_TEST); Redis on :6379"
}

stop() {
  su pg -c "$PG_BIN/pg_ctl -D $PG_DATA stop" || true
  redis-cli shutdown nosave 2>/dev/null || true
}

status() {
  su pg -c "$PG_BIN/pg_ctl -D $PG_DATA status" || true
  redis-cli ping || true
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  *) echo "usage: $0 {start|stop|status}"; exit 1 ;;
esac
