import {
  Annotation,
  Prec,
  Transaction,
  type ChangeSpec,
} from "@codemirror/state";
import type { ViewUpdate } from "@codemirror/view";
import { EditorView, keymap } from "@codemirror/view";
import { type Editor, type EditorPosition, Notice, Plugin } from "obsidian";
import {
  collectKeyEquivalentChanges,
  normalizeSelectedText,
  type InputChange,
} from "./rules";
import { selectParagraphThenAll } from "./select";

const ownChange = Annotation.define<boolean>();

export default class BetterCnInputPlugin extends Plugin {
  override onload(): void {
    this.registerEditorExtension([
      EditorView.updateListener.of((update) => {
        this.handleEditorUpdate(update);
      }),
      Prec.highest(
        keymap.of([
          {
            key: "Mod-a",
            run: selectParagraphThenAll,
          },
        ]),
      ),
    ]);

    this.addCommand({
      id: "normalize-selected-chinese-markdown",
      name: "Normalize selected Chinese Markdown punctuation",
      editorCallback: (editor) => {
        this.normalizeSelection(editor);
      },
    });
  }

  private handleEditorUpdate(update: ViewUpdate): void {
    if (!update.docChanged || update.view.composing) {
      return;
    }

    if (update.transactions.some((transaction) => transaction.annotation(ownChange))) {
      return;
    }

    if (
      update.transactions.some(
        (transaction) =>
          transaction.isUserEvent("input.paste") ||
          transaction.isUserEvent("input.drop"),
      )
    ) {
      return;
    }

    const changes: InputChange[] = [];

    update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
      if (inserted.length === 0) {
        return;
      }

      changes.push({
        fromA,
        toA,
        fromB,
        toB,
        text: inserted.toString(),
        replacedText: update.startState.doc.sliceString(fromA, toA),
      });
    });

    const replacements = collectKeyEquivalentChanges(update.state.doc, changes);
    if (replacements.length === 0) {
      return;
    }

    const cmChanges: ChangeSpec[] = replacements.map(({ from, to, insert }) => ({
      from,
      to,
      insert,
    }));

    update.view.dispatch({
      changes: cmChanges,
      annotations: [
        ownChange.of(true),
        Transaction.userEvent.of("input.chinese-markdown-input"),
      ],
    });
  }

  private normalizeSelection(editor: Editor): void {
    const changes = editor.listSelections().flatMap((selection) => {
      const range = normalizeEditorRange(selection.anchor, selection.head);
      const original = editor.getRange(range.from, range.to);
      const normalized = normalizeSelectedText(original);

      if (!original || original === normalized) {
        return [];
      }

      return [{ ...range, text: normalized }];
    });

    if (changes.length === 0) {
      new Notice("没有可调整的选中文本");
      return;
    }

    editor.transaction({ changes }, "chinese-markdown-input");
    new Notice("已调整选中文本中的中文 Markdown 标点");
  }
}

function normalizeEditorRange(
  first: EditorPosition,
  second: EditorPosition,
): { from: EditorPosition; to: EditorPosition } {
  if (first.line < second.line || (first.line === second.line && first.ch <= second.ch)) {
    return { from: first, to: second };
  }

  return { from: second, to: first };
}
