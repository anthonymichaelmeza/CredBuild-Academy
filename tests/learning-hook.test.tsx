// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useLearning } from "@/components/use-learning";
import { lessons } from "@/modules/learning/catalog";
const empty = { state: { version: 1, progress: {} }, revisions: {} };
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("learning persistence adapter", () => {
  it("loads and saves account progress without reading or writing browser lesson storage", async () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "false");
    const read = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("Account data must not use localStorage");
      });
    const write = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("Account data must not use localStorage");
      });
    const saved = {
      state: {
        version: 1,
        progress: {
          [lessons[0].id]: {
            lessonVersion: 1,
            sections: ["understand"],
            checks: {},
            completedAt: null,
          },
        },
      },
      revisions: { [lessons[0].id]: 1 },
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json(empty))
      .mockResolvedValueOnce(Response.json(saved));
    vi.stubGlobal("fetch", fetcher);
    const { result } = renderHook(() => useLearning());
    await waitFor(() => expect(result.current.state).toEqual(empty.state));
    await act(async () => {
      await result.current.action(lessons[0].id, {
        type: "visit",
        sectionId: "understand",
      });
    });
    expect(result.current.state).toEqual(saved.state);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({
      lessonId: lessons[0].id,
      lessonVersion: 1,
      revision: 0,
      action: { type: "visit", sectionId: "understand" },
    });
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
  it("clears loaded account progress after the authentication boundary rejects a save", async () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "false");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json(empty))
        .mockResolvedValueOnce(
          Response.json({ error: "Sign in to continue." }, { status: 401 }),
        ),
    );
    const { result } = renderHook(() => useLearning());
    await waitFor(() => expect(result.current.state).toEqual(empty.state));
    await act(async () => {
      await expect(
        result.current.action(lessons[0].id, {
          type: "visit",
          sectionId: "understand",
        }),
      ).rejects.toThrow("Sign in");
    });
    expect(result.current.state).toBeNull();
  });
});
