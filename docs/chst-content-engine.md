# CHST5 curriculum and content-engine setup

This extends the existing application; it does not create a second course app.
The connected account/Studio foundation is preserved on
`development/stable-learning-foundation`. Browser demonstration needs no paid
services, provider keys or hosted database.

## What the supplied documents establish

The complete attached BCSP blueprint **CHST5 V.2022.04.12** contributes four
domains, exact weights and **78 knowledge/skill statements**. The supplied
**V.2021.06.09** bibliography contributes **21 publication listings**. Read
[document provenance](chst-source-provenance.md) for exact hashes, numbering,
page attribution and the blocked latest-version check. The repository contains
structured transcription and attribution, not the uploaded PDFs or reference
book contents.

Stable keys such as `CHST5-2022.04.12-D1-K01` encode printed version, domain,
knowledge/skill list and number. They are CredBuilt identifiers, not BCSP-issued
objective codes. Source mapping is preserved without inventing objectives.
Transcribing the attachment does not establish the current online version,
independent technical approval, official duration or passing score.

## Draft inventory and quality boundary

| Domain                                                           | Weight | Official statements | Original drafts |
| ---------------------------------------------------------------- | -----: | ------------------: | --------------: |
| 1 — Hazard and Risk Identification and Control                   |  36.6% |                  36 |              37 |
| 2 — Emergency Preparedness, Incident Investigation, and Response |  19.9% |                  15 |              20 |
| 3 — Safety Program Development, Implementation, and Sustainment  |  22.5% |                  13 |              22 |
| 4 — Leadership, Communication, and Training                      |  21.0% |                  14 |              21 |
| Total                                                            |   100% |                  78 |             100 |

The batch is in `src/content/chst/draft-bank.ts` and domain files, with stable
`chst5-draft-NNN` identities and revision 1. Each record contains the mapped
statement, topic/subtopic, difficulty, instructional category, four choices,
correct key, correct/incorrect explanations, candidate sources and worked steps
where applicable. Categories cover foundational, applied technical, scenario and
reasoning/calculation work. Origin is `ai_generated`; review status is draft,
source-verification date and technical reviewer are null. No exact section,
publication edition or review date is fabricated when unknown.

All 78 objectives have at least one mapped draft. This is mapping coverage, not
sufficient depth, answer accuracy or reviewed curriculum. **0 questions are
source-verified, technically approved or published by this milestone.** The
original 12 demonstrations/eight lessons remain separately unreviewed.

## Browser-only demonstration

Set `NEXT_PUBLIC_BROWSER_DEMO=true` before build and use the existing Vercel
Next.js configuration. Open **Learn → CHST5 study map** or `/curriculum`. Search
by statement/ID and filter by domain or knowledge/skill kind. Each objective has
an explicitly unreviewed study outline, terminology/prompts, tentative reference
connections and related actual lesson completion. An outline has no completion
checkbox or inferred mastery; it is not an approved full lesson or video.

Open **Practice**, choose **CHST5 curriculum drafts**, then select count and
filters. The original 12-item demonstration remains a separate bank. The new
`curriculum_drafts` projection intentionally exposes the 100 AI drafts as public,
inspectable demonstrations. Its saved bank tag and IDs are validated on reload.
Domain/objective/topic/difficulty, answered/unanswered, missed and bookmark
filters report actual eligibility; insufficient pools are blocked rather than
repeated. A 100-item draft bank does not become a 200-question exam.

Reference panels show classification, candidate URL, edition/locator when known
and honest pending verification. In exam rehearsals, references/explanations/
keys stay withheld until submission. Saved objective analytics use actual
attempts; see [the documented heuristic](adaptive-objective-model.md).

Browser storage remains per origin/profile, editable and disconnected from
accounts. No server database is created or imported by visiting these pages.
Studio, live coverage and report triage require connected editorial access.

## Managed preview and database ingestion

Use an isolated non-production environment, never a guessed production database.
Follow [deployment](../DEPLOYMENT.md) and
[connected-provider validation](connected-provider-validation.md). Securely
configure browser-demo mode off, matching Clerk keys, `DATABASE_URL` with verified
TLS and `APP_ORIGIN`. Do not paste secret values into chat or commit them.

```bash
npm ci
npm run db:migrate
npm run db:seed
```

Migrations now include additive `0005_curriculum_sources.sql`. Managed startup
verifies the checksummed ledger rather than applying migrations. Canonical
seeding inserts exact attached documents/objectives and bibliography without
human-verification fields; drift under an immutable ID rejects instead of
silently rewriting wording/version. The old provisional blueprint and demo pins
remain intact. This seed does **not** ingest the 100 question drafts.

