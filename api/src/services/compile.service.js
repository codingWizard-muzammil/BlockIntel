const fs = require("node:fs/promises");
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

function compileSolidity(fileName, source) {
  const input = {
    language: "Solidity",
    sources: { [fileName]: { content: source } },
    settings: {
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode.object", "evm.gasEstimates"] },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const diagnostics = output.errors ?? [];
  const errors = diagnostics.filter((d) => d.severity === "error");
  const warnings = diagnostics.filter((d) => d.severity === "warning");
  const solidityVersion = solc.version();

  if (errors.length > 0 || !output.contracts) {
    return { ok: false, errors, warnings, solidityVersion };
  }

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
  };
}

function defaultArgFor(type) {
  if (type === "address") return ethers.ZeroAddress;
  if (type === "bool") return false;
  if (type === "string") return "";
  if (type.endsWith("[]")) return [];
  if (type.startsWith("bytes")) return "0x";
  return 0;
}

async function deployToChain({ chain, ownerAddress, abi, bytecode }) {
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
    return { ok: true, address: await deployed.getAddress(), rpcUrl, deployer: wallet.address, error: null };
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

  const result = compileSolidity(contract.name, source);
  const time = `${Date.now() - start}ms`;

  if (!result.ok) {
    return { status: 200, json: { compile: { ...result, time, gas: null, deployment: null } } };
  }

  const deployment = await deployToChain({
    chain: project.chain,
    ownerAddress,
    abi: result.abi,
    bytecode: result.bytecode,
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

  return {
    status: 200,
    json: {
      compile: {
        ...result,
        time,
        gas: result.gasEstimate ? Number(result.gasEstimate).toLocaleString() : null,
        deployment: { ...deployment, chain: project.chain },
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
