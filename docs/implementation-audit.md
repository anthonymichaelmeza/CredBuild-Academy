# Implementation audit — stable learning foundation

Audit date: 2026-10-22. Baseline: commit `2a5f8c9` on
`development/v0.4-learning-experience`. Implementation continues on
`development/stable-learning-foundation`; this document records the starting
conditions. Consult root `FEATURE_STATUS.md` and `TESTING.md` for the final
milestone and its executed checks. No item below is a production-readiness claim.

## Existing application

- Next.js 16.4.2 App Router, React 19, strict TypeScript, Tailwind CSS 4 and
  shared charcoal/orange CSS, bundled Inter, Lucide icons. Existing navigation,
  learning, practice, rehearsal, results and analytics share one application.
- Drizzle ORM uses PostgreSQL through `pg`, with PGlite as an explicitly enabled
  single-process development fallback. `0001_foundation.sql` has a migration
  checksum ledger, user-owned sessions/bookmarks, question revisions, source
  reviews and publication/immutability triggers.
- Managed identity is delegated to Clerk. Both keys are needed to activate it;
  `ALLOW_LOCAL_DEMO=true` instead permits a cookie-based local identity. These
  local identities are not production accounts.
- `NEXT_PUBLIC_BROWSER_DEMO=true` selects a separate browser-only experience.
  Practice uses `credbuilt.browser-demo.v1`; lessons use
  `credbuilt.learning-demo.v1`. Browser records are readable/editable by the
  browser owner and never establish protected scoring or cross-device sync.
- Twelve original AI demonstration question drafts and eight representative
  lessons are unreviewed. There are zero approved commercial questions. CHST5
  names/weights are user-supplied, not independently verified. No original
  prototype or official geometric logo asset is present.

## Working baseline and evidence

The nine original Vitest files were run during this audit: **44 tests passed**.
They cover selection/grading, safe individual session payloads, local database
persistence and isolation, publication rejection, browser storage, lesson
completion gates, expiry, analytics and pure content-review rules. This run did
not exercise live Clerk, managed PostgreSQL, Vercel or a commercial question bank.
Earlier repository evidence records desktop/mobile Playwright runs; the release
must run browser tests again after this milestone's changes.

`npm audit --omit=dev --json` completed with **zero reported production
dependency vulnerabilities** at audit time. This is a registry advisory result,
not an application security certification. The lockfile is present; no new
provider or dependency is required for this release.

Working browser flows include lesson sections/checks/completion, topic practice,
learning/adaptive/timed sessions, bookmarks, confidence, flags, first-answer
locking, short editable exam rehearsals, withheld per-session exam feedback,
expiry/submission, results/missed review, real-data domain/topic analytics and
reference discovery search. Short bank shortages are explicitly blocked.

## Priority findings

