"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import {
  CHST_BLUEPRINT_VERSION,
  chstDomains,
  chstObjectives,
} from "@/modules/curriculum/catalog";

export function CurriculumExplorer() {
  const [domain, setDomain] = useState("all");
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const matches = chstObjectives.filter(
    (objective) =>
      (domain === "all" || objective.domain === domain) &&
      (kind === "all" || objective.kind === kind) &&
      `${objective.id} ${objective.statement}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="page-wrap curriculum-page">
      <div className="eyebrow">YOUR CHST5 STUDY MAP</div>
      <h1>
        Know what you’re building toward<span className="orange">.</span>
      </h1>
      <p className="lead">
        Every knowledge and skill statement from the supplied CHST5 blueprint,
        organized into a study pathway.
      </p>
      <div className="curriculum-summary card">
        <BookOpen size={28} />
        <div>
          <strong>78 statements · 4 domains</strong>
          <p>
            Blueprint V.{CHST_BLUEPRINT_VERSION}. Exact statement wording and
            original numbering are preserved.
          </p>
        </div>
        <Link className="button secondary" href="/reference">
          Explore references <ArrowRight size={16} />
        </Link>
      </div>
      <p className="notice curriculum-provenance">
        The attached blueprint has been transcribed into this map. Whether a
        newer official version exists has not been confirmed. The CredBuilt
        study outlines are unreviewed learning aids; this map does not represent
        78 approved lessons or verified technical instruction.
      </p>
      <nav className="curriculum-domains" aria-label="CHST5 domains">
        <button
          className={domain === "all" ? "selected" : ""}
          aria-pressed={domain === "all"}
          onClick={() => setDomain("all")}
        >
          <strong>All domains</strong>
          <span>78 statements</span>
        </button>
        {chstDomains.map((item) => (
          <button
            key={item.code}
            className={domain === item.code ? "selected" : ""}
            aria-pressed={domain === item.code}
            onClick={() => setDomain(item.code)}
          >
            <span>
              DOMAIN {item.code} · {item.percentage}%
            </span>
            <strong>{item.title}</strong>
            <small>
              {
                chstObjectives.filter(
                  (objective) => objective.domain === item.code,
                ).length
              }{" "}
              statements
            </small>
          </button>
        ))}
      </nav>
      <div className="curriculum-filters">
        <label className="search-box" htmlFor="curriculum-search">
          <Search size={18} />
          <span className="sr-only">Search blueprint objectives</span>
          <input
            id="curriculum-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a hazard, skill, or objective ID…"
          />
        </label>
        <label className="curriculum-select">
          Statement type
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value="all">Knowledge and skills</option>
            <option value="knowledge">Knowledge statements</option>
            <option value="skill">Skill statements</option>
          </select>
        </label>
      </div>
      <p className="fine-print" role="status">
        {matches.length} of 78 statements match
      </p>
      <div className="curriculum-objectives">
        {matches.map((objective) => (
          <article className="card curriculum-objective" key={objective.id}>
            <div className="eyebrow">
              DOMAIN {objective.domain} · {objective.kind.toUpperCase()}{" "}
              {objective.number}
            </div>
            <h2>
              <Link href={`/curriculum/${objective.id}`}>
                {objective.statement}
              </Link>
            </h2>
            <code>{objective.id}</code>
            <p>
              Official statement · supplied blueprint page{" "}
              {objective.documentPage}
            </p>
            <Link className="text-link" href={`/curriculum/${objective.id}`}>
              Open study pathway <ArrowRight size={15} />
            </Link>
          </article>
        ))}
      </div>
      {!matches.length && (
        <div className="card empty-block">
          <h2>No statements match these filters.</h2>
          <p>
            Try a different phrase or broaden the domain and statement type.
          </p>
          <button
            className="button secondary"
            onClick={() => {
              setDomain("all");
              setKind("all");
              setQuery("");
            }}
          >
            Reset curriculum filters
          </button>
        </div>
      )}
      <p className="demo-disclosure">
        Domain percentages are examination blueprint weights, not equal
        allocations for every statement. Viewing a pathway does not record
        mastery or complete a lesson.
      </p>
    </div>
  );
}
