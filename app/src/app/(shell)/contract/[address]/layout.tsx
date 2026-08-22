import { EditorPanel } from "@/components/editor/EditorPanel";
import { AnalysisTabs } from "@/components/analyzer/AnalysisTabs";
import { getContractAnalysis } from "@/lib/analyzer-data";

export default async function ContractLayout(
  props: LayoutProps<"/contract/[address]">,
) {
  const { address } = await props.params;
  const analysis = getContractAnalysis(address);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <EditorPanel analysis={analysis} />
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AnalysisTabs address={address} />
        <div className="min-h-0 flex-1 overflow-auto p-6 scrollbar-editor overflow-x-auto">
          {props.children}
        </div>
      </section>
    </div>
  );
}
