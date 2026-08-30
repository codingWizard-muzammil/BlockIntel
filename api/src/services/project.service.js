const path = require("node:path");
const CorCrud = require("../utils/CorCrud");
const fs = require("node:fs/promises");
const { CHAIN_LANGUAGES, LANGUAGE_EXTENSIONS } = require("../constants/chains");

const projectModel = new CorCrud("projects");
const contractModel = new CorCrud("contracts");

const createProject = async ({
  name,
  description,
  chain,
  purpose,
  ownerAddress,
}) => {
  const project = await projectModel.create({
    name,
    description,
    chain,
    purpose,
    ownerAddress,
  });
  const contractId = await crypto.randomUUID();
  const language = CHAIN_LANGUAGES[chain.toLowerCase()];
  const extension =
    LANGUAGE_EXTENSIONS[
      language.length > 1 ? language[0]?.toLowerCase() : language.toLowerCase()
    ];

  const pth = path.join(
    __dirname,
    "../../../contracts",
    ownerAddress,
    String(project.id),
    `${contractId}.${extension}`,
  );

  await fs.mkdir(path.dirname(pth), { recursive: true });
  await fs.writeFile(pth, "", "utf8");

  await contractModel.create({
    id: contractId,
    name: `untitled.${extension}`,
    projectId: project.id,
    ownerAddress,
    language: language.length > 1 ? language[0] : language,
    source: pth,
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
