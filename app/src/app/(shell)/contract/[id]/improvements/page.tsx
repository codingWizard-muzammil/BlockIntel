import { ImprovementsView } from "@/components/analyzer/ImprovementsView";

export default async function ImprovementsPage(
  props: PageProps<"/contract/[id]/improvements">,
) {
  const { id } = await props.params;

  return <ImprovementsView projectId={id} />;
}
