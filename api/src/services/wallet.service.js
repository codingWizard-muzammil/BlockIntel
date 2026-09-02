const { ethers } = require("ethers");
const logger = require("../utils/logger");
const { CHAIN_RPC_URLS } = require("../constants/chains");
const { ensureFunded, mintFunds } = require("../utils/playgroundWallet");
const { get, set, CACHE_CONFIG } = require("../utils/redis");

function unreachableNodeMessage(error, chain, rpcUrl) {
  const unreachable = /ECONNREFUSED|could not detect network|fetch failed|SERVER_ERROR/i.test(
    error.message,
  );
  return unreachable
    ? `Local ${chain} node isn't reachable at ${rpcUrl}. Start it with "docker compose up" from chains/.`
    : (error.shortMessage ?? error.message);
}

// Returns (and auto-funds up to the 100 ETH target) the caller's own
// playground wallet for a given chain — not scoped to any one contract, so
// this is what backs both the global wallet display and the per-contract
// playground card.
const getWallet = async ({ address, chain }) => {
  const rpcUrl = CHAIN_RPC_URLS[chain];
  if (!rpcUrl) {
    return { status: 422, json: { message: `No local node configured for ${chain}` } };
  }

  try {
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
