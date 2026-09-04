const { analysis } = require("../services");

const analyze = async (req, res) => {
  const { id } = req.params;
  const { address } = req.user;
  const { force } = req.body ?? {};

  const { json, status } = await analysis.analyzeContract({ id, ownerAddress: address, force: Boolean(force) });

  res.status(status).json(json);
};

const applyImprovement = async (req, res) => {
  const { id } = req.params;
  const { address } = req.user;
  const { title, severity, reason, how } = req.body;

  const { json, status } = await analysis.applyImprovement({
    id,
    ownerAddress: address,
    improvement: { title, severity, reason, how },
  });

  res.status(status).json(json);
};

module.exports = { analyze, applyImprovement };
