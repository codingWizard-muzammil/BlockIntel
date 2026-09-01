import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, FileCode, Plus, X } from "lucide-react";
import {
  CHAIN_LANGUAGES,
  useEditorStore,
  type EditorFile,
} from "@/store/editor-store";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useDeleteContractFlow } from "@/hooks/useDeleteContractFlow";
import { useProjectStore } from "@/store/project-store";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

function LanguageMenu({
  file,
  languages,
  anchorRef,
  menuRef,
  onSelect,
}: {
  file: EditorFile;
  languages: string[];
  anchorRef: React.RefObject<HTMLElement | null>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (language: string) => void;
}) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useLayoutEffect(() => {
    function updatePosition() {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect) setPosition({ top: rect.bottom + 4, left: rect.left });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef]);

  if (!position) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ top: position.top, left: position.left }}
      className="fixed z-50 min-w-32 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-xl shadow-black/40"
    >
      {languages.map((lang) => {
        const selected = lang === file.language;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => onSelect(lang)}
            className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
              selected
                ? "bg-accent text-white"
                : "text-ink hover:bg-surface-muted"
            }`}
          >
            <span className="flex-1">{lang}</span>
            {selected && <Check className="size-3 shrink-0" />}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}

function FileTab({
  file,
  languages,
  autoEdit,
  onCreate,
  onRequestDelete,
}: {
  file: EditorFile;
  languages: string[];
  autoEdit: boolean;
  onCreate: (file: EditorFile, name: string) => void;
  onRequestDelete: (file: EditorFile) => void;
}) {
  const activeFileId = useEditorStore((s) => s.activeFileId);
  const setActiveFile = useEditorStore((s) => s.setActiveFile);
  const setFileName = useEditorStore((s) => s.setFileName);
  const setFileLanguage = useEditorStore((s) => s.setFileLanguage);
  const fileCount = useEditorStore((s) => s.files.length);
  const updateContractMeta = useProjectStore((s) => s.updateContractMeta);

  const isActive = file.id === activeFileId;
  const multiLanguage = languages.length > 1;
  const extension = file.extension ? `.${file.extension}` : "";
  const baseName =
    extension && file.name.endsWith(extension)
      ? file.name.slice(0, -extension.length)
      : file.name;

  const [isEditing, setIsEditing] = useState(autoEdit);
  const [draftName, setDraftName] = useState(baseName);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(
    () => autoEdit && multiLanguage,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const languageTriggerRef = useRef<HTMLButtonElement>(null);

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

  function stopEditing() {
    setIsEditing(false);
    setLanguageMenuOpen(false);
  }

  function commit() {
    const trimmed = draftName.trim();
    if (trimmed) {
      const finalName = trimmed + extension;
      const renamed = finalName !== file.name;
      setFileName(finalName);
      // Create the contract the first time any unsaved file is named —
      // not just ones opened via the "+" button (autoEdit), otherwise the
      // project's initial default file can never be persisted.
      if (!file.contractId) {
        onCreate(file, finalName);
      } else if (renamed) {
        updateContractMeta(file.id, file.contractId, { name: finalName });
      }
    }
    stopEditing();
  }

  useClickOutside([editRef, menuRef], commit, isEditing);

  function handleNameClick() {
    if (!isActive) {
      setActiveFile(file.id);
      return;
    }
    if (!isEditing) startEditing();
  }

  return (
    <div
      className={`group relative flex items-center gap-2 border-t-2 px-4 pb-[9.5px] pt-[10.5px] editor-scrollbar ${
        isActive
          ? "border-accent bg-surface"
          : "cursor-pointer border-transparent hover:bg-surface/60"
      }`}
      onClick={() => !isActive && setActiveFile(file.id)}
    >
      <FileCode className="size-3 text-muted" />
      {isEditing ? (
        <div ref={editRef} className="flex items-center gap-1.5">
          <span className="flex items-center text-xs text-ink">
            <input
              ref={inputRef}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value.replace(/\./g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") stopEditing();
              }}
              size={Math.max(draftName.length, 1)}
              className="bg-transparent text-xs text-ink outline-none"
            />
            {extension}
          </span>
          {multiLanguage && (
            <button
              ref={languageTriggerRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLanguageMenuOpen((open) => !open);
              }}
              className="flex items-center gap-1 rounded border border-border bg-input px-1.5 py-0.5 text-[10px] text-muted hover:text-ink"
            >
              {file.language}
              <ChevronDown
                className={`size-2.5 transition-transform ${languageMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
          )}
          {languageMenuOpen && (
            <LanguageMenu
              file={file}
              languages={languages}
              anchorRef={languageTriggerRef}
              menuRef={menuRef}
              onSelect={(lang) => {
                setFileLanguage(file.id, lang);
                if (file.contractId && lang !== file.language) {
                  const renamed = useEditorStore
                    .getState()
                    .files.find((f) => f.id === file.id);
                  updateContractMeta(file.id, file.contractId, {
                    language: lang,
                    name: renamed?.name,
                  });
                }
                setLanguageMenuOpen(false);
              }}
            />
          )}
        </div>
      ) : (
        <span
          className="cursor-pointer text-xs text-ink"
          onClick={handleNameClick}
        >
          {file.name}
        </span>
      )}
      {fileCount > 1 ? (
        <button
          aria-label={`Close ${file.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete(file);
          }}
          className="text-muted opacity-0 hover:text-ink group-hover:opacity-100"
        >
          <X className="size-3" />
        </button>
      ) : (
        ""
      )}
    </div>
  );
}

export function FileTabs() {
  const { files, addFile, lockedChain } = useEditorStore();
  const { activeProjectId, saveContract } = useProjectStore();
  const [autoEditFileId, setAutoEditFileId] = useState<string | null>(null);
  const { requestDelete, dialogProps } = useDeleteContractFlow();

  const languages = lockedChain ? CHAIN_LANGUAGES[lockedChain] : [];

  function handleAddFile() {
    const id = addFile();
    setAutoEditFileId(id);
  }

  function handleFileCreate(file: EditorFile, name: string) {
    setAutoEditFileId(null);
    if (!activeProjectId) return;
    saveContract(file.id, {
      projectId: activeProjectId,
      name,
      language: file.language,
      source: file.source,
    });
  }

  return (
    <div className="flex items-start overflow-x-auto border-b border-border bg-canvas">
      {files.map((file) => (
        <FileTab
          key={file.id}
          file={file}
          languages={languages}
          autoEdit={autoEditFileId === file.id}
          onCreate={handleFileCreate}
          onRequestDelete={requestDelete}
        />
      ))}
      <button
        aria-label="New file"
        onClick={handleAddFile}
        className="flex items-center justify-center px-4 pb-2.25 pt-[10.5px] text-muted hover:text-ink"
      >
        <Plus className="size-3" />
      </button>
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
