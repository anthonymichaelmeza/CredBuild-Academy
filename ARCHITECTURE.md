# Architecture

Current milestone: v0.5 stable learning foundation, built from v0.4 on
`development/stable-learning-foundation`. This describes implemented boundaries;
[PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) covers future work and
[FEATURE_STATUS.md](FEATURE_STATUS.md) records validation status.

## One modular application

Next.js App Router, React, TypeScript, Tailwind/shared CSS, Inter and Lucide form
the interface. Drizzle accesses PostgreSQL through `pg`; PGlite is an explicitly
enabled single-process local alternative. Clerk owns managed identity. The
application uses its verified subject, never a client-selected account ID.

| Boundary     | Implementation                         | Responsibility                                                                |
| ------------ | -------------------------------------- | ----------------------------------------------------------------------------- |
| Routes/UI    | `src/app`, `src/components`            | Pages, forms, navigation and feedback                                         |
| Runtime      | `src/modules/runtime/mode.ts`          | Explicit browser-demo flag                                                    |
| Identity     | `src/modules/identity`, `src/proxy.ts` | Provider or local-demo identity; admin writes denied                          |
| Catalog      | `src/modules/catalog`                  | Provisional blueprint/version and domain allocation                           |
| Learning     | `src/modules/learning`                 | Curriculum, progress rules, owner-scoped persistence                          |
| Practice     | `src/modules/practice`                 | Configuration, unique revisions, grading, lifecycle and persistence           |
| Exams        | `src/modules/exams`                    | Full-exam policy/gates; practice lifecycle handles rehearsals                 |
| Performance  | `src/modules/performance`              | Minimal DTOs and actual-activity aggregates                                   |
| Planner      | `src/modules/planner`                  | Preferences, per-owner profiles, weekly suggestions                           |
| Content      | `src/modules/content`, SQL guards      | Review rules and publication rejection; no complete CMS                       |
| HTTP         | `src/modules/http`                     | Origin/type/stream limits, private responses, safe errors, process throttling |
| Database     | `src/db`                               | Mappings, checksummed migrations, non-publishing demo seed                    |
| Browser demo | `src/demo`                             | Public unreviewed fixtures and isolated localStorage adapters                 |

Billing, organizations, paid AI, object storage, background jobs and monitoring
are not connected services. A modular boundary is not a delivered feature.

## Explicit persistence modes

| Mode                                                           | Identity                     | Storage                                | Boundary                                                  |
| -------------------------------------------------------------- | ---------------------------- | -------------------------------------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_BROWSER_DEMO=true`                                | None                         | Browser-local practice/lessons/planner | No server writes; inspectable scoring, one origin/profile |
| Browser demo off, `ALLOW_LOCAL_DEMO=true`, managed auth absent | HTTP-only random demo cookie | Local PGlite or development PostgreSQL | Local development, not real accounts                      |
| Browser demo off, Clerk/database configured                    | Verified Clerk subject       | Hosted PostgreSQL                      | Account integration; live-provider validation required    |

Browser mode bypasses identity/database setup and rejects server progress writes.
It does not persist visitors in Vercel memory, `/tmp` or a filesystem database.
Changing modes does not silently migrate demonstration history into an account.
Account records must not be written into browser-local demo storage.

## Learning and planning

The current structured TypeScript demonstration curriculum is idempotently
seeded into immutable `lesson_versions`. Account actions load the persisted
revision, validate section/check IDs and server-grade checks. Completion needs
every section and correct check; clients cannot submit correctness/completion.
Owner/version progress uses revision comparisons to reject competing stale
writes. Old history is retained; a new lesson version requires new completion.
Browser mode shares the rules without changing its established key/format.
The reader still delivers public demonstration content, not a protected CMS.

The profile records a CHST goal, optional target date, days/minutes, learning
preference and priority domains. A saved seven-day suggestion links actual
lessons and focused practice, favors saved weak areas/incomplete lessons and
does not pile missed days onto today. Assignments and their rationale remain fixed until
the learner saves preferences or selects Refresh next seven days. Past days drop
out; new suggestions use current completion and weakness evidence. This preserves
completed lessons in their original scheduled slots. Real lesson completion and self-reported
checklist marks stay distinct. It is not a notification service or a validated
mastery scheduler; dates use UTC and activity time is browser-reported.

## Practice, exams and analytics

Selection chooses one current eligible revision per logical question, validates
distinct counts and saves exact revision pins. Legacy v0.3/v0.4 records without
pins resolve v1 explicitly. Grading/feedback use pinned material, preserving
historical results. Session JSONB remains a small-bank implementation;
normalized session items and query-level bank pagination are future scale work.

Server reads/writes check ownership. Optimistic revisions prevent silent
overwrites; conflicts require reload/retry. Learning answers lock after feedback;
exam answers remain editable until submission. Finalization is idempotent.
Server time rejects late answers and finalizes expired attempts on the next
read/action. No background worker currently finalizes inactive sessions.

`SessionView` allowlists question fields, omits owner identity and withholds exam
correctness/explanations before submission. Performance uses a separate
metadata-only DTO, excluding answer choices/keys/rationales and active-exam
correctness. Public demo keys remain inspectable by design; this path must not
deliver protected approved commercial content.

Adaptive selection is a transparent heuristic using misses, confidence and time
since review. Analytics/planner use actual saved activity and disclose sample
sizes; they do not predict BCSP outcomes or establish validated mastery.

## Operations and expansion

Managed migrations run explicitly before releasing dependent code. Application
startup verifies the ledger; local fallback may initialize automatically.
See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) and [DEPLOYMENT.md](DEPLOYMENT.md).

The shared application and certification/blueprint fields are expansion points
for ASP/CSP/OHST/CEST and Field. Only CHST demonstration content is implemented,
and some UI/filter assumptions remain CHST-specific. Test a second track before
claiming multi-certification support. Commercial content, entitlements and
organizations require trusted server services and tenant checks, not client flags.
