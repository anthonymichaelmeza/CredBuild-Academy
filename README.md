# CredBuilt Academy — connected learning development

**BUILD KNOWLEDGE. EARN CREDENTIALS.**

A Next.js learning platform under active development. The v0.6A/B work preserves
the v0.5 academy, practice engine, exam rehearsals, analytics and study planner.
It strengthens connected-account boundaries and adds a protected Content Studio
with revision-specific review, publication and learner delivery. It is not a
production-ready commercial CHST course. Instructor/video and flashcard releases
are subsequent work, not delivered features of this checkpoint.

Development branch: **`development/v0.6-connected-learning`**. `main` and the
production demo remain unchanged until the product owner approves a merge or
promotion. A pushed development branch may trigger a Vercel **Preview**.

## Browser preview: no credentials required

For a Vercel demonstration, set **`NEXT_PUBLIC_BROWSER_DEMO=true`** in the
**Preview** environment before building. Keep Root Directory `.`, choose Next.js,
retain `npm run build` and the default output directory, and use Node 24. No Clerk
keys, database URL, filesystem database or paid service is required.

Open this branch's deployment from **Vercel → project → Deployments → Preview →
Visit**. The generated URL must come from the dashboard; no new preview URL is
assumed here. See [deployment instructions](DEPLOYMENT.md).

Try **Learn → a lesson → knowledge checks**, **Practice → 10 questions → all
domains**, **Exam Simulator → short rehearsal**, **Performance**, and **Study
Planner → save study preferences**. The default 25-question request correctly
reports a shortage: the demonstration bank contains only 12 distinct drafts.

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
- Practice supports focused 1/3/5-question sets and 10/25/50/100/200 counts,
  domain/topic filters, learning/adaptive/timed/exam modes, explanations,
  bookmarks, confidence, flags, resume, results and review. Insufficient pools
  are blocked. New sessions pin exact revisions; legacy records resolve v1.
- Short exam rehearsals include countdowns, autosave and editable choices.
  Server deadlines are checked on requests; browser mode uses the visitor's
  clock. The full 200-question CHST exam remains unavailable.
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
  exact-revision reviews, changes/rejections, publication/retirement, JSON import
  preview and append-only audit. Trusted database roles control every action;
  the public `/admin` inspector remains read-only. Studio requires a connected
  authorized account and is unavailable in the browser-only Vercel demo.
- Published instructional lessons and practice questions have a separate
  server-only delivery path. Unpublished drafts never enter learner selection.
  New attempts pin revisions; retirement preserves historical grading. No
  instructional material is published by the seed or this development work.

All 12 questions and eight lessons are **unreviewed demonstrations**, with zero
approved commercial questions or verified technical sources. CHST5 data remains
user-supplied and provisional. No official questions, passing thresholds,
verified official duration, BCSP affiliation or passing prediction is claimed.

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
```

Browser production tests require a browser-mode build first; modes are checked
separately. See [TESTING.md](TESTING.md) for exact commands, executed evidence and
provider exclusions.

- [Audit](docs/implementation-audit.md)
- [Architecture](ARCHITECTURE.md) and [database schema](DATABASE_SCHEMA.md)
- [Feature status](FEATURE_STATUS.md) and [roadmap](PRODUCT_ROADMAP.md)
- [Content policy](CONTENT_REVIEW_POLICY.md)
- [Content Studio operations](docs/editorial-workflow.md)
- [v0.6A/B release report](docs/v06-release-report.md)
- [Deployment, migration and rollback](DEPLOYMENT.md)
- [Testing](TESTING.md) and [security assumptions](SECURITY.md)

Earlier documents under `docs/` retain historical v0.3/v0.4 plans and validation;
they do not override the current feature matrix. CredBuilt Academy is independent
and is not affiliated with or endorsed by BCSP.
