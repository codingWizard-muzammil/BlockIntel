import { apiClient } from "./client";

export type WriteCodeInput = {
  language: string;
  instruction: string;
  // The editor's live buffer — sent directly since it may not be saved yet.
  source: string;
  // When set, the AI returns only the replacement for this span instead of
  // the whole file.
  selection?: { text: string; startLine: number; endLine: number };
};

export async function writeCodeRequest(input: WriteCodeInput, signal?: AbortSignal) {
  const { data } = await apiClient.post<{ code: string }>("/ai/write", input, { signal });
  return data.code;
}
