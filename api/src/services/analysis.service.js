const fs = require("node:fs/promises");
const { Type } = require("@google/genai");
const CorCrud = require("../utils/CorCrud");
const logger = require("../utils/logger");
const { generateJson } = require("../utils/llmClient");
const { formatGasEstimate } = require("../utils/gas");

const contractModel = new CorCrud("contracts");
const analyzeModel = new CorCrud("analyze");

const REQUIRED_KEYS = ["summary", "keyFeatures", "explainer", "improvements"];

// Only the gemini provider gets true schema-constrained decoding from this —
// see JSON_SHAPE below for what the OpenAI-compatible providers work from.
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.OBJECT,
      properties: {
        description: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "2-4 short sentences explaining what the contract does, in plain English.",
        },
        purpose: { type: Type.STRING, description: "One short phrase, e.g. 'ERC-20 token' or 'NFT marketplace'." },
        type: { type: Type.STRING, description: "e.g. 'Token', 'Marketplace', 'Vault', 'Governance'." },
        visibility: { type: Type.STRING, description: "e.g. 'Public', 'Permissioned', 'Owner-restricted'." },
      },
      required: ["description", "purpose", "type", "visibility"],
    },
    keyFeatures: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3-6 short bullet points naming notable mechanisms (e.g. 'Reentrancy guard on withdraw()').",
    },
    explainer: {
      type: Type.OBJECT,
      properties: {
        flow: {
          type: Type.STRING,
          description: "2-4 sentences, plain English: the contract's overall lifecycle — what happens, in what order, as it's used.",
        },
        functions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "The function's name, exactly as declared." },
              access: {
                type: Type.STRING,
                description: "Plain English: who can call it — e.g. 'Anyone', 'Only the contract owner', 'Only after the lock period ends'.",
              },
              description: { type: Type.STRING, description: "Plain English: what happens when it's called." },
            },
            required: ["name", "access", "description"],
          },
          description: "One entry per public/external function.",
        },
      },
      required: ["flow", "functions"],
    },
    improvements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["high", "medium", "low"] },
          reason: { type: Type.STRING, description: "Why this matters." },
          how: { type: Type.STRING, description: "The concrete code change to make." },
        },
        required: ["title", "severity", "reason", "how"],
      },
      description:
        "Real, verified issues only, most severe first. An empty array is the correct answer for a contract with no genuine issues — never pad it.",
    },
  },
  required: ["summary", "keyFeatures", "explainer", "improvements"],
};

// Gemini gets a real `responseSchema` (RESPONSE_SCHEMA above); the
// OpenAI-compatible providers (Groq, OpenRouter) have no equivalent, so the
// exact shape has to be spelled out in the prompt itself instead.
const JSON_SHAPE = `Respond with ONLY a single JSON object — no markdown, no code fences, no commentary — matching exactly this shape:
{
  "summary": {
    "description": string[],  // 2-4 short sentences, plain English
    "purpose": string,        // e.g. "ERC-20 token"
    "type": string,           // e.g. "Token", "Marketplace", "Vault"
    "visibility": string      // e.g. "Public", "Owner-restricted"
  },
  "keyFeatures": string[],    // 3-6 short bullet points naming notable mechanisms
  "explainer": {
    "flow": string,           // 2-4 sentences, plain English: the contract's overall lifecycle
    "functions": [{ "name": string, "access": string, "description": string }]  // one per public/external function
  },
  "improvements": [{ "title": string, "severity": "high"|"medium"|"low", "reason": string, "how": string }]
                              // real issues only, most severe first; [] if the contract has none
}`;

