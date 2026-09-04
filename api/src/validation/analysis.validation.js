const joi = require("joi");

const applyImprovement = joi.object({
  title: joi.string().trim().min(1).required(),
  severity: joi.string().trim().valid("high", "medium", "low").required(),
  reason: joi.string().trim().min(1).required(),
  how: joi.string().trim().min(1).required(),
});

module.exports = { applyImprovement };
