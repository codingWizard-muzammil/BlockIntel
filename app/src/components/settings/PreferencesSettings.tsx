"use client";

import {
  Minus,
  Monitor,
  Moon,
  Palette,
  Plus,
  RotateCcw,
  Settings as SettingsIcon,
  Sun,
  WrapText,
} from "lucide-react";
import { Card, CardHeading } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import {
  MAX_FONT_SIZE,
  MAX_TAB_SIZE,
  MIN_FONT_SIZE,
  MIN_TAB_SIZE,
  usePreferencesStore,
  type EditorColorKey,
  type Theme,
} from "@/store/preferences-store";

const THEME_OPTIONS: {
  id: Theme;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "light", label: "Light", icon: Sun },
  { id: "system", label: "System", icon: Monitor },
];

const EDITOR_COLOR_FIELDS: { key: EditorColorKey; label: string }[] = [
  { key: "keyword", label: "Keywords & types" },
  { key: "string", label: "Strings" },
  { key: "number", label: "Numbers" },
  { key: "comment", label: "Comments" },
];

function SegmentedOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        selected
          ? "bg-accent text-white"
          : "text-muted hover:bg-surface-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function NumberStepper({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-input p-1">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        className="flex size-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
      >
        <Minus className="size-3" />
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
        className="w-10 bg-transparent text-center text-xs text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className="flex size-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-xs text-ink">{label}</span>
      <span className="flex items-center gap-2 rounded-lg border border-border bg-input py-1 pl-1 pr-2.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-6 cursor-pointer rounded border-none bg-transparent p-0"
        />
        <span className="font-mono text-[10px] uppercase text-muted">{value}</span>
      </span>
    </label>
  );
}

export function PreferencesSettings() {
  const theme = usePreferencesStore((s) => s.theme);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const editorFontSize = usePreferencesStore((s) => s.editorFontSize);
  const setEditorFontSize = usePreferencesStore((s) => s.setEditorFontSize);
  const editorWordWrap = usePreferencesStore((s) => s.editorWordWrap);
  const setEditorWordWrap = usePreferencesStore((s) => s.setEditorWordWrap);
  const editorTabSize = usePreferencesStore((s) => s.editorTabSize);
  const setEditorTabSize = usePreferencesStore((s) => s.setEditorTabSize);
  const editorMinimap = usePreferencesStore((s) => s.editorMinimap);
  const setEditorMinimap = usePreferencesStore((s) => s.setEditorMinimap);
  const editorColors = usePreferencesStore((s) => s.editorColors);
  const setEditorColor = usePreferencesStore((s) => s.setEditorColor);
  const resetEditorColors = usePreferencesStore((s) => s.resetEditorColors);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeading icon={SettingsIcon}>Appearance</CardHeading>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-ink">Color scheme</p>
            <p className="text-xs text-muted">
              &quot;System&quot; follows your OS setting and updates live.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-input p-1">
            {THEME_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  theme === id
                    ? "bg-accent text-white"
                    : "text-muted hover:bg-surface-muted hover:text-ink"
                }`}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeading icon={WrapText}>Editor</CardHeading>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-ink">Font size</p>
              <p className="text-xs text-muted">Applies to the code editor.</p>
            </div>
            <NumberStepper
              value={editorFontSize}
              onChange={setEditorFontSize}
              min={MIN_FONT_SIZE}
              max={MAX_FONT_SIZE}
            />
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <div>
              <p className="text-sm text-ink">Tab size</p>
              <p className="text-xs text-muted">Spaces per indent level.</p>
            </div>
            <NumberStepper
              value={editorTabSize}
              onChange={setEditorTabSize}
              min={MIN_TAB_SIZE}
              max={MAX_TAB_SIZE}
            />
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <div>
              <p className="text-sm text-ink">Word wrap</p>
              <p className="text-xs text-muted">
                Wrap long lines instead of scrolling horizontally.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-input p-1">
              <SegmentedOption
                label="Off"
                selected={!editorWordWrap}
                onClick={() => setEditorWordWrap(false)}
              />
              <SegmentedOption
                label="On"
                selected={editorWordWrap}
                onClick={() => setEditorWordWrap(true)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <div>
              <p className="text-sm text-ink">Minimap</p>
              <p className="text-xs text-muted">
                Show the file overview on the right edge.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-input p-1">
              <SegmentedOption
                label="Off"
                selected={!editorMinimap}
                onClick={() => setEditorMinimap(false)}
              />
              <SegmentedOption
                label="On"
                selected={editorMinimap}
                onClick={() => setEditorMinimap(true)}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-3.75 flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Palette className="size-4.5 text-accent" />
            <h2 className="font-semibold text-ink">Syntax colors</h2>
          </div>
          <IconButton
            icon={RotateCcw}
            size={26}
            aria-label="Reset syntax colors to defaults"
            onClick={resetEditorColors}
          />
        </div>
        <p className="mb-4 text-xs text-muted">
          Pick your own highlight colors for the code editor — applied on top
          of whichever color scheme is active above.
        </p>
        <div className="flex flex-col gap-3">
          {EDITOR_COLOR_FIELDS.map(({ key, label }) => (
            <ColorField
              key={key}
              label={label}
              value={editorColors[key]}
              onChange={(value) => setEditorColor(key, value)}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
