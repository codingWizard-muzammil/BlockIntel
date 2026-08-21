function validate(schema, property = "body") {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const messages = error.details.map((d) => d.message);
      return res
        .status(400)
        .json({ error: "Validation failed", details: messages });
    }
    next();
  };
}

module.exports = validate;
