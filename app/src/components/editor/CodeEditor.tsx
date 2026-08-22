"use client";

import Editor, { type BeforeMount } from "@monaco-editor/react";
import { useEditorStore } from "@/store/editor-store";

const MONACO_LANGUAGE_ID: Record<string, string> = {
  Solidity: "solidity",
  Vyper: "vyper",
  Rust: "rust",
  Move: "move",
};

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

const beforeMount: BeforeMount = (monaco) => {
  const languages = monaco.languages.getLanguages();
  const registered = new Set(languages.map((lang: { id: string }) => lang.id));

  if (!registered.has("solidity")) {
    registerCLikeLanguage(monaco, "solidity", SOLIDITY_KEYWORDS, SOLIDITY_TYPES);
  }
  if (!registered.has("vyper")) {
    registerCLikeLanguage(monaco, "vyper", VYPER_KEYWORDS, VYPER_TYPES);
  }
  if (!registered.has("move")) {
    registerCLikeLanguage(monaco, "move", MOVE_KEYWORDS, MOVE_TYPES);
  }

  monaco.editor.defineTheme("blockintel-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "3b82f6" },
      { token: "type", foreground: "3b82f6" },
      { token: "comment", foreground: "94a3b8" },
      { token: "string", foreground: "10b981" },
      { token: "number", foreground: "f59e0b" },
    ],
    colors: {
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
    },
  });
};

export function CodeEditor() {
  const source = useEditorStore((s) => s.source);
  const setSource = useEditorStore((s) => s.setSource);
  const language = useEditorStore((s) => s.language);

  return (
    <Editor
      language={MONACO_LANGUAGE_ID[language] ?? "plaintext"}
      value={source}
      theme="blockintel-dark"
      beforeMount={beforeMount}
      onChange={(value) => setSource(value ?? "")}
      loading={
        <div className="flex size-full items-center justify-center bg-canvas text-xs text-muted">
          Loading editor…
        </div>
      }
      options={{
        fontSize: 13,
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        lineHeight: 24,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 8, bottom: 8 },
        renderLineHighlight: "line",
        tabSize: 4,
        wordWrap: "off",
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
