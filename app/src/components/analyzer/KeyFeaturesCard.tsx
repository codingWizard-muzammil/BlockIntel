import { CheckCircle2, Star } from "lucide-react";
import { Card, CardHeading } from "@/components/ui/Card";

export function KeyFeaturesCard({ features }: { features: string[] }) {
  return (
    <Card>
      <CardHeading icon={Star} size="md">
        Key Features
      </CardHeading>
      {features.length ? (
        <ul className="flex flex-col gap-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-ink">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
              {feature}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No key features detected yet.</p>
      )}
    </Card>
  );
}
