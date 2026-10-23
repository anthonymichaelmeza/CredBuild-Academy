# Product roadmap

Current development branch: `development/stable-learning-foundation`. The
v0.6 CHST curriculum milestone preserves the previously tested connected-account
and Content Studio foundation. This sequence is a development plan, not a claim
that later content has been written, reviewed or published. Main/production
require separate product-owner approval.

## Current checkpoint

Implemented: all 78 supplied CHST5 statements and four domain weights, the
21-entry bibliography, 100 original AI drafts, separate source verification and
technical review, objective pathways/practice/analytics, trusted imports and
actual database coverage/report triage. Latest official-version confirmation,
real source reviews and live connected-provider validation remain blocked or
pending. The 100 drafts do not constitute an approved course or a full exam.

## Content phases

| Phase                     | Target                   | Actual state / gate                                                                                                                                         |
| ------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Original drafts       | 100 original questions   | 100 shipped AI drafts, mapped across all 78 statements; **0 source-verified, approved or published**. Technical correctness must be independently examined. |
| 2 — Private beta          | 300 reviewed questions   | Future target. First review/correct the initial 100 and publish source-supported lessons; add original questions only with the same evidence/workflow.      |
| 3 — Commercial curriculum | 1,000 reviewed questions | Future target, subject to coverage, review quality, operations/security and paid-access readiness.                                                          |
| 4 — Mature platform       | 2,000 reviewed questions | Future target, with per-track load testing and deeper coverage driven by complexity/learner evidence.                                                       |

| Domain | Attached blueprint weight | Initial 100 drafts | 1,000-question target | 2,000-question target |
| ------ | ------------------------: | -----------------: | --------------------: | --------------------: |
| 1      |                     36.6% |                 37 |                   366 |                   732 |
| 2      |                     19.9% |                 20 |                   199 |                   398 |
| 3      |                     22.5% |                 22 |                   225 |                   450 |
| 4      |                     21.0% |                 21 |                   210 |                   420 |

Within each domain, depth should follow topic complexity, coverage gaps and
actual learning needs; official statements are not asserted to carry equal exam
weight. At least one draft per statement establishes mapping coverage, not
adequate instructional depth or technical approval.

## Next milestone: human verification and reviewed learning

1. Compare the attached 2022.04.12 blueprint/2021.06.09 bibliography against
   currently published official documents. Workspace HTTPS checks were blocked
   before reaching the target; do not substitute guessed current-version claims.
2. Give distinct authorized operators access to an isolated connected Preview.
   Actually inspect candidate sources, record exact edition/section evidence,
   verify calculations/units and correct ambiguous answers/distractors in the
   initial 100 drafts. Complete independent technical review before publication.
3. Write and review substantive objective-mapped lessons. The 78 public study
   outlines remain orientation, not 78 approved lessons or mastery measurements.
4. Validate the real Clerk/PostgreSQL journey, including recovery, ownership,
   sign-out/sign-in and another device. Status remains **Blocked: Live Provider
   Validation** until that journey passes.
5. Expand deliberately toward 300 reviewed private-beta questions and test with
   users. Observe coverage and reported errors; avoid quantity-driven approval.
6. Verify official exam duration/policy and sufficient distinct approved published
   domain questions before enabling a full 200-question exam. Do not invent a
   passing score or represent a shorter rehearsal as the complete simulation.

## Subsequent platform work

- **CredBuilt Instructor:** reusable instructor/video models, legally usable
  playback, chapters/captions/transcript, checkpoints and persisted learning
  progress. Avatar generation remains inactive without authorized providers,
  likeness/voice rights and technical review.
- **Retention:** private flashcards, learner-created cards and stable,
  time-zone-tested spaced repetition; integrate documented recommendation rules.
- **Scale and operations:** query-level bank selection/pagination, normalized
  session items as needed, 2,000+ record load tests, distributed limits,
  monitoring, retention/deletion, tested backup/restore and broader accessibility
  and security assessment.
- **Commercial and additional tracks:** entitlements, test billing, teams/tenant
  isolation and second-certification curriculum/UX. No live charges or paid
  provider activation without approval.

## Release discipline

Use incremental commits and development previews, never unreviewed main merges,
force pushes or production promotions. Keep environment credentials isolated and
migrate an explicitly selected disposable database before dependent Preview code.
A green build, successful import or positive fictional QA fixture does not verify
technical instruction or complete hosted provider acceptance. Preserve all
existing learner functionality and report executed results in [TESTING.md](TESTING.md).
