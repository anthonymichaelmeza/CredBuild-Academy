# Product roadmap

This sequence is not a completion claim. Every release must preserve working
flows, pass its checks, document limitations and remain on a preview branch
until production approval. See [FEATURE_STATUS.md](FEATURE_STATUS.md).

| Release                       | Scope                                                                         | Current gate                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| A — Stable foundation         | Audit, build/config, auth routes, navigation, API safeguards, CI/deployment   | Current milestone; provider validation still required                          |
| B — Learning core             | Curriculum DB, account progress, checks, question pins, practice persistence  | This milestone's core; editorial CMS/protected commercial content unfinished   |
| C — Exam and analytics        | Authoritative timed attempts, results/history, safe analytics                 | Short rehearsals exist; full 200 needs reviewed blueprint/timing/content       |
| D — Personalized learning     | Adaptation, flashcards, spaced repetition, planner, experimental readiness    | Basic goals/weekly planner slice now; other systems remain later work          |
| E — Advanced learning         | Grounded AI, licensed hazard exercise, branching scenarios, audio, references | Provider approval/credentials, rights and technical review required            |
| F — Commercial infrastructure | CMS, entitlements, test billing, teams, privacy/operations, launch            | No live charges or commercial launch; full security/provider validation needed |

## Next tasks

1. Review the preview and validate a dedicated Clerk/PostgreSQL development
   account journey: registration, verification/recovery, sign-out/sign-in,
   cross-device resume, ownership isolation and provider failures.
2. Obtain and actually review the current official CHST blueprint. Record source
   document/version, retrieval date, objective locators and reviewer. Supplied
   CHST5 headings/weights remain provisional until then.
3. Build authenticated editorial roles/editor, reconcile SQL/policy workflow
   states and test import/source review/independent approval/publication/
   retirement/audit end to end.
4. Implement protected approved-bank selection/pagination and normalized session
   records where needed. Keep demo content separate and history immutable.
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
