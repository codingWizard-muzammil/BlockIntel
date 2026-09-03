import { ArrowRight, Lightbulb } from "lucide-react";
import { Card, CardHeading } from "@/components/ui/Card";
import { SeverityCardItem } from "@/components/ui/SeverityCardItem";
import type { Improvement } from "@/types/analysis";

function ImprovementItem({ improvement }: { improvement: Improvement }) {
  return (
    <SeverityCardItem title={improvement.title} severity={improvement.severity}>
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
    </SeverityCardItem>
  );
}

export function ImprovementsCard({
  improvements,
  notAnalyzed = false,
}: {
  improvements: Improvement[];
  notAnalyzed?: boolean;
}) {
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
        <p className="text-sm text-muted">
          {notAnalyzed
            ? "Not analyzed yet — click Analyze to get improvement suggestions."
            : "No improvement suggestions yet."}
        </p>
      )}
    </Card>
  );
}
