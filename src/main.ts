import {
  Annotation,
  Prec,
  Transaction,
  type ChangeSpec,
} from "@codemirror/state";
import type { ViewUpdate } from "@codemirror/view";
import { EditorView, keymap } from "@codemirror/view";
import {
  type App,
  type Editor,
  type EditorPosition,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";
import {
  collectKeyEquivalentChanges,
  normalizeSelectedText,
  type InputChange,
} from "./rules";
import { selectParagraphThenAll } from "./select";

const ownChange = Annotation.define<boolean>();

interface BetterCnInputSettings {
  keyEquivalents: boolean;
  selectionWrapping: boolean;
  normalizeCommand: boolean;
  paragraphSelection: boolean;
}

const DEFAULT_SETTINGS: BetterCnInputSettings = {
  keyEquivalents: true,
  selectionWrapping: true,
  normalizeCommand: true,
  paragraphSelection: true,
};

export default class BetterCnInputPlugin extends Plugin {
  settings: BetterCnInputSettings = DEFAULT_SETTINGS;

  override async onload(): Promise<void> {
    await this.loadSettings();

    this.registerEditorExtension([
      EditorView.updateListener.of((update) => {
        this.handleEditorUpdate(update);
      }),
      Prec.highest(
        keymap.of([
          {
            key: "Mod-a",
            run: (view) =>
              this.settings.paragraphSelection ? selectParagraphThenAll(view) : false,
          },
        ]),
      ),
    ]);

    this.addSettingTab(new BetterCnInputSettingTab(this.app, this));
    this.addCommand({
      id: "normalize-selected-chinese-markdown",
      name: "Normalize selected Chinese Markdown punctuation",
      editorCallback: (editor) => {
        this.normalizeSelection(editor);
      },
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(await this.loadData()),
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private handleEditorUpdate(update: ViewUpdate): void {
    if (!this.settings.keyEquivalents && !this.settings.selectionWrapping) {
      return;
    }

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

    const replacements = collectKeyEquivalentChanges(update.state.doc, changes, {
      keyEquivalents: this.settings.keyEquivalents,
      selectionWrapping: this.settings.selectionWrapping,
    });
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
    if (!this.settings.normalizeCommand) {
      new Notice("已关闭选中文本标点调整");
      return;
    }

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

class BetterCnInputSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: BetterCnInputPlugin,
  ) {
    super(app, plugin);
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("中文 Markdown 输入增强")
      .setDesc("将中文输入法下的 Markdown 同键位符号转换为标准 Markdown。")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.keyEquivalents)
          .onChange(async (value) => {
            this.plugin.settings.keyEquivalents = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("选中文本包裹")
      .setDesc("选中文本后输入 ·、＊、～、＝ 时，包裹为代码、粗体、删除线、高亮。")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.selectionWrapping)
          .onChange(async (value) => {
            this.plugin.settings.selectionWrapping = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("手动调整选中文本")
      .setDesc("启用命令：Normalize selected Chinese Markdown punctuation。")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.normalizeCommand)
          .onChange(async (value) => {
            this.plugin.settings.normalizeCommand = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Cmd+A 自然段选择")
      .setDesc("第一次 Cmd+A 选中当前自然段，再按一次全选全文。")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.paragraphSelection)
          .onChange(async (value) => {
            this.plugin.settings.paragraphSelection = value;
            await this.plugin.saveSettings();
          }),
      );
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
