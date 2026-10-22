import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
test("account availability, demo export and reset are honest and functional", async ({
  page,
}) => {
  await page.goto("/sign-up");
  await expect(
    page.getByRole("heading", { name: "Explore without an account." }),
  ).toBeVisible();
  await page.goto("/coach");
  await expect(
    page.getByRole("heading", { name: "The AI Study Coach is not active." }),
  ).toBeVisible();
  await page.goto("/programs");
  await expect(
    page.getByRole("link", { name: "Explore CHST learning" }),
  ).toHaveAttribute("href", "/learn");
  await page.goto("/settings");
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export browser demo data", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("credbuilt-demo-export.json");
  const exported = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(exported.storage).toBe("browser-only-demo");
  expect(exported.practice.sessions).toEqual([]);
  expect(exported.learning.progress).toEqual({});
  expect(exported.planner.state).toBeNull();
  expect((await page.request.get("/api/account/export")).status()).toBe(403);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Reset browser demo", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      [
        "credbuilt.browser-demo.v1",
        "credbuilt.learning-demo.v1",
        "credbuilt.planner-demo.v1",
      ].every((key) => localStorage.getItem(key) === null),
    ),
  ).toBe(true);
});
