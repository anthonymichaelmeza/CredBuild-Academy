export type ChstDomainCode = "1" | "2" | "3" | "4";
export type ObjectiveKind = "knowledge" | "skill";

/** Numbering restarts within each domain's knowledge and skill lists. */
export type CurriculumObjective = {
  id: string;
  certificationId: "chst";
  blueprintRevisionId: string;
  blueprintVersion: string;
  domain: ChstDomainCode;
  kind: ObjectiveKind;
  number: number;
  statement: string;
  documentPage: number;
};

export type CurriculumDomain = {
  code: ChstDomainCode;
  title: string;
  /** Integer basis points, preserving the supplied percentage without rounding. */
  weight: number;
  percentage: number;
};

/** A bibliography listing establishes inclusion, not support for any answer. */
export type BibliographyRecord = {
  id: string;
  title: string;
  authors: string;
  edition: string | null;
  publicationYear: number;
  publisher: string | null;
  publicationPlace: string | null;
  listedUrl: string | null;
  listedCitation: string;
  documentPage: number;
  bibliographyVersion: string;
  sourceCategory: "professional_guidance";
  accessStatus: "bibliography_only";
  verifiedAt: null;
};

export type AttachmentDocument = {
  id: string;
  fileName: string;
  version: string;
  sha256: string;
  pages: number;
  publisher: string;
  provenance: string;
  latestVersionStatus: "not_confirmed";
};
