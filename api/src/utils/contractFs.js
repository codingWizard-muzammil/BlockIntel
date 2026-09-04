const path = require("node:path");
const { LANGUAGE_EXTENSIONS } = require("../constants/chains");

// Single source of truth for where a project/contract lives on disk, so the
// "../../../contracts/<owner>/<project>/..." layout only needs to change in
// one place. Contract files are keyed by contractId (not name) since name is
// a mutable display label a user can rename/duplicate at any time.
const CONTRACTS_ROOT = path.join(__dirname, "../../../contracts");

function projectDir(ownerAddress, projectId) {
  return path.join(CONTRACTS_ROOT, ownerAddress, String(projectId));
}

function contractPath(ownerAddress, projectId, contractId, language) {
  const extension = LANGUAGE_EXTENSIONS[language.toLowerCase()];
  return path.join(projectDir(ownerAddress, projectId), `${contractId}.${extension}`);
}

module.exports = { projectDir, contractPath };
