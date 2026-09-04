const path = require("node:path");
const fs = require("node:fs/promises");
const CorCrud = require("../utils/CorCrud");
const logger = require("../utils/logger");
const { serializeContract } = require("../utils/serializeContract");
const { contractPath } = require("../utils/contractFs");

const contractModel = new CorCrud("contracts");
const projectModel = new CorCrud("projects");

const createContract = async ({ projectId, name, language, source, ownerAddress }) => {
  const project = await projectModel.findOne({ id: projectId });

  if (!project || project.ownerAddress !== ownerAddress) {
    return { status: 404, json: { message: "Project not found" } };
  }

  const contractId = crypto.randomUUID();
  const filePath = contractPath(ownerAddress, projectId, contractId, language);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, source ?? "", "utf8");

  const contract = await contractModel.create({
    id: contractId,
    projectId,
    name,
    language,
    ownerAddress,
    source: filePath,
  });

  return { status: 201, json: { contract: serializeContract(contract) } };
};

const updateContract = async ({ id, ownerAddress, name, language, source }) => {
  const contract = await contractModel.findOne({ id });

  if (!contract || contract.ownerAddress !== ownerAddress) {
    return { status: 404, json: { message: "Contract not found" } };
  }

  const data = {};
  if (name !== undefined) data.name = name;

  let sourcePath = contract.source;
  if (language !== undefined && language !== contract.language) {
    const newPath = contractPath(ownerAddress, contract.projectId, id, language);
    await fs.rename(sourcePath, newPath);
    sourcePath = newPath;
    data.language = language;
    data.source = newPath;
  }

  if (Object.keys(data).length > 0) {
    await contractModel.update({ id }, data);
  }

  if (source !== undefined) {
    await fs.writeFile(sourcePath, source, "utf8");
  }

  const updated = await contractModel.findOne({ id }, { include: { analyze: true } });
  return { status: 200, json: { contract: serializeContract(updated) } };
};

const getContractSource = async ({ id, ownerAddress }) => {
  const contract = await contractModel.findOne({ id });

  if (!contract || contract.ownerAddress !== ownerAddress) {
    return { status: 404, json: { message: "Contract not found" } };
  }

  try {
    const source = await fs.readFile(contract.source, "utf8");
    return { status: 200, json: { source } };
  } catch (error) {
    logger.error("Failed to read contract file from disk", {
      error: error.message,
      path: contract.source,
    });
    return { status: 404, json: { message: "Contract file not found" } };
  }
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

module.exports = { createContract, updateContract, getContractSource, deleteContract };
