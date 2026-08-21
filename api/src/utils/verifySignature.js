const { verifyMessage } = require("ethers");
const nacl = require("tweetnacl");
const bs58 = require("bs58");

function verifyEvm({ message, signature, address }) {
  try {
    return verifyMessage(message, signature).toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

function verifySolana({ message, signature, address }) {
  try {
    const messageBytes = Buffer.from(message, "utf8");
    const signatureBytes = Buffer.from(signature, "hex");
    const publicKeyBytes = bs58.decode(address);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

const verifiers = {
  ethereum: verifyEvm,
  solana: verifySolana,
};

function verifySignatureForChain(chain, params) {
  const verifier = verifiers[chain];
  return verifier ? verifier(params) : false;
}

module.exports = { verifySignatureForChain };
