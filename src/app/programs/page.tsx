import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { domains } from "@/modules/catalog/blueprint";
export default function ProgramsPage() {
  return (
    <div className="page-wrap">
      <div className="page-heading">
        <div>
          <div className="eyebrow">BUILD YOUR NEXT CHAPTER</div>
          <h1>
            Certification programs<span className="orange">.</span>
          </h1>
          <p>Start with CHST. Build a learning path around your goals.</p>
        </div>
      </div>
      <div className="program-grid">
        <section className="card settings-card">
          <GraduationCap className="orange" size={30} />
          <span className="outline-badge">Demonstration curriculum</span>
          <h2>Construction Health and Safety Technician</h2>
          <p>
            Eight representative lessons, knowledge checks, focused practice,
            and a short exam rehearsal across four provisional domains.
          </p>
          <ul className="program-domains">
            {domains.map((d) => (
              <li key={d.code}>
                Domain {d.code} — {d.title}
              </li>
            ))}
          </ul>
          <div className="auth-actions">
            <Link className="button primary" href="/learn">
              Explore CHST learning <ArrowRight size={16} />
            </Link>
            <Link className="button secondary" href="/onboarding">
              Set my study goals
            </Link>
          </div>
          <p className="fine-print">
            Independent preparation; no BCSP affiliation. The supplied blueprint
            and demonstration content have not been source-verified. No
            certification, exam eligibility, or passing outcome is awarded here.
          </p>
        </section>
        <section className="card settings-card">
          <span className="neutral-badge">Not available yet</span>
          <h2>Your path can keep growing.</h2>
          <p>
            ASP, CSP, OHST, CEST, and CredBuilt Field courses are future
            programs. Enrollment and instructional content for these programs
            are unavailable.
          </p>
          <p>
            NFPA 70E, excavation, fall protection, confined spaces, scaffolding,
            and other field competency courses require reviewed curricula before
            release.
          </p>
        </section>
      </div>
    </div>
  );
}
