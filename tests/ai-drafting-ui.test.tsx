// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QuestionDrafting } from "@/components/studio/ai-drafting";
// This unit covers brief and batch controls. Persistent job behavior has its own
// integration and browser tests; its independent inventory reads are isolated.
vi.mock("@/components/studio/drafting-jobs", () => ({
  QuestionDraftingJobs: () => null,
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("builds an explicit no-provider brief without any network request", () => {
  const network = vi.fn();
  vi.stubGlobal("fetch", network);
  render(<QuestionDrafting busy={false} onPrepareBatch={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Drafting topic", { exact: true }), {
    target: { value: "Hot work" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Prepare AI drafting brief" }),
  );
  expect(
    (
      screen.getByLabelText(
        "Generated AI drafting brief",
      ) as HTMLTextAreaElement
    ).value,
  ).toContain("CREDBUILT ACADEMY");
  expect(network).not.toHaveBeenCalled();
});
it("loads the real batch only on request and forwards exact JSON for draft-only validation", async () => {
  const records = [
    { id: "test-candidate", content: { origin: "ai_generated" } },
  ];
  const onPrepareBatch = vi.fn().mockResolvedValue(undefined);
  const network = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => records });
  vi.stubGlobal("fetch", network);
  render(<QuestionDrafting busy={false} onPrepareBatch={onPrepareBatch} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Preview 50 Domain 1 drafts" }),
  );
  await waitFor(() =>
    expect(onPrepareBatch).toHaveBeenCalledWith(JSON.stringify(records)),
  );
  expect(network).toHaveBeenCalledExactlyOnceWith(
    "/api/studio/questions/drafts",
    { cache: "no-store", credentials: "same-origin" },
  );
});
