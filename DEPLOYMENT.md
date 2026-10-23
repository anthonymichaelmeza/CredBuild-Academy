# Deployment, migrations and recovery

Repository: `anthonymichaelmeza/CredBuild-Academy`. Current development branch:
**`development/v0.6-connected-learning`**. Do not merge to `main`, promote a
deployment, delete a Vercel project or change production settings without product
owner approval. Native Git pushes to a development branch may trigger previews.

## Browser-only Vercel preview

1. Use the existing connected Vercel project. Open **Settings → Environment
   Variables** and ensure `NEXT_PUBLIC_BROWSER_DEMO` is lowercase `true` for
   **Preview**. This is the only required demo variable.
2. Use repository root `.`, Framework Preset **Next.js**, Build Command
   `npm run build`, the default output directory and Node.js **24.x**.
3. Push/redeploy the development branch. In **Deployments**, select the
   **Preview** for that branch/commit, wait for Ready, then click **Visit**.
   Do not promote it to production.
4. Confirm the browser-only banner and try a lesson, a 10-question all-domain
   practice session, refresh/resume, a short exam rehearsal, results/analytics
   and saved study preferences. Check mobile navigation and storage errors.

Do not add Clerk/database/local filesystem variables to make this preview work.
The public flag is compiled into client code: rebuild after changing it. The
preview's origin has its own localStorage; progress does not move between
different preview URLs or devices. It is not a real account or protected exam.

This cloud workspace cannot supply a public localhost/port link. The generated
preview URL must be read from Vercel. Read-only requests to the previous preview
were blocked by this environment's proxy before reaching the app. That is not
evidence of a Vercel application 403 or a failed deployment.

## Environment bindings

