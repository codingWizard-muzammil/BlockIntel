export type Severity = "high" | "medium" | "low";

export type ContractSummary = {
  description: string[];
  purpose: string;
  type: string;
  visibility: string;
  compiler: string;
  linesOfCode: number;
  estimatedGasAvg: string;
};

export type ExplainerFunction = {
  name: string;
  access: string;
  description: string;
  // Deterministic, merged in from the contract's compiled ABI — absent
  // until the contract has been compiled at least once.
  signature?: string;
  stateMutability?: string;
};

export type ContractExplainer = {
  flow: string;
  functions: ExplainerFunction[];
};

export type Improvement = {
  title: string;
  severity: Severity;
  reason: string;
  how: string;
};