function buildPrompt({ language, name, source }) {
  return `You are a senior smart contract security auditor. Review the following ${language} contract named "${name}" and report your findings as JSON.

## How to review
Read the whole contract before writing anything. Check it against, at minimum:
- Access control: missing/incorrect modifiers, unprotected initializers, tx.origin auth, privileged functions anyone can call.
- Reentrancy: external calls or value transfers before state updates (checks-effects-interactions), cross-function reentrancy.
- Value handling: unchecked low-level call/send return values, stuck ETH, unsafe ERC-20 transfers (missing SafeERC20 / return checks).
- Arithmetic: overflow/underflow (pre-0.8 Solidity or \`unchecked\` blocks), precision loss, division before multiplication.
- Logic bugs: wrong conditions, off-by-one errors, state that can't be updated or reset, broken invariants.
- Denial of service: unbounded loops over user-growable arrays, a single failing recipient blocking everyone.
- Oracle/price manipulation, front-running/MEV exposure, block.timestamp or blockhash used for randomness.
- delegatecall/selfdestruct misuse, storage collisions in upgradeable patterns.
- Compiler/pragma issues: floating pragma, known-buggy compiler versions.
- Gas: storage reads in loops, values that could be constant/immutable, redundant storage writes.

## Rules for "improvements"
- Report ONLY issues that genuinely exist in THIS code. Every entry must name the specific function or variable it concerns.
- Do NOT pad the list with generic advice ("add more tests", "add NatSpec comments", "consider an audit", "use the latest compiler") unless there is a concrete problem behind it.
- Do NOT report something as a vulnerability if the code already guards against it (e.g. reentrancy on a function with nonReentrant, overflow on Solidity >= 0.8 without \`unchecked\`).
- If the contract is clean and well-written, return an EMPTY "improvements" array. That is a correct, expected answer, not a failure — a short honest list beats a long padded one.
- Severity: "high" = funds can be lost/stolen/locked or access control broken; "medium" = incorrect behavior, DoS, or exploitable under realistic conditions; "low" = gas, best-practice, or hardening with no direct exploit.
- Order entries from most to least severe. In "how", give the concrete code change (e.g. which line/modifier/check to add), not a vague direction.

## Rules for the other fields
- Be specific to THIS contract — use its actual function and variable names.
- "keyFeatures": the mechanisms the contract actually implements (including security measures it gets right).
- "explainer": cover every public/external function, named exactly as declared; say in plain English who can call it (anyone, owner-only, only under some condition) and what happens when it's called.

${JSON_SHAPE}

\`\`\`${language}
${source}
\`\`\``;
}

function countLinesOfCode(source) {
  return source.split("\n").filter((line) => line.trim().length > 0).length;
}

// Fills in signature/stateMutability from the contract's own compiled ABI
// (deterministic) rather than trusting the model to report them — the model
// only needs to describe access control and behavior, which the ABI alone
// can't tell you.
function enrichExplainerFunctions(functions, abi) {
  if (!Array.isArray(abi)) return functions;
  const byName = new Map(
    abi.filter((f) => f.type === "function" && f.name).map((f) => [f.name, f]),
  );
  return functions.map((fn) => {
    const fragment = byName.get(fn.name);
    return fragment
      ? { ...fn, signature: fragment.signature ?? fn.name, stateMutability: fragment.stateMutability }
      : fn;
  });
}

const analyzeContract = async ({ id, ownerAddress, force = false }) => {
  const contract = await contractModel.findOne({ id });
  if (!contract || contract.ownerAddress !== ownerAddress) {
    return { status: 404, json: { message: "Contract not found" } };
  }

  const existing = await analyzeModel.findOne({ contractId: id });

  // Serve the cached result as long as it was generated after the last edit
  // that changed the source (i.e. after the last compile), so switching
  // between Summary/Explainer/Improvements tabs doesn't re-prompt the model.
  const isFresh =
    existing?.analysis &&
    existing?.analyzedAt &&
    (!contract.compiledAt || existing.analyzedAt >= contract.compiledAt);

  if (!force && isFresh) {
    return { status: 200, json: { analysis: existing.analysis } };
  }

  let source;
  try {
    source = await fs.readFile(contract.source, "utf8");
  } catch (error) {
    logger.error("Failed to read contract file for analysis", {
      error: error.message,
      path: contract.source,
    });
    return { status: 404, json: { message: "Contract file not found on disk" } };
  }

  if (!source.trim()) {
    return { status: 422, json: { message: "Nothing to analyze — the contract is empty" } };
  }

  let parsed;
  try {
    const result = await generateJson({
      prompt: buildPrompt({ language: contract.language, name: contract.name, source }),
      geminiSchema: RESPONSE_SCHEMA,
      requiredKeys: REQUIRED_KEYS,
    });
    parsed = result.json;
  } catch (error) {
    logger.error("AI analysis failed on every configured provider", { error: error.message, contractId: id });
    return { status: 502, json: { message: "AI analysis is temporarily unavailable — try again shortly" } };
  }

  const analysis = {
    summary: {
      ...parsed.summary,
      compiler: contract.compilerVersion ?? "Not compiled yet",
      linesOfCode: countLinesOfCode(source),
      estimatedGasAvg: formatGasEstimate(contract.gasEstimate) ?? "N/A",
    },
    keyFeatures: parsed.keyFeatures ?? [],
    explainer: {
      flow: parsed.explainer?.flow ?? "",
      functions: enrichExplainerFunctions(parsed.explainer?.functions ?? [], contract.abi),
    },
    improvements: parsed.improvements ?? [],
  };

  const analyzedAt = new Date();
  await analyzeModel.upsert(
    { contractId: id },
    { contractId: id, analysis, analyzedAt },
    { analysis, analyzedAt },
  );

  return { status: 200, json: { analysis } };
};

