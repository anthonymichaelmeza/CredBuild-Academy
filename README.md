# CredBuilt Academy — v0.4

**BUILD KNOWLEDGE. EARN CREDENTIALS.**

A working Next.js learning academy, practice engine, short exam rehearsal, and real-data analytics for a CHST demonstration. This is an early development milestone, not a production-ready certification course.

## Vercel browser demonstration — no service credentials

For a browser-accessible demo, set **`NEXT_PUBLIC_BROWSER_DEMO=true`** in Vercel before Deploy. This is the only required variable for this mode. Do not add Clerk keys, a database URL, local-demo flags, or filesystem settings. Node.js 24 is pinned in package.json. See the [step-by-step Vercel demo guide](docs/vercel-demo.md).

This explicit mode uses only browser site storage for demo progress and bypasses Clerk, PostgreSQL, and server-side progress writes. It supports the existing practice flow and shows a persistent limitations banner. There is no real account, cross-device synchronization, protected scoring, or approved instructional content. Clearing site data or changing the website address creates an empty demo workspace. The existing server-backed mode remains available when this public build-time flag is off.

## v0.4 review workflow

The v0.4 work lives on **`development/v0.4-learning-experience`**, separate from `main`. Pushing that development branch may create a Vercel **Preview** deployment; it must not be merged into the production branch until approved. Ensure **`NEXT_PUBLIC_BROWSER_DEMO=true`** is enabled for the **Preview** environment as well as Production, and use the deployment for this branch. No new service, secret, paid dependency, or database migration is required for the browser demo.

The browser practice key **`credbuilt.browser-demo.v1` is unchanged**. Existing v0.3 snapshots are accepted without erasing them. New timed and focused sessions add optional fields. Lessons use a separate versioned `credbuilt.learning-demo.v1` namespace; a lesson revision invalidates completion until it is studied again. Each Vercel origin has independent browser-local history, so a new preview address starts empty.

See [v0.4 review notes](docs/v04-review.md) for the implemented scope, test evidence, preview instructions, and remaining limits.

## Run locally

Prerequisites: Node.js 24 LTS and npm 11, with access to the npm registry. No paid service is required for local demonstration use.

```bash
cd /workspace/CredBuild-Academy
cp config/environment.example .env.local # only if .env.local does not already exist
npm ci --cache /tmp/credbuilt-npm
npm run db:migrate
npm run db:seed
npm run dev
```

The application listens on port **3000**. Open that port in your browser when running locally; cloud access requires a supported forwarded port. No public deployment or preview URL has been created. Choose **Practice → 10 questions → All four domains → Start session** to try the full workflow. The requested initial default is 25 adaptive questions; the small demo bank correctly refuses that request until you select 10.

Existing `.env.local` and local progress must be preserved. The cloud workspace already has a non-secret `.env.local` enabling demo mode. On a machine where npm's default home cache is not writable, use the `/tmp/credbuilt-npm` cache shown above. Services do not survive environment snapshots; start the development server in each new task using the existing checkout, without creating a worktree.

For a production-build smoke check on this same single-process development machine:

```bash
npm run build
npm run start
```

Stop the dev server first. Both commands use port 3000. This does not make the demo configuration suitable for public deployment.

## What works

