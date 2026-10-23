"use client";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { CurriculumObjective } from "@/modules/curriculum/types";
import { chstBibliography, chstDomains } from "@/modules/curriculum/catalog";
import { objectiveStudyOutline } from "@/modules/curriculum/study-outline";
import { lessons } from "@/modules/learning/catalog";
import { completedLesson } from "@/modules/learning/progress";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { useLearning } from "./use-learning";

export function ObjectiveStudy({
  objective,
}: {
  objective: CurriculumObjective;
}) {
  const outline = objectiveStudyOutline(objective);
  const related = lessons.filter((lesson) =>
    outline.relatedLessonIds.includes(lesson.id),
  );
  const references = outline.candidateReferenceNumbers.map(
    (number) => chstBibliography[number - 1],
  );
  const domain = chstDomains.find((entry) => entry.code === objective.domain)!;
  const learning = useLearning();
  const browserOnly = browserDemoEnabled();
  const practiceUrl = `/practice?bank=${browserOnly ? "curriculum_drafts" : "published"}&objective=${encodeURIComponent(objective.id)}&count=1`;
  return (
    <div className="page-wrap curriculum-page">
      <Link className="text-link" href="/curriculum">
        ← All CHST5 objectives
      </Link>
      <div className="eyebrow curriculum-kicker">
        DOMAIN {objective.domain} · {domain.title}
      </div>
      <h1>{objective.statement}</h1>
      <div className="curriculum-objective-meta">
        <span>
          {objective.kind === "knowledge" ? "Knowledge of" : "Skill to"}:{" "}
          {objective.number}
        </span>
        <span>CHST5 V.{objective.blueprintVersion}</span>
        <span>Supplied document page {objective.documentPage}</span>
      </div>
      <code className="curriculum-id">{objective.id}</code>
      <p className="notice curriculum-provenance">
        Official statement above, transcribed from your supplied document. The
        learning prompts and reference connections below are CredBuilt
        demonstration material awaiting technical review. Current
        official-version confirmation remains pending.
      </p>
      <nav className="curriculum-pathway" aria-label="Objective study pathway">
        {["Learn", "Understand", "Apply", "Practice", "Review", "Master"].map(
          (step, index) => (
            <a
              key={step}
              href={`#objective-${index === 5 ? "review" : step.toLowerCase()}`}
            >
              <span>{index + 1}</span>
              {step}
            </a>
          ),
        )}
      </nav>
      <div className="curriculum-study-layout">
        <div>
          <section id="objective-learn" className="card curriculum-study-card">
            <div className="eyebrow">LEARN · STUDY ORIENTATION</div>
            <h2>What to work through</h2>
            <p>{outline.explanation}</p>
            <p className="fine-print">
              Start with the exact objective above; the outline does not add
              official BCSP objectives.
            </p>
          </section>
          <section
            id="objective-understand"
            className="card curriculum-study-card"
          >
            <div className="eyebrow">UNDERSTAND · TERMINOLOGY</div>
            <h2>Terms to define in your own words</h2>
            <ul className="curriculum-terms">
              {outline.terms.map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ul>
            <p>
              Use the cited source’s definitions and identify where a term’s
              meaning depends on a particular regulation, standard, or work
              context.
            </p>
          </section>
          <section id="objective-apply" className="card curriculum-study-card">
            <div className="eyebrow">APPLY · WORKED REASONING</div>
            <h2>Build your explanation</h2>
            <ol className="curriculum-prompts">
              {outline.prompts.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ol>
          </section>
          <section
            id="objective-practice"
            className="card curriculum-study-card"
          >
            <div className="eyebrow">PRACTICE · CHECK UNDERSTANDING</div>
            <h2>Connect study with a question</h2>
            <p>
              {browserOnly
                ? "The curriculum draft bank is a separate, clearly labeled demonstration. Its answers and citations still require source verification and independent technical review."
                : "Connected practice includes only eligible published questions. An empty result means reviewed questions have not yet been published for this objective."}
            </p>
            <Link className="button primary" href={practiceUrl}>
              {browserOnly
                ? "Practice unreviewed draft examples"
                : "Find published objective practice"}
              <ArrowRight size={16} />
            </Link>
          </section>
          <section id="objective-review" className="card curriculum-study-card">
            <div className="eyebrow">REVIEW · EVIDENCE BEFORE MASTERY</div>
            <h2>Follow up on your reasoning</h2>
            <p>
              Return to the specific supporting section after a missed question.
              Explain why the correct choice fits and why each alternative does
              not. Identify remaining uncertainty before starting a different
              example.
            </p>
            <p>
              No mastery score is assigned from viewing this page. Future
              retention outcomes and sufficient reviewed practice are required
              before a defensible mastery assessment can be offered.
            </p>
            <Link className="text-link" href="/performance">
              Review saved practice performance <ArrowRight size={15} />
            </Link>
          </section>
        </div>
        <aside className="curriculum-study-aside">
          <section className="card curriculum-study-card">
            <h2>Related learning</h2>
            <p className="fine-print">
              Tentative study connections, not verified full-objective coverage.
            </p>
            {learning.error && (
              <p className="error" role="alert">
                {learning.error}
              </p>
            )}
            {related.length ? (
              related.map((lesson) => {
                const done = Boolean(
                  learning.state && completedLesson(lesson.id, learning.state),
                );
                return (
                  <div className="curriculum-related" key={lesson.id}>
                    <Link className="text-link" href={`/learn/${lesson.id}`}>
                      {lesson.title}
                    </Link>
                    <small>
                      {done && <CheckCircle2 size={13} />}{" "}
                      {learning.hydrated
                        ? done
                          ? "Demonstration lesson completed"
                          : "Demonstration lesson · knowledge checks available"
                        : "Loading saved lesson progress…"}
                    </small>
                  </div>
                );
              })
            ) : (
              <p>
                A reviewed lesson and technical knowledge checks are not
                published for this statement yet. The study outline is available
                now.
              </p>
            )}
            <p className="fine-print">
              Only actual saved lesson completion is shown. The outline itself
              has no completion checkbox.
            </p>
          </section>
          <section className="card curriculum-study-card">
            <h2>Reference starting points</h2>
            <p className="fine-print">
              Suggested bibliography discovery connections. The books’ contents
              have not been examined to verify this objective or an answer.
            </p>
            {references.map((reference) => (
              <div className="curriculum-related" key={reference.id}>
                <Link className="text-link" href={`/reference#${reference.id}`}>
                  {reference.title}
                </Link>
                <small>
                  {reference.authors} · {reference.publicationYear}
                </small>
                <small>Exact supporting section: not verified</small>
              </div>
            ))}
            <Link className="text-link" href="/reference">
              Open source classifications and bibliography
            </Link>
          </section>
          <section className="card curriculum-study-card">
            <h2>Standards and video</h2>
            <p>
              Applicable jurisdiction, source edition, and exact technical
              sections require review. No verified video is mapped to this
              statement yet.
            </p>
            <a
              className="text-link"
              href="https://www.osha.gov/laws-regs/regulations/standardnumber/1926"
              target="_blank"
              rel="noreferrer"
            >
              OSHA construction standards discovery
            </a>
            <p className="fine-print">
              A discovery link does not establish the applicability of a
              requirement.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
