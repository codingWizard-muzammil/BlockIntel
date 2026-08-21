import { ContractSummaryCard } from "@/components/analyzer/ContractSummaryCard";
import { KeyFeaturesCard } from "@/components/analyzer/KeyFeaturesCard";
import { ContractDetailsCard } from "@/components/analyzer/ContractDetailsCard";
import { PotentialAttacksCard } from "@/components/analyzer/PotentialAttacksCard";
import { ImprovementsCard } from "@/components/analyzer/ImprovementsCard";
import { getContractAnalysis } from "@/lib/analyzer-data";

export default async function SummaryPage(
  props: PageProps<"/contract/[address]/summary">,
) {
  const { address } = await props.params;
  const analysis = getContractAnalysis(address);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <ContractSummaryCard summary={analysis.summary} />
        </div>
        <div className="flex shrink-0 flex-col gap-6 lg:w-[300px]">
          <KeyFeaturesCard features={analysis.keyFeatures} />
          <ContractDetailsCard details={analysis.details} />
        </div>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <PotentialAttacksCard attacks={analysis.attacks} />
        </div>
        <div className="flex-1">
          <ImprovementsCard improvements={analysis.improvements} />
        </div>
      </div>
    </div>
  );
}