// Only the "source" field matters here, but wrapping it in an object still
// gets Gemini's schema-constrained decoding and keeps parseJson's fallback
// (outermost {...} span) usable for the OpenAI-compatible providers.
const APPLY_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    source: {
      type: Type.STRING,
      description: "The complete, updated contract source with the improvement applied.",
    },
  },
  required: ["source"],
};

const APPLY_JSON_SHAPE = `Respond with ONLY a single JSON object — no markdown, no code fences, no commentary — matching exactly this shape:
{ "source": string }  // the complete, updated file — not a diff or snippet`;

function buildApplyPrompt({ language, name, source, improvement }) {
  return `You are a senior smart contract engineer. Apply ONE specific improvement to the ${language} contract named "${name}" below, then return the complete updated file.

Improvement to apply: ${improvement.title}
Reason: ${improvement.reason}
How: ${improvement.how}

Rules:
- Make only the change(s) this improvement calls for — don't refactor, rename, or touch unrelated code.
- Preserve the existing formatting and style of the rest of the file.
- Return the ENTIRE file with the change applied, not a diff or a snippet.

${APPLY_JSON_SHAPE}

\`\`\`${language}
${source}
\`\`\``;
}

const applyImprovement = async ({ id, ownerAddress, improvement }) => {
  const contract = await contractModel.findOne({ id });
  if (!contract || contract.ownerAddress !== ownerAddress) {
    return { status: 404, json: { message: "Contract not found" } };
  }

  let source;
  try {
    source = await fs.readFile(contract.source, "utf8");
  } catch (error) {
    logger.error("Failed to read contract file to apply improvement", {
      error: error.message,
      path: contract.source,
    });
    return { status: 404, json: { message: "Contract file not found on disk" } };
  }

  if (!source.trim()) {
    return { status: 422, json: { message: "Nothing to improve — the contract is empty" } };
  }

  let parsed;
  try {
    const result = await generateJson({
      prompt: buildApplyPrompt({ language: contract.language, name: contract.name, source, improvement }),
      geminiSchema: APPLY_RESPONSE_SCHEMA,
      requiredKeys: ["source"],
    });
    parsed = result.json;
  } catch (error) {
    logger.error("AI failed to apply improvement on every configured provider", {
      error: error.message,
      contractId: id,
    });
    return { status: 502, json: { message: "AI is temporarily unavailable — try again shortly" } };
  }

  const updatedSource = String(parsed.source ?? "").trim();
  if (!updatedSource) {
    return { status: 502, json: { message: "AI returned an empty result — try again" } };
  }

  await fs.writeFile(contract.source, updatedSource, "utf8");

  // Recorded so the "Added to contract" state on this improvement survives
  // a page reload instead of resetting to unclicked.
  const existingAnalyze = await analyzeModel.findOne({ contractId: id });
  const appliedImprovements = Array.from(
    new Set([...(existingAnalyze?.appliedImprovements ?? []), improvement.title]),
  );
  await analyzeModel.upsert(
    { contractId: id },
    { contractId: id, appliedImprovements },
    { appliedImprovements },
  );

  return { status: 200, json: { source: updatedSource, appliedImprovements } };
};

module.exports = { analyzeContract, applyImprovement };
