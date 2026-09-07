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
      description: "Concrete, actionable improvements — gas, style, and security hardening.",
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
}`;

function buildPrompt({ language, name, source }) {
  return `You are a senior smart contract engineer. Analyze the following ${language} contract named "${name}" and report your findings as JSON.

Be specific to THIS contract — reference its actual function and variable names. Do not invent generic boilerplate findings that don't apply to the code shown. For the explainer, cover every public/external function: name it exactly as declared, state in plain English who is allowed to call it (anyone, owner-only, only under some condition), and what happens when it's called.

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
