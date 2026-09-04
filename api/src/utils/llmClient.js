// src/utils/llmClient.js
//
// A small multi-provider JSON-generation client. Free-tier LLM providers are
// each unreliable in their own way (deprecated model names, per-minute rate
// limits, an account-level block like the one that motivated this file) —
// this tries a prioritized list of providers, and a fallback list of models
// within each, until one returns valid JSON with the keys the caller needs.
const logger = require("./logger");
const { GoogleGenAI } = require("@google/genai");

function buildModelList(primary, fallbackCsv, defaults) {
  const models = [primary, ...String(fallbackCsv || "").split(",")]
    .map((model) => (model || "").trim())
    .filter(Boolean);
  return models.length ? [...new Set(models)] : defaults;
}

async function callOpenAiCompatible({ url, apiKey, model, prompt, headers = {} }) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...headers,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      // Groq accepts 0 fine. This narrows (doesn't eliminate — confirmed
      // even with a fixed `seed` on Groq's reasoning models, repeated calls
      // on unchanged source can still return a different-looking set of
      // findings) run-to-run variance in the analyze/apply-improvement
      // results — that residual variance is inherent to these providers'
      // inference stacks, not something a client-side setting controls.
      temperature: 0,
    }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`${res.status} ${body?.error?.message || res.statusText}`);
  }

  const text = body?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty model response");
  return text;
}

function buildGroqProvider() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  return {
    name: "groq",
    models: buildModelList(process.env.GROQ_MODEL, process.env.GROQ_FALLBACK_MODELS, [
      "openai/gpt-oss-120b",
      "qwen/qwen3.8-27b",
      "openai/gpt-oss-20b",
    ]),
    call: (model, prompt) =>
      callOpenAiCompatible({ url: "https://api.groq.com/openai/v1/chat/completions", apiKey, model, prompt }),
  };
}

function buildOpenRouterProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  return {
    name: "openrouter",
    models: buildModelList(process.env.OPENROUTER_MODEL, process.env.OPENROUTER_FALLBACK_MODELS, [
      "z-ai/glm-5.2:free",
      "nvidia/nemotron-3-super-120b-a12b:free",
      "minimax/minimax-m3:free",
      // OpenRouter's own auto-router — whatever free model it picks, it's
      // a last-resort safety net if every named model above is down.
      "openrouter/free",
    ]),
    call: (model, prompt) =>
      callOpenAiCompatible({
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey,
        model,
        prompt,
        headers: {
          "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://blockintel.dev",
          "X-Title": "BlockIntel",
        },
      }),
  };
}

function buildGeminiProvider() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const client = new GoogleGenAI({ apiKey });
  return {
    name: "gemini",
    models: buildModelList(process.env.GEMINI_MODEL, process.env.GEMINI_FALLBACK_MODELS, ["gemini-flash-latest"]),
    // Only provider that gets true schema-constrained decoding — the
    // OpenAI-compatible ones above only get the schema described in the
    // prompt text (see `geminiSchema` in generateJson).
    call: async (model, prompt, geminiSchema) => {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        // Same reasoning as the OpenAI-compatible providers above — narrows
        // (but can't fully eliminate) run-to-run drift on unchanged source.
        config: {
          temperature: 0,
          ...(geminiSchema ? { responseMimeType: "application/json", responseSchema: geminiSchema } : {}),
        },
      });
      return response.text;
    },
  };
}

// Order matters: it's the fallback sequence. Groq first (fastest, most
// generous free-tier limits); OpenRouter next; Gemini last since a Gemini
// project can be denied access at the account level with no code-level fix.
// AI_PROVIDER can force a specific one to the front for testing.
const PROVIDERS = [buildGroqProvider(), buildOpenRouterProvider(), buildGeminiProvider()].filter(Boolean);

const forcedProvider = (process.env.AI_PROVIDER || "").trim().toLowerCase();
if (forcedProvider) {
  const index = PROVIDERS.findIndex((provider) => provider.name === forcedProvider);
  if (index > 0) PROVIDERS.unshift(PROVIDERS.splice(index, 1)[0]);
}

if (PROVIDERS.length === 0) {
  throw new Error("No AI provider configured — set GROQ_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY");
}

// Free models routinely wrap JSON in markdown fences or prepend a <think>
// block (reasoning models like DeepSeek-R1) despite being told not to —
// strip those before parsing, and fall back to the outermost {...} span if
// direct JSON.parse still fails.
function parseJson(text) {
  const cleaned = String(text || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found in model response");
    return JSON.parse(match[0]);
  }
}

function assertRequiredKeys(json, requiredKeys) {
  const missing = requiredKeys.filter((key) => !(key in (json || {})));
  if (missing.length) throw new Error(`Missing required keys: ${missing.join(", ")}`);
}

// Tries every configured provider's model list, in order, until one returns
// valid JSON containing `requiredKeys`. `geminiSchema` (a @google/genai
// `Type`-based schema) is used only when the attempt lands on the gemini
// provider; every provider gets the same `prompt`, so it should already
// describe the desired JSON shape in plain text for the others' benefit.
async function generateJson({ prompt, geminiSchema, requiredKeys = [] }) {
  const errors = [];

  for (const provider of PROVIDERS) {
    for (const model of provider.models) {
      try {
        const text = await provider.call(model, prompt, geminiSchema);
        const json = parseJson(text);
        assertRequiredKeys(json, requiredKeys);
        return { provider: provider.name, model, json };
      } catch (error) {
        logger.warn("LLM provider attempt failed", { provider: provider.name, model, error: error.message });
        errors.push(`${provider.name}:${model}: ${error.message}`);
      }
    }
  }

  throw new Error(`All AI providers failed: ${errors.join(" | ")}`);
}

module.exports = { generateJson };
