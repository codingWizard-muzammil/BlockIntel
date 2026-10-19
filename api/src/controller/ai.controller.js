const { ai } = require("../services");

const write = async (req, res) => {
  const { language, instruction, source, selection } = req.body;

  const { json, status } = await ai.writeCode({ language, instruction, source, selection });

  res.status(status).json(json);
};

module.exports = { write };
