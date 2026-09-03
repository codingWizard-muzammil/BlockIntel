#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

PID_FILE="./.validator.pid"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  kill "$(cat "$PID_FILE")"
  rm -f "$PID_FILE"
  echo "Stopped."
else
  echo "Not running."
  rm -f "$PID_FILE"
fi
