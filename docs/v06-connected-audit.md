# v0.6A connected-account audit

Audit starting point: v0.5 commit `d77bf74`, branch
`development/v0.6-connected-learning`, 2026-10-22. This records code-level
findings and bounded local validation; it does not establish hosted provider
success. AGENTS.md and the installed Next.js authentication/server-component
guidance were reviewed.

## Existing boundaries retained

- Clerk's server `auth()` result supplies the managed subject. API callers do
  not select an owner, and a managed authentication failure does not invoke a
  browser-local persistence fallback.
- Practice reads/mutations scope by session ID and owner; bookmarks, lesson
  revisions/progress, and study profiles scope by owner. Optimistic revisions
  reject conflicting writes. Existing APIs enforce these checks independently
  of page visibility.
- Browser demo is an explicit build-time mode, with server progress and database
  initialization denied. Connected lesson/planner state uses in-memory client
  state and server requests, not the browser demonstration storage namespaces.
- Private API responses use `private, no-store` and vary on identity headers.
  Analytics and export use explicit minimal projections; active-exam correctness
  and question keys are omitted. Public demonstration fixtures remain
  inspectable and are unsuitable for a protected commercial bank.
- The managed migration path verifies checksums and refuses pending schema
  changes at application startup. Explicit migrations use one transaction and
  an advisory lock. Existing immutable content and question revision pins are
  preserved.
- Local cookie identities and file-backed PGlite are prohibited on Vercel.
  Hosted mode requires its separately configured database/authentication.

## Findings and v0.6A work

| Finding at audit start                                                                      | Implication                                                                                       | Implementation / validation                                                                                             |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Planner retained a loaded profile after a 401 save and did not refresh after 409            | Expired authentication left stale private goals visible; stale revision was hard to recover       | Planner now clears connected state on 401, reloads the current server revision after 409, and shows the operation error |
| Planner only fetched on mount; pending responses could outlive the account-scoped component | Returning from another device/tab could show stale goals; old requests needed cancellation        | Focus reload, request cancellation, request-generation checks, response validation and unmount cleanup added            |
| Learning hook lacked complete stale-response/account-change guards                          | In-flight old responses could repopulate account-scoped client memory without a new verified read | Root implementation owns shared account boundary and learning-hook hardening; final release tests must cover it         |
| Practice seed initialization retained a rejected promise                                    | A transient database/seed failure could disable practice until process restart                    | Root implementation owns retry-safe initialization                                                                      |
| `pg.Pool` had no explicit connection timeout or idle-error handler                          | Outages could consume capacity or emit an unhandled idle-pool error                               | Root implementation owns bounded pool configuration and safe operational error handling                                 |
| Hosted TLS, provider redirects and real cross-device recovery were not exercised            | Local integration tests cannot prove the live account journey                                     | **Blocked: Live Provider Validation**                                                                                   |

The planner change is limited to `src/components/study-planner.tsx`, with five
new tests in `tests/planner-connected.test.tsx`. They cover session-expiry
clearing without localStorage access, conflict reload, focus refresh with an
out-of-order response, failed-read clearing/recovery, and cancellation on
account-scoped unmount. All five passed in the focused Vitest run. The root
release run records integrated checks and browser counts in TESTING.md.

## Hosted validation gate

Use a dedicated disposable Preview database and a development Clerk application;
enter credentials only in approved environment bindings. Configure both Clerk
keys, the provider's verified PostgreSQL TLS/pooling settings, exact preview
origin/redirects, and browser-demo off. Run explicit migrations before the app.

With two real configured accounts and a second browser/device, verify
registration, verification/recovery, sign-out/sign-in, lesson/check completion,
practice/exam history, goals, bookmarks and learner isolation. Exercise expired
sessions, provider/database outages, reconnects and concurrent stale writes.
The current audit does not claim those steps passed and does not create paid
resources, change production settings or expose credentials.
