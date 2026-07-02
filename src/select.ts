import { EditorSelection, type Text } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

export interface SelectionRange {
  from: number;
  to: number;
}

export interface CurrentSelection extends SelectionRange {
  head: number;
}

function isBlank(text: string): boolean {
  return text.trim().length === 0;
}

export function paragraphAt(doc: Text, pos: number): SelectionRange | null {
  if (doc.length === 0) return null;

  const line = doc.lineAt(Math.max(0, Math.min(pos, doc.length)));
  if (isBlank(line.text)) return null;

  let fromLine = line.number;
  while (fromLine > 1 && !isBlank(doc.line(fromLine - 1).text)) {
    fromLine -= 1;
  }

  let toLine = line.number;
  while (toLine < doc.lines && !isBlank(doc.line(toLine + 1).text)) {
    toLine += 1;
  }

  return {
    from: doc.line(fromLine).from,
    to: doc.line(toLine).to,
  };
}

export function nextSelection(doc: Text, selection: CurrentSelection): SelectionRange | null {
  if (doc.length === 0) return null;

  const paragraph = paragraphAt(doc, selection.head);
  if (!paragraph) return { from: 0, to: doc.length };

  if (selection.from === paragraph.from && selection.to === paragraph.to) {
    return { from: 0, to: doc.length };
  }

  return paragraph;
}

export function selectParagraphThenAll(view: EditorView): boolean {
  const next = nextSelection(view.state.doc, view.state.selection.main);
  if (!next) return false;

  view.dispatch({
    selection: EditorSelection.single(next.from, next.to),
    scrollIntoView: true,
  });

  return true;
}
