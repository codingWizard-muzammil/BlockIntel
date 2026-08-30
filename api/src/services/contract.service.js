const path = require("node:path");
const fs = require("node:fs/promises");
const CorCrud = require("../utils/CorCrud");
const logger = require("../utils/logger");
const { LANGUAGE_EXTENSIONS } = require("../constants/chains");

const contractModel = new CorCrud("contracts");
const projectModel = new CorCrud("projects");

const createContract = async ({ projectId, name, language, source, ownerAddress }) => {
  const project = await projectModel.findOne({ id: projectId });

  if (!project || project.ownerAddress !== ownerAddress) {
    return { status: 404, json: { message: "Project not found" } };
  }

  const contractId = crypto.randomUUID();
  const extension = LANGUAGE_EXTENSIONS[language.toLowerCase()];

  const pth = path.join(
    __dirname,
    "../../../contracts",
    ownerAddress,
    String(projectId),
    `${contractId}.${extension}`,
  );

  await fs.mkdir(path.dirname(pth), { recursive: true });
  await fs.writeFile(pth, source ?? "", "utf8");

  const contract = await contractModel.create({
    id: contractId,
    projectId,
    name,
    language,
    ownerAddress,
    source: pth,
  });

  return { status: 201, json: { contract } };
};

const deleteContract = async ({ id, ownerAddress }) => {
  const contract = await contractModel.findOne({ id });

  if (!contract || contract.ownerAddress !== ownerAddress) {
    return { status: 404, json: { message: "Contract not found" } };
  }

  await contractModel.remove({ id });

  try {
    await fs.rm(contract.source, { force: true });
  } catch (error) {
    logger.error("Failed to remove contract file from disk", {
      error: error.message,
      path: contract.source,
    });
  }

  return { status: 200, json: { message: "Contract deleted" } };
};

module.exports = { createContract, deleteContract };
