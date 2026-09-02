import {
  AlignLeft,
  CheckCircle2,
  CircleAlert,
  Clock,
  Fuel,
  Loader2,
  Play,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";

export function EditorFooter() {
  const status = useEditorStore((s) => s.compileStatus);
  const compiling = useEditorStore((s) => s.compiling);
  const compileError = useEditorStore((s) => s.compileError);
  const activeContractId = useEditorStore(
    (s) => s.files.find((f) => f.id === s.activeFileId)?.contractId ?? null,
  );
  const { clearSource, formatSource } = useEditorStore();
  const compileContract = useProjectStore((s) => s.compileContract);

  const failureMessage = compileError ?? status.errors[0]?.message ?? null;

  return (
    <div className="flex shrink-0 flex-col gap-4 border-t border-border px-4 pb-4 pt-4.25">
      <div className="flex items-center justify-between text-xs text-muted">
        {compiling ? (
          <span className="flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" />
            Compiling…
          </span>
        ) : status.ok ? (
          <>
            <div className="flex items-center gap-4">
              <span>{status.solidityVersion}</span>
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
          <span className="flex items-center gap-1 truncate text-warning" title={failureMessage ?? undefined}>
            <CircleAlert className="size-3 shrink-0" />
            {failureMessage ?? "Compilation for this language isn't supported yet"}
          </span>
        ) : failureMessage ? (
          <span className="flex items-center gap-1 truncate text-danger" title={failureMessage}>
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
          disabled={!activeContractId || compiling}
          title={activeContractId ? undefined : "Name this file to save it before compiling"}
          onClick={() => activeContractId && compileContract(activeContractId)}
        >
          {compiling ? (
            <Loader2 className="size-[10.5px] animate-spin" />
          ) : (
            <Play className="size-[10.5px]" />
          )}
          Compile & Analyze
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
