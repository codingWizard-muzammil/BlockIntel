const { project } = require("../services");

const create = async (req, res) => {
  const { name } = req.body;
  const { address } = req.user;

  const { json, status } = await project.createProject({ name, ownerAddress: address });

  res.status(status).json(json);
};

const list = async (req, res) => {
  const { address } = req.user;

  const { json, status } = await project.listProjects({ ownerAddress: address });

  res.status(status).json(json);
};

const getOne = async (req, res) => {
  const { id } = req.params;
  const { address } = req.user;

  const { json, status } = await project.getProject({ id, ownerAddress: address });

  res.status(status).json(json);
};

const remove = async (req, res) => {
  const { id } = req.params;
  const { address } = req.user;

  const { json, status } = await project.deleteProject({ id, ownerAddress: address });

  res.status(status).json(json);
};

module.exports = { create, list, getOne, remove };
