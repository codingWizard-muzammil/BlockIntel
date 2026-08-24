import { ContractShell } from "@/components/analyzer/ContractShell";

export default async function ContractLayout(
  props: LayoutProps<"/contract/[id]">,
) {
  const { id } = await props.params;

  return <ContractShell id={id}>{props.children}</ContractShell>;
}
