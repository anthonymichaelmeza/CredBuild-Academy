# CHST question-bank development and exam integration

This extends the existing CredBuilt application on
`development/stable-learning-foundation`. It preserves learner records, browser
demonstrations, managed-account boundaries and the existing exam engine. Main is
not merged or promoted to production by this work.

## Inventory and verification status

The repository retains its **100 original CHST5 AI drafts** and adds **exactly 50
new Domain 1 drafts** in `src/content/chst/domain1-batch-001.ts`. These are separate
content batches; visiting the application or running migrations does not ingest
either batch into an editorial database. If both are explicitly imported, the
repository-supplied inventory is 150 questions: Domain 1 has 87, Domain 2 has 20,
Domain 3 has 22, and Domain 4 has 21. Actual dashboard totals come from the selected
connected database and may differ.

The new batch includes realistic construction scenarios for hazard
identification, job hazard analysis, risk assessment, hierarchy of controls,
excavations, fall protection, electrical work, cranes/rigging, mobile equipment,
confined spaces, hazardous energy and industrial hygiene. Each record includes
one canonical objective, topic/subtopic, difficulty, four choices, one answer,
correct/incorrect rationales and a provisional explanation. The application uses
`introductory` internally for the user-facing **Foundational** difficulty.

All 50 remain `ai_generated` drafts with null source-verification dates and null
technical reviewers. Candidate citations and locators are working leads for
review, not evidence that a source was retrieved or supports an answer. **No
source-verified, technically approved or published question is supplied by this
batch.** The earlier drafts, 12 original browser examples, 200 public exam
fixtures and local engineering fixtures also retain their existing disclosures.

Ordinary HTTPS requests to the official BCSP CHST resource, OSHA regulations and
NIOSH guidance were blocked by the environment's CONNECT proxy with HTTP 403,
before reaching those publishers. The latest official blueprint and the cited
technical text could not be independently examined here. This is an unresolved
content-verification gap. The new drafts must not be represented as a
reference-verified practice bank or published until the human review process is
complete. No BCSP affiliation or access to official exam questions is claimed.

## Curriculum and production targets

The curriculum preserves the supplied **CHST5 V.2022.04.12** blueprint: 78 exact
knowledge/skill statements and stable CredBuilt mapping IDs. Its current online
version remains **not confirmed**. The separate supplied bibliography remains
21 listings from V.2021.06.09; a bibliography listing is not source verification.
See [source provenance](chst-source-provenance.md).

| Domain                                                           | Bank target |   Weight | Full-exam requirement | Reviewed, published questions supplied | Still needed for an exam |
| ---------------------------------------------------------------- | ----------: | -------: | --------------------: | -------------------------------------: | -----------------------: |
| 1 — Hazard and Risk Identification and Control                   |         732 |    36.6% |                    73 |                                      0 |                       73 |
| 2 — Emergency Preparedness, Incident Investigation, and Response |         398 |    19.9% |                    40 |                                      0 |                       40 |
| 3 — Safety Program Development, Implementation, and Sustainment  |         450 |    22.5% |                    45 |                                      0 |                       45 |
| 4 — Leadership, Communication, and Training                      |         420 |    21.0% |                    42 |                                      0 |                       42 |
| **Total**                                                        |   **2,000** | **100%** |               **200** |                                  **0** |                  **200** |

The initial launch target is **500 published questions**, followed by a
2,000-question bank. Draft progress and publication progress are distinct.
Importing all 150 supplied drafts does not reduce any production-exam shortfall.
The displayed connected shortfall updates from actual eligible publications;
these supplied-content figures do not claim to inspect a remote customer database.

## Open the connected Question Bank

Use an isolated connected Preview with an existing, authenticated administrator
account. Open **`/studio/questions`**, or **Content Studio → Question Bank**.
General authors/reviewers retain their existing Studio access; that access alone
does not grant administration, richer imports or the production dashboard.

The public browser demonstration intentionally cannot create an administrator,
write editorial records or record source review. It needs no Clerk keys or
database, but cannot demonstrate protected authoring as a real account. Keep
`NEXT_PUBLIC_BROWSER_DEMO=true` for the credential-free hosted demonstration.
Never disable permission checks to make an admin page visible there.

### Import the new 50-question batch in the browser

1. Open **Question Bank → AI drafting**.
2. Read the unverified-content notice and select **Preview 50 Domain 1 drafts**.
3. Inspect the **Question import** preview. Resolve every reported validation
   error or duplicate before confirmation.
4. Explicitly confirm the validated batch. The result is **50 drafts**, with AI
   origin preserved and no source, approval or publication evidence created.
5. Return to the content library and inspect individual records before requesting
   human source examination.

