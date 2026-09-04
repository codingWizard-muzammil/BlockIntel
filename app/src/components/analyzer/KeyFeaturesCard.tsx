import { CheckCircle2, Star } from "lucide-react";
import { Card, CardHeading } from "@/components/ui/Card";
import { useState } from "react";

export function KeyFeaturesCard({
  features,
  notAnalyzed = false,
}: {
  features: string[];
  notAnalyzed?: boolean;
}) {
  const filtered = features.length >= 3 ? features.slice(0, 3) : features;
  const [finalFeatures, setFinalFeatures] = useState(filtered);

  return (
    <Card>
      <CardHeading icon={Star} size="md">
        Key Features
      </CardHeading>
      {finalFeatures.length ? (
        <ul className="flex flex-col gap-3">
          {finalFeatures.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm text-ink"
            >
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
              {feature}
            </li>
          ))}
          {finalFeatures.length !== features.length ? (
            <li
              className="text-center text-sm text-blue-500 hover:underline cursor-pointer"
              onClick={() => setFinalFeatures(features)}
            >
              View All...
            </li>
          ) : (
            ""
          )}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          {notAnalyzed
            ? "Not analyzed yet — click Analyze to detect key features."
            : "No key features detected yet."}
        </p>
      )}
    </Card>
  );
}
