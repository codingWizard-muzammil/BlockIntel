"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Monaco } from "@monaco-editor/react";
import type { editor as MonacoEditor, IDisposable, IRange } from "monaco-editor";
import { ArrowUp, Check, Loader2, Sparkles, Undo2, X } from "lucide-react";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";

type Phase = "prompt" | "loading" | "review";

type Target = {
  // Line the prompt is anchored above.
  anchorLine: number;
  // An empty file gets a centered empty-state card instead of an inline
  // prompt wedged above a blank line 1.
  emptyFile: boolean;
  // Set when the user had text highlighted — the AI then rewrites only
  // that span instead of the whole file.
  selection: { range: IRange; text: string } | null;
};

const STARTER_PROMPTS = [
  "ERC-20 token with a capped supply",
  "Staking vault with time-locked withdrawals",
  "Multisig wallet requiring 2 of 3 owners",
];

const ZONE_GAP_PX = 12;

function captureTarget(editor: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco): Target {
  const model = editor.getModel();
  const selection = editor.getSelection();
  const emptyFile = !model?.getValue().trim();
  if (model && selection && !selection.isEmpty() && !emptyFile) {
    return {
      anchorLine: selection.startLineNumber,
      emptyFile,
      selection: {
        range: selection,
        text: model.getValueInRange(selection, monaco.editor.EndOfLinePreference.LF),
      },
    };
  }
  return { anchorLine: editor.getPosition()?.lineNumber ?? 1, emptyFile, selection: null };
}

// 1-based line/column of `offset` within LF-normalized `text`.
function positionAt(text: string, offset: number) {
  const before = text.slice(0, offset);
  const lineNumber = before.split("\n").length;
  return { lineNumber, column: offset - (before.lastIndexOf("\n") + 1) + 1 };
}

// The smallest whole-line span that differs between `before` and `after`,
// so applying the AI result touches (and highlights) only what changed
// instead of replacing the entire buffer.
function changedLineSpan(before: string, after: string) {
  const max = Math.min(before.length, after.length);
  let start = 0;
  while (start < max && before[start] === after[start]) start++;

  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore--;
    endAfter--;
  }

  // Widen to whole lines. The text before `start` and after `endBefore` /
  // `endAfter` is identical in both strings, so widening both ends by the
  // same amount keeps them aligned.
  start = before.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = before.indexOf("\n", endBefore);
  const widen = (lineEnd === -1 ? before.length : lineEnd) - endBefore;
  return { start, endBefore: endBefore + widen, endAfter: endAfter + widen };
}

