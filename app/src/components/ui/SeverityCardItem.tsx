import type { ReactNode } from "react";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import type { Severity } from "@/types/analysis";

export function SeverityCardItem({
  title,
  severity,
  children,
}: {
  title: string;
  severity: Severity;
  children: ReactNode;
}) {
  return (
    <div className="w-full rounded-lg border border-border-muted bg-surface-muted p-4.25">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <SeverityBadge severity={severity} />
      </div>
      {children}
    </div>
  );
}
