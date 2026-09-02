const { wallet } = require("../services");

const getWallet = async (req, res) => {
  const { address } = req.user;
  const { chain } = req.query;

  const { json, status } = await wallet.getWallet({ address, chain });

  res.status(status).json(json);
};

const mint = async (req, res) => {
  const { address } = req.user;
  const { chain } = req.body;

  const { json, status } = await wallet.mintWallet({ address, chain });

  res.status(status).json(json);
};

module.exports = { getWallet, mint };
