// Keep in sync with CHAIN_LANGUAGES in app/src/store/editor-store.ts.
const CHAIN_LANGUAGES = {
  ethereum: ["solidity", "vyper"],
  polygon: ["solidity"],
  "bnb chain": ["solidity"],
  arbitrum: ["solidity"],
  optimism: ["solidity"],
  avalanche: ["solidity"],
};

const LANGUAGE_EXTENSIONS = {
  solidity: "sol",
  vyper: "vyper",
};

const CHAINS = Object.keys(CHAIN_LANGUAGES);

// Ports match chains/docker-compose.yml. Override per-chain via env (e.g.
// ETHEREUM_RPC_URL) when pointing at something other than the bundled local
// nodes.
const CHAIN_RPC_URLS = {
  ethereum: process.env.ETHEREUM_RPC_URL || "http://127.0.0.1:8545",
  "bnb chain": process.env.BNB_RPC_URL || "http://127.0.0.1:8546",
  avalanche: process.env.AVALANCHE_RPC_URL || "http://127.0.0.1:8547",
  polygon: process.env.POLYGON_RPC_URL || "http://127.0.0.1:8548",
  arbitrum: process.env.ARBITRUM_RPC_URL || "http://127.0.0.1:8549",
  optimism: process.env.OPTIMISM_RPC_URL || "http://127.0.0.1:8550",
};

module.exports = { CHAIN_LANGUAGES, CHAINS, LANGUAGE_EXTENSIONS, CHAIN_RPC_URLS };
