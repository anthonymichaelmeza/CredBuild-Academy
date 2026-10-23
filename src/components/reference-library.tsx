"use client";
import { useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { useHydrated } from "./use-hydrated";
import Link from "next/link";
import {
  CHST_REFERENCES_VERSION,
  chstBibliography,
} from "@/modules/curriculum/catalog";
type Resource = {
  id: string;
  title: string;
  publisher: string;
  topic: string;
  url: string | null;
  access: string;
  category: string;
  domains: string[];
  edition: string;
  section: string;
  citation?: string;
  page?: number;
};
const discovery = [
  {
    title: "CHST certification information",
    publisher: "BCSP",
    topic: "Blueprint and certification",
    url: "https://www.bcsp.org/construction-health-and-safety-technician-chst/",
    access: "Public discovery page",
  },
  {
    title: "Recommended Practices for Safety and Health Programs",
    publisher: "OSHA",
    topic: "Safety program framework",
    url: "https://www.osha.gov/safety-management",
    access: "Public discovery page",
  },
  {
    title: "Construction industry resources",
    publisher: "OSHA",
    topic: "Construction safety",
    url: "https://www.osha.gov/construction",
    access: "Public discovery page",
  },
  {
    title: "Construction safety and health",
    publisher: "NIOSH / CDC",
    topic: "Research and prevention",
    url: "https://www.cdc.gov/niosh/construction/",
    access: "Public discovery page",
  },
];
const bibliographyDomains: Record<number, string[]> = {
  1: ["2", "3"],
  2: ["3", "4"],
  3: ["1", "3"],
  4: ["1", "3"],
  5: ["3", "4"],
  6: ["4"],
  7: ["1", "2", "3", "4"],
  8: ["1", "3"],
  9: ["2"],
  10: ["1"],
  11: ["1", "3"],
  12: ["1"],
  13: ["4"],
  14: ["1"],
  15: ["1", "3"],
  16: ["3"],
  17: ["1", "3", "4"],
  18: ["1"],
  19: ["3", "4"],
  20: ["1", "2", "3", "4"],
  21: ["2", "4"],
};
const resources: Resource[] = [
  ...discovery.map((resource, index) => ({
    ...resource,
    id: `publisher-discovery-${index + 1}`,
    category: index === 1 ? "professional_guidance" : "supplemental_resource",
    domains: ["1", "2", "3", "4"],
    edition: "Not reviewed",
    section: "Not reviewed",
  })),
  ...chstBibliography.map((record, index) => ({
    id: record.id,
    title: record.title,
    publisher: record.publisher || record.authors,
    topic: `BCSP-listed bibliography · ${record.authors} · ${record.publicationYear}`,
    url: record.listedUrl?.startsWith("https://") ? record.listedUrl : null,
    access: "Bibliography listing only; source content not reviewed",
    category: record.sourceCategory,
    domains: bibliographyDomains[index + 1] || [],
    edition: record.edition || "No edition stated in bibliography",
    section: "Not verified",
    citation: record.listedCitation,
    page: record.documentPage,
  })),
];
export function ReferenceLibrary() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [domain, setDomain] = useState("all");
  const hydrated = useHydrated();
  const found = resources.filter(
    (r) =>
      (category === "all" || r.category === category) &&
      (domain === "all" || r.domains.includes(domain)) &&
      `${r.title} ${r.publisher} ${r.topic}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="page-wrap">
      <div className="eyebrow">GO TO THE SOURCE</div>
      <h1>
        Your reference library<span className="orange">.</span>
      </h1>
      <p className="lead">
        The supplied BCSP bibliography, V.{CHST_REFERENCES_VERSION}, plus
        publisher discovery links. A bibliography listing is not evidence that a
        book supports a particular answer.
      </p>
      <div
        className="source-classification"
        aria-label="Source classifications"
      >
        <div>
          <h2>Regulatory requirement</h2>
          <p>
            An applicable legal requirement needs an identified regulation and
            jurisdiction. A publisher link alone does not establish
            applicability.
          </p>
        </div>
        <div>
          <h2>Consensus standard</h2>
          <p>
            A technical standard needs its edition, scope, and applicability
            identified. Do not assume every standard is legally binding.
          </p>
        </div>
        <div>
          <h2>Professional guidance</h2>
          <p>
            Recommendations, professional methods, and textbooks can inform
            learning. They are distinct from a regulation.
          </p>
        </div>
        <div>
          <h2>Supplemental resource</h2>
          <p>
            Discovery pages and learning aids help locate material. They do not
            independently verify technical claims.
          </p>
        </div>
      </div>
      <div className="reference-controls">
        <label className="search-box">
          <Search size={20} />
          <span className="sr-only">Search references</span>
          <input
            disabled={!hydrated}
            placeholder="Search by title, publisher, or topic…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="curriculum-select">
          Source category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All categories</option>
            <option value="regulatory_requirement">
              Regulatory requirements
            </option>
            <option value="consensus_standard">Consensus standards</option>
            <option value="professional_guidance">Professional guidance</option>
            <option value="supplemental_resource">
              Supplemental resources
            </option>
          </select>
        </label>
        <label className="curriculum-select">
          Related study domain
          <select
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
          >
            <option value="all">All CHST domains</option>
            {["1", "2", "3", "4"].map((code) => (
              <option value={code} key={code}>
                Domain {code}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="fine-print" aria-live="polite">
        {found.length} resources
      </p>
      <div className="resource-grid">
        {found.map((r) => (
          <article className="card resource-card" key={r.id} id={r.id}>
            <span className="eyebrow">{r.publisher}</span>
            <h2>{r.title}</h2>
            <p>{r.topic}</p>
            <span className="neutral-badge">
              {r.citation
                ? "Bibliography only · source not reviewed"
                : "Not verified"}
            </span>
            <dl>
              <div>
                <dt>Source edition</dt>
                <dd>{r.edition}</dd>
              </div>
              <div>
                <dt>Exact supporting section</dt>
                <dd>{r.section}</dd>
              </div>
              <div>
                <dt>Last verified</dt>
                <dd>Never</dd>
              </div>
              <div>
                <dt>Access</dt>
                <dd>{r.access}</dd>
              </div>
            </dl>
            {r.citation && (
              <>
                <details>
                  <summary>Listed bibliographic record</summary>
                  <p className="fine-print">{r.citation}</p>
                  <p className="fine-print">
                    Supplied CHST references V.{CHST_REFERENCES_VERSION}, page{" "}
                    {r.page}. The supplied edition may not be current.
                  </p>
                </details>
                <p className="fine-print">
                  Domain connections are tentative study aids, not verified
                  support for a lesson or answer.
                </p>
              </>
            )}
            {r.url ? (
              <a
                className="text-link"
                href={r.url}
                target="_blank"
                rel="noreferrer"
              >
                Visit publisher <ExternalLink size={15} />
              </a>
            ) : (
              <p className="fine-print">
                No current HTTPS publisher link was supplied or verified. Locate
                the stated edition through the publisher or your library.
              </p>
            )}
          </article>
        ))}
      </div>
      {!found.length && (
        <p className="card">
          No matching resources. Try a different title or publisher.
        </p>
      )}
      <p className="demo-disclosure">
        All 21 listed publications are represented. No textbook content, exact
        answer-supporting section, or technical source verification date is
        inferred from inclusion in this bibliography. Link freshness is unknown;
        no dates are invented.{" "}
        <Link className="text-link" href="/curriculum">
          Return to the CHST5 study map.
        </Link>
      </p>
    </div>
  );
}
