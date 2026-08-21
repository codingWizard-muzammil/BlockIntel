const { auth } = require("../services");
const nonce = async (req, res) => {
  const { chain, address } = req.query;

  const { json, status } = await auth.createNonce({ chain, address });

  res.json(json).status(status);
};

const verifyNonce = async (req, res) => {
  const { nonce } = req.query;

  const { json, status } = await auth.verifyNonce({ nonce });

  res.json(json).status(status);
};

module.exports = { nonce, verifyNonce };
