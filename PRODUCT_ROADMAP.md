# Product roadmap

This sequence is not a completion claim. Every release must preserve working
flows, pass its checks, document limitations and remain on a preview branch
until production approval. See [FEATURE_STATUS.md](FEATURE_STATUS.md).

| Release                       | Scope                                                                         | Current gate                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| A — Stable foundation         | Audit, build/config, auth routes, navigation, API safeguards, CI/deployment   | Foundation exists; provider validation still required                            |
| B — Learning core             | Curriculum DB, account progress, checks, question pins, practice persistence  | Foundation exists; operational/provider validation and reviewed content needed   |
| C — Exam and analytics        | Authoritative timed attempts, results/history, safe analytics                 | Short rehearsals exist; full 200 needs reviewed blueprint/timing/content         |
| D — Personalized learning     | Adaptation, flashcards, spaced repetition, planner, experimental readiness    | Basic goals/weekly planner slice now; other systems remain later work            |
| E — Advanced learning         | Grounded AI, licensed hazard exercise, branching scenarios, audio, references | Provider approval/credentials, rights and technical review required              |
| F — Commercial infrastructure | CMS, entitlements, test billing, teams, privacy/operations, launch            | Content Studio now implemented in 0.6B; entitlements/charges/teams/launch remain |

## Current v0.6 release sequence

| Release                           | Implemented scope / next dependency                                                                                                                                                                                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0.6A — Connected accounts**     | Account-switch/stale-request recovery, PostgreSQL TLS/timeouts and substitute isolation tests implemented. **Blocked: Live Provider Validation** until the dedicated Clerk/PostgreSQL journey passes.                                                                      |
| **0.6B — Content Studio**         | Trusted roles, structured question/lesson editors, exact-revision review, transactional publishing/retirement/import/audit and published learner delivery implemented. Final regression evidence is recorded in TESTING.md; no actual source-verified content is supplied. |
| **0.6C — CredBuilt Instructor**   | Next sequential implementation: reusable instructor/video entities, legally usable demonstration playback, chapters/captions/transcript, checkpoints and owner-scoped progress. Avatar-generation adapters stay inactive without authorized providers/likenesses.          |
| **0.6D — Retention and pathways** | Functional private flashcards, stable/time-zone-tested spaced repetition, notes and integrated learning recommendations/analytics. Not yet implemented.                                                                                                                    |
| **0.6E — Readiness**              | Full regression, migration/security review, current exam-policy audit, truthful feature report and isolated preview review. No automatic production promotion.                                                                                                             |

The next coding task after the tested 0.6B checkpoint is 0.6C. Missing live
credentials do not prevent implementing later releases, but the managed-account
acceptance gate remains blocked until real provider testing occurs. Completion
of this checkpoint does not mean all v0.6 target acceptance criteria are met.

## Operational and content dependencies

1. Review the preview and validate a dedicated Clerk/PostgreSQL development
   account journey: registration, verification/recovery, sign-out/sign-in,
   cross-device resume, ownership isolation and provider failures.
2. Obtain and actually review the current official CHST blueprint. Record source
   document/version, retrieval date, objective locators and reviewer. Supplied
   CHST5 headings/weights remain provisional until then.
3. Validate the new editorial workflow with real authorized operators and actual
   reviewed material. Keep the original 12 questions/eight lessons unapproved
   until their sources have actually been examined.
4. Add protected-bank pagination and normalized session records where scale
   requires them. Preserve the separate published path and immutable history;
   implement entitlements before representing content as paid-access protected.
5. Add reviewed instructional lessons and enough distinct approved domain
   questions before enabling full exams. Test concurrency and inactive expiry.
6. Deliver flashcards and persisted spaced-repetition reviews, expand explainable
   adaptation, and document any experimental readiness model without pass claims.
7. Complete distributed abuse limits, monitoring, backup/restore, deletion/export
   and accessibility review. Add billing only in test mode after pricing/provider
   approval; validate entitlements/webhooks before live charging.

## Release discipline

- Use logical commits and pull requests/compare views. No force pushes,
  unrelated overwrites, automatic main merges or production promotions.
- Separate development/preview/production credentials. Test migrations on a
  disposable preview database before authorized rollout; verify backups.
- A page, adapter, policy unit test or successful build does not establish a
  complete workflow. Record executed checks and provider-dependent exclusions.
- Finish a safe milestone, commit it and record the next dependencies when a
  development task ends. Do not claim the whole commercial platform is complete.
