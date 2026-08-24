import type { Severity } from "@/types/analysis";

const styles: Record<Severity, string> = {
  high: "text-danger border-danger/30",
  medium: "text-warning border-warning/30",
  low: "text-success border-success/30",
};

const labels: Record<Severity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`shrink-0 rounded border px-2.25 py-0.75 text-xs leading-4 ${styles[severity]}`}
    >
      {labels[severity]}
    </span>
  );
}
