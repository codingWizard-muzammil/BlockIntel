const { contract } = require("../services");

const create = async (req, res) => {
  const { projectId, name, language, source } = req.body;
  const { address } = req.user;

  const { json, status } = await contract.createContract({
    projectId,
    name,
    language,
    source,
    ownerAddress: address,
  });

  res.status(status).json(json);
};

const remove = async (req, res) => {
  const { id } = req.params;
  const { address } = req.user;

  const { json, status } = await contract.deleteContract({ id, ownerAddress: address });

  res.status(status).json(json);
};

module.exports = { create, remove };
