# CredBuilt Academy v0.4 — review candidate

Branch: `development/v0.4-learning-experience`. This is a review candidate, not a production release. Do not merge to `main` or deploy to the customer-facing production target without approval.

## Functional scope

### Learning Academy

Eight original, explicitly unreviewed demonstration lessons, two per supplied CHST domain heading. Each versioned lesson includes a topic, subtopics, original learning objectives, three reading sections, scenario/reflection prompts, two knowledge checks, reference discovery links, and related practice questions. The reader includes course navigation, section navigation, read acknowledgements, feedback/retries, completion gates, a next-lesson link, and focused practice.

Completion is stored only when all sections are acknowledged and both demo checks are correct. Completing these illustrative lessons awards no certification credit and does not establish field competence. A change in lesson version invalidates prior completion. No official CHST objective code, exact regulatory section, or source verification is invented.

### Practice and exam rehearsal

The original 10/25/50/100/200 counts and adaptive/learning flows remain. Short demo counts of 1, 3, and 5 allow useful domain/topic filtering with the twelve-item bank. Any insufficient request is rejected; selection never duplicates an item. Related-lesson links and results by topic connect practice back to learning.

Timed practice retains immediate explanations and first-answer locking. Exam rehearsal autosaves editable choices and confidence, offers flagged/unanswered navigation, withholds explanations and correctness in question views until submission, and supports review after submission. Deadlines are persisted; expiry finalizes before accepting a late answer. Open pages finalize automatically, and reopened expired sessions finalize without accepting new answers. Submission is idempotent, unanswered items count as incorrect in results, and time-expired results are labeled.

The full 200-question policy and domain allocation are structured separately from short rehearsals. A full CHST simulation remains blocked by the lack of an approved bank, reviewed blueprint mapping, and verified official duration. The provisional user-supplied distribution is 73/40/45/42. Rehearsal durations are learner-selected demonstration settings, not official exam timings or passing standards.

### Analytics

Domain/topic accuracy with sample sizes, date/domain/topic filters, repeated misses with underlying-session links, UTC answer activity, saved session history, next incomplete lessons, and weak-topic practice suggestions use stored learner records. In-progress exam correctness is excluded until submission. No readiness, mastery, retention, or pass prediction is fabricated. Recommendations use a transparent under-75% practice-accuracy heuristic and then curriculum order; small samples remain visible.

### Content quality

A tested policy engine supports Draft → Technical review → Approved → Published → Retired, independent reviewer checks, exact revision matching, supporting source evidence, publication restrictions, revision invalidation, and transition audit events. The public `/admin` inspector exposes rejection reasons for the actual demonstration drafts and checks hypothetical gates without changing records.

This is a workflow foundation, **not a complete authenticated editorial CMS**. The public inspector cannot assign roles, verify a technical source, approve a draft, or publish. The server administrative mutation endpoint remains locked, the existing database publication guards remain, and production content remains empty. Connecting the new policy to trusted role management, an editor, and database-backed review transactions requires a separate milestone. Synthetic policy-test evidence is never seeded as actual reviewed material.

## Compatibility and deployment

- Preserve `NEXT_PUBLIC_BROWSER_DEMO=true`; no additional service, paid dependency, credential, or database is required for the demo.
- Existing `credbuilt.browser-demo.v1` practice data is retained and v0.3-format snapshots are covered by a compatibility test. The schema accepts new optional session fields while preserving earlier sessions/bookmarks.
- Learning progress uses the separate `credbuilt.learning-demo.v1` key. Explicit reset of learning alone preserves practice. Account Settings' full demo reset asks before clearing both namespaces.
- Browser-local history is scoped to a browser profile and origin. A new Vercel preview URL starts with different storage; this does not erase production-site history. Site storage may be blocked/full, and the app reports save errors rather than claiming success.
- Browser clocks, storage, grading, and answer keys are inspectable/editable. There is no server background worker, protected exam service, real account, cross-device sync, or professional credential in this mode. A closed browser finalizes on reopening/next action.
- The optional server-backed flow retains its database/auth integration and shares lifecycle rules, but managed Clerk/PostgreSQL deployments still require live-service validation. No production SQL migration or approved-question seeding was added for this browser-demo release.

## Validation

- All 44 Vitest tests passed, including the existing 29 plus lesson persistence/completion/revision checks, v0.3 snapshot compatibility, focused selection, deadline and editable-exam semantics, withheld feedback, real-data analytics, and content-review rejection/audit rules.
- The original four desktop/mobile server-backed browser tests passed.
- The ten production browser-demo tests passed across desktop and Pixel 7 layouts, including the original browser-demo flows plus lesson completion/focused practice, answer autosave, persisted confidence, expiry auto-submission, analytics from two real practice sessions, and locked publishing.
- Type checking, ESLint, formatting, and production builds with the browser flag on and off were executed successfully. See the validation record for any later correction or limitation.

Screenshots are captured from the running application with actual local demo interactions, rather than generated mockups. They are supplied as separate review artifacts, not mixed into the question bank or committed with private browser data.

## Preview review before approval

1. Review this development branch and its comparison with `main` on GitHub.
2. In Vercel, open the existing project → **Deployments** → **Preview**, then select the deployment for **`development/v0.4-learning-experience`**. If needed, enable `NEXT_PUBLIC_BROWSER_DEMO=true` for the **Preview** environment and redeploy that preview. Do not promote it to Production.
3. Open **Visit** for that Preview deployment. Try **Learn → See the work. Recognize the risk.**, mark each section read, complete both checks, and follow **Practice this topic**.
4. Try **Exam Simulator → short demo rehearsal**, use a one-minute duration to check expiry, and inspect results/history. The full-length panel must remain unavailable.
5. Open **My Performance** after two practice attempts and inspect the sample counts, filters, recommended lessons, and contributing sessions.
6. Open **Account Settings → content review requirements** and inspect blocked publishing without changing status.

This execution environment returns proxy 403 responses for the production Vercel site, BCSP, and GitHub's deployment-status API. Native Git transport works. Therefore a generated hosted preview URL/status cannot be independently retrieved here; obtain the actual URL from the Vercel deployment entry. No hosted preview is claimed ready until Vercel reports it, and `main` is left unchanged for approval.

## Remaining work

Independent review of the current official CHST blueprint and technical sources; approved instructional material; a production-authorized editorial CMS and service validation; a sufficiently large reviewed bank and verified timing for the full exam; flashcards, planner, billing, and commercial launch checks. The original HTML prototype and official logo remain absent; the brand direction and labeled placeholder are preserved.
