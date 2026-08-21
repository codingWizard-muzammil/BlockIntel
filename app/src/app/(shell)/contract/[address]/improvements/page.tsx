import { ImprovementsCard } from "@/components/analyzer/ImprovementsCard";
import { getContractAnalysis } from "@/lib/analyzer-data";

export default async function ImprovementsPage(
  props: PageProps<"/contract/[address]/improvements">,
) {
  const { address } = await props.params;
  const analysis = getContractAnalysis(address);

  return (
    <div className="mx-auto max-w-2xl">
      <ImprovementsCard improvements={analysis.improvements} />
    </div>
  );
}
