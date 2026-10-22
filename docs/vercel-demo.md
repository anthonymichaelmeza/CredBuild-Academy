# Deploy the browser demonstration on Vercel

This mode lets visitors use the existing dashboard and practice flow without Clerk, PostgreSQL, local database files, migrations, or secrets. It is an explicitly labeled demonstration, not a production learning service.

## Exact settings before clicking Deploy

On Vercel's **New Project** screen:

1. Import `anthonymichaelmeza/CredBuild-Academy`, branch **main**, including the commit that adds browser demo mode. Refresh the page if it was open before the push.
2. Keep **Framework Preset: Next.js**, **Root Directory: `.`**, **Build Command: `npm run build`**, and the default output directory. Node.js **24.x** is declared in package.json.
3. Expand **Environment Variables** and add this single row:

   | Key                        | Value  |
   | -------------------------- | ------ |
   | `NEXT_PUBLIC_BROWSER_DEMO` | `true` |

4. Keep the value as the lowercase word `true`, without quotation marks. Apply it to Production and Preview if the dashboard asks which environments to use. Do not configure Clerk keys, `DATABASE_URL`, `ALLOW_LOCAL_DEMO`, `LOCAL_DATABASE_PATH`, `COOKIE_SECURE`, or `APP_ORIGIN` for this browser demo. No external service or secret is needed.
5. Click **Deploy**. When Vercel reports the deployment is ready, click **Visit** or its deployment URL. Actual Vercel deployment is a separate step; passing a local production build does not prove a deployment has finished.

`NEXT_PUBLIC_BROWSER_DEMO` is a public build-time switch, not a secret. Both server and browser use it. Changing it after building requires a fresh deployment; do not simply change a runtime value and reuse an older build. If you already deployed without it, add it in project settings and redeploy with the correct environment selection.

## Try it in the browser

1. Open **Practice**.
2. The requested initial default is 25 adaptive questions; the demo has only 12 drafts, so that size correctly reports a shortage.
3. Select **10** questions, leave **All four domains**, and click **Start session**.
4. Answer a question, set confidence, bookmark or flag it, and refresh to verify that this browser retains progress.
5. Submit the session to see results, review missed questions, and open **My Performance** for history.
6. Open **Account Settings → Reset browser demo** to clear only this demo's sessions and bookmarks for this website. Reset is confirmed and cannot be undone.

The browser-demo banner appears on every page. Navigation to planned lessons, exams, flashcards, and planner continues to show honest availability states.

## What this demonstration does and does not provide

- It uses the browser's localStorage for up to 100 sessions and 12 bookmarks. There is no account, database connection, demo identity cookie, server-side progress write, or cross-device sync. Visitors do not share one server-side demo account.
- Progress belongs to one browser profile and one website origin. Clearing site data, private browsing ending, a different browser/device, or another Vercel preview URL gives a separate or empty history. People sharing a browser profile share its demo data. Do not enter sensitive information.
- Browsers may block or fill site storage. The UI reports a storage problem and does not pretend the answer was saved. Corrupt data is preserved until the visitor explicitly resets it.
- All twelve questions are original, AI-generated, unreviewed demonstration drafts. The CHST5 data is user-supplied and not independently verified. No official duration, passing score, or affiliation is claimed.
- Grading runs locally for illustrative feedback. Demo answers and scoring are inspectable/editable by the visitor; this is not protected exam scoring or evidence of qualification. No approved question bank or credentials are exposed through this provider.
- The public server practice endpoint rejects writes in browser demo mode, administrative publishing remains denied, and the database adapter refuses initialization. No attempt is made to work around Vercel's read-only filesystem or to store progress in ephemeral server memory or `/tmp`.
- The authenticated server-backed workflow remains available when browser demo mode is off. Switching it off requires correctly configured live services and separate validation before offering durable account progress.

## Environment audit of the actual application

| Mode                              | Required configuration                                                                                                                               | Backend behavior                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Vercel browser demonstration      | **Only `NEXT_PUBLIC_BROWSER_DEMO=true`**                                                                                                             | No Clerk, PostgreSQL, filesystem database, migrations, or progress API required                            |
| Local server-backed demonstration | Browser demo off; `ALLOW_LOCAL_DEMO=true`; local writable path optional                                                                              | Random browser cookie and local PGlite storage on a single process                                         |
| Managed account workflow          | Browser demo off; `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`; HTTPS cookie and canonical origin settings as appropriate | Explicit migrations plus authenticated server-side PostgreSQL writes; still requires real-provider testing |

`COOKIE_SECURE` and `APP_ORIGIN` are not used for browser-demo progress because this mode does not issue a progress cookie or POST to the server practice endpoint. Existing optional variables never enable Clerk or database use while the browser-demo switch is active.

## Maintainer validation

The browser demo has dedicated unit and production-browser tests, in addition to the existing server-backed regression tests. To reproduce the hosted-demo conditions:

```bash
NEXT_PUBLIC_BROWSER_DEMO=true ALLOW_LOCAL_DEMO=false DATABASE_URL= CLERK_SECRET_KEY= NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= LOCAL_DATABASE_PATH=/proc/credbuilt-no-writes npm run build
npm run test:e2e:browser
```

The browser test configuration starts the production server on port 3100, without credentials and with local database fallback disabled and an unusable local database directory. Desktop and mobile workflows verify saved answers, confidence, bookmarks, flags, results/review, history, browser isolation, resets, navigation, no progress API traffic, and clear errors for blocked site storage. The normal server-backed tests run separately with browser demo disabled.
