// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
import { Dashboard } from "@/components/dashboard";
import { Shell } from "@/components/shell";
afterEach(cleanup);
describe("dashboard and navigation", () => {
  it("shows honest new-user empty states and demonstration disclosure", () => {
    render(<Dashboard sessions={[]} />);
    expect(
      screen.getByText("Your story starts with a first session."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Complete a session to see your accuracy"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/AI-generated demonstration questions are unreviewed/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Start practicing/ }),
    ).toHaveAttribute("href", "/practice");
  });
  it("exposes mobile navigation and all primary destinations", () => {
    render(
      <Shell managed={false}>
        <p>Content</p>
      </Shell>,
    );
    const toggle = screen.getByRole("button", { name: "Open navigation" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(
      screen.getByRole("button", { name: "Close navigation" }),
    ).toHaveAttribute("aria-expanded", "true");
    for (const label of [
      "Dashboard",
      "Learn",
      "Exam Simulator",
      "My Performance",
      "Flashcards",
      "Reference Library",
      "Study Planner",
      "Account Settings",
    ])
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  });
});
