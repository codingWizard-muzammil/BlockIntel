const joi = require("joi");
const { CHAIN_LANGUAGES } = require("../constants/chains");

const LANGUAGES = Array.from(new Set(Object.values(CHAIN_LANGUAGES).flat()));

const create = joi.object({
  projectId: joi.string().uuid().required(),
  name: joi.string().trim().min(1).max(150).required(),
  language: joi.string().trim().valid(...LANGUAGES).required(),
  source: joi.string().allow("").optional(),
});

const remove = joi.object({
  id: joi.string().uuid().required(),
});

module.exports = { create, remove };
