"use client";

import { useCallback, useEffect, useRef } from "react";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { FileTabs } from "@/components/editor/FileTabs";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { EditorFooter } from "@/components/editor/EditorFooter";
import { ProjectGate } from "@/components/editor/ProjectGate";
import { clampPanelWidth, useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import { useAuthStore } from "@/store/auth-store";
import { useProjects } from "@/api/projects";
import type { ContractAnalysis } from "@/lib/analyzer-data";

export function EditorPanel({ analysis }: { analysis: ContractAnalysis }) {
  const sectionRef = useRef<HTMLElement>(null);
  const { panelWidth: width, setPanelWidth, loadAnalysis } = useEditorStore();
  const authStatus = useAuthStore((s) => s.status);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const restoreProjects = useProjectStore((s) => s.restore);
  const { data: projects } = useProjects();
  const hasActiveProject =
    authStatus === "connected" && !!projects?.some((p) => p.id === activeProjectId);

  useEffect(() => {
    restoreProjects();
  }, [restoreProjects]);

  useEffect(() => {
    loadAnalysis(analysis);
  }, [analysis, loadAnalysis]);

  const dragOrigin = useRef<{ x: number; width: number } | null>(null);
  const pendingWidth = useRef(width);
  const rafId = useRef<number | null>(null);

  const applyPendingWidth = useCallback(() => {
    rafId.current = null;
    if (sectionRef.current) {
      sectionRef.current.style.width = `${pendingWidth.current}px`;
    }
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragOrigin.current = {
        x: event.clientX,
        width: sectionRef.current?.offsetWidth ?? width,
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const origin = dragOrigin.current;
      if (!origin) return;
      pendingWidth.current = clampPanelWidth(
        origin.width + (event.clientX - origin.x),
      );
      if (rafId.current == null) {
        rafId.current = requestAnimationFrame(applyPendingWidth);
      }
    },
    [applyPendingWidth],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragOrigin.current) return;
      event.currentTarget.releasePointerCapture(event.pointerId);
      dragOrigin.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (rafId.current != null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      setPanelWidth(pendingWidth.current);
    },
    [setPanelWidth],
  );

  useEffect(() => {
    return () => {
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{ width }}
      className="relative flex min-h-0 shrink-0 flex-col border-r border-border"
    >
      {hasActiveProject ? (
        <>
          <EditorToolbar />
          <FileTabs />
          <div className="min-h-0 flex-1">
            <CodeEditor />
          </div>
          <EditorFooter />
        </>
      ) : (
        <ProjectGate />
      )}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize editor panel"
        className="group absolute -right-1.5 top-0 z-10 h-full w-3 cursor-col-resize touch-none select-none"
      >
        <div className="mx-auto h-full w-px bg-transparent transition-colors group-hover:bg-accent/60 group-active:bg-accent" />
      </div>
    </section>
  );
}
