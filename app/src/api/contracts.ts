import { apiClient } from "./client";

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

export type DeploymentResult = {
  ok: boolean;
  address: string | null;
  chain: string;
  rpcUrl: string | null;
  // The playground wallet that deployed it — the connected user's own
  // address on this chain, not a shared devnet account.
  deployer: string | null;
  error: string | null;
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
