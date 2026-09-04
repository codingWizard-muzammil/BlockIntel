const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const solc = require("solc");
const { ethers } = require("ethers");
const CorCrud = require("../utils/CorCrud");
const logger = require("../utils/logger");
const { CHAIN_RPC_URLS } = require("../constants/chains");
const { derivePlaygroundWallet, ensureFunded } = require("../utils/playgroundWallet");
const walletService = require("./wallet.service");

const contractModel = new CorCrud("contracts");
const projectModel = new CorCrud("projects");

function functionSignature(fragment) {
  return `${fragment.name}(${fragment.inputs.map((i) => i.type).join(",")})`;
}

const NODE_MODULES_DIR = path.resolve(__dirname, "../../node_modules");

// Resolves npm-style package imports (e.g. OpenZeppelin's
// `import "@openzeppelin/contracts/token/ERC20/IERC20.sol"`) straight off
// `node_modules`, the same layout Hardhat/Foundry remappings assume. Also
// handles a package file's own relative imports, since solc normalizes those
// against the package path before calling back in (e.g. IERC20.sol's
// `import "../utils/Context.sol"` arrives here as
// "@openzeppelin/contracts/utils/Context.sol").
function resolveFromNodeModules(importPath) {
  const resolved = path.resolve(NODE_MODULES_DIR, importPath);
  // Guards against path traversal via a crafted import path (e.g.
  // "../../../../etc/passwd"), since this reads straight off disk.
  if (!resolved.startsWith(NODE_MODULES_DIR + path.sep)) return null;
  try {
    return fsSync.readFileSync(resolved, "utf8");
  } catch {
    return null;
  }
}

// Resolves `import "./Strategy.sol"`-style statements against sibling
// contracts in the same project, pre-fetched by the caller. Matching is
// tried by exact path, then by path with a leading "./" stripped, then by
// basename — so `import "./Strategy.sol"`, `import "Strategy.sol"`, and
// `import "contracts/Strategy.sol"` all resolve to a sibling literally
// named "Strategy.sol", even if the sibling's actual stored name differs
// only in case (e.g. a tab named "strategy.sol"). Falls back to
// `node_modules` for package imports. solc only invokes this for files that
// are actually imported (transitively), so an unrelated sibling with a
// syntax error never blocks a compile that doesn't depend on it.
//
// solc records each resolved import under the *import path itself* (e.g.
// "Strategy.sol", exactly as written in the `import` statement) as its
// source-unit name in the compiler output — not under whatever key this
// resolver actually matched it to. When those differ only in case, a caller
// trying to look up the sibling `contracts` row by that source-unit name
// would silently fail. `resolvedNames` records importPath -> matched sibling
// name for every resolution, so compileSolidity can map back correctly.
function makeImportResolver(importSources, resolvedNames) {
  return function findImports(importPath) {
    const normalized = importPath.replace(/^\.\//, "");
    const basename = normalized.split("/").pop();
    const key = Object.keys(importSources).find(
      (name) => name === importPath || name === normalized || name.toLowerCase() === basename.toLowerCase(),
    );
    if (key) {
      resolvedNames[importPath] = key;
      return { contents: importSources[key] };
    }

    if (!importPath.startsWith(".")) {
      const contents = resolveFromNodeModules(importPath);
      if (contents !== null) return { contents };
    }

    return { error: `File not found: ${importPath}` };
  };
}

function compileSolidity(fileName, source, importSources = {}) {
  const input = {
    language: "Solidity",
    sources: { [fileName]: { content: source } },
    settings: {
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "evm.gasEstimates"] },
      },
    },
  };

  const resolvedNames = {};
  const output = JSON.parse(
    solc.compile(JSON.stringify(input), { import: makeImportResolver(importSources, resolvedNames) }),
  );
  const diagnostics = output.errors ?? [];
  const errors = diagnostics.filter((d) => d.severity === "error");
  const warnings = diagnostics.filter((d) => d.severity === "warning");
  const solidityVersion = solc.version();

  if (errors.length > 0 || !output.contracts) {
    return { ok: false, errors, warnings, solidityVersion };
  }

  // Every contract solc touched while resolving imports (e.g. Strategy,
  // pulled in via Vault's `import "./Strategy.sol"`), with everything needed
  // both to recognize it after deployment (by runtime bytecode) and to cache
  // it the same way the target contract itself gets cached (see
  // detectChildDeployments and the dependency-caching in compileAndDeploy).
  const allContracts = Object.entries(output.contracts).flatMap(([file, contractsInThatFile]) =>
    Object.entries(contractsInThatFile)
      .filter(([, c]) => c.evm?.deployedBytecode?.object)
      .map(([name, c]) => ({
        // Map solc's source-unit name (the import path as written) back to
        // the sibling contract's actual stored name, so a case mismatch
        // between the two (e.g. import "./Strategy.sol" vs. a tab named
        // "strategy.sol") doesn't break the DB lookup in compileAndDeploy.
        file: resolvedNames[file] ?? file,
        name,
        abi: c.abi.map((fragment) =>
          fragment.type === "function" ? { ...fragment, signature: functionSignature(fragment) } : fragment,
        ),
        bytecode: `0x${c.evm.bytecode.object}`,
        deployedBytecode: `0x${c.evm.deployedBytecode.object.toLowerCase()}`,
        gasEstimate: c.evm.gasEstimates?.creation?.totalCost ?? null,
      })),
  );

  const contractsInFile = output.contracts[fileName] ?? {};
  // Interfaces/abstract contracts compile but produce no bytecode; the
  // "main" contract in a single-file source is conventionally declared
  // last, so prefer the last deployable one.
  const deployableName = [...Object.keys(contractsInFile)]
    .reverse()
    .find((name) => contractsInFile[name].evm?.bytecode?.object);

  if (!deployableName) {
    return {
      ok: false,
      errors: [
        { message: "No deployable contract found (only interfaces/abstract contracts?)" },
      ],
      warnings,
      solidityVersion,
    };
  }

  const compiled = contractsInFile[deployableName];
  const abi = compiled.abi.map((fragment) =>
    fragment.type === "function" ? { ...fragment, signature: functionSignature(fragment) } : fragment,
  );

  return {
    ok: true,
    errors: [],
    warnings,
    solidityVersion,
    contractName: deployableName,
    abi,
    bytecode: `0x${compiled.evm.bytecode.object}`,
    gasEstimate: compiled.evm.gasEstimates?.creation?.totalCost ?? null,
    allContracts,
  };
}

