# Phased implementation and acceptance plan

The complete v0.3 scope is a roadmap, not a single implementation milestone. Each phase requires working behavior and evidence before the next expands the product. Current state: Next.js foundation, local PostgreSQL migration/seed, managed-service adapters, and an initial demonstration practice loop are implemented. Original HTML/assets, live provider validation, and reviewed instructional content are still absent.

## Phase 0 — inspect and establish sources

Inputs: the CredBuilt CHST HTML prototype, its required assets, and access to the current official BCSP CHST blueprint.

- Inspect the prototype before scaffolding. Create a behavior inventory and visual migration checklist; preserve useful functionality.
- Confirm the brand tokens and responsive states from the prototype.
- Acquire and review the official blueprint and record version, source metadata, and objectives. A proxy 403 currently prevents fetching the BCSP CHST page from this environment; no blueprint details are considered verified.
- Confirm the architecture and translate the logical schema into the first small migration.

Prototype inspection gates claims of prototype preservation; provisional UI implementation proceeded under the latest request to build working software from the supplied brand requirements. Blueprint access gates verified blueprint alignment and publication of instructional CHST content; it does not prevent an explicitly labeled demonstration foundation.

## Phase 1 — first functional milestone

Deliver a maintained Next.js/TypeScript/Tailwind application, rather than a second standalone HTML prototype.

1. Scaffold the app, establish lint/type/build/test commands, and pin dependencies. Add example environment variable names without values, setup documentation, and migrations.
2. Migrate the prototype's useful dashboard and practice behavior into a responsive shell. Add Learn, Practice, Exam Simulator, Performance, and Reference Library navigation with accurate availability/empty states. Keep the brand name, tagline, orange accent, and typography direction.
3. Integrate managed authentication and a server-verified local user mapping. Add PostgreSQL tables for accounts, catalog, question versions/choices/keys, review evidence, publication pointers, sessions, answers, and bookmarks. Only implement the catalog/content subset needed by this slice.
4. Add clearly labeled original demo fixtures through a separate content provider. No question is labeled verified or inserted into the published instructional bank. With no approved questions, display an honest empty bank state.
5. Implement one ten-question practice journey with server grading, immediate explanations, confidence, bookmarks, completion, persisted history, and missed-question review. Preserve prototype features that fit this slice; explicitly inventory any deferred functionality.
6. Enforce publication rules and version immutability through a narrow internal administrative operation plus database permissions/constraints. A full editorial UI is deferred, but unsafe publication must already be impossible through the supported application path.

Acceptance:

- The dashboard works on mobile and desktop, supports keyboard navigation, and has visible focus and readable contrast.
- A demo visitor can complete a labeled practice loop. A signed-in learner can complete and revisit a database-backed demo session after refresh/sign-out/sign-in. Guest demo progress need not persist to an account and must not silently migrate without consent.
- Correctness and explanations arrive only through the intended server grading step. Session scores use first answers and show unanswered items honestly.
- Bookmarks, confidence, history, and missed review reflect real stored activity. No fabricated dashboard statistics appear.
- Protected routes reject anonymous requests; cross-user reads and mutations fail; role escalation and unreviewed publication fail.
- Type checking, linting, unit tests, PostgreSQL integration tests, production build, and the complete browser practice journey pass. Record executed test counts and any skipped provider-dependent checks.
- The development server serves the dashboard and practice journey. Document install, migration, seed, start, build, and test commands that were actually executed.

External prerequisites for validating real accounts and persistence: a usable managed authentication application and PostgreSQL database. Check existing environment bindings before declaring either missing. Browser-demo success alone does not establish authenticated persistence.

## Phase 2 — reviewed bank and practice configuration

- Build a reviewer queue, question/source editor, review evidence capture, reviewer separation, publication/withdrawal, and append-only audit history.
- Add reviewed blueprint domains/objectives and approved instructional material after actual source review. Keep AI drafts and demonstration content visibly separate.
- Support 10, 25, 50, 100, and 200 questions with objective/topic/difficulty filters. Reject insufficient pools without duplicate padding.
- Add explainable adaptive selection favoring missed questions, low confidence, and weak objective coverage; save the selection policy version.
- Exercise every publication rejection case, source/version changes, selection shortage, bookmark resolution, and per-domain accuracy against real persisted sessions.

## Phase 3 — timed exam simulator

- Configure the requested 200-question CHST practice exam with source-reviewed duration and an eligible published question pool. Do not invent an official duration or passing score.
- Add question navigation, answered/unanswered indicators, flags, resume behavior, a server-backed countdown, final confirmation, automatic expiry, and detailed results.
- Make submission idempotent and atomic. Use server-enforced deadlines, request-time expiry finalization, and a scheduled worker for inactive expired attempts.
- Test refresh, reconnect, client clock manipulation, late answers, concurrent tabs, duplicated submissions, and inactive expiry. Verify no keys or explanations leak before finalization.

## Phase 4 — learning, analytics, and additional tracks

- Publish reviewed lessons and reference resources; persist lesson progress.
- Add domain/topic/objective performance trends, confidence calibration, and session comparison with sample sizes and honest empty states. Exclude demo data from instructional analytics by default.
- Configure additional certifications and Field courses through catalog/blueprint/course data. Avoid CHST-specific assumptions in shared UI and services.
- Test at least one second track to demonstrate data and selection isolation.

## Phase 5 — commercial launch preparation

Add billing and entitlements, operational monitoring, rate limits, abuse controls, backups and restore verification, account deletion/retention policy, accessibility review, security review, and a content-maintenance process. These are commercial launch requirements, not implied first-milestone deliverables. Do not advertise exam pass guarantees or BCSP endorsement.

## Current handoff

The Next.js application runs locally and the initial demonstration practice slice has automated validation. Read README.md and validation.md for exact commands, tests, and limits. Managed account and cross-device persistence are not yet validated, and no content is approved. The original prototype and assets are still needed for inspection and design reconciliation. The current official blueprint and technical sources require actual review before instructional publication. Continue with managed-service validation and the content-review foundation before expanding the exam workflow.
