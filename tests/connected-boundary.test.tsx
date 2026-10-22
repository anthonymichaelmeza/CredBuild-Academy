// @vitest-environment jsdom
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
const state = vi.hoisted(() => ({
  userId: "user_a" as string | null,
  isLoaded: true,
  refresh: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => state }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: state.refresh }),
}));
import { ConnectedAccountBoundary } from "@/components/connected-account-boundary";
afterEach(() => {
  cleanup();
  state.userId = "user_a";
  state.isLoaded = true;
  state.refresh.mockClear();
});
describe("connected account UI isolation", () => {
  it("hides old account content until the authenticated server subject matches", () => {
    const view = render(
      <ConnectedAccountBoundary subject="user_a">
        <p>A private history</p>
      </ConnectedAccountBoundary>,
    );
    expect(screen.getByText("A private history")).toBeInTheDocument();
    state.userId = "user_b";
    view.rerender(
      <ConnectedAccountBoundary subject="user_a">
        <p>A private history</p>
      </ConnectedAccountBoundary>,
    );
    expect(screen.queryByText("A private history")).not.toBeInTheDocument();
    expect(state.refresh).toHaveBeenCalled();
    view.rerender(
      <ConnectedAccountBoundary subject="user_b">
        <p>B private history</p>
      </ConnectedAccountBoundary>,
    );
    expect(screen.getByText("B private history")).toBeInTheDocument();
  });
  it("conceals server content while sign-in state loads or expires", () => {
    state.isLoaded = false;
    const view = render(
      <ConnectedAccountBoundary subject="user_a">
        <p>Private progress</p>
      </ConnectedAccountBoundary>,
    );
    expect(screen.queryByText("Private progress")).not.toBeInTheDocument();
    state.isLoaded = true;
    state.userId = null;
    view.rerender(
      <ConnectedAccountBoundary subject="user_a">
        <p>Private progress</p>
      </ConnectedAccountBoundary>,
    );
    expect(screen.queryByText("Private progress")).not.toBeInTheDocument();
  });
});
