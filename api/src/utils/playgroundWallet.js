const crypto = require("node:crypto");
const { ethers } = require("ethers");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
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

module.exports = { derivePlaygroundWallet };
