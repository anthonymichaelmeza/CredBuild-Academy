# CredBuilt Academy — CHST5 curriculum and content engine

**BUILD KNOWLEDGE. EARN CREDENTIALS.**

A Next.js learning platform under active development. This v0.6 CHST milestone
preserves the connected-account and Content Studio foundation, adds all 78
statements from the supplied CHST5 blueprint, the 21-entry reference bibliography,
100 original AI question drafts, separate source examination and technical review,
objective practice/analytics and database-backed editorial coverage. It is not a
production-ready commercial CHST course. No draft has been source-verified,
technically approved or published by this work.

Development branch: **`development/stable-learning-foundation`**. `main` and the
production demo remain unchanged until the product owner approves a merge or
promotion. A pushed development branch may trigger a Vercel **Preview**.

The current activation milestone makes the complete **200-question demonstration
exam** available in the existing credential-free browser mode. Its 200 distinct
synthetic examples support the standard four-hour setting, saved answers/flags/
position, results, review, missed-question practice and history. The reviewed
production bank remains independent and locked at **0 eligible approved/published
questions**. Administrators gain a dedicated Question Bank with CSV/JSON import
validation and persistent external-ID duplicate protection. See the
[current activation and setup guide](docs/exam-activation.md).

## Browser preview: no credentials required

For a Vercel demonstration, set **`NEXT_PUBLIC_BROWSER_DEMO=true`** in the
**Preview** environment before building. Keep Root Directory `.`, choose Next.js,
retain `npm run build` and the default output directory, and use Node 24. No Clerk
keys, database URL, filesystem database or paid service is required.

Open this branch's deployment from **Vercel → project → Deployments → Preview →
Visit**. The generated URL must come from the dashboard; no new preview URL is
assumed here. See [deployment instructions](DEPLOYMENT.md).

Try **Learn → CHST5 study map → an objective**, **Practice → CHST5 curriculum
drafts → 25 questions**, **Exam Simulator → Start 200-question demonstration
exam**, **Performance**,
**Reference Library**, and **Study Planner → save study preferences**. The
original 12-question demo bank is preserved separately; choose the curriculum
draft bank to explore the new 100 unreviewed examples. Filtering may reduce the
available count; shortages are reported without duplicating questions.

Browser mode saves progress only on the current browser profile and website
origin. It has no real account, cross-device sync or protected scoring. A new
preview URL starts a separate history. Existing practice and lesson storage keys
remain compatible; planner preferences use a separate namespace. Do not enter
sensitive information into a shared browser demonstration.

## Local development

Use Node.js **24.x** and npm 11 or later. Preserve an existing `.env.local`.

