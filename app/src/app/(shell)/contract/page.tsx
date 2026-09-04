"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Folder, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Dropdown } from "@/components/ui/Dropdown";
import { CreateProjectModal } from "@/components/editor/CreateProjectModal";
import { useProjectStore } from "@/store/project-store";

export default function ContractIndexPage() {
  const router = useRouter();
  const { projects, setActiveProjectId } = useProjectStore();
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  function handleSelectProject(id: string) {
    setActiveProjectId(id);
    router.replace(`/contract/${id}/summary`);
  }

  return (
    <>
      <div className="m-auto flex flex-col">
        <ComingSoon
          icon={HelpCircle}
          title="Select a project"
          description="Select a project to start writing, compiling & analyzing contracts"
        />
        {projects.length ? (
          <Dropdown
            label=""
            getKey={(project) => project.id}
            onChange={(project) => handleSelectProject(project.id)}
            options={projects}
            renderOption={(project) => (
              <>
                <span className="flex-1">{project.name}</span>
              </>
            )}
            trigger={
              <>
                <Folder />
                Select Project
              </>
            }
            value=""
            className="mx-auto mt-3"
          />
        ) : (
          <Button variant="primary" onClick={() => setProjectModalOpen(true)}>
            Create Project
          </Button>
        )}
      </div>
      <CreateProjectModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
      />
    </>
  );
}
