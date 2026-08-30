const CorCrud = require("../utils/CorCrud");

const projectModel = new CorCrud("projects");
const contractModel = new CorCrud("contracts");

const createProject = async ({ name, description, chain, purpose, ownerAddress }) => {
  const project = await projectModel.create({
    name,
    description,
    chain,
    purpose,
    ownerAddress,
  });

  return { status: 201, json: { project } };
};

const listProjects = async ({ ownerAddress }) => {
  const projects = await projectModel.findMany({
    where: { ownerAddress },
    orderBy: { createdAt: "desc" },
    include: { contracts: true },
  });

  return { status: 200, json: { projects } };
};

const getProject = async ({ id, ownerAddress }) => {
  const [project] = await projectModel.findMany({
    where: { id },
    include: { contracts: true },
  });

  if (!project || project.ownerAddress !== ownerAddress) {
    return { status: 404, json: { message: "Project not found" } };
  }

  return { status: 200, json: { project } };
};

const deleteProject = async ({ id, ownerAddress }) => {
  const { count } = await projectModel.removeMany({ id, ownerAddress });

  if (count === 0) {
    return { status: 404, json: { message: "Project not found" } };
  }

  return { status: 200, json: { message: "Project deleted" } };
};

module.exports = { createProject, listProjects, getProject, deleteProject };
