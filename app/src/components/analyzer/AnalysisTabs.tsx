"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, LayoutGrid, ShieldAlert, TrendingUp } from "lucide-react";

const tabs = [
  { slug: "summary", label: "Summary", icon: LayoutGrid },
  { slug: "attacks", label: "Attacks", icon: ShieldAlert },
  { slug: "improvements", label: "Improvements", icon: TrendingUp },
  { slug: "playground", label: "Playground", icon: FlaskConical },
];

export function AnalysisTabs({ id }: { id: string }) {
  const pathname = usePathname();

  return (
    <div className="scrollbar-editor flex items-start overflow-x-auto border-b border-border px-6">
      {tabs.map(({ slug, label, icon: Icon }) => {
        const href = `/contract/${id}/${slug}`;
        const active = pathname === href;
        return (
          <Link
            key={slug}
            href={href}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 pb-4.5 pt-4 text-sm whitespace-nowrap transition-colors ${
              active
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
