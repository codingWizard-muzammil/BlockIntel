const path = require("node:path");
const CorCrud = require("../utils/CorCrud");
const fs = require("node:fs/promises");
const { CHAIN_LANGUAGES, LANGUAGE_EXTENSIONS } = require("../constants/chains");
const { serializeContract } = require("../utils/serializeContract");
const { contractPath, projectDir } = require("../utils/contractFs");

const projectModel = new CorCrud("projects");
const contractModel = new CorCrud("contracts");

// A chain's toolchain can support more than one language (e.g. Ethereum:
// Solidity + Vyper) — the first entry in CHAIN_LANGUAGES is the default used
// to seed a new project's first contract.
function defaultLanguageForChain(chain) {
  return CHAIN_LANGUAGES[chain.toLowerCase()][0];
}

function serializeProject(project) {
  return { ...project, contracts: project.contracts.map(serializeContract) };
}

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
  const contractId = crypto.randomUUID();
  const language = defaultLanguageForChain(chain);
  const extension = LANGUAGE_EXTENSIONS[language.toLowerCase()];
  const filePath = contractPath(ownerAddress, project.id, contractId, language);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, "", "utf8");

  await contractModel.create({
    id: contractId,
    name: `untitled.${extension}`,
    projectId: project.id,
    ownerAddress,
    language,
    source: filePath,
  });

  // Re-fetch with its seed contract included — the frontend renders the
  // create response directly (see ProjectStateGate/ContractShell), so it
  // needs the same shape as getProject/listProjects, not the bare `project`
  // captured before the contract existed.
  const [fullProject] = await projectModel.findMany({
    where: { id: project.id },
    include: { contracts: { include: { analyze: true } } },
  });

  return { status: 201, json: { project: serializeProject(fullProject) } };
};

const listProjects = async ({ ownerAddress }) => {
  const projects = await projectModel.findMany({
    where: { ownerAddress },
    orderBy: { createdAt: "desc" },
    include: { contracts: { include: { analyze: true } } },
  });

  return { status: 200, json: { projects: projects.map(serializeProject) } };
};

const getProject = async ({ id, ownerAddress }) => {
  const [project] = await projectModel.findMany({
    where: { id },
    include: { contracts: { include: { analyze: true } } },
  });

  if (!project || project.ownerAddress !== ownerAddress) {
    return { status: 404, json: { message: "Project not found" } };
  }

  return { status: 200, json: { project: serializeProject(project) } };
};

const deleteProject = async ({ id, ownerAddress }) => {
  const { count } = await projectModel.removeMany({ id, ownerAddress });

  if (count === 0) {
    return { status: 404, json: { message: "Project not found" } };
  }

  await fs.rm(projectDir(ownerAddress, id), { force: true, recursive: true });

  return { status: 200, json: { message: "Project deleted" } };
};

module.exports = { createProject, listProjects, getProject, deleteProject };
