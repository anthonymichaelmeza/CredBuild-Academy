# CredBuilt Academy — v0.3 architecture proposal

Status: the initial Next.js foundation and demonstration practice slice are implemented. The uploaded material was a development brief, not an HTML prototype; prototype inspection and design reconciliation remain pending. See README.md and validation.md for current behavior and evidence. The broader architecture below is a roadmap, not a claim that every module is implemented.

## Product and first delivery

CredBuilt Academy prepares learners for construction safety credentials. The initial track is CHST; subsequent tracks include ASP, CSP, OHST, CEST, and CredBuilt Field courses. Credential names, exam structures, and blueprints must be configured per track rather than embedded throughout components.

The first functional milestone is a responsive dashboard and a complete ten-question demonstration practice loop: select a track, answer questions, receive explanations, bookmark questions, record confidence, finish, and revisit results. Managed sign-in and PostgreSQL persist account activity. Demonstration results remain separate from approved-bank results. Navigation exposes Dashboard, Learn, Practice, Exam Simulator, My Performance, Flashcards, Reference Library, Study Planner, and Account Settings; later features show honest availability states instead of simulated functionality or invented analytics.

Authenticated practice persistence and a small real content-publication gate are foundation work. A complete simulator, advanced adaptive algorithm, payments, and a full editorial console follow in separate milestones. The commercial SaaS foundation must not suggest those features already exist.

## Prototype inspection gate

When the prototype is supplied:

1. Inventory every screen, navigation state, form, timer, answer flow, bookmark, chart, reference link, and storage mechanism in the supplied HTML and related assets.
2. Record existing behavior and whether it is working, demonstrative, or incomplete. Preserve useful behavior with acceptance checks.
3. Extract the actual design tokens, typography, layout, spacing, icons, responsive breakpoints, and component states. Use charcoal/black, `#FF7900`, and white, with the brand name and tagline `BUILD KNOWLEDGE. EARN CREDENTIALS.`
4. Check keyboard use, focus, contrast, semantic form controls, touch sizing, and responsive behavior. Improve accessibility while retaining the design direction.
5. Produce a migration checklist linking prototype behavior to the first milestone or a later phase. Do not discard useful functionality silently.

The prototype is currently absent, so none of these inspection steps is represented as completed. The latest request explicitly prioritized working software and local alternatives, so a provisional implementation using the supplied brand specifications has proceeded.

## Technical choices

| Concern                | Proposed choice                                                       | Reason                                                                                    |
| ---------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Application            | Next.js App Router and strict TypeScript                              | One deployable application with server rendering and typed server boundaries              |
| UI                     | Tailwind CSS, semantic HTML, accessible components                    | Preserve prototype tokens while creating reusable components                              |
| Database               | PostgreSQL with Drizzle ORM and checked-in SQL migrations             | Explicit relational constraints and reviewable database changes                           |
| Managed authentication | Clerk                                                                 | Managed sign-in, recovery, and session verification; application data stays in PostgreSQL |
| Validation             | Zod at server boundaries                                              | Reject malformed and unauthorized state transitions                                       |
| Tests                  | Vitest and PostgreSQL integration tests; Playwright for core journeys | Verify business rules, database constraints, and browser behavior                         |
| Hosting                | Node-compatible Next.js deployment and managed PostgreSQL             | Avoid a platform dependency in business modules                                           |

The Clerk adapter is implemented but the service is not configured or live-tested. Real account validation requires a Clerk application and database connection. Never request credentials in chat or commit them. Inventory existing environment binding names first, then document missing values in an ignored local environment file template or environment settings. Local demonstration access must not bypass authentication for account or administrative routes.

Use current supported package versions, pin them in the lockfile, and record runtime requirements when scaffolding. Installed versions and reproducible commands are recorded in package.json, package-lock.json, and README.md.

## Module boundaries

```text
src/
  app/                 routes, layouts, server actions, auth boundaries
  components/          shared visual primitives and dashboard shell
  modules/
    identity/          auth adapter, account mapping, authorization
    catalog/           certifications, courses, blueprint revisions
    content/           question versions, source reviews, publication rules
    practice/          selection, answers, confidence, bookmarks, results
    exams/             exam policies, deadlines, flags, submission
    performance/       aggregates derived from eligible session results
    learning/          lessons, enrollments, lesson completion
    reference/         sources and approved learning resources
  db/                  connection, schema, migrations
  demo/                explicitly labeled fixtures, separate content provider
```

Server actions and route handlers call module services; services enforce ownership, publication, and state-transition rules before accessing repositories. Client components receive answer-safe question projections. Correct answers, explanations not yet due, review notes, credentials, and administrative fields must never appear in learner question payloads or React Server Component props.

## Security and persistence

