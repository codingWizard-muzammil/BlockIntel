const joi = require("joi");
const { CHAINS } = require("../constants/chains");

const create = joi.object({
  name: joi.string().trim().min(1).max(150).required(),
  description: joi.string().trim().max(500).allow("").optional(),
  chain: joi.string().trim().valid(...CHAINS).required(),
  purpose: joi.string().trim().min(1).max(300).required(),
});

const remove = joi.object({
  id: joi.string().uuid().required(),
});

module.exports = { create, remove };
