import { AttacksView } from "@/components/analyzer/AttacksView";

export default async function AttacksPage(
  props: PageProps<"/contract/[id]/attacks">,
) {
  const { id } = await props.params;

  return <AttacksView projectId={id} />;
}
