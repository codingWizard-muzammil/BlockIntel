"use client";

import { useEffect, useRef } from "react";
import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import { usePreferencesStore, type EditorColors } from "@/store/preferences-store";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

const AUTOSAVE_DELAY_MS = 1200;

const SOLIDITY_KEYWORDS = [
  "pragma",
  "solidity",
  "contract",
  "interface",
  "library",
  "is",
  "address",
  "mapping",
  "event",
  "modifier",
  "function",
  "external",
  "internal",
  "private",
  "public",
  "view",
  "pure",
  "returns",
  "return",
  "payable",
  "require",
  "revert",
  "assert",
  "emit",
  "constructor",
  "struct",
  "enum",
  "storage",
  "memory",
  "calldata",
  "indexed",
  "override",
  "virtual",
  "import",
  "using",
  "for",
  "if",
  "else",
  "while",
  "do",
  "break",
  "continue",
  "new",
  "delete",
  "try",
  "catch",
];

const SOLIDITY_TYPES = [
  "uint",
  "uint8",
  "uint16",
  "uint32",
  "uint64",
  "uint128",
  "uint256",
  "int",
  "int256",
  "bool",
  "string",
  "bytes",
  "bytes4",
  "bytes32",
];

const VYPER_KEYWORDS = [
  "def",
  "pass",
  "if",
  "elif",
  "else",
  "for",
  "while",
  "break",
  "continue",
  "return",
  "event",
  "struct",
  "interface",
  "implements",
  "import",
  "from",
  "as",
  "public",
  "internal",
  "external",
  "payable",
  "view",
  "pure",
  "nonpayable",
  "indexed",
  "constant",
  "immutable",
  "and",
  "or",
  "not",
  "in",
  "is",
  "self",
  "assert",
  "raise",
  "log",
];

const VYPER_TYPES = [
  "uint256",
  "int128",
  "int256",
  "bool",
  "address",
  "bytes32",
  "bytes",
  "string",
  "decimal",
  "Bytes",
  "String",
  "HashMap",
  "DynArray",
];

const MOVE_KEYWORDS = [
  "module",
  "script",
  "use",
  "fun",
  "public",
  "entry",
  "native",
  "struct",
  "has",
  "let",
  "mut",
  "if",
  "else",
  "while",
  "loop",
  "break",
  "continue",
  "return",
  "abort",
  "move",
  "copy",
  "borrow_global",
  "borrow_global_mut",
  "exists",
  "move_to",
  "move_from",
  "acquires",
  "friend",
  "const",
];

const MOVE_TYPES = [
  "u8",
  "u16",
  "u32",
  "u64",
  "u128",
  "u256",
  "bool",
  "address",
  "vector",
  "signer",
  "key",
  "store",
  "copy",
  "drop",
];

function registerCLikeLanguage(
  monaco: Parameters<BeforeMount>[0],
  id: string,
  keywords: string[],
  typeKeywords: string[],
) {
  monaco.languages.register({ id });

  monaco.languages.setLanguageConfiguration(id, {
    comments: { lineComment: "//", blockComment: ["/*", "*/"] },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "'", close: "'" },
      { open: '"', close: '"' },
    ],
  });

  monaco.languages.setMonarchTokensProvider(id, {
    keywords,
    typeKeywords,
    operators: ["=", ">", "<", "!", "+", "-", "*", "/", "%", "=>", "&&", "||"],
    symbols: /[=><!~?:&|+\-*/^%]+/,
    tokenizer: {
      root: [
        [
          /[a-zA-Z_$][\w$]*/,
          {
            cases: {
              "@keywords": "keyword",
              "@typeKeywords": "type",
              "@default": "identifier",
            },
          },
        ],
        { include: "@whitespace" },
        [/\d+(\.\d+)?/, "number"],
        [/[{}()[\]]/, "@brackets"],
        [/@symbols/, "operator"],
        [/'([^'\\]|\\.)*'/, "string"],
        [/"([^"\\]|\\.)*"/, "string"],
      ],
      whitespace: [
        [/[ \t\r\n]+/, "white"],
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
      ],
      comment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],
    },
  });
}

// Fixed per-theme editor chrome (background, gutter, selection, …) — only
// the token colors (below) are user-customizable.
const DARK_EDITOR_COLORS = {
  "editor.background": "#0f121a",
  "editor.foreground": "#e2e8f0",
  "editorLineNumber.foreground": "#4b5563",
  "editorLineNumber.activeForeground": "#94a3b8",
  "editor.lineHighlightBackground": "#1a1d2440",
  "editorCursor.foreground": "#3b82f6",
  "editor.selectionBackground": "#3b82f640",
  "editorGutter.background": "#0f121a",
  "editorWidget.background": "#1a1d24",
  "editorWidget.border": "#2d3342",
  "scrollbarSlider.background": "#2d334280",
  "scrollbarSlider.hoverBackground": "#2d3342c0",
};

const LIGHT_EDITOR_COLORS = {
  "editor.background": "#ffffff",
  "editor.foreground": "#0f172a",
  "editorLineNumber.foreground": "#94a3b8",
  "editorLineNumber.activeForeground": "#475569",
  "editor.lineHighlightBackground": "#f1f5f980",
  "editorCursor.foreground": "#2563eb",
  "editor.selectionBackground": "#2563eb26",
  "editorGutter.background": "#ffffff",
  "editorWidget.background": "#ffffff",
  "editorWidget.border": "#e2e8f0",
  "scrollbarSlider.background": "#e2e8f080",
  "scrollbarSlider.hoverBackground": "#e2e8f0c0",
};

