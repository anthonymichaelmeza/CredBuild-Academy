// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { StudyPlanner } from "@/components/study-planner";
import { defaultProfile } from "@/modules/planner/model";

vi.mock("@/components/use-learning", () => ({
  useLearning: () => ({ state: { version: 1, progress: {} }, error: null }),
}));
function snapshot(minutes = 30, revision = 1) {
  return {
    state: {
      version: 1,
      profile: {
        ...defaultProfile,
        studyDays: [0, 1, 2, 3, 4, 5, 6],
        minutesPerSession: minutes,
      },
      completedTaskIds: [],
      onboardedAt: "2026-10-22T09:00:00.000Z",
    },
    revision,
    weakDomains: [],
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("connected planner recovery and private state", () => {
  it("clears private goals after session expiry without using browser storage", async () => {
    const read = vi.spyOn(Storage.prototype, "getItem");
    const write = vi.spyOn(Storage.prototype, "setItem");
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(snapshot()))
      .mockResolvedValueOnce(
        Response.json(
          { error: "Sign in to recover your study plan." },
          { status: 401 },
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    render(<StudyPlanner browserOnly={false} available />);
    await screen.findByRole("button", {
      name: "Edit study preferences",
    });
    fireEvent.click(
      screen.getAllByRole("checkbox", {
        name: "Mark lesson done (self-reported)",
      })[0],
    );
    await expect(screen.findByRole("alert")).resolves.toHaveTextContent(
      "Sign in to recover your study plan.",
    );
    expect(
      screen.queryByRole("button", {
        name: "Edit study preferences",
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Retry loading" })).toBeVisible();
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it("reloads the current server revision after a conflicting save", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(snapshot()))
      .mockResolvedValueOnce(
        Response.json(
          { error: "This study plan changed in another tab." },
          { status: 409 },
        ),
      )
      .mockResolvedValueOnce(Response.json(snapshot(60, 2)));
    vi.stubGlobal("fetch", fetcher);
    render(<StudyPlanner browserOnly={false} available />);
    await screen.findByRole("button", {
      name: "Edit study preferences",
    });
    fireEvent.click(
      screen.getAllByRole("checkbox", {
        name: "Mark lesson done (self-reported)",
      })[0],
    );
    await screen.findByText(/up to 60 minutes per day/);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "changed in another tab",
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Edit study preferences",
      }),
    );
    expect(
      screen.getByLabelText("Minutes per study day", { exact: true }),
    ).toHaveValue(60);
    expect(fetcher.mock.calls[2][1]).toMatchObject({ cache: "no-store" });
  });

  it("refreshes on focus and ignores an older request even if the transport ignores abort", async () => {
    const old = deferred<Response>();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(Response.json(snapshot(45, 2)));
    vi.stubGlobal("fetch", fetcher);
    render(<StudyPlanner browserOnly={false} available />);
    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    fireEvent.focus(window);
    await screen.findByText(/up to 45 minutes per day/);
    expect((fetcher.mock.calls[0][1]?.signal as AbortSignal).aborted).toBe(
      true,
    );
    await act(async () => {
      old.resolve(Response.json(snapshot(20)));
    });
    expect(
      screen.queryByText(/up to 20 minutes per day/),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/up to 45 minutes per day/)).toBeVisible();
  });

  it("clears old goals on a failed refresh and can recover from the server", async () => {
    const read = vi.spyOn(Storage.prototype, "getItem");
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(snapshot(30)))
      .mockRejectedValueOnce(new TypeError("Server connection unavailable"))
      .mockResolvedValueOnce(Response.json(snapshot(40, 2)));
    vi.stubGlobal("fetch", fetcher);
    render(<StudyPlanner browserOnly={false} available />);
    await screen.findByText(/up to 30 minutes per day/);
    fireEvent.focus(window);
    await screen.findByRole("alert");
    expect(
      screen.queryByText(/up to 30 minutes per day/),
    ).not.toBeInTheDocument();
    fireEvent.focus(window);
    await screen.findByText(/up to 40 minutes per day/);
    expect(read).not.toHaveBeenCalled();
  });

  it("aborts in-flight private reads when the account-scoped component unmounts", async () => {
    const old = deferred<Response>();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(Response.json(snapshot(50, 2)));
    vi.stubGlobal("fetch", fetcher);
    const original = render(<StudyPlanner browserOnly={false} available />);
    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    original.unmount();
    expect((fetcher.mock.calls[0][1]?.signal as AbortSignal).aborted).toBe(
      true,
    );
    render(<StudyPlanner browserOnly={false} available />);
    await screen.findByText(/up to 50 minutes per day/);
    await act(async () => {
      old.resolve(Response.json(snapshot(15)));
    });
    expect(
      screen.queryByText(/up to 15 minutes per day/),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/up to 50 minutes per day/)).toBeVisible();
  });
});
