import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-surface border border-border rounded-xl p-6.25 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeading({
  icon: Icon,
  children,
  size = "lg",
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  size?: "lg" | "md";
}) {
  return (
    <div
      className={`flex items-center gap-2 ${size === "lg" ? "text-lg mb-3.75" : "text-base mb-4"}`}
    >
      <Icon
        className={size === "lg" ? "size-4.5 text-accent" : "size-4 text-accent"}
      />
      <h2 className="font-semibold text-ink">{children}</h2>
    </div>
  );
}
