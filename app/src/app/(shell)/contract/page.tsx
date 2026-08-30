"use client";
import { CreateProjectModal } from "@/components/editor/CreateProjectModal";
import { Button } from "@/components/ui/Button";
import { ComingSoon } from "@/components/ui/ComingSoon";
import Dropdown from "@/components/ui/Dropdown";
import { useProjectStore } from "@/store/project-store";
import { Folder, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ContractIndexPage = () => {
  const router = useRouter();
  const data = useProjectStore((s) => s.projects);
  const setActiveProjectId = useProjectStore((s) => s.setActiveProjectId);
  const [projectModelOpen, setProjectModelOpen] = useState(false);

  const handleOnChange = (id: string) => {
    setActiveProjectId(id);
    router.replace(`/contract/${id}/summary`);
  };

  return (
    <>
      <div className="m-auto flex flex-col ">
        <ComingSoon
          icon={HelpCircle}
          title="Select a project"
          description="Select a project to start writing, compiling & analyzing contracts"
        />
        {data?.length ? (
          <Dropdown
            label=""
            getKey={(opt) => opt?.id}
            onChange={(opt) => handleOnChange(opt?.id)}
            options={data}
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
          <Button variant="primary" onClick={() => setProjectModelOpen(true)}>
            Create Project
          </Button>
        )}
      </div>
      <CreateProjectModal
        open={projectModelOpen}
        onClose={() => setProjectModelOpen(false)}
      />
    </>
  );
};

export default ContractIndexPage;
