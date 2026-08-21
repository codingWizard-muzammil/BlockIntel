"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Code2, HelpCircle, History, Info, Settings } from "lucide-react";

const topItems = [
  { href: "/contract/sample/summary", icon: Code2, label: "Analyzer", match: "/contract" },
  { href: "/history", icon: History, label: "History", match: "/history" },
  { href: "/settings", icon: Settings, label: "Settings", match: "/settings" },
];

const bottomItems = [
  { href: "#", icon: HelpCircle, label: "Help" },
  { href: "#", icon: Info, label: "Info" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-14 shrink-0 flex-col items-center gap-6 border-r border-border bg-canvas py-4">
      {topItems.map(({ href, icon: Icon, label, match }) => {
        const active = pathname.startsWith(match);
        return (
          <Link
            key={label}
            href={href}
            aria-label={label}
            className={`relative flex size-10 items-center justify-center rounded-lg transition-colors ${
              active ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"
            }`}
          >
            {active && (
              <span className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-accent" />
            )}
            <Icon className="size-3.5" />
          </Link>
        );
      })}

      <div className="flex flex-1 flex-col items-center justify-end gap-6">
        {bottomItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={label}
            href={href}
            aria-label={label}
            className="flex size-10 items-center justify-center rounded-lg text-muted transition-colors hover:text-ink"
          >
            <Icon className="size-3.5" />
          </Link>
        ))}
      </div>
    </aside>
  );
}
