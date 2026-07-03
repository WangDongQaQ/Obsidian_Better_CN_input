import type { Editor, EditorPosition } from "obsidian";

export interface UrlTarget {
  url: string;
  from: EditorPosition;
  to: EditorPosition;
}

const URL_PATTERN = /https?:\/\/[^\s<>"'，。！？；：、\]】）)]+/gu;

export function findUrlTarget(editor: Editor): UrlTarget | null {
  const selected = editor.getSelection().trim();
  if (isHttpUrl(selected)) {
    return {
      url: selected,
      from: editor.getCursor("from"),
      to: editor.getCursor("to"),
    };
  }

  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  for (const match of line.matchAll(URL_PATTERN)) {
    const from = match.index;
    const to = from + match[0].length;
    if (from <= cursor.ch && cursor.ch <= to) {
      return {
        url: match[0],
        from: { line: cursor.line, ch: from },
        to: { line: cursor.line, ch: to },
      };
    }
  }

  return null;
}

export function isHttpUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function titleFromHtml(html: string): string | null {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title>/iu.exec(html);
  const title = decodeHtml(stripTags(match?.[1] ?? ""))
    .replace(/\s+/gu, " ")
    .trim();

  return title || null;
}

export function fallbackTitle(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    return url;
  }
}

export function formatMarkdownLink(title: string, url: string): string {
  return `[${escapeMarkdownLinkText(title)}](${escapeMarkdownUrl(url)})`;
}

function stripTags(text: string): string {
  return text.replace(/<[^>]+>/gu, "");
}

function decodeHtml(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/giu, (entity, body) => {
    const value = String(body).toLowerCase();
    if (value === "amp") return "&";
    if (value === "lt") return "<";
    if (value === "gt") return ">";
    if (value === "quot") return '"';
    if (value === "apos") return "'";
    if (value === "nbsp") return " ";
    if (value.startsWith("#x")) return String.fromCodePoint(Number.parseInt(value.slice(2), 16));
    if (value.startsWith("#")) return String.fromCodePoint(Number.parseInt(value.slice(1), 10));
    return entity;
  });
}

function escapeMarkdownLinkText(text: string): string {
  return text.replace(/([\\[\]])/gu, "\\$1");
}

function escapeMarkdownUrl(url: string): string {
  return url.replace(/\s/gu, "%20").replace(/\)/gu, "%29");
}
