import { useEffect, useRef, useState } from "react";
import { FileCode, Plus, X } from "lucide-react";
import { useEditorStore, type EditorFile } from "@/store/editor-store";

function FileTab({ file }: { file: EditorFile }) {
  const activeFileId = useEditorStore((s) => s.activeFileId);
  const setActiveFile = useEditorStore((s) => s.setActiveFile);
  const closeFile = useEditorStore((s) => s.closeFile);
  const setFileName = useEditorStore((s) => s.setFileName);
  const fileCount = useEditorStore((s) => s.files.length);

  const isActive = file.id === activeFileId;
  const extension = file.extension ? `.${file.extension}` : "";
  const baseName = extension && file.fileName.endsWith(extension)
    ? file.fileName.slice(0, -extension.length)
    : file.fileName;
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
    if (!isActive) {
      setActiveFile(file.id);
      return;
    }
    setDraftName(baseName);
    setIsEditing(true);
  }

  function commit() {
    const trimmed = draftName.trim();
    if (trimmed) setFileName(trimmed + extension);
    setIsEditing(false);
  }

  return (
    <div
      className={`group flex items-center gap-2 border-t-2 px-4 pb-[9.5px] pt-[10.5px] editor-scrollbar ${
        isActive
          ? "border-accent bg-surface"
          : "cursor-pointer border-transparent hover:bg-surface/60"
      }`}
      onClick={() => !isActive && setActiveFile(file.id)}
    >
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
          {file.fileName}
        </span>
      )}
      {fileCount > 1 ? (
        <button
          aria-label={`Close ${file.fileName}`}
          onClick={(e) => {
            e.stopPropagation();
            closeFile(file.id);
          }}
          className="text-muted opacity-0 hover:text-ink group-hover:opacity-100"
        >
          <X className="size-3" />
        </button>
      ) : (
        <span className="size-2 rounded-full bg-warning" />
      )}
    </div>
  );
}

export function FileTabs() {
  const { files, addFile } = useEditorStore();

  return (
    <div className="flex items-start overflow-x-auto border-b border-border bg-canvas">
      {files.map((file) => (
        <FileTab key={file.id} file={file} />
      ))}
      <button
        aria-label="New file"
        onClick={addFile}
        className="flex items-center justify-center px-4 pb-2.25 pt-[10.5px] text-muted hover:text-ink"
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}
