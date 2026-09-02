const joi = require("joi");
const { CHAIN_RPC_URLS } = require("../constants/chains");

const CHAINS = Object.keys(CHAIN_RPC_URLS);

const getWallet = joi.object({
  chain: joi.string().valid(...CHAINS).required(),
});

const mint = joi.object({
  chain: joi.string().valid(...CHAINS).required(),
});

module.exports = { getWallet, mint };
