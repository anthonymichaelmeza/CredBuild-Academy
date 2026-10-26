# Full-length CHST practice examinations

This extends the existing CredBuilt Academy on
`development/stable-learning-foundation`. It preserves the original practice,
lessons, browser demonstrations and curriculum/content-review foundation.
No production promotion is authorized by this work.

## What can be launched today

The repository supplies **0 source-verified, 0 technically approved and 0
published CHST questions**. The existing 100 original AI drafts and 12 demonstration
questions remain unreviewed. They are not promoted, duplicated or relabeled to
fill a full examination.

| Supplied CHST5 domain                                            | Required per full attempt | Eligible questions supplied | Shortfall |
| ---------------------------------------------------------------- | ------------------------: | --------------------------: | --------: |
| 1 — Hazard and Risk Identification and Control                   |                        73 |                           0 |        73 |
| 2 — Emergency Preparedness, Incident Investigation, and Response |                        40 |                           0 |        40 |
| 3 — Safety Program Development, Implementation, and Sustainment  |                        45 |                           0 |        45 |
| 4 — Leadership, Communication, and Training                      |                        42 |                           0 |        42 |
| Total                                                            |                       200 |                           0 |       200 |

**A real 200-question CHST practice examination cannot currently launch.**
The interface reports this gate and exact shortages instead of substituting
unreviewed content. A separately configured deployment may have different
editorial records; its administrator must inspect its actual database counts.

The pasted request listed the correct subject-area quantities but reordered
the domain numbers. The application retains the numbering from the supplied
CHST5 **V.2022.04.12** blueprint: 36.6% / 19.9% / 22.5% / 21.0%, allocated
**73 / 40 / 45 / 42** by the existing Hamilton allocation.

Ordinary HTTPS requests to current official BCSP pages/PDFs failed with an
environment **CONNECT proxy 403 before reaching BCSP**. The latest official
blueprint and official examination duration remain unconfirmed. The four-hour
limit is the owner's requested **CredBuilt practice configuration**, not a
fabricated official-source verification. No universal BCSP passing percentage
or validated pass prediction is claimed.

## Learner access and flow

On the dashboard, find **CHST Full-Length Exam Simulation** and click
**Open Exam Simulator**, or open `/exam` directly.
**Exam History** opens `/exam/history`; an attempt opens `/exam/{id}`.

- The overview describes exactly 200 distinct questions, a configured
  **240-minute** limit, the attached blueprint version and content availability.
- Connected starts use only eligible published instructional revisions and
  require sufficient questions in **each** domain. A large total in one domain
  cannot compensate for another domain's shortfall.
- The exam reader shows one question, four answer choices, previous/next
  controls, answered progress, a 200-question navigation grid and review flags.
  Learners may change answers before submission.
- Every answer, flag and question position is saved to the authenticated owner's
  existing server storage. The attempt pins question identities, revisions and
  order so refresh or later content changes cannot reconstruct a different exam.
- Explanations, correct answers, distractor rationales and references are
  withheld from active examination responses. Confidence prompts, hints and
  immediate grading are not part of the full-exam reader.
- Early submission requires confirmation and shows the unanswered count.
  Completed results separate answered incorrectly from unanswered questions;
  unanswered questions remain incorrect in the overall denominator.
- Results include overall/domain/topic/difficulty accuracy, time used,
  response-time evidence, prior-attempt comparison and study follow-up links.
  Review supports correct/incorrect/unanswered/flagged/domain/topic filters.
  **Study My Missed Questions** starts a separate practice session from actual
  missed concepts and available eligible questions, rather than changing the
  submitted attempt.
- History lets owners resume unfinished attempts and review completed ones.
  It loads 50 attempts per server page with **Load earlier exams** keyset
  pagination. Visible summaries and comparisons describe the loaded records;
  loading older pages extends that evidence. It does not expose another user's
  attempt, keys or performance.

The original short rehearsals remain available and explicitly labeled. The
browser-only demonstration retains its existing local progress/history; it
does not pretend to provide authenticated cross-device full examinations.

## Deadline, persistence and concurrency policy

Full attempts use the existing `learning_sessions` snapshots and a separate
full-exam metadata record. The server creates a fixed `deadlineAt` exactly
14,400 seconds after the attempt's creation. Navigating away, closing the
browser, changing devices or adjusting the browser clock does not extend it.

Responses include server time so the browser can display the server-relative
countdown. The service checks the deadline again for reads and mutations.
An answer arriving after expiry is not accepted into results. Expiry finalizes
the attempt with the effective submission time at its deadline. Active-page
countdown expiry requests server synchronization through the read API, which
checks expiry before finalizing; it does not send an early manual submission
based solely on the browser clock. Reopening an expired attempt or reading
history also finalizes it. There is **no independently running background
expiry worker** or claim that an untouched database row changes at the precise
expiry instant while every client is closed.

