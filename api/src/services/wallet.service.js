const { ethers } = require("ethers");
const bs58 = require("bs58");
const { Connection, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const logger = require("../utils/logger");
const { CHAIN_RPC_URLS } = require("../constants/chains");
const { ensureFunded, mintFunds } = require("../utils/playgroundWallet");
const {
  ensureFundedSolana,
  mintFundsSolana,
} = require("../utils/playgroundSolanaWallet");
const { get, set, CACHE_CONFIG } = require("../utils/redis");

function isUnreachable(error) {
  return /ECONNREFUSED|could not detect network|fetch failed|SERVER_ERROR|failed to get recent blockhash/i.test(
    error.message,
  );
}

function unreachableNodeMessage(error, chain, rpcUrl) {
  return isUnreachable(error)
    ? `Local ${chain} node isn't reachable at ${rpcUrl}. Start it with "docker compose up" from chains/.`
    : (error.shortMessage ?? error.message);
}

const SOLANA_RETRY_ATTEMPTS = 4;
const SOLANA_RETRY_DELAY_MS = 2000;

// The local solana-test-validator restarts far more often than the EVM
// nodes (a single-node gossip self-check that occasionally times out under
// load — see chains/solana/Dockerfile), so a request landing in one of its
// few-second reboot windows is common, not exceptional. Give it a handful
// of retries before actually reporting "unreachable" instead of failing on
// the first unlucky request.
async function withSolanaRetry(fn) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= SOLANA_RETRY_ATTEMPTS || !isUnreachable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, SOLANA_RETRY_DELAY_MS));
    }
  }
}

// Solana isn't EVM: no ethers provider, lamports instead of wei, and the
// local test validator has its own built-in faucet (no funder account to
// hold/manage). Kept as a separate pair of small functions rather than
// branching deep inside the EVM ones below.
async function getSolanaWallet(address, rpcUrl) {
  const connection = new Connection(rpcUrl, "confirmed");
  const keypair = await ensureFundedSolana(address, connection);
  const balance = await connection.getBalance(keypair.publicKey);
  return {
    address: keypair.publicKey.toBase58(),
    // Safe to hand back for the same reason as the EVM one: derived from
    // JWT_SECRET one-way (HMAC) and only ever holds devnet SOL.
    privateKey: bs58.encode(keypair.secretKey),
    balance: (balance / LAMPORTS_PER_SOL).toString(),
  };
}

async function mintSolanaWallet(address, rpcUrl) {
  const connection = new Connection(rpcUrl, "confirmed");
  const keypair = await mintFundsSolana(address, connection);
  const balance = await connection.getBalance(keypair.publicKey);
  return { address: keypair.publicKey.toBase58(), balance: (balance / LAMPORTS_PER_SOL).toString() };
}

// Returns (and auto-funds up to the 100 ETH/SOL target) the caller's own
// playground wallet for a given chain — not scoped to any one contract, so
// this is what backs both the global wallet display and the per-contract
// playground card.
const getWallet = async ({ address, chain }) => {
  const rpcUrl = CHAIN_RPC_URLS[chain];
  if (!rpcUrl) {
    return { status: 422, json: { message: `No local node configured for ${chain}` } };
  }

  try {
    if (chain === "solana") {
      return { status: 200, json: await withSolanaRetry(() => getSolanaWallet(address, rpcUrl)) };
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = await ensureFunded(address, chain, provider);
    const balance = await provider.getBalance(wallet.address);
    return {
      status: 200,
      json: {
        address: wallet.address,
        // Safe to hand back: it's derived from JWT_SECRET one-way (HMAC) and
        // only ever holds devnet ETH on an ephemeral local node — this is
        // what lets the user import it into MetaMask/Phantom themselves.
        privateKey: wallet.privateKey,
        balance: ethers.formatEther(balance),
      },
    };
  } catch (error) {
    logger.error("Failed to fetch playground wallet", { error: error.message, chain });
    return { status: 422, json: { message: unreachableNodeMessage(error, chain, rpcUrl) } };
  }
};

// Self-serve top-up, gated by a short per-(address, chain) cooldown so a
// user can't spam the local faucet account dry.
const mintWallet = async ({ address, chain }) => {
  const rpcUrl = CHAIN_RPC_URLS[chain];
  if (!rpcUrl) {
    return { status: 422, json: { message: `No local node configured for ${chain}` } };
  }

  const cooldownKey = `${CACHE_CONFIG.keyPrefixes.mint}:${chain}:${address.toLowerCase()}`;
  if (await get(cooldownKey)) {
    return { status: 429, json: { message: "Please wait a few seconds before minting again" } };
  }

  try {
    if (chain === "solana") {
      const json = await withSolanaRetry(() => mintSolanaWallet(address, rpcUrl));
      await set(cooldownKey, true, CACHE_CONFIG.ttlByType.mint);
      return { status: 200, json };
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = await mintFunds(address, chain, provider);
    await set(cooldownKey, true, CACHE_CONFIG.ttlByType.mint);
    const balance = await provider.getBalance(wallet.address);
    return {
      status: 200,
      json: { address: wallet.address, balance: ethers.formatEther(balance) },
    };
  } catch (error) {
    logger.error("Failed to mint playground wallet funds", { error: error.message, chain });
    return { status: 422, json: { message: unreachableNodeMessage(error, chain, rpcUrl) } };
  }
};

module.exports = { getWallet, mintWallet };
