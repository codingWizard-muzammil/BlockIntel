import { useEffect, useRef, useState } from "react";
import { FileCode, Plus } from "lucide-react";
import { useEditorStore } from "@/store/editor-store";

function splitFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) return { baseName: fileName, extension: "" };
  return {
    baseName: fileName.slice(0, dotIndex),
    extension: fileName.slice(dotIndex),
  };
}

export function FileTabs() {
  const { fileName, setFileName } = useEditorStore();
  const { baseName, extension } = splitFileName(fileName);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(baseName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function startEditing() {
    setDraftName(baseName);
    setIsEditing(true);
  }

  function commit() {
    const trimmed = draftName.trim();
    if (trimmed) setFileName(trimmed + extension);
    setIsEditing(false);
  }

  return (
    <div className="flex items-start border-b border-border bg-canvas">
      <div className="flex items-center gap-2 border-t-2 border-accent bg-surface px-4 pb-[9.5px] pt-[10.5px]">
        <FileCode className="size-3 text-muted" />
        {isEditing ? (
          <span className="flex items-center text-xs text-ink">
            <input
              ref={inputRef}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value.replace(/\./g, ""))}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setIsEditing(false);
              }}
              size={Math.max(draftName.length, 1)}
              className="bg-transparent text-xs text-ink outline-none"
            />
            {extension}
          </span>
        ) : (
          <span
            className="cursor-pointer text-xs text-ink"
            onClick={startEditing}
          >
            {fileName}
          </span>
        )}
        <span className="size-2 rounded-full bg-warning" />
      </div>
    </div>
  );
}