| Variable                            | Browser preview           | Managed account preview                                                  |
| ----------------------------------- | ------------------------- | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_BROWSER_DEMO`          | `true` before build       | `false` or unset before build                                            |
| `DATABASE_URL`                      | Unused                    | Required, provider-managed PostgreSQL with verified TLS/pooling settings |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Unused                    | Required public key for the same Clerk environment                       |
| `CLERK_SECRET_KEY`                  | Unused                    | Required server secret, entered securely in hosting settings             |
| `APP_ORIGIN`                        | Unused for local progress | Exact canonical HTTPS origin used by same-origin mutation checks         |
| `ALLOW_LOCAL_DEMO`                  | Unneeded                  | `false`/unset; local identity is disabled on Vercel                      |
| `ALLOW_LOCAL_STUDIO`                | Unused                    | `false`/unset; local editorial test bypass is disabled on Vercel         |
| `LOCAL_DATABASE_PATH`               | Unused                    | Do not use PGlite as serverless persistence                              |
| `COOKIE_SECURE`                     | Unused                    | Only controls the local-demo cookie; Clerk controls its own cookies      |
| `CREDBUILT_MIGRATE`                 | Unused                    | Explicit migration CLI sets it; do not enable runtime schema mutation    |

Never paste secrets into chat or commit them. Preview/development/production
credentials must be distinct. Public Next variables are build inputs; secret
keys/database URLs must never receive a `NEXT_PUBLIC_` prefix.

## Hosted account integration: remaining setup

No live Clerk/hosted PostgreSQL validation has been completed. To validate it
without touching production:

1. Create/select a dedicated development Clerk application and disposable
   PostgreSQL database using the approved providers. No paid activation is
   required by the repository; obtain approval before incurring cost.
2. Add the bindings above to a dedicated **Preview** environment. In Clerk,
   configure the preview application/origin and intended email/password or other
   sign-in method; enable desired verification/recovery settings.
3. Use `/sign-in`, `/sign-up` and `/account` for the integrated provider screens.
   New sign-ups continue to `/onboarding`; returning sign-ins open the dashboard.
   Verify provider redirects, allowed origins and development-key restrictions
   against Clerk's dashboard. No application password database is needed.
4. Run explicit migrations using a trusted job/workspace with injected preview
   database credentials, then seed only the labeled demo content if desired.
5. Rebuild and verify registration, email verification/recovery, sign-out,
   sign-in, goals, lesson completion, practice, exams, history and cross-device
   resume. Use two accounts to test ownership isolation and expired sessions.

Detailed live acceptance steps and secure TLS requirements are in
[connected provider validation](docs/connected-provider-validation.md).
Remote URLs with an explicit `sslmode` must use `verify-full`; certificate
validation is never disabled to make a provider connection succeed. Default
remote connections also require verified TLS. Provider setup and a green build
do not complete the commercial course: content and operational launch blockers
remain in `FEATURE_STATUS.md`.

## Content Studio preview

The no-credentials browser demo deliberately cannot author/review/publish. To
review the protected Studio, first configure the isolated connected preview
above, migrate it through `0004`, and sign in with distinct author, reviewer and
administrator accounts. A trusted operator then grants the corresponding
database roles through `npm run studio:role`; there is no self-service role
selector. See [editorial workflow](docs/editorial-workflow.md) for exact commands.

Do not set `ALLOW_LOCAL_STUDIO` on Vercel or publish fictional test approvals.
The isolated local Studio browser suite provides reproducible interface evidence
while live providers are unavailable. Studio UI availability is separate from
actual instructional publication: the provisional blueprint and demo material
must remain unapproved until independently reviewed.

## Migration rollout

```bash
npm ci
npm run db:migrate
npm run db:seed
```

The CLI accepts injected environment variables and optionally reads `.env.local`
(`--env-file-if-exists`); no local secret file is required in a job. Migration
`0001` is preserved; `0002` adds lessons/progress, `0003` adds learner profiles and
`0004` adds trusted editorial roles, revision/review/audit workflow, import previews
and guarded instructional publication.
The checksummed ledger rejects edited applied files. Managed migrations run in
a transaction with an advisory lock. Application startup only verifies them;
it refuses a missing/pending migration rather than applying schema changes.
Demo seeding is idempotent and never publishes instructional content.

Before any authorized managed rollout, take a provider snapshot/backup, verify
that a restore point exists, rehearse upgrades on a copy/disposable database,
then run one explicit migration job before releasing dependent application code.
Use separate restricted runtime and migration credentials where the provider
supports them. Do not run migrations against a guessed environment.

For local PGlite, stop the app, back up its ignored data directory, run the CLI
and restart. Never share one local directory across processes/instances.

## CI, production protection and failures

`.github/workflows/quality.yml` defines checks plus separate browser-demo and
server-learning browser jobs, including the isolated Studio suite. Observe its actual GitHub run before treating CI
as green. Configure repository branch protection/rulesets in GitHub to require
review and checks on `main`; workflow YAML alone cannot enforce protection.
Keep the Vercel production branch on `main`. Use pull requests or the compare
view for this branch until approved.

Vercel failed-deployment causes and duplicate projects cannot be established
without dashboard/API access and the relevant logs. Inspect the actual failed
deployment's **Build Logs** and **Runtime Logs**, selected commit/branch, root,
Node version and environment scope. Compare the previous successful deployment.
Do not delete duplicate-looking projects or change production to investigate.
Do not publish logs containing credentials or learner data.

## Rollback and recovery

- A failed build/preview should not replace production. Retain the prior known
  good deployment and correct the development branch.
- If an approved release later needs application rollback, use Vercel's previous
  known good deployment after confirming it is compatible with the current DB.
  These migrations are additive, but compatibility must still be exercised.
- No destructive down migrations are provided. Do not delete new tables to
  roll back code. Prefer a forward corrective migration; restore a provider
  backup into a separate database first when recovery is needed.
- Validate restored user ownership, session scores/pins, lesson completion,
  profiles and migration ledger before switching a database binding. Restore
  procedures are a runbook foundation, not a tested production recovery service.
- Browser-local data is outside server backups. Clearing it is irreversible;
  Settings can download browser activity as JSON, but import/restore and cloud
  recovery are not implemented. Server export is an activity snapshot, not a
  complete database backup.
