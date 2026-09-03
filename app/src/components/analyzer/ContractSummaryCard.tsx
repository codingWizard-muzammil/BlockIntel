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

// Compile-only info (compiler/lines/gas) — deterministic, available before
// AI analysis has ever run. Shown in place of the full AI-generated summary
// (description/purpose/type/visibility) until Analyze is clicked.
export type BasicContractInfo = {
  compiler: string;
  linesOfCode: number;
  estimatedGasAvg: string;
};

export function ContractSummaryCard({
  summary,
  basicInfo = null,
}: {
  summary: ContractSummary | null;
  basicInfo?: BasicContractInfo | null;
}) {
  return (
    <Card>
      <CardHeading icon={FileText}>Contract Summary</CardHeading>
      {summary ? (
        <>
          <p className="mb-2.5 text-sm leading-[22.75px] text-muted">
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
      ) : basicInfo ? (
        <>
          <p className="mb-2.5 text-sm leading-[22.75px] text-muted">
            Compiled successfully. Click Analyze for the AI-generated
            description, key features, attacks & improvements.
          </p>
          <div className="border-t border-border pt-1">
            <Row label="Compiler" value={basicInfo.compiler} />
            <Row label="Lines of Code" value={basicInfo.linesOfCode} />
            <Row label="Estimated Gas (avg)" value={basicInfo.estimatedGasAvg} />
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
