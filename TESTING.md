# Testing

Use Node.js 24, the lockfile and `npm ci`. Test databases are isolated in-memory
PGlite or ignored `.local/e2e`, not a configured managed database. Do not run
destructive tests against a learner's database. Test reports/traces are ignored.

## Routine checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm audit --omit=dev --audit-level=high
```

`tests/*.test.ts(x)` cover grading/selection/shortage, disclosure/empty states,
safe payloads, API authorization, database persistence/publication constraints,
browser storage, lesson completion and content policy. This milestone adds
question-revision integrity, metadata-only analytics payloads, streamed body
limits, process throttling, additive migration upgrades, server lesson progress,
forgery/stale-write rejection, profile persistence, planner rules/storage and private activity exports.

## Server-backed browser checks

Stop an existing server on port 3000, then run:

```bash
npm run test:e2e
```

Playwright starts a development server with browser mode off and explicit local
demo/PGlite enabled. Desktop and Pixel 7 projects exercise complete practice,
refresh/resume, results, other-browser isolation, references/navigation, server
lesson progress and the planner. This tests application behavior using local
identities, not live managed authentication.

## Production browser-demo checks

Stop the prior Next server before building the same checkout. Build-time mode
must match the test configuration:

```bash
NEXT_PUBLIC_BROWSER_DEMO=true ALLOW_LOCAL_DEMO=false DATABASE_URL= CLERK_SECRET_KEY= NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= LOCAL_DATABASE_PATH=/proc/credbuilt-no-writes npm run build
npm run test:e2e:browser
```

This suite starts the production server on port 3100, with no provider keys or
database fallback and an unusable local database path. Desktop/mobile checks
exercise practice, lessons, rehearsal expiry/autosave/withheld feedback,
analytics, review denial, planner, local persistence/isolation and blocked
storage. No server progress API should be needed in browser-demo flows.

For an additional server-mode production build without services:

```bash
NEXT_PUBLIC_BROWSER_DEMO=false ALLOW_LOCAL_DEMO=false DATABASE_URL= CLERK_SECRET_KEY= NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= npm run build
```

This verifies compilation and honest unauthenticated states, not database
connectivity. Do not run server/client mode builds simultaneously in one
checkout because they share `.next`.

Playwright defaults to `/usr/bin/chromium` in this cloud workspace. Elsewhere,
run `npx playwright install --with-deps chromium` and set `CHROMIUM_PATH` to the
installed executable. CI derives that path from Playwright. Traces/screenshots
are retained on failures; browser screenshots used for review must come from
the actual application, not generated mockups.

## Executed evidence

Audit baseline on 2026-10-22: **44/44 original tests passed** across nine files;
`npm audit --omit=dev` reported zero production dependency advisories. Earlier
v0.4 browser evidence is in `docs/v04-review.md` and `docs/validation.md`.

Historical v0.5 milestone evidence on 2026-10-22:

- **86/86 unit/integration tests passed across 20 files.**
- **8/8 server-backed desktop/mobile browser cases passed.** The two lesson cases were also rerun after adding authenticated export and anonymous-denial assertions; both passed.
- **14/14 production browser-demo desktop/mobile cases passed** with provider credentials absent, local database fallback disabled, and an unusable filesystem path.
- TypeScript, ESLint, Prettier, and `git diff --check` passed.
- Browser-mode production build passed. A clean clone of the application source at `5757dc6` completed `npm ci`, a server-mode production build without service credentials, and the migration CLI with an in-memory local database and no `.env.local` file.
- Eight actual application screenshots were captured with `scripts/capture-preview.mjs` in `/workspace/artifacts/credbuilt-v05`. The capture used real interface actions, three completed practice sessions, and saved goals. No statistics or progress were injected. No page errors or horizontal overflow were observed. Desktop Academy, planner, practice feedback, exam rehearsal and mobile onboarding screenshots were visually inspected.

The planner regression test confirms that completing an assigned lesson preserves its original calendar slot and displays actual completion. Refreshing the next seven days explicitly regenerates suggestions; it does not silently reassign completed work. The initial asynchronous checkbox test failure was resolved by awaiting server-confirmed state and adding a visible saving indicator.

To reproduce screenshots, start a browser-demo production build on a disposable origin and run:

```bash
CAPTURE_ORIGIN=http://127.0.0.1:3200 node scripts/capture-preview.mjs /tmp/credbuilt-preview
```

This creates disposable activity in a fresh browser context; it must not be used to imply actual customer activity. Live providers and cloud deployment status remain outside the evidence above.

## Explicit exclusions and manual gates

- Live Clerk registration, email verification/recovery, sign-out/sign-in and
  session expiry need provider credentials and real-browser validation.
- Hosted PostgreSQL TLS/pooling, deployed migrations, cross-device persistence,
  backup/restore and production operations have not been live-tested.
- The Vercel preview/dashboard could not be independently reached through this
  workspace's proxy. A tunnel 403 is not an application response or deployment
  diagnosis. Confirm actual Ready status/commit/environment in Vercel.
- There is no approved 200-question exam, reviewed technical content, payment
  provider, paid AI or organizational tenant service to validate. Editorial
  workflow tests use isolated fictional fixtures; they do not verify actual
  technical sources or constitute production editorial operations.
- Browser clocks/scores are intentionally inspectable. Response time is
  browser-reported, and current analytics do not establish exam readiness.

## Release 0.6A checkpoint

Independently reran the v0.5 baseline: 86 unit/integration tests and eight server-backed desktop/mobile browser cases passed before implementation. After connected-account reliability changes, 98 tests across 25 files and all eight server-backed browser cases passed. TypeScript, ESLint (after the ref cleanup), diff checks and a server-mode production build passed. New tests cover account switching/loading concealment, superseded requests, planner401/409 recovery, managed-subject ownership with isolated PGlite, initialization retry and PostgreSQL options. Live provider validation remains blocked; no claim of real Clerk registration or hosted cross-device testing is made.

## Release 0.6B verification

The Content Studio suite is separate from the original learner suites:

```bash
npm run test:e2e:studio
```

It uses the explicit non-production local Studio opt-in and an isolated ignored
`.local/studio-e2e` database. A guarded fixture script resets only that exact
test directory while the application is stopped, creates test roles and leaves
the supplied demonstration curriculum unapproved. Never aim this configuration
at a learner/customer database or enable the test opt-in on Vercel. Test
identities/fixture reviews do not prove managed-provider behavior or source
verification.

Completed local v0.6A/B verification:

- **135/135 unit/integration tests passed across 32 files.** Coverage includes
  trusted roles, ownership, self-approval rejection, missing-source/canonical
  blueprint blockers, stale revisions, immutable audit/history,
  publication/retirement, JSON import and safe published learner DTOs.
- **6/6 Content Studio desktop/Pixel 7 browser cases passed.** These exercise
  the operational author/reviewer interface and authorization/import boundaries
  using explicitly isolated local QA identities.
- **8/8 original server-backed desktop/mobile browser cases passed.**
- Server-mode production build without provider credentials passed.
- Browser-mode production build with `NEXT_PUBLIC_BROWSER_DEMO=true` passed.
- TypeScript, ESLint and formatting checks passed. The production dependency
  audit reported zero vulnerabilities.
- **14/14 original production browser-demo desktop/mobile cases passed** with
  provider credentials absent, local database fallback disabled and an unusable
  filesystem database path. Together the three suites passed **28 browser cases**.

Actual application screenshots were captured at
`/workspace/artifacts/v06/studio-author-desktop.png` and
`/workspace/artifacts/v06/studio-reviewer-mobile.png`. They use isolated QA
identities and draft/review activity, not approved instructional content or
customer records. Screenshots are generated artifacts outside Git.

These checks establish local application behavior, not live Clerk registration,
hosted PostgreSQL connectivity or cross-device recovery. Those remain
**Blocked: Live Provider Validation**. See the
[release report](docs/v06-release-report.md) for the checkpoint scope and limits.
