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

const update = joi
  .object({
    name: joi.string().trim().min(1).max(150).optional(),
    language: joi.string().trim().valid(...LANGUAGES).optional(),
    source: joi.string().allow("").optional(),
  })
  .min(1);

const call = joi.object({
  functionName: joi.string().trim().min(1).required(),
  args: joi.array().items(joi.any()).default([]),
  valueWei: joi.string().trim().optional(),
});

module.exports = { create, remove, update, call };