function tokenRules(colors: EditorColors) {
  return [
    { token: "keyword", foreground: colors.keyword.replace("#", "") },
    { token: "type", foreground: colors.keyword.replace("#", "") },
    { token: "comment", foreground: colors.comment.replace("#", "") },
    { token: "string", foreground: colors.string.replace("#", "") },
    { token: "number", foreground: colors.number.replace("#", "") },
  ];
}

// Registers or re-registers both editor themes with the user's current
// syntax colors — called from beforeMount (first mount) and again whenever
// editorColors changes, since Monaco applies a redefined theme immediately
// to whichever editor is currently using it by name.
function defineThemes(monaco: Monaco, colors: EditorColors) {
  monaco.editor.defineTheme("blockintel-dark", {
    base: "vs-dark",
    inherit: true,
    rules: tokenRules(colors),
    colors: DARK_EDITOR_COLORS,
  });

  monaco.editor.defineTheme("blockintel-light", {
    base: "vs",
    inherit: true,
    rules: tokenRules(colors),
    colors: LIGHT_EDITOR_COLORS,
  });
}

const beforeMount: BeforeMount = (monaco) => {
  const languages = monaco.languages.getLanguages();
  const registered = new Set(languages.map((lang: { id: string }) => lang.id));

  if (!registered.has("solidity")) {
    registerCLikeLanguage(
      monaco,
      "solidity",
      SOLIDITY_KEYWORDS,
      SOLIDITY_TYPES,
    );
  }
  if (!registered.has("vyper")) {
    registerCLikeLanguage(monaco, "vyper", VYPER_KEYWORDS, VYPER_TYPES);
  }
  if (!registered.has("move")) {
    registerCLikeLanguage(monaco, "move", MOVE_KEYWORDS, MOVE_TYPES);
  }

  defineThemes(monaco, usePreferencesStore.getState().editorColors);
};

export function CodeEditor() {
  const { source, setSource, language, activeFileId } = useEditorStore();
  const updateContract = useProjectStore((s) => s.updateContract);
  const saveContract = useProjectStore((s) => s.saveContract);
  const resolvedTheme = usePreferencesStore((s) => s.resolvedTheme);
  const editorFontSize = usePreferencesStore((s) => s.editorFontSize);
  const editorWordWrap = usePreferencesStore((s) => s.editorWordWrap);
  const editorTabSize = usePreferencesStore((s) => s.editorTabSize);
  const editorMinimap = usePreferencesStore((s) => s.editorMinimap);
  const editorColors = usePreferencesStore((s) => s.editorColors);
  const monacoRef = useRef<Monaco | null>(null);

  const handleMount: OnMount = (_editor, monaco) => {
    monacoRef.current = monaco;
  };

  // Re-apply the theme definitions live when the user tweaks a syntax color
  // in Preferences, instead of only picking them up on the next mount.
  useEffect(() => {
    if (monacoRef.current) defineThemes(monacoRef.current, editorColors);
  }, [editorColors]);

  // Fires 1200ms after typing stops, deciding fresh (not from a stale
  // closure) whether the file already has a contract to PATCH or still
  // needs its first-save POST — a file created via "+ New file" only gets a
  // `contractId` once something persists it, and edits were previously
  // silently dropped (only local zustand state) until a rename or
  // Compile/Analyze click happened to create it first.
  const [debouncedSave, flushSave] = useDebouncedCallback(
    (fileId: string, value: string) => {
      const file = useEditorStore.getState().files.find((f) => f.id === fileId);
      if (!file) return;
      if (file.contractId) {
        updateContract(file.contractId, value);
        return;
      }
      const projectId = useProjectStore.getState().activeProjectId;
      if (!projectId) return;
      saveContract(fileId, {
        projectId,
        name: file.name,
        language: file.language,
        source: value,
      });
    },
    AUTOSAVE_DELAY_MS,
  );

  // Flush rather than drop a pending save when the user switches to another
  // file/tab (or leaves this view entirely, which unmounts CodeEditor) —
  // the debounce timer alone would otherwise silently lose that last edit.
  useEffect(() => {
    return () => {
      flushSave();
    };
  }, [activeFileId, flushSave]);

  return (
    <Editor
      language={language ?? "plaintext"}
      value={source}
      theme={resolvedTheme === "light" ? "blockintel-light" : "blockintel-dark"}
      beforeMount={beforeMount}
      onMount={handleMount}
      onChange={(value) => {
        const next = value ?? "";
        setSource(next);
        // Read fresh state rather than a closed-over selector — this only
        // fires on genuine user edits (Monaco doesn't re-fire onChange for
        // programmatic `value` prop updates), so it's safe to autosave here.
        const state = useEditorStore.getState();
        const activeFile = state.files.find((f) => f.id === state.activeFileId);
        if (activeFile) {
          debouncedSave(activeFile.id, next);
        }
      }}
      loading={
        <div className="flex size-full items-center justify-center bg-canvas text-xs text-muted">
          Loading editor…
        </div>
      }
      options={{
        fontSize: editorFontSize,
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        lineHeight: 24,
        minimap: { enabled: editorMinimap },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 8, bottom: 8 },
        renderLineHighlight: "line",
        tabSize: editorTabSize,
        wordWrap: editorWordWrap ? "on" : "off",
        smoothScrolling: true,
        cursorBlinking: "smooth",
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
      }}
    />
  );
}
