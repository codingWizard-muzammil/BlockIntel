const CorCrud = require("../utils/CorCrud");

const projectModel = new CorCrud("projects");
const contractModel = new CorCrud("contracts");

const createProject = async ({ name, ownerAddress }) => {
  const project = await projectModel.create({
    name,
    ownerAddress,
  });

  return { status: 201, json: { project } };
};

const listProjects = async ({ ownerAddress }) => {
  const projects = await projectModel.findMany({
    where: { ownerAddress },
    orderBy: { createdAt: "desc" },
  });

  projects.map((project) => {
    project.contracts = project.contracts ?? [];
  });

  return { status: 200, json: { projects } };
};

const deleteProject = async ({ id, ownerAddress }) => {
  const { count } = await projectModel.removeMany({ id, ownerAddress });

  if (count === 0) {
    return { status: 404, json: { message: "Project not found" } };
  }

  return { status: 200, json: { message: "Project deleted" } };
};

module.exports = { createProject, listProjects, deleteProject };
