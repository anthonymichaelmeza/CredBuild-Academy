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
import { QuestionQualityStudio } from "@/components/question-quality-studio";
import type { EditorialSnapshot } from "@/modules/studio/editorial-model";
import { questionQualityReport } from "@/modules/studio/question-quality";
import { domain1Batch001 } from "@/content/chst/domain1-batch-001";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("clears the private editorial workspace when the server rejects a lost reviewer role", async () => {
  const content = domain1Batch001[0].content;
  const initial: EditorialSnapshot = {
    access: {
      actorId: "qa-ui-reviewer",
      roles: ["reviewer"],
      localDevelopment: false,
    },
    items: [
      {
        id: "qa-ui-item",
        revisionId: "qa-ui-item:v1",
        revision: 1,
        rowVersion: 4,
        ownerId: "qa-other-author",
        status: "approved",
        data: content,
        sourceVerified: true,
        editorialApproved: false,
        history: [],
        stage: "Editorial Review — technical approval recorded",
        canReview: true,
      },
    ],
    quality: questionQualityReport([
      { id: "qa-ui-item", data: content, sourceVerified: true },
    ]),
    truncated: false,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: "Your editorial role no longer permits this action.",
      }),
    }),
  );
  render(<QuestionQualityStudio initial={initial} />);
  fireEvent.click(screen.getByText(content.title, { exact: true }));
  fireEvent.change(
    screen.getByLabelText("Editorial findings", { exact: true }),
    {
      target: {
        value:
          "Synthetic reviewer QA decision must be rejected after role revocation.",
      },
    },
  );
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: /I personally performed this editorial examination/,
    }),
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Record human editorial decision",
    }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "Editorial access has ended." }),
    ).toBeVisible(),
  );
  expect(
    screen.queryByText(content.title, { exact: true }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Record human editorial decision" }),
  ).not.toBeInTheDocument();
});
