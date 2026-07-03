import { describe, expect, it } from "vitest";
import {
  fallbackTitle,
  formatMarkdownLink,
  isHttpUrl,
  titleFromHtml,
} from "../src/link";

describe("link title conversion", () => {
  it("extracts and decodes html titles", () => {
    expect(titleFromHtml("<title>OpenAI &amp; 中文</title>")).toBe("OpenAI & 中文");
    expect(titleFromHtml("<html></html>")).toBe(null);
  });

  it("formats safe markdown links", () => {
    expect(formatMarkdownLink("A [B]", "https://example.com/a b)")).toBe(
      "[A \\[B\\]](https://example.com/a%20b%29)",
    );
  });

  it("validates and falls back for urls", () => {
    expect(isHttpUrl("https://openai.com")).toBe(true);
    expect(isHttpUrl("ftp://openai.com")).toBe(false);
    expect(fallbackTitle("https://www.openai.com/research")).toBe("openai.com");
  });
});