- Next.js App Router, strict TypeScript, Tailwind CSS 4, bundled Inter typography, Lucide icons, responsive dashboard/navigation, keyboard focus, and empty states.
- Practice builder with 10/25/50/100/200 counts, learning/adaptive modes, domain selection, explicit missed-question priority, and a summary. The 12-item demo bank permits ten distinct questions across all domains; shortages are explained rather than padded.
- Server-side selection and grading, first-answer locking, instant explanations and distractor feedback, confidence ratings, per-question bookmarks, flags, and question navigation.
- Saved session progress, resumable sessions, submission, results, missed/all-question review, session history, and domain accuracy. Demo activity is clearly identified.
- Eight representative demo lessons across the four supplied CHST domains, with topics/subtopics, original learning objectives, a section-based reader, references, two knowledge checks per lesson, versioned completion tracking, and related practice.
- Domain/topic filters and focused 1/3/5-question sets alongside the original 10/25/50/100/200 options. Insufficient pools are blocked.
- Timed practice and short exam rehearsals: pinned distinct questions, countdown/deadline checks, autosaved editable exam answers, flagged/unanswered navigation, automatic expiry finalization, withheld exam feedback, and detailed results. The full 200-question exam remains gated by reviewed content and verified timing.
- Filterable domain/topic accuracy, repeated misses with underlying-session links, UTC activity, history, next incomplete lessons, and weak-topic practice suggestions from saved records.
- A tested Draft → Technical review → Approved → Published → Retired content policy, with independent review/source gates and revision/audit handling. The public inspector explains the gates but cannot change status or publish.
- Searchable reference discovery links and honest availability states for future flashcards/planner.
- Drizzle ORM, a checksummed SQL migration, idempotent demonstration seeding, PGlite local PostgreSQL, and a configurable managed PostgreSQL adapter.
- Server authorization, browser-demo isolation, input validation, same-origin mutation checks, optimistic concurrency, protected server modules, and denial of all administrative publishing endpoints.

## What is demonstrated or incomplete

**Prototype and brand:** the uploaded text was a development brief, not the promised HTML prototype or logo. No prototype has been inspected, migrated, or declared preserved. The implementation follows the specified charcoal/orange/white direction; the hard-hat mark is explicitly a temporary placeholder. Supply the prototype and assets before design reconciliation.

**Content:** all 12 original questions are AI-generated, unreviewed demonstration drafts. They teach illustrative planning/communication concepts and are not official questions. Reference URLs are discovery links, not reviewed technical citations. There are **zero approved production questions**. Never use this seed as a claim of reviewed CHST instruction.

**Blueprint:** the four CHST5 domain names and weights came from the user's brief. They remain marked unverified. Official BCSP page retrieval was blocked by a proxy 403 in this environment. Versioned structured data records this provenance. Provisional largest-remainder allocation for 200 questions is **73 / 40 / 45 / 42**, not a verified official configuration. No official duration, passing score, or endorsement is claimed.

**Accounts:** Clerk integration is implemented but has not been exercised with live provider credentials. Browser-only demo mode requires no account, cookie, or backend storage. In the separate server-backed local demo mode, an HTTP-only, SameSite cookie acts as a browser identity. Server-backed local progress is stored on the development machine; browser-only progress is stored on the visitor’s device. Neither demo provides real accounts, password recovery, or cross-device sync. Demo and managed account IDs are separate; there is no silent migration of demo history to accounts.

**Database:** browser-only demo mode does not use a database. In server-backed mode, local PostgreSQL behavior is exercised through PGlite. Live managed PostgreSQL connectivity, TLS configuration, pooling, deployment migrations, and cross-device account persistence remain unvalidated. PGlite is a single-process development fallback; do not point multiple application instances at one local data directory.

**Later work:** an approved 200-question CHST simulation, a complete authenticated source-review CMS/editor and role management, technically reviewed instructional lessons, flashcards/spaced repetition, study planner, billing/entitlements, an AI coach, and validated readiness/retention models remain incomplete. The short rehearsal timer and expiry are implemented; a browser that is closed cannot run a background task and finalizes on reopening or its next action. Browser clocks and scoring are inspectable and are not an authoritative exam service.

## Environment configuration

