import { apiClient } from "./client";
import type { ContractSummary, AttackScenario, Improvement } from "@/types/analysis";

export type ApiContract = {
  id: string;
  address: string | null;
  name: string;
  projectId: string;
  ownerAddress: string;
  language: string;
  source: string;
  createdAt: string;
  // Cached result of the last successful compile — present once the
  // contract has been compiled at least once, null until then.
  abi: AbiFragment[] | null;
  compilerVersion: string | null;
  gasEstimate: string | null;
  compiledAt: string | null;
  // Cached result of the last AI analysis — present once /analyze has been
  // called at least once for this contract, null until then.
  analysis: AnalysisResult | null;
  analyzedAt: string | null;
  // Titles of improvements already applied via "Add this improvement" —
  // lets that button show as already-added after a reload.
  appliedImprovements: string[];
};

export type CreateContractInput = {
  projectId: string;
  name: string;
  language: string;
  source?: string;
};

export async function createContractRequest(input: CreateContractInput) {
  const { data } = await apiClient.post<{ contract: ApiContract }>("/contracts", input);
  return data.contract;
}

export async function deleteContractRequest(id: string) {
  await apiClient.delete(`/contracts/${id}`);
  return id;
}

export async function updateContractRequest(id: string, source: string) {
  const { data } = await apiClient.patch<{ contract: ApiContract }>(`/contracts/${id}`, {
    source,
  });
  return data.contract;
}

export type UpdateContractMetaInput = {
  name?: string;
  language?: string;
};

export async function updateContractMetaRequest(
  id: string,
  input: UpdateContractMetaInput,
) {
  const { data } = await apiClient.patch<{ contract: ApiContract }>(
    `/contracts/${id}`,
    input,
  );
  return data.contract;
}

export async function fetchContractSourceRequest(id: string) {
  const { data } = await apiClient.get<{ source: string }>(`/contracts/${id}/source`);
  return data.source;
}

export type AbiInput = { name: string; type: string; internalType?: string };

export type AbiFragment = {
  type: "function" | "constructor" | "event" | "error" | "fallback" | "receive";
  name?: string;
  inputs: AbiInput[];
  outputs?: AbiInput[];
  stateMutability?: string;
  // Only present on function fragments — `${name}(${type,type,...})`, used
  // to identify the exact overload when calling it from the playground.
  signature?: string;
};

export type CompileDiagnostic = { message: string; severity?: string; formattedMessage?: string };

export type DeployedDependency = {
  name: string | null;
  address: string;
  // Set when this dependency is itself an open contract/tab in the project
  // (e.g. a Strategy.sol Vault.sol imports) — lets the frontend populate
  // that tab's own playground immediately, in this same session.
  contractId: string | null;
  abi: AbiFragment[] | null;
};

export type DeploymentResult = {
  ok: boolean;
  address: string | null;
  chain: string;
  rpcUrl: string | null;
  // The playground wallet that deployed it — the connected user's own
  // address on this chain, not a shared devnet account.
  deployer: string | null;
  error: string | null;
  // Other contracts the constructor deployed itself (e.g. a Vault's
  // `import "./Strategy.sol"` + `new Strategy(...)`) — absent/empty when
  // there weren't any.
  dependencies?: DeployedDependency[];
};

export type CompileResult = {
  ok: boolean;
  // Set when the contract's language has no compiler wired up yet (e.g.
  // Vyper) — distinguishes "not implemented" from a real source error so
  // the UI can show a friendlier state instead of an error trace.
  unsupported?: boolean;
  solidityVersion: string;
  contractName?: string;
  abi?: AbiFragment[];
  bytecode?: string;
  errors: CompileDiagnostic[];
  warnings: CompileDiagnostic[];
  time: string;
  gas: string | null;
  deployment: DeploymentResult | null;
};

export async function compileContractRequest(id: string) {
  // The backend uses 422 (rather than throwing an error page) to report an
  // unsupported language as a structured compile result — accept it here so
  // axios doesn't reject and lose that payload.
  const { data } = await apiClient.post<{ compile: CompileResult }>(`/contracts/${id}/compile`, undefined, {
    validateStatus: (status) => status === 200 || status === 422,
  });
  return data.compile;
}

export type CallFunctionInput = {
  functionName: string;
  args?: unknown[];
  valueWei?: string;
};

export type CallFunctionResult = {
  result?: unknown;
  txHash?: string;
  gasUsed?: string;
  // The playground wallet's address/native balance right after this call —
  // lets the UI reflect e.g. a payable deposit's effect without a refetch.
  walletAddress?: string;
  walletBalance?: string;
};

export async function callContractFunctionRequest(id: string, input: CallFunctionInput) {
  const { data } = await apiClient.post<CallFunctionResult>(`/contracts/${id}/call`, input);
  return data;
}

export type PlaygroundWallet = { address: string; privateKey: string; balance: string };

export async function fetchPlaygroundWalletRequest(id: string) {
  const { data } = await apiClient.get<PlaygroundWallet>(`/contracts/${id}/wallet`);
  return data;
}

export type AnalysisResult = {
  summary: ContractSummary;
  keyFeatures: string[];
  attacks: AttackScenario[];
  improvements: Improvement[];
};

export async function analyzeContractRequest(id: string, force = false) {
  const { data } = await apiClient.post<{ analysis: AnalysisResult }>(`/contracts/${id}/analyze`, {
    force,
  });
  return data.analysis;
}

// Has the AI rewrite the contract's source to apply one specific
// improvement, and persists both the result and the applied-improvements
// list server-side — the returned source is the new source of truth for
// this contract's file on disk.
export async function applyImprovementRequest(id: string, improvement: Improvement) {
  const { data } = await apiClient.post<{ source: string; appliedImprovements: string[] }>(
    `/contracts/${id}/improvements/apply`,
    improvement,
  );
  return data;
}
