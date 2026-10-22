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
- Administrative publishing endpoints deny all writes. SQL constraints reject
  unsafe publication, and immutable lesson revisions preserve history. These
  are safeguards, not a delivered role-based editorial CMS.
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
be separate. A completed CMS must reconcile database/policy states, secure source
evidence, role administration and every sensitive audit event.

All demonstration keys are intentionally public, including fixtures imported by
browser learning/practice modules. Do not place an approved paid bank in those
modules or infer commercial answer protection from hidden UI. Approved content
requires a separate trusted server selection/delivery path and entitlement
checks. The current bank/query/history implementation targets a small demo, not
thousands of protected questions.

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
