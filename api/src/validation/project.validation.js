const joi = require("joi");

const create = joi.object({
  name: joi.string().trim().min(1).max(150).required(),
});

const remove = joi.object({
  id: joi.string().uuid().required(),
});

module.exports = { create, remove };
