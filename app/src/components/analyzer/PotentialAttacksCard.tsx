import { ArrowRight, ShieldAlert } from "lucide-react";
import { Card, CardHeading } from "@/components/ui/Card";
import { SeverityCardItem } from "@/components/ui/SeverityCardItem";
import { Button } from "@/components/ui/Button";
import type { AttackScenario } from "@/types/analysis";

function AttackItem({ attack, index }: { attack: AttackScenario; index: number }) {
  return (
    <SeverityCardItem title={`${index}. ${attack.title}`} severity={attack.severity}>
      <p className="mb-3 text-xs leading-4 text-muted">{attack.description}</p>
      <Button variant="ghost" size="sm">
        Simulate Attack
      </Button>
    </SeverityCardItem>
  );
}

export function PotentialAttacksCard({ attacks }: { attacks: AttackScenario[] }) {
  return (
    <Card>
      <CardHeading icon={ShieldAlert}>Potential Attacks</CardHeading>
      {attacks.length ? (
        <>
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
        </>
      ) : (
        <p className="text-sm text-muted">No attack scenarios found yet.</p>
      )}
    </Card>
  );
}
