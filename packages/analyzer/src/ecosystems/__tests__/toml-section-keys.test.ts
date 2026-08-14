import { describe, expect, it } from "vitest";
import { extractTomlSectionKeys } from "../toml-section-keys";

describe("extractTomlSectionKeys", () => {
  it("extracts keys from a simple key = value table", () => {
    const content = ['[dependencies]', 'axum = "0.7"', 'serde = "1.0"'].join("\n");
    expect(extractTomlSectionKeys(content, "dependencies")).toEqual(["axum", "serde"]);
  });

  it("extracts keys from an inline-table value (name = { version = ..., features = [...] })", () => {
    const content = ['[dependencies]', 'serde = { version = "1.0", features = ["derive"] }'].join("\n");
    expect(extractTomlSectionKeys(content, "dependencies")).toEqual(["serde"]);
  });

  it("stops at the next [section] header, not spilling into unrelated sections", () => {
    const content = [
      "[dependencies]",
      'axum = "0.7"',
      "",
      "[dev-dependencies]",
      'tokio-test = "0.4"',
    ].join("\n");
    expect(extractTomlSectionKeys(content, "dependencies")).toEqual(["axum"]);
  });

  it("handles a dotted section header (e.g. tool.poetry.dependencies)", () => {
    const content = ["[tool.poetry.dependencies]", 'django = "^4.2"'].join("\n");
    expect(extractTomlSectionKeys(content, "tool.poetry.dependencies")).toEqual(["django"]);
  });

  it("returns an empty array when the section doesn't exist", () => {
    const content = '[package]\nname = "foo"\n';
    expect(extractTomlSectionKeys(content, "dependencies")).toEqual([]);
  });

  it("skips blank lines and comment lines within the section", () => {
    const content = ["[dependencies]", "# a comment", "", 'axum = "0.7"'].join("\n");
    expect(extractTomlSectionKeys(content, "dependencies")).toEqual(["axum"]);
  });
});
