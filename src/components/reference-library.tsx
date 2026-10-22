"use client";
import { useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { useHydrated } from "./use-hydrated";
const resources = [
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
export function ReferenceLibrary() {
  const [search, setSearch] = useState("");
  const hydrated = useHydrated();
  const found = resources.filter((r) =>
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
        Official publisher discovery links. No source has been reviewed or
        verified in this build.
      </p>
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
      <p className="fine-print" aria-live="polite">
        {found.length} resources
      </p>
      <div className="resource-grid">
        {found.map((r) => (
          <article className="card resource-card" key={r.url}>
            <span className="eyebrow">{r.publisher}</span>
            <h2>{r.title}</h2>
            <p>{r.topic}</p>
            <span className="neutral-badge">Not verified</span>
            <dl>
              <div>
                <dt>Source version / section</dt>
                <dd>Not reviewed</dd>
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
            <a
              className="text-link"
              href={r.url}
              target="_blank"
              rel="noreferrer"
            >
              Visit publisher <ExternalLink size={15} />
            </a>
          </article>
        ))}
      </div>
      {!found.length && (
        <p className="card">
          No matching resources. Try a different title or publisher.
        </p>
      )}
      <p className="demo-disclosure">
        External links may change. No copyrighted standards are reproduced.
        Related lesson and question mappings await source review.
      </p>
    </div>
  );
}
