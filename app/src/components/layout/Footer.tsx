import { Bot } from "lucide-react";

export function Footer() {
  return (
    <footer className="flex h-10 shrink-0 items-center justify-between border-t border-border bg-canvas px-4 text-xs text-muted">
      <span>© 2024 BlockIntel</span>
      <div className="flex items-center gap-4">
        <span>Powered by AI</span>
        <span className="flex items-center gap-1">
          <Bot className="size-3" />
          OpenAI GPT-4o
          <span className="ml-1 size-2 rounded-full bg-success" />
        </span>
        <span>All Systems Operational</span>
      </div>
    </footer>
  );
}
