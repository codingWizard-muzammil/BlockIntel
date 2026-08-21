import { FileCode, Plus } from "lucide-react";
import { useEditorStore } from "@/store/editor-store";

export function FileTabs() {
  const fileName = useEditorStore((s) => s.fileName);

  return (
    <div className="flex items-start border-b border-border bg-canvas">
      <div className="flex items-center gap-2 border-t-2 border-accent bg-surface px-4 pb-[9.5px] pt-[10.5px]">
        <FileCode className="size-3 text-muted" />
        <span className="text-xs text-ink">{fileName}</span>
        <span className="size-2 rounded-full bg-warning" />
      </div>
      <button
        aria-label="New file"
        className="flex items-center justify-center px-4 pb-2.25 pt-[10.5px] text-muted hover:text-ink"
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}
