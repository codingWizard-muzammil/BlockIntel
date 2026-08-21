export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-accent-soft">
        <Icon className="size-5 text-accent" />
      </div>
      <h1 className="text-lg font-semibold text-ink">{title}</h1>
      <p className="max-w-sm text-sm text-muted">{description}</p>
    </div>
  );
}
