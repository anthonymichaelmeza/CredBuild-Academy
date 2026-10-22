import Link from "next/link";
import { BookOpen, LockKeyhole } from "lucide-react";
export default function CoachPage() {
  return (
    <div className="page-wrap narrow">
      <div className="eyebrow">CREDBUILT AI</div>
      <h1>
        Study with a clear source<span className="orange">.</span>
      </h1>
      <section className="card empty-block">
        <LockKeyhole size={30} />
        <span className="neutral-badge">Not configured</span>
        <h2>The AI Study Coach is not active.</h2>
        <p>
          There is no connected AI provider or approved instructional source
          collection. Questions are not sent to an AI service, and no AI usage
          charges are incurred.
        </p>
        <p>
          A future coach must cite reviewed material, acknowledge gaps, protect
          learner privacy, and withhold exam answers during active attempts.
        </p>
        <Link className="button primary" href="/learn">
          <BookOpen size={17} />
          Explore the lesson library
        </Link>
      </section>
    </div>
  );
}
