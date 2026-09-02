const { contract, compile } = require("../services");

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
  const { name, language, source } = req.body;
  const { address } = req.user;

  const { json, status } = await contract.updateContract({
    id,
    ownerAddress: address,
    name,
    language,
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

const compileAndDeploy = async (req, res) => {
  const { id } = req.params;
  const { address } = req.user;

  const { json, status } = await compile.compileAndDeploy({ id, ownerAddress: address });

  res.status(status).json(json);
};

const callFunction = async (req, res) => {
  const { id } = req.params;
  const { address } = req.user;
  const { functionName, args, valueWei } = req.body;

  const { json, status } = await compile.callFunction({
    id,
    ownerAddress: address,
    functionName,
    args,
    valueWei,
  });

  res.status(status).json(json);
};

const getWallet = async (req, res) => {
  const { id } = req.params;
  const { address } = req.user;

  const { json, status } = await compile.getWallet({ id, ownerAddress: address });

  res.status(status).json(json);
};

module.exports = { create, update, getSource, remove, compileAndDeploy, callFunction, getWallet };