Owner-scoped transactions/row locks serialize mutations. Flags are set to an
explicit enabled state rather than toggled on retry. Attempt creation uses an
owner/request key, and repeated submission returns the existing result without
creating another attempt or changing the original grading. Submitted snapshots
are immutable. Existing generic practice routes reject full-exam attempts so
they cannot bypass the dedicated lifecycle.

Live Clerk registration/recovery and hosted PostgreSQL cross-device behavior
remain **Blocked: Live Provider Validation**. Local isolated tests can establish
ownership, persistence and separate-browser behavior; they do not establish a
successful live-provider journey.

## Database and selection

Apply additive **`0006_full_length_exams.sql`** through the existing checksummed
migration runner. Earlier migrations and learner records are preserved.

The migration adds:

- `full_exam_attempts`, referencing the existing session/user, recording the
  trusted policy version, development-fixture marker and unique owner/request
  key for creation replay protection;
- owner/history, expiry and published-domain indexes;
- a full-session trigger enforcing 200 distinct pinned IDs, valid position,
  matching owner/status/mode, a 14,400-second deadline and answers/flags belonging
  to that attempt;
- immutable full-exam identity, question pins, policy/deadline and submitted
  snapshots.

The trusted server policy fixes CHST, the supplied blueprint version, four-hour
practice timing and required domain allocation. Learner JSON cannot override
the publication gate, duration, domain counts or development provider.
Eligibility checks publication/approval, canonical objective/domain mapping,
question shape, key/explanation and source evidence. Multiple revisions of a
logical question do not increase the eligible count. Selection first prefers
eligible questions with no completed-answer record in the preceding **30 days**.
When that pool cannot fill a domain, it falls back to the least recently answered
eligible items, then randomizes the final question order. Older recorded answers
do not permanently exclude a question. No question repeats within an attempt.

Candidate loading/pagination and indexes support growth beyond the first 200
questions. This is not a claim that the current bank contains 2,000 reviewed
items or that commercial-scale throughput has been load-tested. Revision pins
preserve historical review even if an item is subsequently replaced or retired.

## Administrator management

An account with the existing trusted **administrator** role opens
`/studio/exams`. A reviewer/author role alone is insufficient. The page and
`GET /api/exams?view=admin` enforce authorization on the server.

The view shows actual domain approval/publication/eligibility counts, exact
shortfalls, draft/unreviewed quantities, invalid published records and
completed/in-progress production examination counts. Observed question
statistics use completed production answers; active answers and synthetic
development attempts do not contribute. The statistics list loads **up to 200
most-answered question revisions across all domains**; its domain filter applies
to that loaded list, not a new bank-wide statistics query. Studio drill-downs
support follow-up review. Empty observations remain empty; no synthetic score
distribution is shown as real evidence.

The browser demonstration has no editorial database. It renders protected
access information without querying a database or creating an administrator.
Roles can only be granted through the existing trusted operational workflow.

## Local verification with development-only fixtures

