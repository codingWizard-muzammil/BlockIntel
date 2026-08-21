import type { ButtonHTMLAttributes } from "react";

export function IconButton({
  icon: Icon,
  size = 32,
  active = false,
  className = "",
  ...props
}: {
  icon: React.ComponentType<{ className?: string }>;
  size?: number;
  active?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md transition-colors ${
        active
          ? "bg-accent-soft text-accent"
          : "text-muted hover:text-ink"
      } ${className}`}
      style={{ width: size, height: size }}
      {...props}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
