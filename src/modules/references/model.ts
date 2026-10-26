import { z } from "zod";
import { safeHttps } from "@/modules/studio/model";

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max);
export const registryReferenceSchema = z
  .object({
    title: text(500),
    issuer: text(300),
    publicationDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    edition: optionalText(300),
    section: text(1000),
    url: optionalText(2000).refine(
      (value) => !value || safeHttps(value),
      "Use a public HTTPS source URL.",
    ),
    licensedIdentifier: optionalText(500),
    domains: z
      .array(z.enum(["1", "2", "3", "4"]))
      .min(1)
      .max(4)
      .refine((items) => new Set(items).size === items.length),
    topics: z.array(text(300)).min(1).max(30),
    access: z.enum(["public_link", "licensed_reference"]),
    rights: text(2000),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.access === "public_link" && !value.url)
      context.addIssue({
        code: "custom",
        path: ["url"],
        message: "A public reference needs a source URL.",
      });
    if (value.access === "licensed_reference" && !value.licensedIdentifier)
      context.addIssue({
        code: "custom",
        path: ["licensedIdentifier"],
        message:
          "Provide the licensed reference identifier; do not upload restricted content.",
      });
    if (
      value.publicationDate &&
      (Number.isNaN(Date.parse(value.publicationDate)) ||
        new Date(value.publicationDate).toISOString().slice(0, 10) !==
          value.publicationDate)
    )
      context.addIssue({
        code: "custom",
        path: ["publicationDate"],
        message: "Enter a valid publication date or leave it unknown.",
      });
  });
export type RegistryReferenceData = z.infer<typeof registryReferenceSchema>;
export const registryActionSchema = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("create"), data: registryReferenceSchema })
    .strict(),
  z
    .object({
      action: z.literal("edit"),
      id: text(100),
      revision: z.number().int().positive(),
      data: registryReferenceSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("review"),
      id: text(100),
      revision: z.number().int().positive(),
      decision: z.enum(["verified", "needs_revision"]),
      findings: text(5000),
      humanAttestation: z.literal(true),
    })
    .strict(),
]);
export type RegistryReference = {
  id: string;
  revision: number;
  data: RegistryReferenceData;
  status: "unverified" | "verified" | "needs_revision";
  updatedAt: string;
  reviews: {
    id: string;
    revision: number;
    reviewerId: string;
    decision: "verified" | "needs_revision";
    findings: string;
    createdAt: string;
  }[];
};
export const newRegistryReference: RegistryReferenceData = {
  title: "",
  issuer: "",
  publicationDate: null,
  edition: "",
  section: "",
  url: "",
  licensedIdentifier: "",
  domains: ["1"],
  topics: ["Construction safety"],
  access: "public_link",
  rights:
    "Link and citation metadata only. No distribution rights to source text are granted.",
};
