import type { Text } from "@codemirror/state";

export interface InputChange {
  fromA: number;
  toA: number;
  fromB: number;
  toB: number;
  text: string;
  replacedText: string;
}

export interface Replacement {
  from: number;
  to: number;
  insert: string;
  reason:
    | "key-equivalent"
    | "quote"
    | "wiki-link"
    | "link"
    | "code"
    | "format"
    | "selection-wrap";
}

type EditorText = Pick<Text, "lineAt">;

const MARKDOWN_KEY_MAP: Record<string, string> = {
  "＃": "#",
  "｜": "|",
};

const SELECTION_WRAPPERS: Record<string, [string, string]> = {
  "·": ["`", "`"],
  "＊": ["**", "**"],
  "～": ["~~", "~~"],
  "＝": ["==", "=="],
};

export function collectKeyEquivalentChanges(
  doc: EditorText,
  changes: InputChange[],
): Replacement[] {
  const replacements: Replacement[] = [];

  for (const change of changes) {
    const selectionWrap = getSelectionWrapChange(change);
    if (selectionWrap) {
      replacements.push(selectionWrap);
      continue;
    }

    const simpleMapping = getSimpleKeyEquivalentChange(change);
    if (simpleMapping) {
      replacements.push(simpleMapping);
      continue;
    }

    const contextual = getContextualChange(doc, change);
    if (contextual) {
      replacements.push(contextual);
    }
  }

  return replacements.sort((left, right) => left.from - right.from);
}

export function normalizeSelectedText(text: string): string {
  return text
    .split(/(\r\n|\r|\n)/u)
    .map((part) => {
      if (/^(?:\r\n|\r|\n)$/u.test(part)) {
        return part;
      }

      return normalizeLine(part);
    })
    .join("");
}

function getSelectionWrapChange(change: InputChange): Replacement | null {
  if (change.fromA === change.toA) {
    return null;
  }

  const wrapper = SELECTION_WRAPPERS[change.text];
  if (!wrapper) {
    return null;
  }

  return {
    from: change.fromB,
    to: change.toB,
    insert: `${wrapper[0]}${change.replacedText}${wrapper[1]}`,
    reason: "selection-wrap",
  };
}

function getSimpleKeyEquivalentChange(change: InputChange): Replacement | null {
  const mapped = MARKDOWN_KEY_MAP[change.text];
  if (!mapped) {
    return null;
  }

  return {
    from: change.fromB,
    to: change.toB,
    insert: mapped,
    reason: "key-equivalent",
  };
}

function getContextualChange(
  doc: EditorText,
  change: InputChange,
): Replacement | null {
  const line = doc.lineAt(change.toB);
  const prefix = line.text.slice(0, change.toB - line.from);

  return (
    getQuoteChange(line.from, prefix) ??
    getWikiLinkChange(change, prefix) ??
    getCodeFenceChange(line.from, prefix) ??
    getInlineCodeChange(line.from, prefix) ??
    getFormattingChange(line.from, prefix) ??
    getMarkdownLinkChange(line.from, prefix) ??
    getTagPathChange(change, prefix)
  );
}

function getQuoteChange(lineFrom: number, prefix: string): Replacement | null {
  const match = /^(\s*)[》>] $/u.exec(prefix);
  if (!match) {
    return null;
  }

  const indentation = match[1] ?? "";

  return {
    from: lineFrom + indentation.length,
    to: lineFrom + prefix.length,
    insert: "> ",
    reason: "quote",
  };
}

function getWikiLinkChange(
  change: InputChange,
  prefix: string,
): Replacement | null {
  if (prefix.endsWith("！【【") || prefix.endsWith("!【【")) {
    return {
      from: change.toB - 3,
      to: change.toB,
      insert: "![[",
      reason: "wiki-link",
    };
  }

  if (prefix.endsWith("【【")) {
    return {
      from: change.toB - 2,
      to: change.toB,
      insert: "[[",
      reason: "wiki-link",
    };
  }

  if (prefix.endsWith("】】")) {
    return {
      from: change.toB - 2,
      to: change.toB,
      insert: "]]",
      reason: "wiki-link",
    };
  }

  return null;
}

function getCodeFenceChange(lineFrom: number, prefix: string): Replacement | null {
  const match = /^(\s*)···$/u.exec(prefix);
  if (!match) {
    return null;
  }

  return {
    from: lineFrom + (match[1] ?? "").length,
    to: lineFrom + prefix.length,
    insert: "```",
    reason: "code",
  };
}

