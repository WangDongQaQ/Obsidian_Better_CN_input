import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { nextSelection, paragraphAt } from "../src/select";

const doc = Text.of([
  "第一段第一行",
  "第一段第二行",
  "",
  "第二段",
]);
const hardBreakDoc = Text.of([
  "第一段  ",
  "第二段",
  "第三段",
]);

describe("paragraph selection", () => {
  it("selects the current natural paragraph", () => {
    expect(paragraphAt(doc, 2)).toEqual({ from: 0, to: 13 });
    expect(paragraphAt(doc, doc.line(2).from)).toEqual({ from: 0, to: 13 });
    expect(paragraphAt(doc, doc.line(4).from)).toEqual({ from: 15, to: 18 });
  });

  it("treats two trailing spaces as a rendered paragraph boundary", () => {
    expect(paragraphAt(hardBreakDoc, hardBreakDoc.line(1).from)).toEqual({
      from: hardBreakDoc.line(1).from,
      to: hardBreakDoc.line(1).to,
    });
    expect(paragraphAt(hardBreakDoc, hardBreakDoc.line(2).from)).toEqual({
      from: hardBreakDoc.line(2).from,
      to: hardBreakDoc.line(3).to,
    });
  });

  it("selects all when the current paragraph is already selected", () => {
    expect(nextSelection(doc, { from: 0, to: 13, head: 13 })).toEqual({
      from: 0,
      to: doc.length,
    });
  });

  it("selects all from a blank line", () => {
    expect(nextSelection(doc, { from: 14, to: 14, head: 14 })).toEqual({
      from: 0,
      to: doc.length,
    });
  });
});