| Variable                            | Purpose                                                                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_BROWSER_DEMO=true`     | The only required variable for the Vercel browser demo; public build-time flag, no backend or account needed                 |
| `ALLOW_LOCAL_DEMO=true`             | Explicitly enable a local browser identity when Clerk is not configured; also allow PGlite when no database URL exists       |
| `LOCAL_DATABASE_PATH`               | Local PGlite directory; defaults to `.local/credbuilt`; `:memory:` for isolated tests                                        |
| `DATABASE_URL`                      | Optional managed PostgreSQL connection string; use the provider's verified TLS settings                                      |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk's public application key; both Clerk keys are required to activate managed authentication                              |
| `CLERK_SECRET_KEY`                  | Clerk server credential, supplied securely outside source control                                                            |
| `COOKIE_SECURE`                     | Set `true` for HTTPS; local HTTP development uses `false`                                                                    |
| `APP_ORIGIN`                        | Exact canonical HTTPS origin behind a reverse proxy; otherwise same-origin checks use the incoming host and request protocol |

Never commit `.env.local` or supply secrets in chat. Before enabling a production learning service, turn browser demo off, set up managed authentication and PostgreSQL, turn off local demo identities, set HTTPS/cookie/origin configuration, and complete the documented launch work. A labeled browser-only preview instead uses the single public demo flag and no credentials. A partial Clerk configuration does not enable managed sign-in.

For a managed database, `npm run db:migrate` must run explicitly before application use. The migration ledger rejects changes to an already-applied migration. Add a new numbered migration and runner entry for future changes. The local fallback can initialize its schema on first use for convenience; seeding inserts drafts only and does not overwrite existing versions. Stop the app before running CLI operations against the same PGlite directory.

## Tests and checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Vitest covers grading, count/domain shortages, adaptive ranking, safe question payloads, blueprint allocation, empty states, navigation, request validation/authorization, real PostgreSQL persistence and publication rejection constraints. Integration tests use an isolated in-memory PGlite instance and never a configured managed database.

Playwright uses Chromium at `/usr/bin/chromium` by default in this cloud environment. Set `CHROMIUM_PATH` to a local Chromium/Chrome executable elsewhere. It starts a dev server itself on port 3000, so stop any existing application server first. E2E data is isolated in ignored `.local/e2e`, with separate browser identities for each run; it is not inserted into `.local/credbuilt`. Desktop and Pixel 7 layouts exercise a complete practice loop, refresh persistence, results/review, cross-browser authorization, reference search, mobile navigation, and overflow. Test traces are retained only on failure.

See [validation evidence and limitations](docs/validation.md) for the executed checks. Live authentication and managed database workflows must be tested with real service configuration before being called ready.

## Vercel project detection and deployment boundary

Import `anthonymichaelmeza/CredBuild-Academy` with branch `main`, **Root Directory: `.`**, **Framework Preset: Next.js**, and the standard **Build Command: `npm run build`**. Leave the output directory at the framework default and select Node.js 24. The root package.json declares Next.js, and src/app contains the App Router source. These are the standard Next.js detection inputs; no Vercel deployment or dashboard import has been performed in this task.

The repository includes all source, the lockfile, SQL migration, tests, and documentation. Every `.env*` file is excluded from Git. The safe, credential-free example is stored at `config/environment.example`; create local environment files from it or enter deployment variables securely through the hosting dashboard.

**Use `NEXT_PUBLIC_BROWSER_DEMO=true` for this Vercel preview.** Practice and demo lessons then save only in the visitor’s browser and does not need a hosted backend, migrations, Clerk, or filesystem writes. [Deployment instructions and limitations](docs/vercel-demo.md) describe the exact settings and test conditions. For durable account progress with browser demo turned off, a hosted PostgreSQL database and authentication are still required; file-backed PGlite must not be used for persistent progress in Vercel serverless functions.

## Architecture and next milestone

See [architecture](docs/architecture.md), [database design](docs/database-schema.md), and [phased plan](docs/implementation-plan.md). The initial migration is intentionally smaller than the complete logical schema. Session snapshots and question details use typed JSONB in this initial slice; normalized session-item, source, lesson, and analytics tables are planned before richer content and exam workflows. Separate server modules enforce boundaries around identity, catalog, content, and practice.

Next: reconcile the actual prototype, validate managed sign-in/database persistence, obtain and review the current official blueprint, and build the protected source-review workflow before publishing instructional content. Then expand the approved bank and implement the server-timed exam simulator.

CredBuilt Academy is independent and is not affiliated with or endorsed by BCSP.