function getInlineCodeChange(lineFrom: number, prefix: string): Replacement | null {
  const match = /·([^·\n]+)·$/u.exec(prefix);
  if (!match) {
    return null;
  }

  return {
    from: lineFrom + prefix.length - match[0].length,
    to: lineFrom + prefix.length,
    insert: `\`${match[1] ?? ""}\``,
    reason: "code",
  };
}

function getFormattingChange(lineFrom: number, prefix: string): Replacement | null {
  const specs: Array<[RegExp, (match: RegExpExecArray) => string]> = [
    [/＊＊＊([^＊\n]+)＊＊＊$/u, (match) => `***${match[1] ?? ""}***`],
    [/＊＊([^＊\n]+)＊＊$/u, (match) => `**${match[1] ?? ""}**`],
    [/＊([^＊\n]+)＊$/u, (match) => `*${match[1] ?? ""}*`],
    [/＿＿([^＿\n]+)＿＿$/u, (match) => `__${match[1] ?? ""}__`],
    [/＿([^＿\n]+)＿$/u, (match) => `_${match[1] ?? ""}_`],
    [/～～([^～\n]+)～～$/u, (match) => `~~${match[1] ?? ""}~~`],
    [/＝＝([^＝\n]+)＝＝$/u, (match) => `==${match[1] ?? ""}==`],
  ];

  for (const [pattern, render] of specs) {
    const match = pattern.exec(prefix);
    if (!match) {
      continue;
    }

    return {
      from: lineFrom + prefix.length - match[0].length,
      to: lineFrom + prefix.length,
      insert: render(match),
      reason: "format",
    };
  }

  return null;
}

function getMarkdownLinkChange(lineFrom: number, prefix: string): Replacement | null {
  const image = /(^|[^\[【])([!！])【([^\n】]+)】[（(【]([^\n）】)]+)[）)】]$/u.exec(
    prefix,
  );
  if (image) {
    return renderMatchedLink(lineFrom, prefix, image, `![${image[3] ?? ""}](${image[4] ?? ""})`);
  }

  const link = /(^|[^\[【!！])【([^\n】]+)】[（(【]([^\n）】)]+)[）)】]$/u.exec(
    prefix,
  );
  if (!link) {
    return null;
  }

  return renderMatchedLink(lineFrom, prefix, link, `[${link[2] ?? ""}](${link[3] ?? ""})`);
}

function renderMatchedLink(
  lineFrom: number,
  prefix: string,
  match: RegExpExecArray,
  insert: string,
): Replacement {
  const leadingCharacter = match[1] ?? "";

  return {
    from: lineFrom + prefix.length - match[0].length + leadingCharacter.length,
    to: lineFrom + prefix.length,
    insert,
    reason: "link",
  };
}

function getTagPathChange(change: InputChange, prefix: string): Replacement | null {
  if (change.text !== "／" && change.text !== "＿") {
    return null;
  }

  if (!/(^|[\s([{（【])#[^\s#，。！？；：、\]】）)]*[／＿]$/u.test(prefix)) {
    return null;
  }

  return {
    from: change.toB - 1,
    to: change.toB,
    insert: change.text === "／" ? "/" : "_",
    reason: "key-equivalent",
  };
}

function normalizeLine(line: string): string {
  return line
    .replace(/＃/gu, "#")
    .replace(/｜/gu, "|")
    .replace(/^(\s*)[》>](\s+)/u, "$1>$2")
    .replace(/！【【([^】\n]+)】】/gu, "![[$1]]")
    .replace(/【【([^】\n]+)】】/gu, "[[$1]]")
    .replace(/【([^\n】]+)】[（(【]([^\n）】)]+)[）)】]/gu, "[$1]($2)")
    .replace(/！\[([^\n\]]+)\]\(([^)\n]+)\)/gu, "![$1]($2)")
    .replace(/·([^·\n]+)·/gu, "`$1`")
    .replace(/＊＊＊([^＊\n]+)＊＊＊/gu, "***$1***")
    .replace(/＊＊([^＊\n]+)＊＊/gu, "**$1**")
    .replace(/＊([^＊\n]+)＊/gu, "*$1*")
    .replace(/＿＿([^＿\n]+)＿＿/gu, "__$1__")
    .replace(/＿([^＿\n]+)＿/gu, "_$1_")
    .replace(/～～([^～\n]+)～～/gu, "~~$1~~")
    .replace(/＝＝([^＝\n]+)＝＝/gu, "==$1==")
    .replace(
      /(^|[\s([{（【])#([^\s#，。！？；：、\]】）)]+)/gu,
      (_full, lead: string, tag: string) =>
        `${lead}#${tag.replace(/／/gu, "/").replace(/＿/gu, "_")}`,
    );
}
