import Link from "next/link";
import { browserDemoEnabled } from "@/modules/runtime/mode";

export function AccountUnavailable() {
  const browserOnly = browserDemoEnabled();
  return (
    <div className="page-wrap narrow">
      <div className="eyebrow">YOUR CREDBUILT ACCOUNT</div>
      <h1>
        {browserOnly
          ? "Explore without an account."
          : "Account access is not configured."}
      </h1>
      <section className="card settings-card">
        <p>
          {browserOnly
            ? "This browser demonstration does not register accounts or upload your progress. Learning activity stays on this browser and website address."
            : "Managed registration, sign-in, email verification, and password recovery become available when the authentication service is configured. No account is created here."}
        </p>
        <Link className="button primary" href="/settings">
          Open account settings
        </Link>
      </section>
    </div>
  );
}
