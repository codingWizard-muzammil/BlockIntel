const fs = require("node:fs/promises");
const { Type } = require("@google/genai");
const CorCrud = require("../utils/CorCrud");
const logger = require("../utils/logger");
const { generateJson } = require("../utils/llmClient");

const contractModel = new CorCrud("contracts");
const analyzeModel = new CorCrud("analyze");

const REQUIRED_KEYS = ["summary", "keyFeatures", "attacks", "improvements"];

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
    attacks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["high", "medium", "low"] },
          description: { type: Type.STRING, description: "How the attack would actually be carried out against this specific code." },
        },
        required: ["title", "severity", "description"],
      },
      description: "Concrete, contract-specific attack scenarios — skip if genuinely none apply.",
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
  required: ["summary", "keyFeatures", "attacks", "improvements"],
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
  "attacks": [{ "title": string, "severity": "high"|"medium"|"low", "description": string }],
  "improvements": [{ "title": string, "severity": "high"|"medium"|"low", "reason": string, "how": string }]
}`;

function buildPrompt({ language, name, source }) {
  return `You are a senior smart contract security auditor. Analyze the following ${language} contract named "${name}" and report your findings as JSON.

Be specific to THIS contract — reference its actual function and variable names. Do not invent generic boilerplate findings that don't apply to the code shown. If the contract has no real vulnerabilities, return an empty "attacks" array rather than padding it.

${JSON_SHAPE}

\`\`\`${language}
${source}
\`\`\``;
}

function countLinesOfCode(source) {
  return source.split("\n").filter((line) => line.trim().length > 0).length;
}

const analyzeContract = async ({ id, ownerAddress, force = false }) => {
  const contract = await contractModel.findOne({ id });
  if (!contract || contract.ownerAddress !== ownerAddress) {
    return { status: 404, json: { message: "Contract not found" } };
  }

  const existing = await analyzeModel.findOne({ contractId: id });

  // Serve the cached result as long as it was generated after the last edit
  // that changed the source (i.e. after the last compile), so switching
  // between Summary/Attacks/Improvements tabs doesn't re-prompt the model.
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
      estimatedGasAvg: contract.gasEstimate
        ? Number(contract.gasEstimate).toLocaleString()
        : "N/A",
    },
    keyFeatures: parsed.keyFeatures ?? [],
    attacks: parsed.attacks ?? [],
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

module.exports = { analyzeContract };
