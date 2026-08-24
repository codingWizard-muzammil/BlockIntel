import { ArrowRight, Lightbulb } from "lucide-react";
import { Card, CardHeading } from "@/components/ui/Card";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import type { Improvement } from "@/types/analysis";

function ImprovementItem({ improvement }: { improvement: Improvement }) {
  return (
    <div className="w-full rounded-lg border border-border-muted bg-surface-muted p-4.25">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{improvement.title}</h3>
        <SeverityBadge severity={improvement.severity} />
      </div>
      <div className="flex flex-col gap-1 text-xs leading-4">
        <p>
          <span className="font-medium text-ink">Reason:</span>{" "}
          <span className="text-muted">{improvement.reason}</span>
        </p>
        <p>
          <span className="font-medium text-ink">How:</span>{" "}
          <span className="text-muted">{improvement.how}</span>
        </p>
      </div>
    </div>
  );
}

export function ImprovementsCard({ improvements }: { improvements: Improvement[] }) {
  return (
    <Card>
      <CardHeading icon={Lightbulb}>Improvements</CardHeading>
      {improvements.length ? (
        <>
          <div className="flex flex-col gap-4">
            {improvements.map((improvement) => (
              <ImprovementItem key={improvement.title} improvement={improvement} />
            ))}
          </div>
          <a
            href="#"
            className="mt-4 flex items-center gap-2 text-sm text-accent hover:underline"
          >
            View more suggestions
            <ArrowRight className="size-3" />
          </a>
        </>
      ) : (
        <p className="text-sm text-muted">No improvement suggestions yet.</p>
      )}
    </Card>
  );
}