Use Node 24, the lockfile and `npm ci`. Never aim test fixtures at a managed or
learner database. Stop other Next servers/builds in this checkout first.

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e:exam
```

The dedicated browser configuration enables a development-only provider and
isolated `.local/exam-e2e` database. Its guarded fixture script resets only that
exact test path before the application starts. Synthetic arithmetic items are
explicitly labeled **DEVELOPMENT-ONLY ENGINE FIXTURE**, stored as draft
demonstrations, and excluded from production approval/publication counts. They
exercise a complete 200-question attempt; they are not CHST instructional content.

Fixture generation requires **all** of: `NODE_ENV=development`,
`CREDBUILT_EXAM_FIXTURES=true`, `ALLOW_LOCAL_DEMO=true`, browser-demo mode off,
no Vercel environment, no `DATABASE_URL`, and the exact disposable
`.local/exam-e2e` path. A learner request cannot enable this provider. Do not add
these test flags to Vercel.

Desktop, tablet-size and mobile Chromium tests cover the dedicated interface, private payloads,
navigation, answer changes, flags, save/reload, same-owner separate-context
resume, submission, results, review/history, authorization and expired-attempt
handling. Unit/integration tests cover selection and lifecycle invariants.
The tablet project uses an iPad-sized Chromium viewport; it is **not native iPad
Safari validation**. The earlier 183-test curriculum checkpoint does not
establish this new feature.

### Executed validation

| Check                                                                 | Current confirmed result                                                                                                                       |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Dedicated full-exam desktop/mobile/tablet-size Chromium browser suite | **12/12 passed**, 53.6 seconds                                                                                                                 |
| Final full unit/integration run                                       | **229/229 passed across 49 files**, 136 seconds                                                                                                |
| Preserved server-backed desktop/mobile browser suite                  | **8/8 unique cases passed**; six initial cases plus two preserved rehearsal cases rerun after restoring the truthful unavailable-state heading |
| Content Studio desktop/mobile browser suite                           | **10/10 passed**, 1.2 minutes                                                                                                                  |
| Production browser-demo desktop/mobile suite                          | **22/22 passed**, 55 seconds                                                                                                                   |
| Total browser cases                                                   | **52 passed** across all four suites                                                                                                           |
| Formatting, diff checks and production dependency audit               | Passed; **0 production dependency vulnerabilities**                                                                                            |
| Server production build (`NEXT_PUBLIC_BROWSER_DEMO=false`)            | Passed without warnings                                                                                                                        |
| Browser-demo production build (`NEXT_PUBLIC_BROWSER_DEMO=true`)       | Passed without warnings                                                                                                                        |
| TypeScript and whole-tree ESLint                                      | Passed                                                                                                                                         |
| Development-fixture guard regression after literal-path hardening     | **10/10 passed**; both production builds rerun successfully                                                                                    |

The dedicated browser run uses clearly labeled synthetic development items,
not approved CHST questions or real learner records. It demonstrates local
application behavior, not live hosted authentication/database validation.

The fixture guard requires the literal value
`LOCAL_DATABASE_PATH=.local/exam-e2e`; it performs no filesystem-path resolution.
Both production modes compile with no provider credentials or fixture provider
enabled. The CI quality workflow includes the dedicated exam suite; local
results do not assert that remote CI or a Vercel deployment is Ready.

Actual application screenshots are saved outside Git:

- Active reader: [desktop](/workspace/artifacts/full-exam-v06/active-exam-desktop.png),
  [mobile](/workspace/artifacts/full-exam-v06/active-exam-mobile.png),
  [tablet-size](/workspace/artifacts/full-exam-v06/active-exam-tablet.png).
- Results: [desktop](/workspace/artifacts/full-exam-v06/exam-results-desktop.png),
  [mobile](/workspace/artifacts/full-exam-v06/exam-results-mobile.png),
  [tablet-size](/workspace/artifacts/full-exam-v06/exam-results-tablet.png).
- Question review: [desktop](/workspace/artifacts/full-exam-v06/exam-review-desktop.png),
  [mobile](/workspace/artifacts/full-exam-v06/exam-review-mobile.png),
  [tablet-size](/workspace/artifacts/full-exam-v06/exam-review-tablet.png).
- History: [desktop](/workspace/artifacts/full-exam-v06/exam-history-desktop.png),
  [mobile](/workspace/artifacts/full-exam-v06/exam-history-mobile.png),
  [tablet-size](/workspace/artifacts/full-exam-v06/exam-history-tablet.png).
- Administration: [desktop](/workspace/artifacts/full-exam-v06/exam-administration-desktop.png),
  [mobile](/workspace/artifacts/full-exam-v06/exam-administration-mobile.png),
  [tablet-size](/workspace/artifacts/full-exam-v06/exam-administration-tablet.png).

The active desktop/mobile reader, desktop results and mobile administration
images were visually reviewed. The administrator view correctly reports zero
eligible production content while synthetic development attempts exercise the
learner engine separately.

## Vercel Preview and connected setup

For the existing no-credentials browser demonstration, retain
**`NEXT_PUBLIC_BROWSER_DEMO=true`** in the **Preview** environment before build.
Use the existing Next.js/root/Node 24 configuration. It shows the full-exam gate,
curriculum and short rehearsal; it cannot launch the synthetic test provider or
claim an approved examination bank.

For a separate connected non-production preview:

1. Configure the existing matching Clerk keys, `DATABASE_URL` and `APP_ORIGIN`
   securely. Set browser-demo mode off. Never paste keys into chat or Git.
2. Run the trusted migration job (`npm run db:migrate`) before code requiring
   migration `0006`; seed the existing canonical curriculum as documented.
3. Complete live-provider validation and use separately authorized editorial
   accounts to source-verify, independently technically approve and publish
   sufficient real questions in each required domain.
4. Inspect `/studio/exams`, then exercise the learner journey with an isolated
   account. Do not bypass the content gate or enable local fixtures on Vercel.

The local production checks build server mode and browser-demo mode separately.
They do not verify a generated Vercel URL or remote Ready status. Open
**Vercel → project → Deployments → Preview for this development branch → Ready →
Visit**. Do not merge into `main` or promote production without owner approval.

## Remaining content and operational work

The next useful milestone is actual human source examination, independent
technical review/correction of the 100 drafts and source-supported lessons,
followed by deliberate reviewed-bank expansion and live-provider validation.
There are no verified videos, operational flashcard retention engine or
validated mastery/pass predictions added here. Current official-document
versions, large-bank load testing, expiry-worker operations and broader
production monitoring/backup/restore remain separate work.