// A contract's constructor creating another (e.g. Vault's `new Strategy(...)`)
// isn't visible in the deployment transaction's logs or return value — but
// per EIP-161, a freshly deployed contract's own nonce starts at 1, and each
// `new` it performs consumes the next nonce in order. So the child contracts
// it created live at the standard CREATE address for nonces 1, 2, 3, ...
// This avoids depending on debug_traceTransaction, which isn't available on
// every chain's local dev node (Hardhat's only supports its default tracer).
async function detectChildDeployments({ provider, deployerAddress, allContracts }) {
  const dependencies = [];
  for (let nonce = 1; nonce <= 25; nonce += 1) {
    const address = ethers.getCreateAddress({ from: deployerAddress, nonce });
    const code = await provider.getCode(address);
    if (code === "0x") break;
    const match = allContracts.find((c) => c.deployedBytecode === code.toLowerCase()) ?? null;
    dependencies.push({ address, match });
  }
  return dependencies;
}

function defaultArgFor(type) {
  if (type === "address") return ethers.ZeroAddress;
  if (type === "bool") return false;
  if (type === "string") return "";
  if (type.endsWith("[]")) return [];
  if (type.startsWith("bytes")) return "0x";
  return 0;
}

async function deployToChain({ chain, ownerAddress, abi, bytecode, allContracts = [] }) {
  const rpcUrl = CHAIN_RPC_URLS[chain];
  if (!rpcUrl) {
    return { ok: false, address: null, rpcUrl: null, deployer: null, error: `No local node configured for ${chain}` };
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = await ensureFunded(ownerAddress, chain, provider);
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const constructorInputs = abi.find((f) => f.type === "constructor")?.inputs ?? [];
    const args = constructorInputs.map((input) => defaultArgFor(input.type));

    const deployed = await factory.deploy(...args);
    await deployed.waitForDeployment();
    const address = await deployed.getAddress();
    const dependencies = await detectChildDeployments({ provider, deployerAddress: address, allContracts });
    return { ok: true, address, rpcUrl, deployer: wallet.address, error: null, dependencies };
  } catch (error) {
    logger.error("Contract deploy failed", { error: error.message, chain });
    const unreachable = /ECONNREFUSED|could not detect network|fetch failed|SERVER_ERROR/i.test(
      error.message,
    );
    return {
      ok: false,
      address: null,
      rpcUrl,
      deployer: null,
      error: unreachable
        ? `Local ${chain} node isn't reachable at ${rpcUrl}. Start it with "docker compose up" from chains/.`
        : (error.shortMessage ?? error.message),
    };
  }
}

