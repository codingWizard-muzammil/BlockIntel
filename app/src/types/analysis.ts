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

export type AttackScenario = {
  title: string;
  severity: Severity;
  description: string;
};

export type Improvement = {
  title: string;
  severity: Severity;
  reason: string;
  how: string;
};