```bash
npm ci
cp config/environment.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

Copy the template only if `.env.local` does not already exist. Its local-demo
settings use an HTTP-only demo identity cookie and a single-process PGlite
database in `.local/credbuilt`; this is a development alternative to hosted
services, not a Vercel persistence solution. Stop the application before running
CLI commands against the same local PGlite directory.

For browser-only development, set `NEXT_PUBLIC_BROWSER_DEMO=true` before starting
or building and skip database commands. This public build-time flag requires a
restart/rebuild after changing. Never commit `.env*`, credentials, local databases
or generated artifacts. The safe template is
[config/environment.example](config/environment.example).

## Current boundaries

- Eight representative lessons support topics/subtopics, objectives, a reader,
  sections, checks, completion and related practice. Server mode records progress
  per owner and immutable lesson revision; browser mode keeps its local adapter.
- The CHST5 study map preserves all 78 official statements, numbering and weights
  from the supplied **2022.04.12** blueprint. Objective pages provide unreviewed
  study outlines and related practice/reference connections; they are not 78
  approved lessons. The supplied bibliography is **2021.06.09**. Whether newer
  official documents exist remains unconfirmed; see
  [document provenance](docs/chst-source-provenance.md).
- Practice supports focused 1/3/5-question sets and 10/25/50/100/200 counts,
  domain/objective/topic/difficulty and answered/unanswered/history filters,
  learning/adaptive/timed/exam modes, explanations,
  bookmarks, confidence, flags, resume, results and review. Insufficient pools
  are blocked. New sessions pin exact revisions; legacy records resolve v1.
- Short exam rehearsals include countdowns, autosave and editable choices.
  Server deadlines are checked on requests; browser mode uses the visitor's
  clock. The full browser demonstration is separate from reviewed production
  examinations and does not provide protected scoring.
- **CHST Full-Length Exam Simulation** is accessible from the dashboard and
  `/exam`; `/exam/history` stores owner-scoped full attempts. Connected full
  attempts pin 200 distinct revisions and use a fixed 240-minute CredBuilt
  standard setting, with canonical domain allocation 73/40/45/42. Browser mode
  now completes a full synthetic demonstration using its local adapter; it has
  no server or cross-device exam record. `/studio/exams` reports actual
  approval/publication shortfalls separately from demonstration availability.
  No official pass threshold is claimed.
- Analytics derive accuracy, repeated misses, history and recommendations from
  saved activity. Client analytics receive metadata, not the server question
  bank or active-exam correctness.
- Goals and weekly planner suggestions use selected days, available minutes,
  learning preferences, priority domains, completion and recorded weak areas.
  Self-reported checklist items are distinguished from lesson completion.
- Clerk sign-in/sign-up/account integration requires configuration. Live
  registration/recovery/verification and hosted PostgreSQL/cross-device behavior
  still need provider validation; local tests do not establish them. Status:
  **Blocked: Live Provider Validation**. See the exact
  [provider acceptance checklist](docs/connected-provider-validation.md).
- Settings can download activity as JSON. Server exports use a limited safe
  activity projection; import/restore and account deletion are not implemented.
- Content Studio at `/studio` supports question/lesson drafts, structured editors,
  separate source verification and exact-revision technical reviews,
  changes/rejections, publication/retirement, JSON import
  preview and append-only audit. Administrator-only `/studio/questions` adds
  CSV/JSON previews, row-level validation and persistent external-ID deduplication. Trusted database roles control every action;
  the public `/admin` inspector remains read-only. Studio requires a connected
  authorized account and is unavailable in the browser-only Vercel demo.
- Protected curriculum coverage reads actual database records, with domain/
  objective/status/search filters, paginated editorial drill-downs and content
  concern triage. It does not fabricate import counts or reference freshness.
- Published instructional lessons and practice questions have a separate
  server-only delivery path. Unpublished drafts never enter learner selection.
  New attempts pin revisions; retirement preserves historical grading. No
  instructional material is published by the seed or this development work.

The original 12 questions/eight lessons and the new 100 original AI drafts remain
**unreviewed**. The new batch is distributed 37/20/22/21 across the four domains
and maps to all 78 statements. Browser fixtures expose drafts as demonstrations;
connected production starts accept only approved published content. Database
ingestion of the 100 drafts is an explicit trusted operation, not automatic
seeding. See [content-engine setup](docs/chst-content-engine.md).

There are zero source-verified, technically approved or published questions
supplied by this milestone. Exact attached blueprint transcription is distinct
from human source verification or confirmation of the latest version. No
official exam questions, passing thresholds, BCSP affiliation or passing
prediction is claimed. The standard examination setting is four hours.

Paid AI, billing, teams, video instruction and full flashcards/retention are not
operational. Entitlement-based paid-bank access is not implemented. Unavailable
features are labeled. Brand work keeps
the CredBuilt direction; the original prototype and official geometric logo have
not been supplied. See the feature matrix for the dark-interface validation state.

## Checks and documentation

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run test:e2e:studio
npm run test:e2e:exam
```

Browser production tests require a browser-mode build first; modes are checked
separately. The final activation run passed **260 automated tests and 60 unique
browser cases**, both production builds, TypeScript and ESLint. See
[TESTING.md](TESTING.md) for exact commands, executed evidence and provider
exclusions.

- [Audit](docs/implementation-audit.md)
- [Architecture](ARCHITECTURE.md) and [database schema](DATABASE_SCHEMA.md)
- [Feature status](FEATURE_STATUS.md) and [roadmap](PRODUCT_ROADMAP.md)
- [Content policy](CONTENT_REVIEW_POLICY.md)
- [Content Studio operations](docs/editorial-workflow.md)
- [CHST content-engine setup](docs/chst-content-engine.md) and
  [current curriculum release report](docs/chst-curriculum-release.md)
- [Current exam activation, launch steps, diagnosis and content gates](docs/exam-activation.md)
- [Historical full-length exam engine checkpoint](docs/full-length-exam.md)
- [Earlier v0.6A/B checkpoint](docs/v06-release-report.md)
- [Deployment, migration and rollback](DEPLOYMENT.md)
- [Testing](TESTING.md) and [security assumptions](SECURITY.md)

Earlier documents under `docs/` retain historical v0.3/v0.4 plans and validation;
they do not override the current feature matrix. CredBuilt Academy is independent
and is not affiliated with or endorsed by BCSP.
