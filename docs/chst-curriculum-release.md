# CHST5 curriculum and content-engine release

Current branch: **`development/stable-learning-foundation`**. The earlier
connected-account/Content Studio commits are preserved. Main and the live
production website are unchanged; no production merge/promotion is authorized.
The earlier [A/B checkpoint report](v06-release-report.md) remains historical.

## Delivered functionality

- Canonical supplied CHST5 **V.2022.04.12** curriculum: all **78 exact statements**,
  printed numbering, knowledge/skill distinction, domain and source page; four
  exact weights and immutable versioned database records.
- All **21 bibliography entries** from **V.2021.06.09**, preserving printed
  citations, editions where stated and document hashes/provenance. Underlying
  reference texts are not supplied or technically reviewed.
- **100 original AI draft questions**, with four choices/rationales, explanations,
  official-statement mapping, topic/subtopic, difficulty, category, candidate
  references and immutable revision identity. Worked calculations include steps
  where applicable. Unknown citation details are not fabricated.
- Explicit trusted, atomic/idempotent draft import under an existing authorized
  author; a separate public browser projection labels the batch as unreviewed
  demonstrations. The original 12-question demo remains separate.
- Separate **source verification → technical review → approval → publication**,
  with exact citation evidence, independent authorized reviewers, SQL guards,
  immutable audit and registered physical-book support without inventing URLs.
- Searchable objective study map and 78 unreviewed study outlines, related actual
  lesson progress/reference discovery and objective-filtered practice.
- Objective/difficulty/answered/unanswered/missed/bookmarked practice filters,
  correct eligible counts, no duplicate fill, feedback reference panels and
  actual objective analytics with documented recommendation rules.
- Protected database-backed coverage with objective/domain/status filters,
  25-row editorial pagination, gaps, honest unknown source currency and
  append-only reported-content triage.
- Server-side full-exam policy/allocation enforcement, preserving existing timed
  short rehearsals, autosave/navigation, flags, submission and results.

## Inventory and coverage

| Domain | Attached weight | Official statements | New original drafts |
| ------ | --------------: | ------------------: | ------------------: |
| 1      |           36.6% |                  36 |                  37 |
| 2      |           19.9% |                  15 |                  20 |
| 3      |           22.5% |                  13 |                  22 |
| 4      |           21.0% |                  14 |                  21 |
| Total  |            100% |                  78 |                 100 |

Every official statement maps to at least one draft. This establishes broad
mapping coverage, not adequate topic depth or technical correctness.

| Review state supplied by this milestone | Count |
| --------------------------------------- | ----: |
| Original AI question drafts             |   100 |
| Source-verified questions               | **0** |
| Technically approved questions          | **0** |
| Published questions                     | **0** |
| Approved technical lessons added        | **0** |

The isolated real-database import/coverage checks demonstrated these counts and
all 78 mappings. Database ingestion is explicit: a deployment's coverage reflects
its actual records, not the static public fixture count. No automatic seed/import
promotes the original 12 questions/eight lessons or the new 100 drafts.

## Schema, implementation and security

Additive **`0005_curriculum_sources.sql`** adds `curriculum_documents`, immutable
`curriculum_objectives`, `reference_publications`, immutable
`studio_source_verifications`, `content_error_reports` and `content_error_triage`.
It expands workflow statuses, enforces canonical objective/domain mapping,
requires all supplied statements in a human blueprint review, separates source
proof from technical approval/publication and adds editorial indexes. Earlier
migrations remain unchanged. Managed schema changes use explicit checksummed
migration jobs before dependent code.

Source proof must support every exact cited edition/locator and URL or matching
registered physical publication. Reviewers must remain authorized and independent
of every item contributor. Monotonic event numbers avoid source/triage timestamp
ties. A new revision resets evidence/approval; historical learner pins remain
immutable. Reports/triage do not automatically change content or publication.

Connected production starts reject unreviewed draft banks and use only eligible
published instruction. Browser drafts intentionally expose inspectable original
AI working content. Safe DTOs withhold teaching feedback/references during active
exam rehearsals. Objective analytics resolve saved pins and do not consume active
exam correctness. No client-supplied owner, role or verification claim is trusted.

The schema targets 2,000+ questions per track with stable IDs, indexes and
pagination. This is an architecture target, not a claim of a 2,000-question bank,
load-tested selection or complete commercial-scale operations. Runtime database
credentials remain trusted; distributed abuse limits, RLS/tenant policies, paid
entitlements, monitoring and tested backup/restore remain launch work.

## Executed validation

| Check                                          | Confirmed result                                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Unit/integration                               | **183/183 passed across 43 files**                                                                   |
| Content Studio desktop/Pixel 7                 | **10/10 passed** (six preserved plus four new cases)                                                 |
| TypeScript / ESLint                            | Passed                                                                                               |
| Original server-backed desktop/mobile suite    | **8/8 passed**                                                                                       |
| Production browser-demo desktop/mobile suite   | **20/20 passed:** full expanded 18-case suite plus two 100-question navigation/bookmark-review cases |
| Total browser cases                            | **38/38 passed**                                                                                     |
| Server-mode and browser-demo production builds | Both passed                                                                                          |
| Attachment hashes and exact transcription      | Passed; fidelity does not establish technical answer verification                                    |
| Production dependency audit                    | `npm audit --omit=dev --audit-level=high` passed                                                     |
| Documentation formatting / diff checks         | Passed                                                                                               |

