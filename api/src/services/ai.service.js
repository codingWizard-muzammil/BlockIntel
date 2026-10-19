const { Type } = require("@google/genai");
const logger = require("../utils/logger");
const { generateJson } = require("../utils/llmClient");

// Wrapping the code in an object (rather than asking for raw text) still
// gets Gemini's schema-constrained decoding and keeps parseJson's fallback
// (outermost {...} span) usable for the OpenAI-compatible providers.
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    code: {
      type: Type.STRING,
      description: "The generated code — only the code, no markdown fences or commentary.",
    },
  },
  required: ["code"],
};

const JSON_SHAPE = `Respond with ONLY a single JSON object — no markdown, no code fences, no commentary — matching exactly this shape:
{ "code": string }  // only the code itself, properly escaped as a JSON string`;

const RULES = `Rules:
- Write production-quality, secure code: checks-effects-interactions, explicit access control, no unchecked external calls, no tx.origin auth.
- Follow the language version/pragma and the formatting style already used in the file.
- Don't add explanatory prose outside of normal code comments.`;

// Selection mode: the model rewrites only the highlighted span, but sees the
// whole file so it can reference existing state variables, modifiers, etc.
function buildSelectionPrompt({ language, instruction, source, selection }) {
  return `You are a senior smart contract engineer working inside a ${language} code editor. The user highlighted part of the file and asked you to change it.

Instruction: ${instruction}

${RULES}
- Return ONLY the replacement for the highlighted snippet — not the whole file. It will be pasted over the selection verbatim, so keep its indentation consistent with the surrounding code.

Full file, for context:
\`\`\`${language}
${source}
\`\`\`

Highlighted snippet (lines ${selection.startLine}-${selection.endLine}) to replace:
\`\`\`${language}
${selection.text}
\`\`\`

${JSON_SHAPE}`;
}

// Whole-file mode: generates from scratch when the file is empty, otherwise
// edits the existing file and returns it in full.
function buildFilePrompt({ language, instruction, source }) {
  if (!source.trim()) {
    return `You are a senior smart contract engineer working inside a ${language} code editor. Write a complete, compilable ${language} file for the following request.

Request: ${instruction}

${RULES}
- Include the license identifier and pragma/version header the language expects.

${JSON_SHAPE}`;
  }

  return `You are a senior smart contract engineer working inside a ${language} code editor. Apply the user's instruction to the file below and return the complete updated file.

Instruction: ${instruction}

${RULES}
- Make only the changes the instruction calls for — don't refactor, rename, or touch unrelated code.
- Return the ENTIRE file with the change applied, not a diff or a snippet.

\`\`\`${language}
${source}
\`\`\`

${JSON_SHAPE}`;
}

// Some free models still wrap the code string itself in a markdown fence
// even inside the JSON — strip it so it doesn't land in the editor.
function stripCodeFence(code) {
  const match = String(code).match(/^\s*```[\w-]*\n([\s\S]*?)\n?```\s*$/);
  return match ? match[1] : String(code);
}

const writeCode = async ({ language, instruction, source = "", selection }) => {
  const prompt = selection?.text
    ? buildSelectionPrompt({ language, instruction, source, selection })
    : buildFilePrompt({ language, instruction, source });

  let parsed;
  try {
    const result = await generateJson({ prompt, geminiSchema: RESPONSE_SCHEMA, requiredKeys: ["code"] });
    parsed = result.json;
  } catch (error) {
    logger.error("AI code writing failed on every configured provider", { error: error.message });
    return { status: 502, json: { message: "AI is temporarily unavailable — try again shortly" } };
  }

  const code = stripCodeFence(parsed.code ?? "");
  if (!code.trim()) {
    return { status: 502, json: { message: "AI returned an empty result — try rephrasing" } };
  }

  return { status: 200, json: { code } };
};

module.exports = { writeCode };