| Priority | Baseline finding and location                                                                                                                                                                                                                                   | Required treatment                                                                                                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | `/performance` passes full `Question[]` from `pool()` and raw session history to the client (`src/app/[section]/page.tsx`, `src/components/performance.tsx`). Those objects contain answer keys and active-exam correctness even though the UI suppresses them. | Send a minimal analytics DTO; exclude active exam answers/correctness. Test the boundary, not just rendered text.                                                                        |
| High     | Session snapshots contain question IDs but no version pins (`src/modules/practice/types.ts`, `service.ts`). The pool includes all demonstration revisions; selection does not deduplicate logical IDs.                                                          | Pin exact question revisions, resolve scoring/review using those pins, and select one eligible revision per logical question. Preserve legacy v1 records explicitly.                     |
| High     | Lessons use browser-local storage in every mode (`use-learning.ts`, `lesson-reader.tsx`, `demo/learning-store.ts`). Managed account practice and lessons therefore have different persistence and privacy behavior.                                             | Add versioned curriculum and owner-scoped server progress, server-grade checks, validate completion, handle concurrent updates, and keep browser-only mode separate.                     |
| High     | Clerk and hosted PostgreSQL are integrated but no provider credentials are available for live validation. Register/recover/email verification depend on provider setup.                                                                                         | Finish the provider-facing routes and exact setup instructions; require real-account/cross-device checks before launch. Do not claim those checks passed.                                |
| Medium   | Mutation body limits trust `Content-Length`, then call `request.json()` without a stream limit (`src/app/api/practice/route.ts`). There is no throttling or shared private-response helper.                                                                     | Limit actual received bytes, enforce JSON/same-origin requests, return private/no-store responses and apply server-side throttling where implemented.                                    |
| Medium   | Practice selection and analytics load the whole small demo bank; demonstration answer data also enters client modules through `SessionBuilder`, `PracticeSession` → browser store, and the lesson catalog.                                                      | Demo fixtures are intentionally public, but do not reuse that delivery path for protected commercial material. Select/page approved content on the server and keep its keys server-only. |
| Medium   | Pure review workflow uses `technical_review/published/retired`; database question status uses `in_review/changes_requested/rejected`, with publication in another table. `/admin` is an inspector and `/api/admin` denies all writes.                           | Preserve denial until authenticated role management, transactional workflow mapping and an editor are implemented. Policy tests alone do not establish a working editorial CMS.          |
| Medium   | There is no GitHub Actions workflow or enforced production-branch protection in source. Scripts `db:migrate` and `db:seed` require `.env.local` even when the deployment injects all environment variables.                                                     | Add CI for both modes, avoid requiring a local env file for injected credentials, document preview/migration/rollback and dashboard protections.                                         |
| Medium   | Goals, onboarding and study planner are unavailable; dashboard has no account-linked lesson completion.                                                                                                                                                         | Implement one coherent saved-goal/planner slice using real learner data. Do not fabricate activity or promise passing.                                                                   |
| Later    | Adaptive ranking is a small transparent heuristic; no retention scheduling or validated readiness exists. Full 200-question exam gates intentionally fail.                                                                                                      | Keep labels and gates; implement these as separate tested releases after content/provider validation.                                                                                    |

## Duplication and technical debt

The browser and server practice adapters intentionally duplicate persistence,
not scoring. Shared `engine.ts` and `lifecycle.ts` should remain authoritative.
Browser storage schemas need backwards-compatible changes because existing
v0.3/v0.4 records are already in use. Do not replace those namespaces or erase
records while introducing account persistence. Learning completion logic should
be shared between adapters, with authoritative grading on the server path.

The foundation's JSONB snapshots are practical for this small bank, but a
commercial pool needs constrained revision references, pagination, background
expiry/reporting, and query-level analytics. The managed database migration
runner must support additive migrations without changing the applied `0001`
checksum. Serverless hosting must never treat PGlite filesystem state as durable.

The existing design direction is reusable. New controls should share tokens,
focus styles, spacing, empty/error states and responsive breakpoints. There is
no official logo asset to substitute for the explicitly temporary mark.

## Deployment audit boundary

Native Git remote inspection confirms main at `81ab09c` and the existing v0.4
branch at `2a5f8c9`. A separate development branch preserves both. No production
merge, project deletion, environment change, promotion or paid activation is
authorized by this audit.

The supplied v0.4 preview and the official BCSP page were both requested read-only
during this audit. Both failed at this environment's proxy tunnel with
`403 Forbidden`, before an application response was obtained. This does not show
that the application itself returned 403. There is no usable Vercel dashboard or
deployment-log API connection here, so failed-deployment causes, duplicate Vercel
projects and actual project settings cannot be determined from this workspace.
Do not report a cause without the relevant build/runtime logs.

For browser previews, the existing required setting is
`NEXT_PUBLIC_BROWSER_DEMO=true` at build time in Vercel's **Preview** environment.
The repository root is a standard Next.js project with Node 24 engines and
`npm run build`. The hosted account mode additionally needs configured Clerk,
managed PostgreSQL and an explicit successful migration. A successful local
build alone does not validate those external services.

## Commercial launch blockers

1. Verify the current official CHST blueprint and examination details against
   actual source material; complete technical and editorial review of content.
2. Validate real account registration, recovery, verification, sign-out,
   account isolation, hosted database persistence and cross-device resume.
3. Complete protected content management, production-bank delivery, durable
   rate-limit/abuse controls, observability, backup/restore and deletion/export
   policies appropriate to the selected providers.
4. Test managed migrations and rollback on a disposable preview database.
5. Review legal/product disclosures and commercial entitlement/billing behavior
   before enabling subscriptions. No pricing or live charges are authorized.

The safe current release is a tested foundation and learning-core increment.
Flashcards, advanced adaptation/readiness, paid AI, media/scenarios, teams and
billing remain later releases unless separately implemented and verified.
