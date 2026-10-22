"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page-wrap narrow">
      <section className="card empty-block">
        <h1>We couldn’t load this workspace.</h1>
        <p>
          Please retry. If this continues, check the database configuration and
          server logs. Saved answers are retained.
        </p>
        <button className="button primary" onClick={reset}>
          Try again
        </button>
      </section>
    </div>
  );
}