const compileAndDeploy = async ({ id, ownerAddress }) => {
  const start = Date.now();
  const contract = await contractModel.findOne({ id });
  if (!contract || contract.ownerAddress !== ownerAddress) {
    return { status: 404, json: { message: "Contract not found" } };
  }

  const project = await projectModel.findOne({ id: contract.projectId });
  if (!project) {
    return { status: 404, json: { message: "Project not found" } };
  }

  let source;
  try {
    source = await fs.readFile(contract.source, "utf8");
  } catch (error) {
    logger.error("Failed to read contract file for compilation", {
      error: error.message,
      path: contract.source,
    });
    return { status: 404, json: { message: "Contract file not found on disk" } };
  }

  if (contract.language.toLowerCase() !== "solidity") {
    return {
      status: 422,
      json: {
        compile: {
          ok: false,
          // Lets the frontend show a distinct "not supported yet" state
          // instead of treating this like a source-code compile error.
          unsupported: true,
          errors: [{ message: `Compilation for ${contract.language} isn't supported yet` }],
          warnings: [],
          time: `${Date.now() - start}ms`,
          gas: null,
          deployment: null,
        },
      },
    };
  }

  // Other Solidity contracts in the same project are candidate imports
  // (e.g. a Vault.sol that does `import "./Strategy.sol"`). Pre-fetch their
  // sources so they're available if solc's import resolver needs them.
  const siblings = await contractModel.findMany({
    where: { projectId: contract.projectId, language: contract.language, id: { not: contract.id } },
  });
  const importSources = {};
  await Promise.all(
    siblings.map(async (sibling) => {
      try {
        importSources[sibling.name] = await fs.readFile(sibling.source, "utf8");
      } catch (error) {
        logger.error("Failed to read sibling contract for import resolution", {
          error: error.message,
          path: sibling.source,
        });
      }
    }),
  );

  const { allContracts, ...result } = compileSolidity(contract.name, source, importSources);
  const time = `${Date.now() - start}ms`;

  if (!result.ok) {
    return { status: 200, json: { compile: { ...result, time, gas: null, deployment: null } } };
  }

  const { dependencies: rawDependencies, ...deployment } = await deployToChain({
    chain: project.chain,
    ownerAddress,
    abi: result.abi,
    bytecode: result.bytecode,
    allContracts,
  });

  // Cache the compiled ABI/bytecode so the playground's call endpoint can
  // reuse them instead of recompiling from source on every function call.
  await contractModel.update(
    { id },
    {
      abi: result.abi,
      bytecode: result.bytecode,
      compilerVersion: result.solidityVersion,
      gasEstimate: result.gasEstimate ?? null,
      compiledAt: new Date(),
      ...(deployment.ok ? { address: deployment.address } : {}),
    },
  );

  // A dependency the constructor deployed (e.g. Vault's `new Strategy(...)`)
  // may itself be an open tab/contract row in this project — cache its
  // compiled+deployed state there too, so switching to that tab's playground
  // shows it as already deployed instead of "wasn't deployed" until the user
  // separately compiles it themselves.
  const dependencies = [];
  for (const dep of rawDependencies ?? []) {
    const siblingContract = dep.match ? siblings.find((s) => s.name === dep.match.file) : null;
    if (siblingContract) {
      await contractModel.update(
        { id: siblingContract.id },
        {
          address: dep.address,
          abi: dep.match.abi,
          bytecode: dep.match.bytecode,
          compilerVersion: result.solidityVersion,
          gasEstimate: dep.match.gasEstimate ?? null,
          compiledAt: new Date(),
        },
      );
    }
    dependencies.push({
      name: dep.match?.name ?? null,
      address: dep.address,
      contractId: siblingContract?.id ?? null,
      // So the frontend can populate that tab's playground in this same
      // session too, not just after the sibling row's cached ABI comes back
      // on the next project fetch.
      abi: dep.match?.abi ?? null,
    });
  }

  return {
    status: 200,
    json: {
      compile: {
        ...result,
        time,
        gas: result.gasEstimate ? Number(result.gasEstimate).toLocaleString() : null,
        deployment: { ...deployment, chain: project.chain, dependencies },
      },
    },
  };
};

