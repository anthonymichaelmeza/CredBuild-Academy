# Security and privacy assumptions

This is a development foundation, not a completed commercial security review.
Do not submit secrets, account tokens or learner records in public issues/chat.
No live paid provider is activated. See [FEATURE_STATUS.md](FEATURE_STATUS.md)
for unfinished launch requirements.

## Implemented boundaries

- Managed operations derive identity from Clerk; clients cannot select an
  owner. Session, lesson-progress and profile services scope reads/writes to
  that identity. Sign-in/account routes do not implement their own passwords.
- Explicit local-demo identity uses an HTTP-only, SameSite cookie and is
  disabled on Vercel. It is development convenience, not account authentication.
  Never use local-demo identities for customer data.
- Browser demo disables database/auth initialization and rejects server progress
  writes. Its public fixture keys/scoring and localStorage are inspectable and
  editable by anyone using the same browser profile.
- JSON mutations check same-origin and media type, bound actual streamed UTF-8
  bytes and validate schemas. Private APIs return `private, no-store` and vary
  on identity headers. Generic errors use request IDs without logging request
  bodies, credentials, SQL or learner answers.
- Per-process write buckets bound repeated saves. They reset per instance and
  are not distributed quotas or a complete serverless abuse solution.
- Question presentation uses an allowlist; exam correctness/explanations remain
  withheld until submission. Performance DTOs omit keys, choices/rationales,
  owner IDs and active-exam correctness. Exact question pins preserve grading
  when a new revision is added; legacy records resolve v1 explicitly.
- Server lesson writes validate section/check IDs, grade against stored content,
  reject forged completion/correctness and use optimistic revisions. Profiles
  also reject stale writes; manual checklist marks do not establish learning.
- The public `/api/admin` endpoint still denies writes. Protected `/api/studio`
  derives author/reviewer/administrator roles from the database, never a client
  role. Role grants/revocations are trusted CLI operations. Authors can access
  their items; reviewers/administrators can inspect editorial content. Ordinary
  learners cannot access draft keys or editorial actions.
- Editorial review excludes every contributor to the logical item. Approvals
  require immutable revision/source evidence, canonical blueprint mapping and
  independent human attestation. Only administrators publish; transactions and
  SQL guards require exact reviewed canonical learner snapshots and matching
  pointers. Revisions/reviews/source records/audit are append-only. Edits create
  drafts rather than mutating published material.
- JSON imports use strict schemas, bounded bodies, duplicate checks,
  owner-bound expiring previews and single-use transactional confirmation.
  Imported questions remain drafts; client approval/role fields are rejected.
- Connected UI hides prior account state while identity changes and discards
  superseded requests. Connected read/write errors never fall back to local
  demo storage. PostgreSQL uses verified remote TLS, bounded pools/timeouts and
  safe generic connection errors.
- Security headers include no-sniff, frame denial and a referrer policy. Secrets,
  `.env*`, local databases, dependencies and build/report artifacts are ignored
  by Git. Public build flags contain no credentials.

## Material limitations

Live managed authentication and hosted PostgreSQL are not validated in this
environment. Provider key restrictions, allowed origins/redirects, verification,
recovery, cookie/session policies, pooling/TLS and cross-device isolation must be
checked before enabling customer accounts. A test using local PGlite or mocked
identity does not prove these provider behaviors.

Database privacy currently relies on application ownership predicates; there
is no installed row-level-security or organization tenant policy. Runtime DB
credentials are trusted and need least privilege. Migration credentials should
be separate. Studio roles do not make runtime SQL credentials untrusted: anyone
with those credentials is an infrastructure operator. Review production
privileges, grant/revoke procedures and audit retention before launch.

All demonstration keys are intentionally public, including fixtures imported by
browser learning/practice modules. Do not place an approved paid bank in those
modules or infer commercial answer protection from hidden UI. Published content
now uses separate server-only selection and safe learner projections. This does
not implement paid entitlements. Bank/history queries remain bounded small-bank
implementations and require pagination/scale work before thousands of questions.

Editor content is structured text, not executable arbitrary HTML. Media/source
URLs accept public HTTPS or restricted local media paths as applicable, reject
embedded credentials and obvious private hosts, and carry rights metadata.
The server does not fetch arbitrary URLs. URL syntax checks do not establish
trustworthiness, media rights or technical verification; a future media-ingestion
service will need its own network isolation, malware/content checks and access
policy. Current external media is not a protected paid asset service.

Studio local test access requires both local flags, non-production execution and
absence of Vercel. Do not enable it for customer records. The browser-only demo
cannot use Studio. Human attestations are recorded, not independently proven by
the application; operator discipline and review quality remain material risks.

Browser timers are editable; server mode enforces deadline comparisons on
requests, but has no inactive-session expiry worker. Browser response time is
untrusted analytics input. The per-process limiter needs a durable gateway/shared
policy before launch; it does not stop anonymous distributed traffic by itself.

No billing webhook, AI cost quota, organization authorization or protected media
service exists. No claims of those protections are made. Account deletion,
retention policy, operational monitoring, alerting, backup/restore drills,
dependency-update policy and a broader accessibility/security assessment remain
launch work. The deployment recovery runbook is not proof of a tested restore.

## Activity export

Settings can download browser demo activity locally. The authenticated
`/api/account/export` endpoint returns a private JSON snapshot of the latest
200 sessions, bookmarks, lesson progress and profile; it uses the safe performance
projection and withholds active-exam correctness/answer keys. No import/restore or
full account deletion workflow is implemented. Treat downloaded activity as
private learner data; do not attach it to public issues.

## Data handling and safe changes

The application stores only the provider subject/local demo ID and the learning
records/preferences needed by current features. It does not duplicate passwords
or require learner names/emails/employers in the profile. Provider data handling
and retention still need review. Anyone sharing a browser profile can inspect
its demo activity; clearing site data cannot be recovered from a server backup.

Use preview credentials and disposable databases for integration testing. Never
change production configuration, delete projects/data, activate charges or
promote a deployment without authorization. See [DEPLOYMENT.md](DEPLOYMENT.md)
for migration/rollback precautions and the exact remaining provider setup.
