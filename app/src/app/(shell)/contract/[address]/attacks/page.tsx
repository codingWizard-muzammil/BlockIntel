import { PotentialAttacksCard } from "@/components/analyzer/PotentialAttacksCard";
import { getContractAnalysis } from "@/lib/analyzer-data";

export default async function AttacksPage(
  props: PageProps<"/contract/[address]/attacks">,
) {
  const { address } = await props.params;
  const analysis = getContractAnalysis(address);

  return (
    <div className="mx-auto max-w-2xl">
      <PotentialAttacksCard attacks={analysis.attacks} />
    </div>
  );
}
