/** Exact publisher hosts. A discovered link never expands this allowlist. */
export const allowedResearchHosts = [
  "bcsp.org",
  "www.bcsp.org",
  "bcsphub.com",
  "www.bcsphub.com",
  "osha.gov",
  "www.osha.gov",
  "cdc.gov",
  "www.cdc.gov",
  "stacks.cdc.gov",
  "fema.gov",
  "www.fema.gov",
  "training.fema.gov",
  "nfpa.org",
  "www.nfpa.org",
  "link.nfpa.org",
  "ansi.org",
  "www.ansi.org",
  "webstore.ansi.org",
  "assp.org",
  "www.assp.org",
  "store.assp.org",
  "epa.gov",
  "www.epa.gov",
  "cpwr.com",
  "www.cpwr.com",
  "ccohs.ca",
  "www.ccohs.ca",
  "wiley.com",
  "www.wiley.com",
  "onlinelibrary.wiley.com",
  "routledge.com",
  "www.routledge.com",
  "crcpress.com",
  "www.crcpress.com",
  "mheducation.com",
  "www.mheducation.com",
  "pearson.com",
  "www.pearson.com",
  "nsc.org",
  "www.nsc.org",
] as const;
const hosts = new Set<string>(allowedResearchHosts);
export function allowedResearchUrl(value: string): boolean {
  if (/[\u0000-\u0020\\]/u.test(value)) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      hosts.has(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}
export function normalizeResearchUrl(value: string): string {
  if (!allowedResearchUrl(value))
    throw new Error(
      "Source URL is outside the explicit public HTTPS research scope.",
    );
  const url = new URL(value);
  url.hash = "";
  return url.href;
}
