export function Footer() {
  return (
    <footer className="flex h-10 shrink-0 items-center justify-between border-t border-border bg-canvas px-4 text-xs text-muted">
      <span>© {new Date().getFullYear()} BlockIntel</span>
    </footer>
  );
}
