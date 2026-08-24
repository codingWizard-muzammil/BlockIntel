import { useClickOutside } from "@/hooks/useClickOutside";
import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";

function Dropdown<T>({
  label,
  value,
  options,
  getKey,
  onChange,
  trigger,
  renderOption,
  footer,
  className,
  triggerClassName,
  menuClassName = "min-w-43",
}: {
  label: string;
  value: string;
  options: T[];
  getKey: (option: T) => string;
  onChange: (option: T) => void;
  trigger: React.ReactNode;
  renderOption: (option: T, selected: boolean) => React.ReactNode;
  footer?: (close: () => void) => React.ReactNode;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useClickOutside(containerRef, close);

  return (
    <div className={`relative ${className ?? ""}`} ref={containerRef}>
      <span className="absolute -top-1.75 left-2.5 z-10 bg-canvas px-1 text-[10px] leading-none text-muted">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-md border border-border bg-input py-1.75 pl-3 pr-2.5 text-xs text-ink outline-none hover:border-muted ${triggerClassName ?? ""}`}
      >
        {trigger}
        <ChevronDown
          className={`size-2.5 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          className={`absolute left-0 top-[calc(100%+6px)] z-20 ${menuClassName} overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-xl shadow-black/40`}
        >
          {options.map((option) => {
            const key = getKey(option);
            const selected = key === value;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onChange(option);
                  close();
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                  selected
                    ? "bg-accent text-white"
                    : "text-ink hover:bg-surface-muted"
                }`}
              >
                {renderOption(option, selected)}
              </button>
            );
          })}
          {footer && (
            <>
              <div className="my-1 h-px bg-border" />
              {footer(close)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Dropdown;
