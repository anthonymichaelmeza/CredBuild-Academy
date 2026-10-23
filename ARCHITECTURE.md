# Architecture

Current milestone: v0.6 CHST5 curriculum/content engine on
`development/stable-learning-foundation`, preserving the v0.6A/B connected
learning commits. This describes implemented boundaries;
[PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) covers future work and
[FEATURE_STATUS.md](FEATURE_STATUS.md) records validation status.

## One modular application

Next.js App Router, React, TypeScript, Tailwind/shared CSS, Inter and Lucide form
the interface. Drizzle accesses PostgreSQL through `pg`; PGlite is an explicitly
enabled single-process local alternative. Clerk owns managed identity. The
application uses its verified subject, never a client-selected account ID.

| Boundary     | Implementation                               | Responsibility                                                                        |
| ------------ | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| Routes/UI    | `src/app`, `src/components`                  | Pages, forms, navigation and feedback                                                 |
| Runtime      | `src/modules/runtime/mode.ts`                | Explicit browser-demo flag                                                            |
| Identity     | `src/modules/identity`, `src/proxy.ts`       | Provider or local-demo identity; server-side resource ownership                       |
| Catalog      | `src/modules/catalog`                        | Supplied blueprint weights, verification policy and domain allocation                 |
| Curriculum   | `src/modules/curriculum`, `src/content/chst` | Supplied objectives/bibliography, study outlines, draft content and database coverage |
| Learning     | `src/modules/learning`                       | Curriculum, progress rules, owner-scoped persistence                                  |
| Practice     | `src/modules/practice`                       | Configuration, unique revisions, grading, lifecycle and persistence                   |
| Exams        | `src/modules/exams`                          | Full-exam policy/gates; practice lifecycle handles rehearsals                         |
| Performance  | `src/modules/performance`                    | Minimal DTOs and actual-activity aggregates                                           |
| Planner      | `src/modules/planner`                        | Preferences, per-owner profiles, weekly suggestions                                   |
| Content      | `src/modules/content`, SQL guards            | Legacy pure policy and publication safeguards                                         |
| Studio       | `src/modules/studio`, `/api/studio`          | Trusted roles, immutable authoring/review, transactional publication/import           |
| HTTP         | `src/modules/http`                           | Origin/type/stream limits, private responses, safe errors, process throttling         |
| Database     | `src/db`                                     | Mappings, checksummed migrations, non-publishing demo seed                            |
| Browser demo | `src/demo`                                   | Public unreviewed fixtures and isolated localStorage adapters                         |

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
The established reader still delivers public demonstration content. A separate
connected reader delivers only published instructional revisions, strips check
keys until grading, enforces prerequisites and saves owner/version progress.
Editing or retiring content does not alter existing immutable learner records.

The CHST curriculum is a separate immutable supplied-document catalog: all 78
statements from printed blueprint V.2022.04.12, four exact domain weights and 21
bibliography records from V.2021.06.09. CredBuilt keys encode version, domain,
knowledge/skill list and printed number. Those keys are not BCSP-issued objective
codes. The old provisional blueprint remains available for existing demo history;
it is not silently relabeled as the new attached revision. New canonical seeding
checks existing content for identity/wording drift and never grants human
verification. See [provenance](docs/chst-source-provenance.md).

Public `/curriculum` and objective pages use the canonical catalog plus clearly
unreviewed study outlines. They link actual saved lesson progress, candidate
references and objective-filtered practice. Viewing an outline does not create
completion/mastery; no verified video or comprehensive approved lesson is implied.

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
correctness. Public demo keys remain inspectable by design. Published
instructional questions are loaded only through server-side selection for
authorized connected learners; they are never added to public demo fixtures.
New published sessions select the requested certification and preserve exact
revision pins. Paid-content entitlements and large-bank pagination remain future
work; managed identity alone does not establish a subscription.

The new `curriculum_drafts` bank exposes the 100 original AI draft records only
as inspectable browser demonstrations. Its tag/IDs are validated on reload;
connected production starts reject this bank and accept published instruction
only. The original 12-item bank/storage format remains separate and works in
local development; older connected demonstration attempts remain reviewable.
Filters combine domain, objective, topic, difficulty, history, missed answers and
bookmarks using the same eligibility predicate for counts and session selection.
No path duplicates questions to fill a requested count.