- Verify managed authentication on every protected server operation. Use the verified provider subject to find or create the local account; never trust a client-supplied user ID. User creation is idempotent and does not depend solely on webhook timing.
- Enforce session ownership in each read and mutation. Administrative roles live in protected server-side records; ordinary users cannot select or change roles.
- Store immutable question versions and session snapshots. A later editorial change must not alter an in-progress session or historical score.
- Serialize competing answer/submission writes using a session row lock or equivalent transaction. Use idempotency keys where replay can create duplicate sessions or submissions.
- Separate demonstration content and results from approved material. No approved bank is required to make the demonstration workflow usable.
- Use least-privilege database credentials. The learner application cannot approve content or update immutable approved versions through generic CRUD. Administrative publication runs through its dedicated checked transition.
- Validate and sanitize imported HTML or render structured text safely. Do not render arbitrary editorial HTML directly.
- Exclude tokens and answer keys from logs; minimize personal data. Account deletion, retention, and operational backups need explicit policies before commercial launch.

## Content integrity

The official BCSP CHST examination page is a source-discovery starting point: <https://www.bcsp.org/construction-health-and-safety-technician-chst/>. An attempt to retrieve it from this environment on October 21, 2026 returned an HTTP proxy 403. No current blueprint document or technical source has been reviewed in this task. The latest brief supplies CHST5 domain names and weights, which are now stored as unverified user-provided data. Objectives and official exam rules have not been invented.

Before blueprint-dependent implementation, obtain the official current blueprint, record its URL, title, publication/effective date, retrieval date, hash, and reviewer, and transcribe its domains and objectives with source locators. If unavailable, retain an explicit unverified state and keep approved CHST content unpublished. Never silently substitute a third-party summary or invent domain weights. Technical explanations also need separate source review; blueprint alignment alone does not verify an answer.

Store content origin (`human_authored`, `ai_generated`, or `imported`) separately from review status. AI-generated drafts must complete the same technical and editorial checks as other drafts. Publication requires source-review evidence, objective alignment against an active reviewed blueprint, and an authorized reviewer who is not the author. Changing question text, choices, answer, explanation, or source evidence creates a new version and invalidates previous approval for that version.

Demo questions carry persistent demo labels on selection, answering, and results. They are original illustrative material, never represented as official BCSP questions. Display an independent-preparation disclaimer; do not claim BCSP affiliation or guaranteed passing outcomes.

## Practice and exam behavior

Practice configuration will support 10, 25, 50, 100, and 200 distinct eligible questions. Validate pool size server-side and explain shortages rather than duplicating questions. A session records its selected question versions, selection policy version, and scoring policy. Initial adaptive practice prioritizes missed, low-confidence, and underrepresented objectives using an explainable, versioned policy; no validated prediction of exam readiness is claimed.

The requested 200-question timed simulator is a product requirement, not yet a statement of the current official exam format. Keep count and duration in an exam-policy revision; confirm duration against the current official source before claiming an exam-like format. Use a server-issued start time and deadline. The client countdown is presentational. The server rejects late answer changes and atomically finalizes an expired attempt on the next request; a scheduled worker can finalize inactive expired sessions. Browser-only timers are insufficient. Results exclude unanswered items from correct answers and distinguish raw practice accuracy from any official passing standard.

## Validation and operational readiness

The first milestone must demonstrate both an explicitly labeled demo journey and a real authenticated database-backed journey. A build or open port alone does not prove either. Required checks cover unauthorized access, cross-user access, source/publication gates, immutable versions, answer evaluation, persistence after refresh, and complete browser practice flow. Dashboard empty states must reflect real data.

Database migrations run explicitly with migration credentials, never implicitly on every page request. Provide a non-destructive demo seed that cannot publish content. Document environment variables, install/build/test commands, migration/seed commands, sign-in setup, and startup/readiness checks once those commands exist and have been run. Use this task's existing checkout; do not create a Git worktree unless requested.

## Initial implementation decisions

The current slice uses Drizzle with PGlite for a real local PostgreSQL engine, or node-postgres when DATABASE_URL is configured. The initial relational catalog, question versions, source-review records, publication guards, user identities, sessions, and bookmarks are in the SQL migration. Rich question details and session snapshots are typed JSONB for the initial slice; the full logical schema remains the target for subsequent phases. Managed authentication and database adapters are implemented but require live validation. Demo identity is an explicit browser-only fallback with a random HTTP-only cookie; it never claims cross-device accounts.

The requested initial builder defaults are 25 questions, adaptive mode, all domains, immediate explanations, and missed-priority off. The 12-question demo pool intentionally rejects that size, and the UI directs developers to ten questions across all domains. The initial adaptive score uses recent mistakes, repeated mistakes, confidence, and age since review; response time is stored but not yet used in ranking. Difficulty and topic-level recommendation improvements are future work.

All administration mutations are denied in this milestone. Database publication guards provide a starting invariant; the complete reviewer role model, least-privilege production credentials, objective validation, and source-review UI still need implementation and tests before production publication.