New tests exercise exact 78/21 document data, immutable seed drift, unique draft
grading/mapping, explicit 100-record import, separate source proof, canonical
approval/eligibility, connected draft rejection, filters/counts, exam duration/
domain allocation, objective analytics and actual coverage/report triage.
Fictional isolated approval fixtures test gates; they do not verify any real
source. Earlier 135-test/28-browser A/B evidence remains in the historical report,
not a substitute for this changed milestone's completed run above. See [TESTING.md](../TESTING.md).

Actual application screenshots, generated outside Git in
`/workspace/artifacts/v06-chst/`:

- Curriculum: [desktop](/workspace/artifacts/v06-chst/curriculum-desktop.png)
  and [mobile](/workspace/artifacts/v06-chst/curriculum-mobile.png).
- Objective pathway: [desktop](/workspace/artifacts/v06-chst/objective-desktop.png)
  and [mobile](/workspace/artifacts/v06-chst/objective-mobile.png).
- Draft feedback: [desktop](/workspace/artifacts/v06-chst/draft-feedback-desktop.png)
  and [mobile](/workspace/artifacts/v06-chst/draft-feedback-mobile.png).
- Database coverage: [desktop](/workspace/artifacts/v06-chst/coverage-desktop.png)
  and [mobile](/workspace/artifacts/v06-chst/coverage-mobile.png).
- Source examination: [desktop](/workspace/artifacts/v06-chst/source-review-desktop.png)
  and [mobile](/workspace/artifacts/v06-chst/source-review-mobile.png).

The images show public unreviewed demonstrations or isolated QA editorial
activity. They do not represent approved source content, customer records or a
live configured Clerk/PostgreSQL journey. The source-examination screens show QA
requests for corrections/insufficient evidence, not actual technical approval.
Visual review covered desktop/mobile curriculum, mobile objective, desktop
feedback, mobile source examination and desktop coverage. These local artifact
links work in the execution workspace; screenshots are not committed Git assets.

## External and content limitations

The supplied blueprint/bibliography were completely read, transcribed and hashed.
Their printed versions remain **2022.04.12 / 2021.06.09**, regardless of later PDF
packaging metadata. Current official-version/technical-source HTTPS checks were
blocked by this workspace's **CONNECT proxy 403 before reaching the target**;
that is not a BCSP/OSHA response. No latest-version claim, textbook page, source
verification date, legal applicability or outdated-reference status is invented.
See [source provenance](chst-source-provenance.md).

A bibliography listing does not show that a book supports an answer. Source
categories distinguish regulations, consensus standards, guidance and learning
resources; classification alone does not prove legal applicability or accuracy.
Human attestations are recorded, not independently proven by the application.

The 78 objective pages are unreviewed study outlines, **not 78 approved lessons**.
No verified videos, operational Instructor/avatar, flashcard scheduler, measured
retention/mastery or validated BCSP pass prediction is supplied. Analytics are
observed practice with transparent heuristics.

The full 200-question exam remains unavailable: real official duration/policy is
unverified and there are zero eligible production questions. Future full starts
must select 200 distinct published questions in **73/40/45/42** domain allocation
for the supplied weights. Short rehearsals remain labeled; no official passing
score is fabricated.

Connected accounts remain **Blocked: Live Provider Validation**. Clerk
registration/recovery/verification and hosted PostgreSQL cross-device behavior
have not been live-tested; isolated PGlite/provider substitutes do not establish
those results. No paid provider or production deployment has been activated.

## Branch, setup and preview

- Branch: `development/stable-learning-foundation`.
- Preserved A/B checkpoint: `5a67ad3` (including connected hardening `9db7ca7`).
- Canonical supplied-document foundation: `85e386d`.
- Remaining implementation/docs: accompanying curriculum checkpoint commit.

For the no-credentials Vercel Preview, retain repository root `.`, Next.js,
Node 24, `npm run build`, default output and **`NEXT_PUBLIC_BROWSER_DEMO=true`**
before building. Open **Vercel → project → Deployments → Preview for this branch
and commit → Ready → Visit**. Generated deployment URLs/Ready status must be read
from Vercel; this environment cannot retrieve the deployment-status link. Do not
promote to production. A push or local build alone does not prove a remote Ready
result.

For connected editorial coverage, separately configure Preview Clerk/PostgreSQL,
apply migrations/seed, initialize users through saved activity, grant trusted
roles and explicitly run `content:import-chst`. Never put secrets in chat/Git.
The browser-only demo cannot supply live editorial metrics or triage. Full steps:
[content-engine setup](chst-content-engine.md), [deployment](../DEPLOYMENT.md),
[provider checklist](connected-provider-validation.md).

## Recommended next milestone

Actually examine sources and independently correct/review the 100 drafts; confirm
current official documents, author source-supported objective lessons and
validate the isolated live account journey. Then grow deliberately toward **300
reviewed private-beta questions**, followed by future 1,000/2,000 reviewed targets.
Do not substitute question quantity for technical evidence. Instructor/video and
flashcard releases remain subsequent platform work.
