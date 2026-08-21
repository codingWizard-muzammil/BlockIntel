const INDENT_SIZE = 4;

export function formatSolidity(source: string): string {
  let depth = 0;

  return source
    .split("\n")
    .map((rawLine) => {
      const line = rawLine.trim();
      if (line.length === 0) return "";

      const startsWithCloser = /^[}\)\]]/.test(line);
      const lineDepth = Math.max(0, depth - (startsWithCloser ? 1 : 0));

      const opens = (line.match(/[{(\[]/g) ?? []).length;
      const closes = (line.match(/[})\]]/g) ?? []).length;
      depth = Math.max(0, depth + opens - closes);

      return " ".repeat(INDENT_SIZE * lineDepth) + line;
    })
    .join("\n");
}
