import { PlaygroundView } from "@/components/analyzer/PlaygroundView";

export default async function PlaygroundPage(
  props: PageProps<"/contract/[id]/playground">,
) {
  const { id } = await props.params;

  return <PlaygroundView projectId={id} />;
}