Adaptive selection is a transparent heuristic using misses, confidence and time
since review. Analytics/planner use actual saved activity and disclose sample
sizes; they do not predict BCSP outcomes or establish validated mastery.
Objective analytics resolve pinned revisions and show actual accuracy,
confidence and reported response time. Active exam attempts do not feed those
recommendations until submission. Thresholds and ranking weights are documented
in [the objective evidence model](docs/adaptive-objective-model.md); these are
heuristics, not measured retention or validated readiness predictions.

Full 200-question starts are guarded in the generic practice service as well as
the interface. Trusted policy must verify blueprint and official duration, and
selection needs 200 distinct published questions with Hamilton domain allocation
(73/40/45/42 for the supplied weights). No real official duration is configured,
and no eligible production questions are supplied. Short rehearsals retain their
existing user-selected duration and explicit labels.

## Editorial transactions and learner publication

`/studio` and `/api/studio` require verified managed identity and trusted
`editorial_roles`; an ordinary learner has no editorial role. A tightly scoped
non-production local opt-in exists for tests, is disabled on Vercel, and is not
a customer authentication path. Role grants/revocations occur only through the
trusted CLI, never a client-supplied role or public role-selection API.

`studio_content` holds identity/current revision; `studio_revisions` holds
append-only authored snapshots. Workflow and compare-and-swap row versions are
separate from immutable content. Every review records its exact revision,
reviewer, source checks, findings and timestamp. Any contributor to a logical
item is excluded from approving that item. Reviewers require the reviewer role;
administrator status alone is not technical-review permission.

Publication revalidates the canonical blueprint/objective, independently
supporting sources and current approval inside one transaction. It materializes
the exact reviewed question/lesson snapshot and sets matching Studio/learner
publication pointers before advancing workflow. SQL triggers enforce these
relationships. Revising published material creates a draft while the previous
published revision stays available until replacement or retirement. Retired
revisions remain available for pinned learner history.

Migration `0005` separates source examination from technical review. An
independent reviewer records exact URL or registered physical-publication
identity, edition, supporting locator, findings and per-source outcomes for the
immutable revision. Monotonic evidence event numbers define the latest decision;
source verification cannot replace technical approval. Current authorized
supporting evidence is required again at approval/publication. Legacy
in-flight technical reviews may continue or request source examination, but
cannot bypass that gate. All 78 canonical objective statements must be preserved
when recording a human blueprint review.

Import accepts up to 50 structured JSON question records with a bounded request
body, schema validation, duplicate reporting and owner-bound expiring previews.
Confirmation rechecks duplicates, inserts draft revisions, records audit and
consumes the preview transactionally. Declared content origin is preserved,
including `ai_generated`; a separate append-only per-record import event records
ingestion. No imported approval, role or source-verification assertions are
accepted.

Media/source URLs are validated and rendered as structured text/media; editor
HTML is not executed. The service does not fetch remote references to imply
verification. Human source review remains necessary, and no approved production
content is created by migration/seed. See
[editorial operations](docs/editorial-workflow.md).

Protected `/studio/coverage` and `/api/curriculum/coverage` derive counts from
current database heads and active publication pointers, never static fixture
totals. Reviewer/administrator filters link to a 25-row paginated Studio list.
Connected learners can report current published or owned historical content;
reviewers/administrators append triage decisions without auto-changing
publication. Source freshness is explicitly unknown; no outdated-source monitor
is claimed. Stable IDs/indexes and pagination support the intended 2,000+ record
track; large-bank selection/coverage aggregation still need load testing and
further query work.

## Operations and expansion

Managed migrations run explicitly before releasing dependent code. Application
startup verifies the ledger; local fallback may initialize automatically.
See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) and [DEPLOYMENT.md](DEPLOYMENT.md).

The shared application and certification/blueprint fields are expansion points
for ASP/CSP/OHST/CEST and Field. Only CHST demonstration content is implemented,
and some UI/filter assumptions remain CHST-specific. Test a second track before
claiming multi-certification support. Commercial content, entitlements and
organizations require trusted server services and tenant checks, not client flags.
