import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent/90",
  secondary:
    "bg-input border border-border text-ink hover:border-muted",
  ghost:
    "bg-canvas border border-border text-ink hover:border-muted",
  danger: "bg-danger text-white hover:bg-danger/90",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...props
}: {
  variant?: Variant;
  size?: "sm" | "md";
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizing =
    size === "sm"
      ? "px-[13px] py-[7px] text-xs gap-2 rounded-md"
      : "px-4 py-2 text-sm gap-2 rounded-lg";

  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors ${sizing} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
