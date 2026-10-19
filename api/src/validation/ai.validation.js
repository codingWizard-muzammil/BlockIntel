const joi = require("joi");
const { CHAIN_LANGUAGES } = require("../constants/chains");

const LANGUAGES = Array.from(new Set(Object.values(CHAIN_LANGUAGES).flat()));

// `source` is the editor's live buffer (it may not be saved yet), so the
// request carries it directly rather than reading a contract off disk.
const write = joi.object({
  language: joi.string().trim().valid(...LANGUAGES).required(),
  instruction: joi.string().trim().min(1).max(2000).required(),
  source: joi.string().allow("").max(100_000).default(""),
  selection: joi
    .object({
      text: joi.string().min(1).required(),
      startLine: joi.number().integer().min(1).required(),
      endLine: joi.number().integer().min(1).required(),
    })
    .optional(),
});

module.exports = { write };
