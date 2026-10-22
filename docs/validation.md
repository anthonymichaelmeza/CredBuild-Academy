# Validation record

This file describes executed checks and their limits. The application is an initial foundation plus local demonstration practice, not the complete v0.3 product.

## v0.4 review-candidate validation

The original checks below are retained as earlier evidence. Current v0.4 development adds 15 tests for a total of **44 passing Vitest tests**, with no original test removed or disabled. The original **four server-backed browser tests** pass; the expanded **ten browser-demo browser tests** exercise both desktop and Pixel 7 layouts. Production builds work with the browser flag on and off. See [v0.4 review notes](v04-review.md) for exact implemented features and limits.

Browser checks initially found an exact-label locator that included option text. The selector now uses the actual accessible combobox role/name; the repeated-miss analytics workflow and locked publication gate pass. No assertions were removed to accommodate that selector correction.

The demo remains client-local, with no real accounts, independently verified content, or protected exams. Timed rehearsal and browser-local lesson progress are now implemented; the earlier statements about unimplemented timing/lessons describe v0.3 only. Public content administration is still denied; the new inspector does not publish.

## Earlier foundation checks executed successfully

- TypeScript checking and ESLint.
- Twenty-nine Vitest tests across six files: practice rules and allocation, dashboard/navigation, API boundaries, real PGlite PostgreSQL integration, browser-only persistence, and explicit browser-mode guards.
- SQL migration, demonstration seed, then a repeated seed against the local file-backed database. Twelve drafts remain; none are published.
- Production build with all application routes compiled.
- Production-server smoke check: dashboard rendering, ten-question session creation, server grading, and persisted-answer reload succeeded without browser page errors. The server is left running on port 3000.
- Four Chromium Playwright tests: complete practice/persistence/review/ownership and reference/navigation/overflow, each on desktop and Pixel 7 layouts. The practice test answers all ten questions, checks bookmarks and flags after saving, refreshes, submits, reviews results, and checks access from another browser identity.
- Four additional production-server browser-demo tests passed on desktop and Pixel 7 layouts, with no Clerk/database credentials, local database fallback disabled, and a deliberately unusable local database directory. These exercise all navigation routes, a full ten-question loop, bookmarks/flags/confidence persistence, refresh, results/missed review/history, separate browser storage, reset, blocked storage handling, no progress API requests, no demo identity cookie, and denied server/admin mutations.
- Production builds passed with browser mode both disabled and enabled. Browser-mode tests verify that the database adapter refuses initialization and Clerk/cookie authentication is bypassed even if other credentials happen to exist. Node.js 24.x is now declared in package.json.
- Visual inspection of desktop and mobile dashboard screenshots; no horizontal overflow was observed at 1440px or 390px width.
- The complete reusable installation sequence ran successfully: frozen dependency install, migration checksum verification, non-destructive seed, and production build. Final lint and formatting checks passed.

The previously saved environment configuration draft contains local server-backed setup/startup instructions. For the separate Vercel browser preview, follow [vercel-demo.md](vercel-demo.md): the only required setting is `NEXT_PUBLIC_BROWSER_DEMO=true` before building. No migrations, secrets, or backend services are needed for that explicit mode. Saving a cloud environment draft does not publish a website. Fresh-task restoration and an actual Vercel deployment have not been independently tested.

Browser testing initially exposed an ambiguous selector, an input usable before hydration, and a same-origin comparison using Next.js's internal hostname. The selectors were scoped, the search input is disabled until hydrated, development loopback access is explicitly configured, and mutations validate the incoming host or canonical configured origin. The full browser workflows then passed.

## Not established

- Live Clerk sign-in, sign-out, recovery, account deletion, or cross-device identity. Credentials are absent. Local demo isolation is tested; it is not managed authentication validation.
- Managed PostgreSQL connectivity, TLS, pooling, multi-instance operation, deployment credentials, or backup restoration. PGlite exercises PostgreSQL locally only.
- Official current blueprint, source review, question accuracy, exam duration, or passing standard. The official BCSP fetch returned a proxy 403.
- Prototype fidelity: only the development brief was attached, not HTML or original assets.
- Simulator timing, expiry, auto-submission, or navigation: the simulator is not implemented. Practice question navigation is tested.
- Full editorial roles, source-review interface, and production publishing permissions. There is no publishing UI and the public administrative mutation endpoint always denies access. Database guards reject demo, self-reviewed, and source-unverified publication, but this is not the complete editorial security model.
- Flashcards, planner, lessons, advanced analytics, payments, production deployment, or full accessibility/security certification.

An optional npm dependency-advisory request did not complete and was stopped; no clean vulnerability-audit result is claimed. Package installation retained standard integrity and TLS verification.
