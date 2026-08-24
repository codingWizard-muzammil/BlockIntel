import { FileText } from "lucide-react";
import { Card, CardHeading } from "@/components/ui/Card";
import type { ContractSummary } from "@/types/analysis";

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-start justify-between border-b border-border-muted py-4 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

export function ContractSummaryCard({ summary }: { summary: ContractSummary | null }) {
  return (
    <Card>
      <CardHeading icon={FileText}>Contract Summary</CardHeading>
      {summary ? (
        <>
          <p className="mb-[10px] text-sm leading-[22.75px] text-muted">
            {summary.description.map((line, i) => (
              <span key={i}>
                {line}
                {i < summary.description.length - 1 ? " " : ""}
              </span>
            ))}
          </p>
          <div className="border-t border-border pt-1">
            <Row label="Purpose" value={summary.purpose} />
            <Row label="Type" value={summary.type} />
            <Row label="Visibility" value={summary.visibility} />
            <Row label="Compiler" value={summary.compiler} />
            <Row label="Lines of Code" value={summary.linesOfCode} />
            <Row label="Estimated Gas (avg)" value={summary.estimatedGasAvg} />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">
          No summary yet. Compile & analyze a contract to generate one.
        </p>
      )}
    </Card>
  );
}
