import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import {
  collectKeyEquivalentChanges,
  normalizeSelectedText,
  type InputChange,
} from "../src/rules";

function doc(text: string): Text {
  return Text.of(text.split("\n"));
}

function input(text: string): InputChange {
  return {
    fromA: text.length - 1,
    toA: text.length - 1,
    fromB: text.length - 1,
    toB: text.length,
    text: text.slice(-1),
    replacedText: "",
  };
}

function changesFor(text: string) {
  return collectKeyEquivalentChanges(doc(text), [input(text)]);
}

function typeText(text: string): string {
  let value = "";

  for (const char of Array.from(text)) {
    const previous = value;
    value += char;

    const changes = collectKeyEquivalentChanges(doc(value), [
      {
        fromA: previous.length,
        toA: previous.length,
        fromB: previous.length,
        toB: value.length,
        text: char,
        replacedText: "",
      },
    ]);

    for (const change of changes.slice().reverse()) {
      value =
        value.slice(0, change.from) + change.insert + value.slice(change.to);
    }
  }

  return value;
}

describe("Chinese Markdown key equivalents", () => {
  it("converts the quote key position only when it becomes markdown syntax", () => {
    expect(changesFor("》 ")).toEqual([
      { from: 0, to: 2, insert: "> ", reason: "quote" },
    ]);
    expect(changesFor("《红楼梦》")).toEqual([]);
    expect(typeText("《红楼梦》")).toBe("《红楼梦》");
    expect(typeText("《红楼梦》是一本书")).toBe("《红楼梦》是一本书");
  });

  it("converts wiki links, markdown links, autolinks, and code", () => {
    expect(changesFor("【【")).toEqual([
      { from: 0, to: 2, insert: "[[", reason: "wiki-link" },
    ]);
    expect(changesFor("【OpenAI】（https://openai.com）")).toEqual([
      {
        from: 0,
        to: 28,
        insert: "[OpenAI](https://openai.com)",
        reason: "link",
      },
    ]);
    expect(typeText("《https://openai.com》")).toBe("《https://openai.com》");
    expect(changesFor("·代码·")).toEqual([
      { from: 0, to: 4, insert: "`代码`", reason: "code" },
    ]);
  });

  it("converts common same-key markdown marks", () => {
    expect(changesFor("＃")).toEqual([
      { from: 0, to: 1, insert: "#", reason: "key-equivalent" },
    ]);
    expect(changesFor("｜")).toEqual([
      { from: 0, to: 1, insert: "|", reason: "key-equivalent" },
    ]);
    expect(changesFor("＊＊粗体＊＊")).toEqual([
      { from: 0, to: 6, insert: "**粗体**", reason: "format" },
    ]);
    expect(changesFor("～～删除～～")).toEqual([
      { from: 0, to: 6, insert: "~~删除~~", reason: "format" },
    ]);
    expect(changesFor("＝＝高亮＝＝")).toEqual([
      { from: 0, to: 6, insert: "==高亮==", reason: "format" },
    ]);
  });

  it("wraps selected text with the Chinese key equivalent", () => {
    expect(
      collectKeyEquivalentChanges(doc("·"), [
        {
          fromA: 0,
          toA: 4,
          fromB: 0,
          toB: 1,
          text: "·",
          replacedText: "输入内容",
        },
      ]),
    ).toEqual([
      {
        from: 0,
        to: 1,
        insert: "`输入内容`",
        reason: "selection-wrap",
      },
    ]);
  });

  it("honors rule toggles", () => {
    expect(
      collectKeyEquivalentChanges(doc("》 "), [input("》 ")], {
        keyEquivalents: false,
        selectionWrapping: true,
      }),
    ).toEqual([]);
    expect(
      collectKeyEquivalentChanges(
        doc("·"),
        [
          {
            fromA: 0,
            toA: 4,
            fromB: 0,
            toB: 1,
            text: "·",
            replacedText: "输入内容",
          },
        ],
        {
          keyEquivalents: true,
          selectionWrapping: false,
        },
      ),
    ).toEqual([]);
  });

  it("normalizes selected pasted text on command, not automatically on paste", () => {
    expect(
      normalizeSelectedText(
        "＃ 标题\n》 引用\n【OpenAI】（https://openai.com）\n·代码·\n＝＝高亮＝＝",
      ),
    ).toBe(
      "# 标题\n> 引用\n[OpenAI](https://openai.com)\n`代码`\n==高亮==",
    );
  });
});