**Download draft batch JSON** provides the same authoring data without importing
it. CSV/JSON imports accept at most 50 records and 250,000 UTF-8 bytes per batch.
Use the downloadable templates for the exact schema. Validation checks canonical
objective/domain mapping, four unique choices, answer keys and rationales.
Duplicate external IDs or duplicate stems block the entire import; records are
never silently overwritten. Preview is owner-bound, expires after 15 minutes,
and must still match the displayed input at confirmation.

The existing manual editor supports creation, revision, mapping, candidate source
citations, source verification, review decisions, publication and retirement.
Retirement preserves history and removes active publication pointers.

### AI-assisted authoring

The **AI drafting** form prepares an objective-specific brief with topic,
subtopic, count, difficulty, candidate-reference notes and the import JSON shape.
**No model provider is connected, no API request is made to an AI provider, and
no question is generated automatically by that form.** Copy the brief into the
chosen AI tool, examine its output, then use the normal validated JSON
preview/confirm workflow. No provider key or paid service is required by this
milestone. This is an authoring aid, not automated technical review.

## Technical reference registry

From Question Bank, select **Open the reference registry**, or visit
**`/studio/references`** with administrator access. Migration 0009 registers five
candidate metadata records: OSHA Part 1926, OSHA Part 1910, OSHA Job Hazard
Analysis, NIOSH Hierarchy of Controls and the OSHA interpretation index. All start
**unverified**, without invented publication dates or editions. The original
21-entry BCSP bibliography remains separate and intact.

The registry records title, issuing organization, publication/revision date when
known, edition, section/chapter, public HTTPS URL or licensed identifier, domains,
topics, access conditions and rights limitations. It stores metadata and links,
not paid or restricted source text. Do not paste or redistribute publications
without distribution rights. Applicability, currency and licensing require actual
examination; Part 1910 must not be assumed universally applicable to construction.

An administrator can create/edit metadata and record an actual human examination
with findings and explicit attestation. Review records are immutable and pin the
exact metadata revision. A monotonic event number preserves review order even
when timestamps match. Editing metadata creates a new revision whose status is
unverified, preserving earlier examination history. A stale review is rejected.
**Registry verification never verifies or approves a question.** Each question
still needs evidence supporting its exact answers and explanations.

## Human source review, approval and publication

Use distinct authorized contributors and independent reviewers. Roles are granted
by a trusted operator; accounts cannot grant their own editorial roles. An
administrator does not automatically have the independent technical-review role.

1. **Draft:** an author or authorized administrator corrects the question and
   records its exact objective, four choices, key, rationales and candidate
   technical references. Source retrieval gaps must be resolved before approval.
2. **Source Verification Pending:** request source examination for the immutable
   content revision. An independent reviewer actually examines every cited source
   and records exact edition, supporting section, URL or physical/licensed
   identity, findings, source outcomes and human attestation.
3. **Source Verified:** positive question-specific evidence must support the
   revision. A registry entry, AI citation, URL or bibliography alone is insufficient.
4. **Technical Review:** submit the source-verified revision. An independent,
   authorized reviewer evaluates the mapping, applicability, correct answer,
   distractors, explanations, calculations, rights and instructional quality,
   then approves, requests changes or rejects it with findings and attestation.
   Contributors cannot independently review their own logical question.
5. **Approved → Published:** a trusted administrator publishes the exact approved
   revision. The canonical blueprint must also have an actual administrator source
   review, recorded through **Blueprint source review**. Importing an attachment
   does not create this review automatically.
6. **Retired:** archive obsolete approved/published material through retirement.
   Immutable revisions, review evidence and historical learner pins survive.

Editing requires a new draft. Source verification and technical approval do not
silently transfer to changed wording. Batch import is supported; independent
technical decisions remain explicit per revision. Automatic AI approval and
unattended bulk publication are not provided.

## Content production dashboard

Open **`/studio/questions/production`** with administrator access. Metrics use
current logical CHST instructional records from the connected database, without
counting old revisions, retired content or demonstration fixtures as active bank
inventory. The dashboard reports lifecycle totals, domain/topic counts, questions
needing source verification, missing objective mappings, published coverage,
duplicate candidates, 500/2,000 progress and current full-exam readiness.

Duplicate candidates are normalized wording matches, not a semantic similarity or
plagiarism judgment. A mapped draft provides planning coverage; it is not reviewed
instructional coverage. For exact exam eligibility and shortages also open
**`/studio/exams`**. Browser mode cannot query this database and therefore displays
protected access rather than fictional live metrics.

## Approved content and the existing exam engine

Connected production selection follows current publication pointers and requires
instructional content, canonical mapping, actual source-verification evidence,
independent approval and the applicable authorized review records. A record whose
status merely says approved is insufficient. Draft imports cannot enter this path.

