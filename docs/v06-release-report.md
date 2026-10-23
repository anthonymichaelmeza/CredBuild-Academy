# CredBuilt Academy v0.6A/B release report

This checkpoint completes connected-account hardening and the protected Content
Studio on `development/v0.6-connected-learning`, preserving the v0.5 learner
experience. It does not complete the entire v0.6 roadmap or establish commercial
readiness. The product-owner scope is to validate, commit and push this checkpoint
on the development branch; Instructor and flashcard implementation remains next.

## Implemented scope

**0.6A — Connected accounts:** account-switch/loading concealment, cancellation
of superseded learner requests, private planner recovery, initialization retry,
verified remote PostgreSQL TLS, bounded pooling/timeouts and ownership/persistence
regressions. Account operations never silently fall back to browser-demo storage.
Clerk registration/recovery/verification remain provider-managed integration
flows requiring actual configured validation.

**0.6B — Content Studio:** trusted database author/reviewer/administrator roles;
protected question/lesson structured editors; revision-specific technical review,
changes/rejection, independent approval, publication/replacement/retirement;
append-only revision/review/source/audit history; and transactional JSON question
import with validation, duplicate detection, expiring owner-bound previews and
one-use confirmation. Import preserves declared AI/human provenance and records
its ingestion separately.

Published instructional lessons now enter a separate connected Learn catalog
and private reader with server grading, prerequisites and owner/version progress.
Published practice uses a separate server-side certification-filtered bank.
Learner payloads exclude unpublished material and grading keys until appropriate
feedback; retired canonical revisions preserve owned attempt/history integrity.
The browser-only demo retains its established local-storage adapters and
explicit limitations. It cannot author/review/publish.

## Database and security changes

Additive migration `0004_content_studio.sql` adds editorial roles, content identity,
immutable revisions/reviews, guarded workflow, publications, import previews,
blueprint review evidence, lesson publication and append-only audit. Migrations
`0001`–`0003` remain unchanged. Explicit migration jobs must run before dependent
managed application code; normal managed startup only verifies the ledger.

Server actions derive identity and roles from trusted sources, check expected
revision/row version and enforce workflow in transactions. SQL guards reject
self-approval, missing-source/canonical-objective evidence, stale publication and
mismatched learner snapshots. Edits create drafts; they never mutate approved
content. Every contributor to an item is excluded from independent review.
Only trusted administrators publish. Role grants/revocations use an operator CLI,
with no public role-escalation endpoint. Media/source URLs are validated; editor
HTML is not executed and remote references are not fetched for fake verification.

Material remaining risks: runtime database credentials remain trusted; no
row-level-security policy, paid entitlements, distributed abuse limiter,
protected media service or tested production backup/restore exists. Human
attestations record claims of review rather than independently proving technical
truth. See [security](../SECURITY.md) and [content policy](../CONTENT_REVIEW_POLICY.md).

## Executed validation

| Check                                                 | Result                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| Unit/integration                                      | **135/135 passed across 32 files**                                |
| Original server-backed desktop/mobile browser suite   | **8/8 passed**                                                    |
| New Content Studio desktop/Pixel 7 browser suite      | **6/6 passed**                                                    |
| Original production browser-demo desktop/mobile suite | **14/14 passed**                                                  |
| Total browser cases                                   | **28/28 passed**                                                  |
| Production builds                                     | Server mode without credentials and browser-demo mode both passed |
| TypeScript / ESLint / formatting                      | Passed                                                            |
| Production dependency audit                           | Zero reported vulnerabilities                                     |

The original 86-test baseline was independently rerun before implementation.
Studio browser tests use explicitly isolated local QA identities; integration
publication fixtures are fictional test data. The production browser-demo suite
ran without provider keys, with local database fallback disabled and an unusable
filesystem path. None of these results claims live hosted-provider validation.
See [TESTING.md](../TESTING.md) for commands and exclusions.

Actual application screenshots are generated artifacts outside Git:

- `/workspace/artifacts/v06/studio-author-desktop.png`
- `/workspace/artifacts/v06/studio-reviewer-mobile.png`

They show isolated QA draft/review activity, not approved instructional material,
customer records or a live configured provider account.

## External configuration and remaining gates

Managed accounts remain **Blocked: Live Provider Validation**. Configure an
isolated Preview with `NEXT_PUBLIC_BROWSER_DEMO=false`, matching Clerk public/
secret keys, `DATABASE_URL` using certificate-verified TLS, exact `APP_ORIGIN`,
explicit migrations and trusted editorial role grants. Never paste secrets into
chat or public Git. Follow the complete
[provider acceptance checklist](connected-provider-validation.md) and
[editorial setup](editorial-workflow.md). First saved learner activity initializes
the application user record before trusted role assignment.

No actual technical sources were verified. The original **12 demonstration
questions and eight lessons remain unapproved**, with **zero approved commercial
questions** supplied by this release. The full 200-question exam stays unavailable
until official requirements and sufficient distinct reviewed content exist.
No passing threshold, source-verification date, BCSP affiliation, readiness
prediction or AI avatar is invented.

## Delivery and next checkpoint

- Development branch: `development/v0.6-connected-learning`.
- 0.6A commit: `9db7ca7` — connected-account isolation and persistence recovery.
- 0.6B implementation and documentation: the accompanying checkpoint commit.
- `main` and the production deployment are untouched; no merge or production
  promotion is authorized by this release.

The generated Vercel Preview URL cannot be retrieved through this workspace's
blocked deployment-status access. In Vercel, open **project → Deployments → the
Preview for this development branch/commit → Ready → Visit**. Browser-demo Preview
requires only `NEXT_PUBLIC_BROWSER_DEMO=true` before building; it cannot display
the protected Studio. Review Studio through a separately configured connected
Preview or the isolated test screenshots. A push/green local build alone does
not establish that Vercel reports Ready. See [deployment](../DEPLOYMENT.md).

Next sequential work is **0.6C — CredBuilt Instructor**: reusable instructor/video
models, legally usable demonstration playback, captions/transcripts/chapters,
checkpoints and persisted progress. Then **0.6D — retention** adds functional
flashcards and tested spaced repetition. Neither is implemented by this
checkpoint, and no paid generation or other provider is activated.
