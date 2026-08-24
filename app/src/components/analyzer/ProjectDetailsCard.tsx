import { Settings } from "lucide-react";
import { Card, CardHeading } from "@/components/ui/Card";
import { truncateAddress } from "@/helpers/address";
import type { ApiProject } from "@/api/projects";

export function ProjectDetailsCard({ project }: { project: ApiProject }) {
  const rows: [string, string][] = [
    ["Project Name", project.name],
    ["Owner", truncateAddress(project.ownerAddress)],
    ["Created", new Date(project.createdAt).toLocaleDateString()],
  ];

  return (
    <Card>
      <CardHeading icon={Settings} size="md">
        Project Details
      </CardHeading>
      <div className="flex flex-col gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-2">
            <span className="text-sm text-muted">{label}</span>
            <span className="text-sm text-ink">{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
