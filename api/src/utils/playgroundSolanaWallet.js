const crypto = require("node:crypto");
const { Keypair, LAMPORTS_PER_SOL } = require("@solana/web3.js");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

const TARGET_BALANCE_LAMPORTS = 100 * LAMPORTS_PER_SOL;
const MINT_AMOUNT_LAMPORTS = 100 * LAMPORTS_PER_SOL;

// Deterministic per-user Solana keypair, same derivation shape as
// playgroundWallet.js's EVM one — nothing needs to be stored, the same
// ownerAddress always re-derives the same keypair. Unlike the EVM chains,
// a local solana-test-validator has a built-in faucet that mints lamports
// out of thin air via requestAirdrop, so there's no separate funder account
// to hold/fund from.
function derivePlaygroundSolanaWallet(ownerAddress) {
  const seed = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`playground:solana:${ownerAddress.toLowerCase()}`)
    .digest();
  return Keypair.fromSeed(seed);
}

const POLL_INTERVAL_MS = 500;
const POLL_ATTEMPTS = 20; // 10s of polling per airdrop
const AIRDROP_ATTEMPTS = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// confirmTransaction's blockhash-based strategy relies on a WebSocket
// signature subscription that isn't reliably notifying on this single local
// node, so it just sits there until its own ~60-90s expiry window lapses —
// and requestAirdrop signs its transaction server-side, so the client never
// even knows the real blockhash to judge that expiry against in the first
// place. None of that machinery is actually needed here: the only thing
// that matters is whether the balance went up, so poll for that directly
// instead of going through transaction confirmation at all.
async function pollForBalanceIncrease(connection, publicKey, minBalance) {
  for (let i = 0; i < POLL_ATTEMPTS; i++) {
    const balance = await connection.getBalance(publicKey);
    if (balance >= minBalance) return balance;
    await sleep(POLL_INTERVAL_MS);
  }
  return connection.getBalance(publicKey);
}

async function ensureFundedSolana(ownerAddress, connection) {
  const keypair = derivePlaygroundSolanaWallet(ownerAddress);
  let balance = await connection.getBalance(keypair.publicKey);
  for (let attempt = 0; balance < TARGET_BALANCE_LAMPORTS && attempt < AIRDROP_ATTEMPTS; attempt++) {
    await connection.requestAirdrop(keypair.publicKey, TARGET_BALANCE_LAMPORTS - balance);
    balance = await pollForBalanceIncrease(connection, keypair.publicKey, TARGET_BALANCE_LAMPORTS);
  }
  return keypair;
}

async function mintFundsSolana(ownerAddress, connection) {
  const keypair = derivePlaygroundSolanaWallet(ownerAddress);
  const before = await connection.getBalance(keypair.publicKey);
  for (let attempt = 0; attempt < AIRDROP_ATTEMPTS; attempt++) {
    await connection.requestAirdrop(keypair.publicKey, MINT_AMOUNT_LAMPORTS);
    if ((await pollForBalanceIncrease(connection, keypair.publicKey, before + 1)) > before) break;
  }
  return keypair;
}

module.exports = { derivePlaygroundSolanaWallet, ensureFundedSolana, mintFundsSolana };
