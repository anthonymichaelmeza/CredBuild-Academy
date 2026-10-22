# Validation record

This file describes executed checks and their limits. The application is an initial foundation plus local demonstration practice, not the complete v0.3 product.

## Executed successfully

- TypeScript checking and ESLint.
- Twenty Vitest tests across four files: practice rules and allocation, dashboard/navigation, API boundaries, and real PGlite PostgreSQL integration.
- SQL migration, demonstration seed, then a repeated seed against the local file-backed database. Twelve drafts remain; none are published.
- Production build with all application routes compiled.
- Production-server smoke check: dashboard rendering, ten-question session creation, server grading, and persisted-answer reload succeeded without browser page errors. The server is left running on port 3000.
- Four Chromium Playwright tests: complete practice/persistence/review/ownership and reference/navigation/overflow, each on desktop and Pixel 7 layouts. The practice test answers all ten questions, checks bookmarks and flags after saving, refreshes, submits, reviews results, and checks access from another browser identity.
- Visual inspection of desktop and mobile dashboard screenshots; no horizontal overflow was observed at 1440px or 390px width.
- The complete reusable installation sequence ran successfully: frozen dependency install, migration checksum verification, non-destructive seed, and production build. Final lint and formatting checks passed.

The environment configuration draft now contains tested `install_script` and `start_skill` instructions. Saving the draft does not publish a snapshot. Review and save those changes in environment settings, then publish the environment to retain this setup for future tasks. Fresh-task restoration has not been independently tested.

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
