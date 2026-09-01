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

const update = async (req, res) => {
  const { id } = req.params;
  const { source } = req.body;
  const { address } = req.user;

  const { json, status } = await contract.updateContract({
    id,
    ownerAddress: address,
    source,
  });

  res.status(status).json(json);
};

const getSource = async (req, res) => {
  const { id } = req.params;
  const { address } = req.user;

  const { json, status } = await contract.getContractSource({ id, ownerAddress: address });

  res.status(status).json(json);
};

const remove = async (req, res) => {
  const { id } = req.params;
  const { address } = req.user;

  const { json, status } = await contract.deleteContract({ id, ownerAddress: address });

  res.status(status).json(json);
};

module.exports = { create, update, getSource, remove };
