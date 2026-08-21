import { AlignLeft, CheckCircle2, Clock, Fuel, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useEditorStore } from "@/store/editor-store";

export function EditorFooter() {
  const status = useEditorStore((s) => s.compileStatus);
  const clearSource = useEditorStore((s) => s.clearSource);
  const formatSource = useEditorStore((s) => s.formatSource);

  return (
    <div className="flex shrink-0 flex-col gap-4 border-t border-border px-4 pb-4 pt-4.25">
      <div className="flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-4">
          <span>{status.solidityVersion}</span>
          <span className="flex items-center gap-1 text-success">
            <CheckCircle2 className="size-3" />
            Compiled Successfully
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Fuel className="size-3" />
            {status.gas}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {status.time}
          </span>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <Button variant="primary" className="flex-1">
          <Play className="size-[10.5px]" />
          Compile
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