function coerceArg(type, raw) {
  const value = raw ?? "";
  if (type.endsWith("[]")) {
    const items = typeof value === "string" ? (value.trim() ? JSON.parse(value) : []) : value;
    return items.map((item) => coerceArg(type.slice(0, -2), item));
  }
  if (type.startsWith("uint") || type.startsWith("int")) return BigInt(value === "" ? "0" : value);
  if (type === "bool") return value === true || value === "true";
  return value;
}

function serializeResult(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serializeResult);
  return value;
}

const callFunction = async ({ id, ownerAddress, functionName, args = [], valueWei }) => {
  const contract = await contractModel.findOne({ id });
  if (!contract || contract.ownerAddress !== ownerAddress) {
    return { status: 404, json: { message: "Contract not found" } };
  }
  if (!contract.address || !contract.abi) {
    return { status: 409, json: { message: "Contract hasn't been deployed yet — compile & analyze first" } };
  }

  const project = await projectModel.findOne({ id: contract.projectId });
  const rpcUrl = CHAIN_RPC_URLS[project.chain];
  if (!rpcUrl) {
    return { status: 422, json: { message: `No local node configured for ${project.chain}` } };
  }

  // Reuse the ABI cached at compile time rather than recompiling from source
  // on every call.
  const abi = contract.abi;
  const fragment = abi.find((f) => f.type === "function" && f.signature === functionName);
  if (!fragment) {
    return { status: 404, json: { message: `Function ${functionName} not found on this contract` } };
  }

  const isWrite = fragment.stateMutability !== "view" && fragment.stateMutability !== "pure";

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    // Every call runs as the connected user's own playground wallet, not a
    // shared devnet account — only a write needs it topped up with gas.
    const wallet = isWrite
      ? await ensureFunded(ownerAddress, project.chain, provider)
      : derivePlaygroundWallet(ownerAddress, project.chain).connect(provider);
    const instance = new ethers.Contract(contract.address, abi, wallet);
    const callArgs = fragment.inputs.map((input, i) => coerceArg(input.type, args[i]));
    const fn = instance.getFunction(functionName);

    if (isWrite) {
      const overrides = fragment.stateMutability === "payable" && valueWei ? { value: BigInt(valueWei) } : {};
      const tx = await fn(...callArgs, overrides);
      const receipt = await tx.wait();
      const walletBalance = ethers.formatEther(await provider.getBalance(wallet.address));
      return {
        status: 200,
        json: {
          result: null,
          txHash: receipt.hash,
          gasUsed: receipt.gasUsed.toString(),
          walletAddress: wallet.address,
          walletBalance,
        },
      };
    }

    const value = await fn(...callArgs);
    const walletBalance = ethers.formatEther(await provider.getBalance(wallet.address));
    return {
      status: 200,
      json: { result: serializeResult(value), walletAddress: wallet.address, walletBalance },
    };
  } catch (error) {
    logger.error("Playground call failed", { error: error.message, functionName });
    return { status: 422, json: { message: error.shortMessage ?? error.message } };
  }
};

// Lets the frontend show the user's playground wallet (address + native
// balance) before they've made any calls yet, e.g. to see a deposit's effect
// against a known starting balance. Tops it up the same way a write call
// would, so the "before" balance the user sees is already meaningful.
const getWallet = async ({ id, ownerAddress }) => {
  const contract = await contractModel.findOne({ id });
  if (!contract || contract.ownerAddress !== ownerAddress) {
    return { status: 404, json: { message: "Contract not found" } };
  }

  const project = await projectModel.findOne({ id: contract.projectId });
  return walletService.getWallet({ address: ownerAddress, chain: project.chain });
};

module.exports = { compileAndDeploy, callFunction, getWallet };
