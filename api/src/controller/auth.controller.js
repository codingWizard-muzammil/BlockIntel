const { auth } = require("../services");
const nonce = async (req, res) => {
  const { chain, address } = req.query;

  const { json, status } = await auth.createNonce({ chain, address });

  res.status(status).json(json);
};

const verifyNonce = async (req, res) => {
  const { nonce, signature } = req.body;

  const { json, status } = await auth.verifyNonce({ nonce, signature });

  res.status(status).json(json);
};

module.exports = { nonce, verifyNonce };
