// Keep in sync with CHAIN_LANGUAGES in app/src/store/editor-store.ts.
const CHAIN_LANGUAGES = {
  ethereum: ["solidity", "vyper"],
  polygon: ["solidity"],
  "bnb chain": ["solidity"],
  arbitrum: ["solidity"],
  optimism: ["solidity"],
  avalanche: ["solidity"],
  solana: ["rust"],
};

const LANGUAGE_EXTENSIONS = {
  solidity: "sol",
  rust: "rs",
  vyper: "vyper",
};

const CHAINS = Object.keys(CHAIN_LANGUAGES);

module.exports = { CHAIN_LANGUAGES, CHAINS, LANGUAGE_EXTENSIONS };