The full exam requires **200 distinct eligible questions**, allocated
**73/40/45/42**, with the standard **four-hour** deadline. It randomizes questions
and pins randomized answer ordering for each new attempt. Autosave, refresh/resume,
flagging, expiration submission, scoring, detailed explanations, history and
domain/topic analytics continue to use the existing engine. Older attempts retain
their saved questions and answer meaning; a migration does not reorder them.

Insufficient domain coverage produces specific shortages, never repeated question
filling. The separate local engineering fixture mode remains guarded and labeled.
The existing public browser demonstration also remains explicitly synthetic and
browser-local; its 200 fixtures never count toward production readiness. See
[exam activation](exam-activation.md) for its limits and local QA timing.

## Additive migration and deployment instructions

For a connected environment, securely select the intended non-production database
and run migrations **before starting the updated server**:

```bash
npm ci
NEXT_PUBLIC_BROWSER_DEMO=false npm run db:migrate
NEXT_PUBLIC_BROWSER_DEMO=false npm run db:seed
```

Migration **`0009_reference_registry.sql`** adds candidate-reference metadata and
immutable human examination records. **`0010_exam_choice_orders.sql`** adds durable
answer-order pins and guards for new full attempts. Existing checksummed
migrations are preserved; no destructive reset, approval backfill or learner data
replacement is required. Managed startup checks migration state rather than
applying pending migrations automatically.

An existing managed subject needs the appropriate trusted editorial role. Configure
matching managed-auth keys, PostgreSQL and `APP_ORIGIN` only for the connected
Preview. Follow [connected provider validation](connected-provider-validation.md);
local tests do not establish live hosted-provider validation. Never commit `.env`
files, database files or credentials. The hosted browser demonstration keeps its
existing environment flag and does not need these services or migrations.

The browser import above is recommended for an administrator. An optional trusted
operator command imports the same 50 draft records for an existing authorized
subject into the explicitly selected database:

```bash
NEXT_PUBLIC_BROWSER_DEMO=false npm run content:import-domain1 -- existing-author-subject
```

Replace the placeholder with the actual existing subject. The command cannot
create an account, grant a role, verify sources, approve or publish. Repeated
identical trusted imports skip existing records; conflicts do not overwrite work.
Stop a local application before a CLI accesses its single-process PGlite path.

## Validation and known limits

Final validation passed **284 automated tests across 58 files** and **66 unique
browser cases**. The browser totals are 18 Content Studio/Question Bank cases,
12 connected-fixture full-exam cases, two actual shortened server-expiry cases,
eight preserved learner cases and 26 optimized browser-demo cases. After the final
reference-review ordering and mobile summary refinements, all six new production
bank cases passed again against a fresh isolated database; reruns are not counted
as additional cases.

Both optimized production builds passed: connected mode and
`NEXT_PUBLIC_BROWSER_DEMO=true`, with provider credentials empty and local database
fallback disabled. TypeScript, ESLint, whole-tree Prettier and whitespace checks
passed. The public demo completed all 200 questions on both desktop and mobile.
Coverage includes creation, bulk imports, duplicates, permissions, source and
technical review gates, reference history, domain selection, exam construction,
scoring, persistence, shortages and fixture separation. Earlier migrations
`0001`–`0008` and the original 100 draft source files remain unchanged.

These checks exercise local PGlite and Chromium, including an iPad-sized viewport;
they do not establish native Safari or live Clerk/hosted PostgreSQL validation.
No remote Vercel Ready status or generated preview URL was independently checked.

Actual UI screenshots and the importable batch are available as workspace artifacts:

- [Production dashboard, desktop](/workspace/artifacts/question-bank-development/production-overview-desktop.png).
- [AI drafting, mobile](/workspace/artifacts/question-bank-development/drafting-form-mobile.png).
- [Reference registry, desktop](/workspace/artifacts/question-bank-development/references-overview-desktop.png).
- [Unverified 50-question JSON batch](/workspace/artifacts/question-bank-development/domain1-batch001-UNVERIFIED-drafts.json).

Screenshots use an explicitly isolated development administrator and actual local
records, not customer activity or fabricated approvals. Reference screenshots may
include synthetic software-test metadata in addition to the five candidate links.

The remaining content work is substantive: retrieve current authoritative sources,
confirm the latest blueprint, examine and correct the 50 drafts, independently
review every instructional revision, and build sufficient published coverage in
all four domains. Semantic duplicate detection and a connected AI model provider
are not implemented. A browser demo and passing engineering tests do not establish
technical accuracy, a commercial launch-ready bank or production exam readiness.
