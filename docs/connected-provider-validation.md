# Connected provider validation — Release 0.6A

Status: **Blocked: Live Provider Validation**. No Clerk keys or hosted PostgreSQL URL were available in this workspace. Local PGlite and mocked identity checks are development substitutes, not evidence of real registration or cross-device recovery.

## Dedicated preview configuration

Use a dedicated development Clerk application and PostgreSQL database with approved providers. Do not change production settings, activate charges or paste secrets into chat.

Set these in the Vercel **Preview** environment for `development/v0.6-connected-learning`:

- `NEXT_PUBLIC_BROWSER_DEMO=false` before rebuilding.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the same development Clerk application.
- `DATABASE_URL` using the provider's pooled, certificate-verified PostgreSQL URL. Hosted URLs with explicit SSL mode must use `sslmode=verify-full`; insecure or downgrade modes are rejected. The server uses certificate verification when a remote URL omits SSL settings.
- `APP_ORIGIN` equal to the exact HTTPS preview origin.
- Leave `ALLOW_LOCAL_DEMO` false/unset. Local demo identities are prohibited on Vercel.

Configure Clerk allowed origins/redirects and desired email verification/recovery options. The integrated routes are `/sign-up`, `/sign-in` and `/account`. Sign-up continues to `/onboarding`; returning sign-in opens `/`.

Run `npm run db:migrate` with injected preview credentials in a trusted job before using connected mode. The CLI optionally reads `.env.local`; it does not need a local secret file. Do not leave `CREDBUILT_MIGRATE=true` on the deployed runtime. Migration execution and runtime verification are separate.

The browser-only review preview still needs only `NEXT_PUBLIC_BROWSER_DEMO=true`; no account or backend service is created by that mode.

## Live acceptance record to complete

Use two real test accounts and at least two independent browser profiles/devices. Record deployment commit, provider environment, test time and outcome without including tokens or learner details.

1. Register A, verify email if configured, sign out, recover a password through Clerk and sign in again.
2. Complete a lesson, save practice/bookmarks, submit an exam rehearsal and save study preferences for A.
3. Sign out. Verify private UI clears. Sign in on another device as A and recover the same records.
4. Sign in as B. Verify none of A's records appear and attempts to open A's session URL return unavailable.
5. Switch accounts, expire a session, disable network briefly and interrupt a save. Verify clear errors, no browser-local fallback and recovery without overwriting saved data.
6. Validate hosted migration checksums, pooled connections, verified TLS and relevant provider logs. Never copy connection strings into reports.

Until this record passes against configured providers, connected accounts remain **Blocked: Live Provider Validation**. Do not label them Production Ready.

## Implemented reliability boundaries

- Private API ownership comes from verified server identity, never client owner IDs.
- A Clerk/server-subject UI boundary hides the previous account during sign-in changes and refreshes server-rendered data; it does not replace API authorization.
- Account learning requests are abortable and superseded reads cannot repopulate stale progress. Account data is never copied to demo localStorage.
- Initialization can retry after transient database failures; pooled connection/query/statement timeouts are bounded and idle connection errors are logged without credentials.
- Study-plan errors do not silently fall back to browser storage. Revisions protect writes from stale tabs.
