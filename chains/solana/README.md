# Solana local devnet

Unlike every other chain in `chains/`, this one doesn't run in Docker.

`solana-test-validator` hits two Docker-specific problems that don't exist
running natively:

- It panics on startup (`UnspecifiedIpAddr`) if `--bind-address` is a
  wildcard (`0.0.0.0`) — but Docker's port mapping requires binding to the
  container's own interface, not loopback, which forces a wildcard-ish setup.
- Releases from mid-2025 onward hard-require `io_uring` when setting up
  accounts-db directories and panic (`assert!(io_uring_supported())`) if it's
  unavailable — which it is under Docker's default seccomp profile.

Neither applies outside a container: it just binds to the default
`127.0.0.1`, and there's no seccomp restriction on `io_uring`.

## Usage

Requires the Solana CLI on `PATH` (https://docs.anza.xyz/cli/install).

```sh
./start.sh   # starts it in the background, logs to ./.validator.log
./stop.sh
```

RPC is on `http://127.0.0.1:8899`, matching `CHAIN_RPC_URLS.solana` in
`api/src/constants/chains.js` — no other config needed.

`--reset` wipes the ledger on every start, so state never persists between
runs (same as the other chains starting fresh each time).
