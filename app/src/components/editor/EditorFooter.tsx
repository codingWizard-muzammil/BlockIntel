import {
  AlignLeft,
  CheckCircle2,
  CircleAlert,
  Clock,
  Fuel,
  Loader2,
  Play,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import { redirect, usePathname } from "next/navigation";

export function EditorFooter() {
  const status = useEditorStore((s) => s.compileStatus);
  const compiling = useEditorStore((s) => s.compiling);
  const compileError = useEditorStore((s) => s.compileError);
  const analyzing = useEditorStore((s) => s.analyzing);
  const activeFile = useEditorStore(
    (s) => s.files.find((f) => f.id === s.activeFileId) ?? null,
  );
  const { clearSource, formatSource } = useEditorStore();
  const compileContract = useProjectStore((s) => s.compileContract);
  const analyzeContract = useProjectStore((s) => s.analyzeContract);
  const saveContract = useProjectStore((s) => s.saveContract);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);

  const failureMessage = compileError ?? status.errors[0]?.message ?? null;

  const pathname = usePathname();

  // A file only needs a persisted contract to compile/analyze against — it
  // no longer has to be renamed first. Renaming used to be the only thing
  // that saved it (see FileTabs' `commit`), which both left the pre-made
  // "Untitled1.sol" tab permanently uncompilable until renamed, and made
  // renaming look like it was silently creating a new contract.
  const canRun = !!activeFile && (!!activeFile.contractId || !!activeProjectId);

  async function ensureContractId(): Promise<string | null> {
    if (activeFile?.contractId) return activeFile.contractId;
    if (!activeFile || !activeProjectId) return null;
    const contract = await saveContract(activeFile.id, {
      projectId: activeProjectId,
      name: activeFile.name,
      language: activeFile.language,
      source: activeFile.source,
    });
    return contract.id;
  }

  async function handleCompile() {
    const contractId = await ensureContractId();
    if (!contractId) return;
    await compileContract(contractId);
    redirect(pathname.replace("/summary", "/playground"), "replace");
  }

  async function handleAnalyze() {
    const contractId = await ensureContractId();
    if (!contractId) return;
    await analyzeContract(contractId, true);
  }

  return (
    <div className="flex shrink-0 flex-col gap-4 border-t border-border px-4 pb-4 pt-4.25 overflow-x-auto scrollbar-editor">
      <div className="flex items-center justify-between text-xs text-muted ">
        {compiling ? (
          <span className="flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" />
            Compiling…
          </span>
        ) : status.ok ? (
          <>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="size-3" />
                Compiled Successfully
              </span>
            </div>
            <div className="flex items-center gap-4">
              {status.gas ? (
                <span className="flex items-center gap-1">
                  <Fuel className="size-3" />
                  {status.gas}
                </span>
              ) : null}
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {status.time}
              </span>
            </div>
          </>
        ) : status.unsupported ? (
          <span
            className="flex items-center gap-1 truncate text-warning"
            title={failureMessage ?? undefined}
          >
            <CircleAlert className="size-3 shrink-0" />
            {failureMessage ??
              "Compilation for this language isn't supported yet"}
          </span>
        ) : failureMessage ? (
          <span
            className="flex items-center gap-1 truncate text-danger"
            title={failureMessage}
          >
            <XCircle className="size-3 shrink-0" />
            {failureMessage}
          </span>
        ) : (
          <span>Not compiled yet</span>
        )}
      </div>
      <div className="flex items-start gap-2">
        <Button
          variant="primary"
          className="flex-1"
          disabled={!canRun || compiling}
          onClick={handleCompile}
        >
          {compiling ? (
            <Loader2 className="size-[10.5px] animate-spin" />
          ) : (
            <Play className="size-[10.5px]" />
          )}
          Compile
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          disabled={!canRun || analyzing}
          onClick={handleAnalyze}
        >
          {analyzing ? (
            <Loader2 className="size-[10.5px] animate-spin" />
          ) : (
            <Sparkles className="size-[10.5px]" />
          )}
          Analyze
        </Button>
        <Button variant="secondary" onClick={formatSource}>
          <AlignLeft className="size-[10.5px]" />
          Format
        </Button>
        <Button variant="secondary" onClick={clearSource}>
          <Trash2 className="size-3" />
          Clear
        </Button>
      </div>
    </div>
  );
}
