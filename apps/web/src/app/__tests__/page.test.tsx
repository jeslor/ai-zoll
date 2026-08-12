import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "../page";

describe("HomePage", () => {
  it("renders the AI Zoll scaffold heading", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "AI Zoll" })).toBeDefined();
  });
});