export function AiInlinePrompt({
  editor,
  monaco,
  onClose,
}: {
  editor: MonacoEditor.IStandaloneCodeEditor;
  monaco: Monaco;
  onClose: () => void;
}) {
  const language = useEditorStore((s) => s.language);
  const writeCodeWithAi = useProjectStore((s) => s.writeCodeWithAi);

  const [target] = useState(() => captureTarget(editor, monaco));
  const [phase, setPhase] = useState<Phase>("prompt");
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [top, setTop] = useState<number | null>(null);
  const [layout, setLayout] = useState(() => editor.getLayoutInfo());

  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const zoneRef = useRef<{ id: string; zone: MonacoEditor.IViewZone } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const decorationsRef = useRef<MonacoEditor.IEditorDecorationsCollection | null>(null);
  const reviewListenerRef = useRef<IDisposable | null>(null);

  // Reserves real vertical space inside the editor (a Monaco view zone) so
  // the prompt sits between code lines instead of covering them; the
  // overlay itself is positioned over that gap via onDomNodeTop.
  const placeZone = (afterLineNumber: number) => {
    editor.changeViewZones((accessor) => {
      if (zoneRef.current) accessor.removeZone(zoneRef.current.id);
      const zone: MonacoEditor.IViewZone = {
        afterLineNumber,
        heightInPx: (overlayRef.current?.offsetHeight ?? 64) + ZONE_GAP_PX,
        domNode: document.createElement("div"),
        onDomNodeTop: setTop,
      };
      zoneRef.current = { id: accessor.addZone(zone), zone };
    });
  };

  useLayoutEffect(() => {
    // An empty file's card is centered instead — it only moves inline (into
    // a view zone, see applyCode) once there's generated code to review.
    if (!target.emptyFile) {
      placeZone(target.anchorLine - 1);
      editor.revealLineInCenterIfOutsideViewport(target.anchorLine);
    }
    inputRef.current?.focus();

    const layoutListener = editor.onDidLayoutChange(setLayout);
    const resizeObserver = new ResizeObserver(() => {
      const current = zoneRef.current;
      const height = overlayRef.current?.offsetHeight;
      if (!current || !height) return;
      current.zone.heightInPx = height + ZONE_GAP_PX;
      editor.changeViewZones((accessor) => accessor.layoutZone(current.id));
    });
    if (overlayRef.current) resizeObserver.observe(overlayRef.current);

    return () => {
      layoutListener.dispose();
      resizeObserver.disconnect();
      abortRef.current?.abort();
      reviewListenerRef.current?.dispose();
      decorationsRef.current?.clear();
      editor.updateOptions({ readOnly: false });
      editor.changeViewZones((accessor) => {
        if (zoneRef.current) accessor.removeZone(zoneRef.current.id);
      });
      zoneRef.current = null;
    };
    // Mount-only: the target is captured once, when the prompt opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "review") keepRef.current?.focus();
  }, [phase]);

  function close() {
    onClose();
    editor.focus();
  }

  function applyCode(code: string): boolean {
    const model = editor.getModel();
    if (!model) return false;

    const lf = monaco.editor.EndOfLinePreference.LF;
    const before = model.getValue(lf);
    const normalized = code.replace(/\r\n/g, "\n");
    let after = normalized;
    if (target.selection) {
      const { range } = target.selection;
      const full = model.getFullModelRange();
      const prefix = model.getValueInRange(
        { startLineNumber: 1, startColumn: 1, endLineNumber: range.startLineNumber, endColumn: range.startColumn },
        lf,
      );
      const suffix = model.getValueInRange(
        {
          startLineNumber: range.endLineNumber,
          startColumn: range.endColumn,
          endLineNumber: full.endLineNumber,
          endColumn: full.endColumn,
        },
        lf,
      );
      after = prefix + normalized + suffix;
    }
    if (after === before) return false;

    const span = changedLineSpan(before, after);
    const start = positionAt(before, span.start);
    const end = positionAt(before, span.endBefore);

    // Undo stops on both sides make the whole AI edit one Ctrl+Z step.
    editor.pushUndoStop();
    editor.executeEdits("ai-write", [
      {
        range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
        text: after.slice(span.start, span.endAfter),
        forceMoveMarkers: true,
      },
    ]);
    editor.pushUndoStop();

    const firstLine = start.lineNumber;
    const insertedEnd = positionAt(after, span.endAfter);
    // Text ending in a newline stops at column 1 of the next line — don't
    // highlight that untouched line too.
    const lastLine = Math.max(firstLine, insertedEnd.lineNumber - (insertedEnd.column === 1 ? 1 : 0));
    decorationsRef.current = editor.createDecorationsCollection(
      span.endAfter > span.start
        ? [
            {
              range: new monaco.Range(firstLine, 1, lastLine, 1),
              options: {
                isWholeLine: true,
                className: "ai-inserted-line",
                linesDecorationsClassName: "ai-inserted-gutter",
              },
            },
          ]
        : [],
    );
    placeZone(firstLine - 1);
    editor.revealLinesInCenterIfOutsideViewport(firstLine, lastLine);

    // Any further edit by the user implicitly accepts the AI change —
    // after that, a single undo would no longer revert just the AI edit.
    reviewListenerRef.current = editor.onDidChangeModelContent(() => onClose());
    return true;
  }

  async function submit(text = instruction) {
    const trimmed = text.trim();
    const model = editor.getModel();
    if (!trimmed || phase === "loading" || !model) return;

    const fileId = useEditorStore.getState().activeFileId;
    const controller = new AbortController();
    abortRef.current = controller;
    setInstruction(trimmed);
    setError(null);
    setPhase("loading");
    // Locked while the request is in flight so the range the AI is
    // rewriting can't shift under it.
    editor.updateOptions({ readOnly: true });

    const result = await writeCodeWithAi(
      {
        language,
        instruction: trimmed,
        source: model.getValue(monaco.editor.EndOfLinePreference.LF),
        selection: target.selection
          ? {
              text: target.selection.text,
              startLine: target.selection.range.startLineNumber,
              endLine: target.selection.range.endLineNumber,
            }
          : undefined,
      },
      controller.signal,
    );

    if (controller.signal.aborted || useEditorStore.getState().activeFileId !== fileId) return;
    editor.updateOptions({ readOnly: false });

    if (!result.ok) {
      setError(result.message);
      setPhase("prompt");
      inputRef.current?.focus();
      return;
    }
    if (!applyCode(result.code)) {
      setError("The AI didn't change anything — try rephrasing the instruction.");
      setPhase("prompt");
      inputRef.current?.focus();
      return;
    }
    setPhase("review");
  }

  function undo() {
    reviewListenerRef.current?.dispose();
    editor.getModel()?.undo();
    close();
  }

  const modeLabel = target.selection
    ? `Edit lines ${target.selection.range.startLineNumber}–${target.selection.range.endLineNumber}`
    : target.emptyFile
      ? "Generate contract"
      : "Edit file";

  const centered = target.emptyFile && phase !== "review";
  const width = Math.max(240, Math.min(640, layout.contentWidth - 24));

  return (
    <div
      ref={overlayRef}
      style={
        centered
          ? { width: "min(520px, calc(100% - 48px))" }
          : { top: top ?? 0, left: layout.contentLeft, width, visibility: top == null ? "hidden" : "visible" }
      }
      className={`absolute z-20 rounded-lg border border-accent/50 bg-surface text-ink shadow-lg shadow-black/20 ${
        centered ? "left-1/2 top-[12%] -translate-x-1/2" : ""
      }`}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        if (phase === "review") undo();
        else close();
      }}
    >
      <div className="flex items-center gap-2 px-3 pt-2 text-[11px] text-muted">
        <Sparkles className="size-3 text-accent" />
        <span className="font-medium text-ink">{modeLabel}</span>
        {phase === "review" && <span>· Change applied</span>}
        <button
          type="button"
          aria-label="Close AI prompt"
          onClick={close}
          className="ml-auto rounded p-0.5 hover:bg-surface-muted hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {phase === "review" ? (
        <div className="flex items-center gap-2 px-3 pb-2.5 pt-2">
          <p className="min-w-0 flex-1 truncate text-xs text-muted" title={instruction}>
            {instruction}
          </p>
          <button
            type="button"
            onClick={undo}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-input px-2.5 py-1 text-xs hover:border-muted"
          >
            <Undo2 className="size-3" />
            Undo
            <kbd className="ml-1 text-[10px] text-muted">Esc</kbd>
          </button>
          <button
            ref={keepRef}
            type="button"
            onClick={close}
            className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-accent/90"
          >
            <Check className="size-3" />
            Keep
            <kbd className="ml-1 text-[10px] text-white/70">⏎</kbd>
          </button>
        </div>
      ) : (
        <form
          className="flex items-end gap-2 px-3 pb-2.5 pt-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={instruction}
            // readOnly rather than disabled, so focus stays here and Esc
            // can still cancel the in-flight request.
            readOnly={phase === "loading"}
            onChange={(event) => setInstruction(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={
              target.selection
                ? "Describe how to change the selected code…"
                : target.emptyFile
                  ? "Describe the contract you want to write…"
                  : "Describe what to add or change…"
            }
            className="field-sizing-content max-h-40 min-h-6 flex-1 resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-muted read-only:opacity-60"
          />
          <button
            type="submit"
            aria-label="Generate"
            disabled={!instruction.trim() || phase === "loading"}
            className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-white transition-opacity hover:bg-accent/90 disabled:opacity-40"
          >
            {phase === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUp className="size-3.5" />}
          </button>
        </form>
      )}

      {phase === "loading" && (
        <p className="px-3 pb-2.5 text-[11px] text-muted">Writing code… press Esc to cancel</p>
      )}
      {error && phase === "prompt" && <p className="px-3 pb-2.5 text-[11px] text-danger">{error}</p>}
      {phase === "prompt" && target.emptyFile && !instruction && (
        <div className="border-t border-border px-1.5 pb-1.5 pt-2">
          <p className="px-1.5 pb-1 text-[10px] uppercase tracking-wide text-muted">Try an example</p>
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => submit(prompt)}
              className="group flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-xs text-muted hover:bg-surface-muted hover:text-ink"
            >
              <span className="min-w-0 flex-1 truncate">{prompt}</span>
              <ArrowUp className="size-3 shrink-0 rotate-45 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
