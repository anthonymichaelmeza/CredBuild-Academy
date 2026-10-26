# Full-length exam demonstration activation

This is the current activation guide for
`development/stable-learning-foundation`. It extends the existing exam engine,
curriculum, Content Studio and browser demonstration. The earlier
[full-exam engine checkpoint](full-length-exam.md) records historical validation
at `b6890e2`; its browser-demo launch restriction is superseded here. Main and
production are not changed or promoted by this development work.

## Why the previous screen was locked

The warning combined two independent conditions:

1. **The reviewed production bank is empty.** The 100 original AI questions in
   `src/content/chst/drafts-domain*.ts` are deliberately drafts, with null source
   verification and technical-review fields. The original 12 questions in
   `src/demo/questions.ts` are also demonstrations. Approval status was not
   missing or accidentally left unpopulated; no human technical approval had
   occurred.
2. **The browser demonstration had no full-exam adapter.** The complete
   server-backed engine existed, but the browser-only page rejected full starts.
   Its public browser bank contained only the original examples and curriculum
   drafts. The separate 240-item engineering pool in
   `src/modules/exams/development-fixtures.ts` was restricted to an explicitly
   isolated local test database and could not run on Vercel.

The reported screen and the last inspected local build used browser-demo mode.
Workspace configuration allowed local PGlite development storage, but contained
no configured hosted PostgreSQL URL or Clerk provider credentials. Remote
Vercel environment settings were not inspected. A local build's selected mode
does not establish a remote deployment's configuration or Ready status.

Production questions live in `question_versions`, with current
`published_questions` pointers and immutable Studio source/review/publication
evidence. The 100 drafts enter a connected editorial database only through the
explicit trusted import documented in [content-engine setup](chst-content-engine.md).
Public browser fixture counts are not database metrics.

## Two independent launch paths

| Path                              | Content and timing                                                                                                         | Storage and access                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Browser demonstration             | Exactly 200 distinct synthetic examples, four choices and one key each; standard four hours; explicit demonstration labels | Existing browser-demo flag and local browser storage; no account, Clerk or server database |
| Isolated connected development QA | Synthetic draft demonstration pool; standard four hours or a guarded local test duration                                   | Existing local development identity and disposable PGlite test directory                   |
| Production CHST study             | Exactly 200 eligible source-verified, independently technically approved and published questions; standard four hours      | Managed authentication, owner-scoped server records and configured PostgreSQL              |

The first two paths never create approval/publication evidence. The production
path still rejects insufficient content. Making the demonstration usable does
not make the instructional bank production-ready.

`NODE_ENV=production` describes an optimized Next.js build. A build explicitly
configured with `NEXT_PUBLIC_BROWSER_DEMO=true` remains a public demonstration,
including when hosted as a Vercel Preview. Its inspectable sample data does not
become the production question bank. Shortened development timing is unavailable
in a production build, including the hosted browser demonstration.

## Open the demonstration without installing tools

1. In the existing Vercel project, retain
   **`NEXT_PUBLIC_BROWSER_DEMO=true`** for **Preview** before the build. Keep the
   existing repository root `.`, Next.js preset, Node 24, `npm run build` and
   default output directory. No additional service or credential is required.
2. Open **Deployments → Preview for `development/stable-learning-foundation`
   and the intended commit → Ready → Visit**. The generated URL and actual Ready
   status must come from Vercel; a local build or Git push alone does not prove
   them. Do not promote to production.
3. On the dashboard, find **CHST Full-Length Exam Simulation** and click
   **Open Exam Simulator**, or open `/exam`.
4. Click **Start 200-question demonstration exam**. It uses all
   200 unique examples in the supplied domain proportions, without duplicate
   filling or invented technical approval.
5. Select answers, change them, mark questions, navigate and refresh. Submit
   with confirmation, inspect domain results and explanations, then open
   **Exam History** or **Study My Missed Questions**.

The browser preserves the selected IDs, order, answers, flags, current position
and deadline on the same origin/profile. Closing it does not intentionally pause
or restart the deadline. Expired attempts finalize at the stored deadline when
the page resumes or is accessed. The deadline, scores and answer bank remain
inspectable/editable because this path runs in the visitor's browser. It is
not protected scoring or authenticated cross-device persistence.

Changing the preview URL, browser profile, private window or device starts a
separate history. Another person using the same browser profile can inspect its
demo activity. Blocked/full storage produces a visible error instead of silently
discarding a save. Settings can export the browser's demonstration data or reset
only the existing CredBuilt demo stores. No sensitive learner information should
be entered into this public demonstration.

This does not create an access-controlled tester account. Restrict a preview
through the hosting project's existing access controls if private tester access
is required; the application does not pretend that browser storage authenticates
users.

## Blueprint, timing and readiness

The application preserves the supplied CHST5 **V.2022.04.12** wording, numbering
and weights. The full-attempt allocation is:

