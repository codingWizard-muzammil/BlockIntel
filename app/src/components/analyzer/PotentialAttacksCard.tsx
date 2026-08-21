import { ArrowRight, ShieldAlert } from "lucide-react";
import { Card, CardHeading } from "@/components/ui/Card";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { Button } from "@/components/ui/Button";
import type { AttackScenario } from "@/lib/analyzer-data";

function AttackItem({ attack, index }: { attack: AttackScenario; index: number }) {
  return (
    <div className="w-full rounded-lg border border-border-muted bg-surface-muted p-[17px]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">
          {index}. {attack.title}
        </h3>
        <SeverityBadge severity={attack.severity} />
      </div>
      <p className="mb-3 text-xs leading-4 text-muted">{attack.description}</p>
      <Button variant="ghost" size="sm">
        Simulate Attack
      </Button>
    </div>
  );
}

export function PotentialAttacksCard({ attacks }: { attacks: AttackScenario[] }) {
  return (
    <Card>
      <CardHeading icon={ShieldAlert}>Potential Attacks</CardHeading>
      <div className="flex flex-col gap-4">
        {attacks.map((attack, i) => (
          <AttackItem key={attack.title} attack={attack} index={i + 1} />
        ))}
      </div>
      <a
        href="#"
        className="mt-4 flex items-center gap-2 text-sm text-accent hover:underline"
      >
        View all attack scenarios
        <ArrowRight className="size-3" />
      </a>
    </Card>
  );
}
