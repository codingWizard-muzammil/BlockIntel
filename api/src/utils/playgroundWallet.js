const crypto = require("node:crypto");
const { ethers } = require("ethers");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

// Hardhat's well-known local devnet account #0 — every `hardhat node`
// instance in chains/ funds it automatically. Used only as a faucet to top
// up each user's own playground wallet, never as the account that actually
// deploys or calls a contract. Only ever used against the ephemeral local
// test chains started from chains/, never a real network.
const DEV_DEPLOYER_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const TARGET_BALANCE_WEI = ethers.parseEther("100");
// Only refill once the wallet can no longer reliably pay gas. Topping up
// whenever it dips below TARGET_BALANCE_WEI would silently undo every
// payable deposit before the next call, hiding the contract's real effect.
const MIN_GAS_BALANCE_WEI = ethers.parseEther("0.01");
const MINT_AMOUNT_WEI = ethers.parseEther("100");

// ethers v6 shares identical RPC requests made within 250ms by default. On a
// local node a funding tx mines faster than that, so reading a balance right
// after reading it once before the tx returned the stale pre-tx value (e.g. a
// freshly funded wallet showing 0.0, then 200 after one +100 mint). These
// providers only ever talk to a local devnet, so there's nothing to save by
// caching — always read live.
function createChainProvider(rpcUrl) {
  return new ethers.JsonRpcProvider(rpcUrl, undefined, { cacheTimeout: -1 });
}

// Deterministic per-(user, chain) EOA used for every playground deploy/call,
// so `msg.sender` inside a contract is the connected wallet itself rather
// than one devnet account shared by every user. Nothing needs to be stored —
// the same ownerAddress + chain always re-derives the same key.
function derivePlaygroundWallet(ownerAddress, chain) {
  const privateKey = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`playground:${chain}:${ownerAddress.toLowerCase()}`)
    .digest("hex");
  return new ethers.Wallet(`0x${privateKey}`);
}

// Every user gets their own deterministic wallet per chain so contract
// interactions carry their own identity as `msg.sender` — but a freshly
// derived wallet starts at a zero balance, so top it up from the shared
// devnet faucet to a flat 100 ETH target once it's (nearly) empty.
async function ensureFunded(ownerAddress, chain, provider) {
  const wallet = derivePlaygroundWallet(ownerAddress, chain).connect(provider);
  const balance = await provider.getBalance(wallet.address);
  if (balance < MIN_GAS_BALANCE_WEI) {
    const funder = new ethers.Wallet(DEV_DEPLOYER_KEY, provider);
    const tx = await funder.sendTransaction({
      to: wallet.address,
      value: TARGET_BALANCE_WEI - balance,
    });
    await tx.wait();
  }
  return wallet;
}

// Self-serve top-up: sends another flat MINT_AMOUNT_WEI regardless of the
// current balance, unlike ensureFunded's threshold-based top-up.
async function mintFunds(ownerAddress, chain, provider) {
  const wallet = derivePlaygroundWallet(ownerAddress, chain).connect(provider);
  const funder = new ethers.Wallet(DEV_DEPLOYER_KEY, provider);
  const tx = await funder.sendTransaction({ to: wallet.address, value: MINT_AMOUNT_WEI });
  await tx.wait();
  return wallet;
}

module.exports = { createChainProvider, derivePlaygroundWallet, ensureFunded, mintFunds };