| Domain                                                           | Weight | Required questions | Eligible production questions supplied | Additional questions needed |
| ---------------------------------------------------------------- | -----: | -----------------: | -------------------------------------: | --------------------------: |
| 1 — Hazard and Risk Identification and Control                   |  36.6% |                 73 |                                      0 |                          73 |
| 2 — Emergency Preparedness, Incident Investigation, and Response |  19.9% |                 40 |                                      0 |                          40 |
| 3 — Safety Program Development, Implementation, and Sustainment  |  22.5% |                 45 |                                      0 |                          45 |
| 4 — Leadership, Communication, and Training                      |  21.0% |                 42 |                                      0 |                          42 |
| Total                                                            |   100% |                200 |                                      0 |                         200 |

The standard examination setting is **four hours (240 minutes)**. No official
passing percentage is applied. Ordinary HTTPS checks of currently published
BCSP blueprint resources were blocked by the workspace CONNECT proxy before
reaching BCSP. The application therefore retains the supplied version and does
not invent a successful latest-document examination. See
[source provenance](chst-source-provenance.md).

Readiness presents separate facts: **Production Exam: Not Ready** until each
domain has enough eligible publications, while **Demonstration Simulator:
Available** when the explicitly configured demo path is available. Connected
administrator counts come from the actual database, not the shipped fixture
inventory. In browser-only mode there is no connected editorial database to
query; repository content totals are labeled accordingly.

## Short development timing

The connected local QA provider accepts
`CREDBUILT_EXAM_TEST_DURATION_SECONDS` as an integer from **5 to 14,400 seconds**
only when its complete local fixture guard passes. It is not a learner-supplied
exam setting. Omit the variable for the standard 14,400 seconds.

The guard requires development mode, explicit fixture/local-demo opt-ins,
browser-demo mode off, no Vercel or managed database configuration, and the
literal disposable `.local/exam-e2e` path. Never enable these flags for a
customer database or configure them on Vercel. The published-question path
always uses four hours. The browser demonstration likewise restricts the **Local QA duration (seconds)**
control to 5–14,400 seconds in local development; a production build cannot
request it.

Run `npm run test:e2e:exam:short` for the separately guarded local short-timer
QA suite. The normal `npm run test:e2e:exam` retains the standard four-hour
setting. The exact commands and executed results are recorded in
[TESTING.md](../TESTING.md). Stop a running Next server before another browser
suite or build touches the same checkout; generated `.next` files are shared.

## Admin Question Bank and production content

An existing connected account with the trusted **administrator** role opens
`/studio/questions`. Browser demonstration mode cannot grant roles, author
protected records or publish content. Author/reviewer workflows remain available
in Content Studio without turning every editor into an administrator.

The Question Bank reuses the existing immutable editors and source/review
workflow. Administrators can create/edit questions, assign the canonical
domain/objective, topic/subtopic and difficulty, supply four choices/key and
explanations, add candidate citations, and save drafts. Approved or published revisions are archived through the existing **Retired**
state, retaining history rather than deleting question revisions.

CSV and JSON batches accept at most **50 records and 250,000 UTF-8 bytes** per
import. Use the Question Bank template downloads (`/api/studio/questions?template=csv`
or `?template=json`) for supported fields. CSV requires an external `id`; JSON
accepts existing `ContentDraft` records with an optional top-level external `id`,
or records shaped as `{ "id": "external-id", "content": { ... } }`. External IDs
are 1–100 characters, start with a letter/digit and use letters, digits, `_`, `.`,
`:`, or `-` thereafter. Internal logical UUIDs are generated by the application.

A CSV row includes the canonical blueprint/objective/domain, topic, difficulty,
question stem, four choices, correct choice, explanation, all four rationales
and a candidate source title. Optional citation URL/edition/section can remain
blank when unknown; that never counts as source verification. Downloaded
templates are authoritative for the complete column list. Preserve
`origin=ai_generated` for AI drafts rather than relabeling authorship.

Batches use a validated preview before explicit confirmation. Malformed records, invalid choices/keys and
duplicate external IDs produce row/record issues; import does not fill missing
answers, approve questions or silently overwrite existing content. Confirmation
is owner-bound, transactional, one-use and expires after **15 minutes**. Editing
the import text or switching CSV/JSON invalidates the visible confirmation so an
older preview cannot accidentally import a different batch. Persistent external-ID mapping rejects
an already ingested identifier, including from another batch. Internal immutable
content identity remains separate from an imported external ID.

For actual production eligibility, an administrator must first record an actual
review of the applicable canonical blueprint through **Blueprint source review**
in Content Studio. Supplying the attachment or importing mappings does not set
that human-review record automatically. Then:

1. Author and correct the exact draft with complete canonical mapping and
   candidate technical sources.
2. Request separate source verification. An authorized independent reviewer
   actually examines the sources and records edition, supporting section,
   findings and human attestation. A bibliography listing is not sufficient.
3. Submit the revision for separate technical review. An independent reviewer
   approves it or requests changes/rejects it with findings.
4. A trusted administrator publishes the exact approved revision. Changes
   require a new draft; source/technical approval does not transfer implicitly.
5. Check `/studio/exams` for actual eligible quantities and shortfalls in every
   domain before a connected learner attempts a production start.

