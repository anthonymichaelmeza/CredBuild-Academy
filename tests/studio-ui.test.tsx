// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
vi.mock("@/modules/studio/service", () => ({ studioSnapshot: vi.fn() }));
vi.mock("@/modules/identity/auth", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/modules/identity/auth")>();
  return { ...actual, actor: vi.fn(async () => null) };
});
import { ContentStudio } from "@/components/content-studio";
import StudioPage from "@/app/studio/page";
import { studioSnapshot } from "@/modules/studio/service";
import { Field, ListTextArea } from "@/components/studio/fields";
import {
  questionTemplate,
  type StudioItem,
  type StudioSnapshot,
} from "@/modules/studio/model";

const item: StudioItem = {
  id: "question-test",
  kind: "question",
  ownerId: "author-a",
  revision: 1,
  revisionId: "revision-1",
  rowVersion: 0,
  status: "draft",
  data: { ...questionTemplate, title: "Private source-review draft" },
  reviews: [],
  events: [],
  publishedRevisionId: null,
  blockers: ["A reviewed source is required."],
  versions: [
    {
      revision: 1,
      revisionId: "revision-1",
      status: "draft",
      authorId: "author-a",
    },
  ],
};
const initial: StudioSnapshot = {
  access: { actorId: "author-a", roles: ["author"], localDevelopment: false },
  items: [item],
  blueprints: [
    {
      id: "chst5-unverified",
      certificationId: "chst",
      version: "CHST5",
      verified: false,
      domains: [{ code: "1", title: "Supplied provisional domain" }],
      objectives: [],
    },
  ],
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("protected Content Studio interface", () => {
  it("retains the saved revision when its new review state moves it outside the filtered page", async () => {
    const updated: StudioItem = {
      ...item,
      status: "source_verification_pending",
      rowVersion: 1,
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json(updated))
      .mockResolvedValueOnce(
        Response.json({
          ...initial,
          items: [],
          pagination: { page: 1, pageSize: 25, total: 0, pages: 1 },
        }),
      )
      .mockResolvedValueOnce(Response.json(updated));
    vi.stubGlobal("fetch", fetcher);
    render(<ContentStudio initial={initial} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Request source verification" }),
    );
    await screen.findByText(
      "The saved revision remains selected even though it is outside this library page’s filters.",
    );
    expect(
      screen.getByRole("heading", { name: item.data.title }),
    ).toBeInTheDocument();
    expect(fetcher.mock.calls[2][0]).toBe(`/api/studio?id=${item.id}`);
  });
  it("saves structured changes as a new draft revision without sending identity or approval claims", async () => {
    const updated: StudioItem = {
      ...item,
      revision: 2,
      revisionId: "revision-2",
      rowVersion: 1,
      data: { ...item.data, title: "Revised original question" },
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json(updated))
      .mockResolvedValueOnce(Response.json({ ...initial, items: [updated] }));
    vi.stubGlobal("fetch", fetcher);
    render(<ContentStudio initial={initial} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Create a new draft revision" }),
    );
    fireEvent.change(screen.getByLabelText("Content title"), {
      target: { value: "Revised original question" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save new draft revision" }),
    );
    await screen.findByText(
      "Draft saved. Independent technical review is required before publication.",
    );
    const submitted = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(submitted).toMatchObject({
      action: "revise",
      id: item.id,
      revision: 1,
      rowVersion: 0,
      content: {
        title: "Revised original question",
        body: { stem: questionTemplate.body.stem },
      },
    });
    expect(submitted).not.toHaveProperty("role");
    expect(submitted).not.toHaveProperty("authorId");
    expect(submitted.content).not.toHaveProperty("reviewStatus");
    expect(submitted.content).not.toHaveProperty("verified");
    expect(fetcher.mock.calls[1][1].cache).toBe("no-store");
  });
  it("clears private content after editorial authorization expires and never stores it locally", async () => {
    const storage = vi.spyOn(Storage.prototype, "setItem");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: "Editorial access denied." }, { status: 403 }),
        ),
    );
    render(<ContentStudio initial={initial} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Submit for technical review" }),
    );
    await screen.findByRole("heading", { name: "Editorial access ended." });
    expect(
      screen.queryByText("Private source-review draft"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(questionTemplate.body.stem),
    ).not.toBeInTheDocument();
    expect(storage).not.toHaveBeenCalled();
  });
  it("keeps import confirmation unavailable when the server reports validation errors or duplicates", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        id: "preview-test",
        expiresAt: "2026-10-23T12:00:00Z",
        records: [],
        errors: [{ index: 0, message: "Unknown role claim." }],
        duplicates: ["Existing title"],
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    render(<ContentStudio initial={initial} />);
    fireEvent.click(screen.getByRole("button", { name: "Question import" }));
    fireEvent.change(screen.getByLabelText("Question import JSON"), {
      target: { value: JSON.stringify([questionTemplate]) },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Preview and validate import" }),
    );
    await screen.findByText("Record 1: Unknown role claim.");
    expect(
      screen.getByRole("button", { name: "Confirm draft-only import" }),
    ).toBeDisabled();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("preserves an exact import textarea label after validation and a second fill", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        id: "preview-test",
        expiresAt: "2026-10-23T12:00:00Z",
        records: [],
        errors: [{ index: 0, message: "Unknown role claim." }],
        duplicates: [],
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    render(<ContentStudio initial={initial} />);
    fireEvent.click(screen.getByRole("button", { name: "Question import" }));
    fireEvent.change(
      screen.getByLabelText("Question import JSON", { exact: true }),
      {
        target: {
          value: JSON.stringify([
            { ...questionTemplate, reviewStatus: "published" },
          ]),
        },
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Preview and validate import" }),
    );
    await screen.findByText("Record 1: Unknown role claim.");
    const secondValue = JSON.stringify([questionTemplate]);
    const textarea = screen.getByLabelText("Question import JSON", {
      exact: true,
    });
    fireEvent.change(textarea, { target: { value: secondValue } });
    expect(
      screen.getByLabelText("Question import JSON", { exact: true }),
    ).toHaveValue(secondValue);
    expect(textarea).toHaveAccessibleName("Question import JSON");
    expect(
      screen.getByRole("textbox", {
        name: "Question import JSON",
      }),
    ).toBe(textarea);
  });
  it("forwards explicit labels and separate descriptions through list textareas", () => {
    render(
      <Field label="Learning objectives" hint="One objective per line.">
        <ListTextArea value={["First objective"]} onChange={vi.fn()} />
      </Field>,
    );
    const textarea = screen.getByLabelText("Learning objectives", {
      exact: true,
    });
    expect(textarea).toHaveAccessibleName("Learning objectives");
    expect(textarea).toHaveAccessibleDescription("One objective per line.");
    fireEvent.change(textarea, {
      target: { value: "First objective\nSecond objective" },
    });
    expect(screen.getByLabelText("Learning objectives", { exact: true })).toBe(
      textarea,
    );
    expect(textarea).toHaveAccessibleName("Learning objectives");
  });
  it("does not expose administrative or self-approval controls to an author", () => {
    render(
      <ContentStudio
        initial={{
          ...initial,
          access: { ...initial.access, roles: ["author", "reviewer"] },
          items: [{ ...item, status: "technical_review" }],
        }}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Blueprint source review" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Review decision")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "You authored this revision. A different authorized reviewer must record the technical decision.",
      ),
    ).toBeInTheDocument();
  });
  it("rejects browser-demo Studio access before any database snapshot is requested", async () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    render(await StudioPage());
    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: "An authorized editorial account is required.",
        }),
      ).toBeInTheDocument(),
    );
    expect(studioSnapshot).not.toHaveBeenCalled();
  });
});