An intended author must first sign in and save learner activity so the managed
subject exists in `users`. A trusted operator then grants the minimum role and
imports the batch into the explicitly selected preview database:

```bash
npm run studio:role -- grant existing-author-subject author responsible-operator
npm run content:import-chst -- existing-author-subject
```

The names above are placeholders. Use the actual existing provider subject and
responsible operator. The import cannot create users, grant roles, verify sources,
approve or publish. It imports all 100 stable-ID drafts atomically, preserving
AI origin and appending ingestion audit. Identical repeat imports skip; different
owners, edits, statuses or revisions conflict rather than overwrite. A failed
batch rolls back. Ordinary public JSON import remains a separate at-most-50-record
validated preview/confirm workflow.

For disposable local tests, the explicit local Studio flags can substitute for
providers only outside production/Vercel. The account still needs a trusted role;
stop the app before CLI access to the same single-process PGlite directory.
Never use local test identities or flags for customer data. The dedicated Studio
browser fixture resets only its guarded `.local/studio-e2e` path.

## Separate review stages

Use distinct authorized author and reviewer identities. Reviewers need the
reviewer role; administrator alone does not permit technical review. Every item
contributor is excluded from independently reviewing that logical item.

1. **Draft:** correct content and mapping; add classified candidate sources.
2. **Source Verification Pending:** author/admin requests examination of the
   exact immutable revision.
3. **Source Verified:** reviewer actually examines every source and records
   exact edition, supporting section, URL or registered physical-book identity,
   findings, outcomes and human attestation. Positive source proof requires all
   cited sources supported; a bibliography listing alone is insufficient.
4. **Technical Review:** separately review mapping, answers, distractors,
   explanations, calculations/units, scenarios/media, rights and pedagogy.
5. **Approved:** independent technical approval plus current source proof and
   an actually reviewed canonical blueprint/objective are required.
6. **Published:** only an administrator can publish the exact approved snapshot.
   SQL/API guards and matching pointers feed the connected learner bank.
7. **Retired:** active pointers are removed while immutable history stays intact.

Changes/rejections require a new draft; source proof and approval do not transfer.
Legacy in-flight technical reviews can request examination but cannot bypass the
new source gate at approval/publication. Monotonic evidence event numbers define
the latest source decision. Revoked examiner authorization requires re-review.

Sources are regulatory requirements, consensus standards, professional guidance
or supplemental resources. Legal applicability requires actual jurisdiction and
scope analysis. A public HTTPS source may be cited, or a registered physical
publication without a URL must match exact title/edition and still have an
examined locator. The service does not fetch references or prove human diligence.
Unknown source freshness and current editions remain unknown; no automatic
outdated-reference monitor is implemented.

## Coverage, pagination and reported concerns

A reviewer/administrator opens `/studio/coverage`. Metrics query actual current
editorial heads for this attached blueprint and active publication pointers
separately, so a new draft cannot remap a previous publication count. Filters
include domain, objective, status and search. Clickable drill-downs open the
server-paginated 25-row Studio list with true totals. Missing/thin coverage uses
an explicit fewer-than-two-record heuristic, not an official sufficiency rule.

Before explicit draft ingestion, the dashboard may correctly show zero questions;
the public fixture count is not a database metric. After the isolated integration
import, actual records demonstrate 100 drafts across all 78 objectives with zero
source-verified/approved/published. Production/deployed database state must be
observed independently.

Connected learners may report current published or owned historical revisions
through the content concern form. Authorized reviewers/administrators append
under-review/resolved/dismissed decisions and notes. Reports and triage remain
append-only; resolution never auto-verifies, approves or republishes a question.

## Exam and scale gates

Full exam selection requires trusted verified blueprint/duration policy, exact
policy duration, approved published content and 200 distinct eligible questions
with domain allocation **73/40/45/42**. Generic practice starts enforce the same
server gate; changing a browser field cannot unlock it. No actual official
duration is configured and no eligible production questions are supplied, so
only explicitly labeled short rehearsals work today. No passing score is claimed.

Stable versioned identity, objective/domain indexes and editorial pagination
support the intended 2,000+ questions per track without a 100-record schema cap.
Large-bank selection pagination/aggregation, normalized session items and load
validation remain necessary before claiming tested scale. Instructor/video,
flashcards/retention, paid entitlements and commercial operations remain pending.