The repository still supplies **0 source-verified, 0 technically approved and 0
published CHST questions**. Synthetic tests do not change those counts. A seeded
draft, recorded citation or enabled demonstration button is never evidence of
professional review.

## Persistence and additive migrations

Browser examples use the existing versioned browser storage; visiting a demo
page does not create a server database. Connected learners continue to use
server-verified identities, owner predicates, row-locked saves, protected active
DTOs, immutable question pins and fixed server deadlines. Repeated submission
returns the same result. Historical review survives retirement of a question.

Apply migrations explicitly before connected code that depends on them:

```bash
npm ci
npm run db:migrate
npm run db:seed
```

Migration `0007_exam_demo_timing.sql` extends full-exam timing validation for narrowly identified
demonstration attempts while preserving the four-hour production invariant and
immutable deadlines. Migration `0008_question_import_ids.sql` adds immutable
`studio_import_question_ids` mappings for persistent imported external-ID
deduplication. Earlier migrations and existing learner records are preserved;
no destructive reset or approval backfill is part of the rollout.

Workspace diagnosis found local development persistence, not a configured
hosted database or live authentication provider. For account-based Vercel use,
configure the existing matching Clerk keys, PostgreSQL URL and `APP_ORIGIN` in
an isolated connected Preview, run migrations, grant minimum trusted roles, and
complete [live-provider validation](connected-provider-validation.md). Never
put credentials into chat, Git or a `NEXT_PUBLIC_` secret variable.

## Validation and remaining launch work

The prior engine checkpoint passed 229 automated tests and 52 browser cases.
Those results are historical and do not substitute for changed activation code.
Current confirmed browser evidence is **60 unique cases passed**:

| Suite                                       | Confirmed result                                                           |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| Production-build browser demonstration      | **26/26 unique cases**; 24 initial passes plus two expiry-selector retries |
| Preserved server learner flow               | **8/8**, 51 seconds                                                        |
| Full connected-fixture exam                 | **12/12**, 51 seconds                                                      |
| Actual local ten-second expiry              | **2/2**, desktop/mobile, 37 seconds                                        |
| Content Studio and Question Bank            | **12/12**, 1.5 minutes, including CSV/JSON duplicate-ID flows              |
| Final full automated suite                  | **260/260 across 52 files**, 108.45 seconds                                |
| Final server/browser-mode production builds | Both passed without warnings, with the latest import-preview fixes         |

Both browser-demo runs answered all **200 questions through the interface** and
produced the expected **50 correct / 200 (25%)** score (35 seconds desktop,
45 seconds mobile). The short-timer suite uses real server time rather than a
browser-clock bypass. Question Bank tests exercise protected actual draft
imports, invalid/duplicate IDs and retained review gates. Independent security
review found no blocker; candidate-file review found no credentials, databases
or uploaded source PDFs, and migrations `0001`–`0006` remain unchanged.

The final **260/260** automated tests and both production builds passed. Whole-tree
TypeScript and ESLint also passed. The final builds include the current
CSV/JSON preview-binding changes; old preview data cannot silently confirm after
the visible import text or format changes. Focused reruns are not added again to
the aggregate test totals.

Actual browser-demo screenshots are saved outside Git:

- Active exam: [desktop](/workspace/artifacts/full-exam-activation/browser-demo-active-desktop.png)
  and [mobile](/workspace/artifacts/full-exam-activation/browser-demo-active-mobile.png).
- Completed results: [desktop](/workspace/artifacts/full-exam-activation/browser-demo-results-desktop.png)
  and [mobile](/workspace/artifacts/full-exam-activation/browser-demo-results-mobile.png).
- Review: [desktop](/workspace/artifacts/full-exam-activation/browser-demo-review-desktop.png)
  and [mobile](/workspace/artifacts/full-exam-activation/browser-demo-review-mobile.png).
- History: [desktop](/workspace/artifacts/full-exam-activation/browser-demo-history-desktop.png)
  and [mobile](/workspace/artifacts/full-exam-activation/browser-demo-history-mobile.png).
- Question Bank validation: [desktop](/workspace/artifacts/full-exam-activation/question-bank-validation-desktop.png)
  and [mobile](/workspace/artifacts/full-exam-activation/question-bank-validation-mobile.png).
- Imported draft: [desktop](/workspace/artifacts/full-exam-activation/question-bank-draft-desktop.png)
  and [mobile](/workspace/artifacts/full-exam-activation/question-bank-draft-mobile.png).

The active desktop/mobile, desktop results and desktop Question Bank validation
screenshots were visually reviewed.
The 25% score is the actual outcome of scripted answers to arithmetic fixtures;
it is not customer activity, reviewed CHST knowledge or readiness evidence.

A full demonstration is not a commercial CHST bank. Real customer readiness
still requires actual source examination and independent content review,
sufficient published coverage, live Clerk/PostgreSQL validation, and the existing
operational checks for monitoring, backups/restore, retention and secure access.
No BCSP affiliation, validated examination-result prediction or official passing
percentage is claimed.
