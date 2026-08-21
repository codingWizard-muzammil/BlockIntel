import { Settings } from "lucide-react";
import { Card, CardHeading } from "@/components/ui/Card";
import type { ContractDetails } from "@/lib/analyzer-data";

export function ContractDetailsCard({ details }: { details: ContractDetails }) {
  const rows: [string, string][] = [
    ["Contract Name", details.contractName],
    ["Language", details.language],
    ["Chain", details.chain],
    ["License", details.license],
    ["Optimization", details.optimization],
    ["EVM Version", details.evmVersion],
  ];

  return (
    <Card>
      <CardHeading icon={Settings} size="md">
        Contract Details
      </CardHeading>
      <div className="flex flex-col gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-2">
            <span className="text-sm text-muted">{label}</span>
            <span className="text-sm text-ink">{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
