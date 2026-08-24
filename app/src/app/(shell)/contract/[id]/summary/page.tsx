import { SummaryView } from "@/components/analyzer/SummaryView";

export default async function SummaryPage(
  props: PageProps<"/contract/[id]/summary">,
) {
  const { id } = await props.params;

  return <SummaryView projectId={id} />;
}
