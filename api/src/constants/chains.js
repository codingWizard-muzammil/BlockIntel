// Keep in sync with CHAIN_LANGUAGES in app/src/store/editor-store.ts.
const CHAIN_LANGUAGES = {
  Ethereum: ["Solidity", "Vyper"],
  Polygon: ["Solidity"],
  "BNB Chain": ["Solidity"],
  Arbitrum: ["Solidity"],
  Optimism: ["Solidity"],
  Avalanche: ["Solidity"],
  Solana: ["Rust"],
};

const CHAINS = Object.keys(CHAIN_LANGUAGES);

module.exports = { CHAIN_LANGUAGES, CHAINS };
