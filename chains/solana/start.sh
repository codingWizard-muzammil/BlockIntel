#!/usr/bin/env bash
# Starts the local Solana devnet validator as a native background process —
# unlike every other chain here, this one isn't Docker. solana-test-validator
# hits two Docker-specific problems that don't exist running natively: it
# panics on startup with a wildcard --bind-address (which Docker's port
# mapping requires), and newer releases hard-require io_uring, which
# Docker's default seccomp profile blocks. Neither applies outside a
# container — it just binds to the default 127.0.0.1.
#
# Requires the Solana CLI (https://docs.anza.xyz/cli/install) on PATH.
set -euo pipefail
cd "$(dirname "$0")"

LEDGER_DIR="./.ledger"
LOG_FILE="./.validator.log"
PID_FILE="./.validator.pid"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Already running (pid $(cat "$PID_FILE")). Logs: $LOG_FILE"
  exit 0
fi

solana-test-validator \
  --reset \
  --ledger "$LEDGER_DIR" \
  --rpc-port 8899 \
  --faucet-port 9900 \
  --gossip-port 8001 \
  --log \
  > "$LOG_FILE" 2>&1 &

echo $! > "$PID_FILE"
echo "Started (pid $!). Logs: $LOG_FILE. Stop with ./stop.sh"
