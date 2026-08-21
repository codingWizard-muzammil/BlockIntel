const joi = require("joi");

const nonce = joi.object({
  address: joi.string().required(),
  chain: joi.string().valid("ethereum", "solana").required(),
});

const verify = joi.object({
  nonce: joi
    .string()
    .length(36)
    .regex(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
    )
    .required(),
  signature: joi.string().required(),
});

module.exports = { nonce, verify };
