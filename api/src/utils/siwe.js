function buildSignMessage({ address, chain, nonce }) {
  return [
    "BlockIntel wants you to sign in with your wallet.",
    "",
    `Address: ${address}`,
    `Chain: ${chain}`,
    `Nonce: ${nonce}`,
    "",
    "This signature will not trigger a blockchain transaction or cost any gas.",
  ].join("\n");
}

module.exports = { buildSignMessage };
