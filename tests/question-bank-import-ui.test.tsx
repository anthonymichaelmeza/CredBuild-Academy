// @vitest-environment jsdom
import { useState } from "react";
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
import { QuestionBankImport } from "@/components/studio/question-bank-import";
import { questionTemplate } from "@/modules/studio/model";
import type { QuestionImportPreview } from "@/modules/studio/batch-import";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const basePreview: QuestionImportPreview = {
  id: "11111111-1111-4111-8111-111111111111",
  expiresAt: "2030-01-01T00:00:00Z",
  records: [questionTemplate],
  errors: [],
  duplicates: [],
  format: "csv",
  sourceRows: [2],
  externalIds: ["QA-external-id"],
};

describe("Question Bank input-bound import confirmation", () => {
  it("requires a fresh preview after content, format or file selection changes", async () => {
    const confirm = vi.fn().mockResolvedValue(undefined);
    let sequence = 0;
    function Harness() {
      const [preview, setPreview] = useState<QuestionImportPreview | null>(
        null,
      );
      return (
        <QuestionBankImport
          busy={false}
          preview={preview}
          onConfirm={confirm}
          onPreview={async (format) => {
            const result = {
              ...basePreview,
              id: `preview-${++sequence}`,
              format,
            };
            setPreview(result);
            return result;
          }}
        />
      );
    }
    render(<Harness />);
    const content = screen.getByLabelText("Question batch content", {
      exact: true,
    });
    const preview = () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Preview CSV or JSON import" }),
      );
    const confirmation = () =>
      screen.getByRole("button", {
        name: "Confirm draft-only Question Bank import",
      });
    fireEvent.change(content, { target: { value: "original batch" } });
    preview();
    await waitFor(() => expect(confirmation()).toBeEnabled());
    fireEvent.change(content, { target: { value: "edited batch" } });
    expect(confirmation()).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(/no longer matches/);
    fireEvent.click(confirmation());
    expect(confirm).not.toHaveBeenCalled();
    preview();
    await waitFor(() => expect(confirmation()).toBeEnabled());
    fireEvent.change(
      screen.getByLabelText("Question file format", { exact: true }),
      { target: { value: "json" } },
    );
    expect(confirmation()).toBeDisabled();
    preview();
    await waitFor(() => expect(confirmation()).toBeEnabled());
    const oversized = new File([new Uint8Array(250_001)], "too-large.json", {
      type: "application/json",
    });
    fireEvent.change(
      screen.getByLabelText("Choose a CSV or JSON question file", {
        exact: true,
      }),
      { target: { files: [oversized] } },
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/smaller than 250 KB/);
    expect(confirmation()).toBeDisabled();
    preview();
    await waitFor(() => expect(confirmation()).toBeEnabled());
    fireEvent.click(confirmation());
    expect(confirm).toHaveBeenCalledExactlyOnceWith("preview-4");
  });

  it("does not confirm an older input when its async preview finishes after an edit", async () => {
    let resolve: (preview: QuestionImportPreview) => void = () => {};
    const deferred = new Promise<QuestionImportPreview>((done) => {
      resolve = done;
    });
    const confirm = vi.fn().mockResolvedValue(undefined);
    function Harness() {
      const [preview, setPreview] = useState<QuestionImportPreview | null>(
        null,
      );
      return (
        <QuestionBankImport
          busy={false}
          preview={preview}
          onConfirm={confirm}
          onPreview={async () => {
            const result = await deferred;
            setPreview(result);
            return result;
          }}
        />
      );
    }
    render(<Harness />);
    const content = screen.getByLabelText("Question batch content", {
      exact: true,
    });
    fireEvent.change(content, { target: { value: "first submitted batch" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Preview CSV or JSON import" }),
    );
    fireEvent.change(content, { target: { value: "newer unpreviewed batch" } });
    await act(async () => {
      resolve(basePreview);
      await deferred;
    });
    expect(
      screen.getByRole("button", {
        name: "Confirm draft-only Question Bank import",
      }),
    ).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      /Preview and validate the current batch again/,
    );
    expect(confirm).not.toHaveBeenCalled();
  });
});
