import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connection } from "@/db/client";
import { seedDemo } from "@/db/seed";
import { grantStudioRole } from "@/modules/studio/roles";
import {
  registryActionSchema,
  registryReferenceSchema,
  newRegistryReference,
} from "@/modules/references/model";
import {
  referenceRegistry,
  referenceRegistryAction,
} from "@/modules/references/service";

process.env.ALLOW_LOCAL_DEMO = "true";
process.env.LOCAL_DATABASE_PATH = ":memory:";
delete process.env.DATABASE_URL;
delete process.env.NEXT_PUBLIC_BROWSER_DEMO;
const admin = { id: "registry-test-admin", mode: "managed" as const };
const author = { id: "registry-test-author", mode: "managed" as const };
const candidate = {
  ...newRegistryReference,
  title: "Fictional registry QA source — no technical evidence",
  issuer: "QA fixture publisher",
  section: "Fictional QA section",
  url: "https://example.test/registry-qa",
  topics: ["Synthetic QA only"],
};
beforeAll(async () => {
  await seedDemo();
  for (const who of [admin, author])
    await (
      await connection()
    ).query("INSERT INTO users(id,identity_mode) VALUES($1,'managed')", [
      who.id,
    ]);
  await grantStudioRole(admin.id, "administrator", "isolated-QA-operator");
  await grantStudioRole(author.id, "author", "isolated-QA-operator");
});
afterAll(async () => (await connection()).close());
describe("authoritative candidate reference registry", () => {
  it("seeds five unverified public links with unknown publication dates and keeps the supplied bibliography separate", async () => {
    const references = await referenceRegistry(admin);
    expect(references).toHaveLength(5);
    expect(
      references.every(
        (item) =>
          item.status === "unverified" &&
          item.reviews.length === 0 &&
          item.data.publicationDate === null,
      ),
    ).toBe(true);
    const [{ count }] = (
      await (
        await connection()
      ).query("SELECT count(*) FROM reference_publications")
    ).rows;
    expect(Number(count)).toBe(21);
  });
  it("requires administrator access and rejects browser mode before connecting", async () => {
    await expect(referenceRegistry(author)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      referenceRegistryAction(author, { action: "create", data: candidate }),
    ).rejects.toMatchObject({ status: 403 });
    process.env.NEXT_PUBLIC_BROWSER_DEMO = "true";
    try {
      await expect(referenceRegistry(admin)).rejects.toMatchObject({
        status: 403,
      });
    } finally {
      delete process.env.NEXT_PUBLIC_BROWSER_DEMO;
    }
  });
  it("validates safe source locations, date and licensing metadata without accepting verification claims", () => {
    expect(
      registryReferenceSchema.safeParse({
        ...candidate,
        url: "http://localhost/private",
      }).success,
    ).toBe(false);
    expect(
      registryReferenceSchema.safeParse({
        ...candidate,
        publicationDate: "2025-02-30",
      }).success,
    ).toBe(false);
    expect(
      registryReferenceSchema.safeParse({
        ...candidate,
        url: "",
        access: "licensed_reference",
        licensedIdentifier: "Licensed-ISBN-fixture",
      }).success,
    ).toBe(true);
    expect(
      registryReferenceSchema.safeParse({
        ...candidate,
        url: "",
        access: "licensed_reference",
        licensedIdentifier: "",
      }).success,
    ).toBe(false);
    expect(
      registryReferenceSchema.safeParse({ ...candidate, verified: true })
        .success,
    ).toBe(false);
    expect(
      registryActionSchema.safeParse({
        action: "review",
        id: "x",
        revision: 1,
        decision: "verified",
        findings: "QA",
        humanAttestation: false,
      }).success,
    ).toBe(false);
  });
  it("records human examination on the exact revision, preserves its immutable history, and resets verification on edit", async () => {
    const c = await connection();
    const created = (
      await referenceRegistryAction(admin, {
        action: "create",
        data: candidate,
      })
    ).find((item) => item.data.title === candidate.title)!;
    expect(created.status).toBe("unverified");
    const verified = (
      await referenceRegistryAction(admin, {
        action: "review",
        id: created.id,
        revision: 1,
        decision: "verified",
        findings:
          "Synthetic source examination fixture; not real technical verification.",
        humanAttestation: true,
      })
    ).find((item) => item.id === created.id)!;
    expect(verified.status).toBe("verified");
    expect(verified.reviews[0].reviewerId).toBe(admin.id);
    await expect(
      c.query("DELETE FROM technical_reference_reviews WHERE reference_id=$1", [
        created.id,
      ]),
    ).rejects.toThrow(/immutable/);
    const edited = (
      await referenceRegistryAction(admin, {
        action: "edit",
        id: created.id,
        revision: 1,
        data: { ...candidate, section: "Changed synthetic section" },
      })
    ).find((item) => item.id === created.id)!;
    expect(edited.revision).toBe(2);
    expect(edited.status).toBe("unverified");
    expect(edited.reviews).toHaveLength(1);
    await expect(
      referenceRegistryAction(admin, {
        action: "review",
        id: created.id,
        revision: 1,
        decision: "verified",
        findings: "Stale synthetic revision",
        humanAttestation: true,
      }),
    ).rejects.toMatchObject({ status: 409 });
    const [{ count }] = (
      await c.query("SELECT count(*) FROM studio_source_verifications")
    ).rows;
    expect(Number(count)).toBe(0);
    const [published] = (
      await c.query("SELECT count(*) FROM published_questions")
    ).rows;
    expect(Number(published.count)).toBe(0);
  });
  it("uses insertion event order when review timestamps tie and IDs sort in the opposite direction", async () => {
    const data = {
      ...candidate,
      title: "Fictional same-time review ordering QA",
    };
    const created = (
      await referenceRegistryAction(admin, { action: "create", data })
    ).find((item) => item.data.title === data.title)!;
    await (
      await connection()
    ).transaction(async (query) => {
      // now() is the same transaction timestamp for both inserts. The later
      // needs_revision decision must win even though its ID sorts first.
      for (const [id, decision] of [
        ["zzzz-reference-review-first", "verified"],
        ["aaaa-reference-review-last", "needs_revision"],
      ]) {
        await query(
          "INSERT INTO technical_reference_reviews(id,reference_id,revision,reference_snapshot,reviewer_id,decision,findings,human_attestation) VALUES($1,$2,1,$3::jsonb,$4,$5,'Synthetic same-time ordering fixture only',true)",
          [id, created.id, JSON.stringify(data), admin.id, decision],
        );
      }
    });
    const result = (await referenceRegistry(admin)).find(
      (item) => item.id === created.id,
    )!;
    expect(result.reviews).toHaveLength(2);
    expect(result.reviews[0].createdAt).toBe(result.reviews[1].createdAt);
    expect(result.reviews.map((review) => review.id)).toEqual([
      "aaaa-reference-review-last",
      "zzzz-reference-review-first",
    ]);
    expect(result.status).toBe("needs_revision");
  });
});
