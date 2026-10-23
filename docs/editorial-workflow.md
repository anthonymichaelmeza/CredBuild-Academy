# Content Studio operations

Content Studio is the protected `/studio` authoring/review interface. It is
separate from the public read-only `/admin` demonstration inspector. The original
12 questions and eight lessons remain unapproved demonstrations; no seeded
content is silently copied into the approved bank.

## Access and role bootstrap

Use an isolated connected Preview with browser-demo mode off, configured Clerk
and PostgreSQL, and migrations applied through `0004_content_studio.sql`. See
[provider configuration](connected-provider-validation.md) and
[deployment](../DEPLOYMENT.md). Live-provider validation is still blocked until
that environment is supplied and tested.

Each editorial person must first sign in and save a study goal/checklist or a
lesson/practice action so the verified provider subject exists in `users`.
Signing in alone does not initialize this application record. A trusted
infrastructure operator, using securely injected preview
database credentials, grants only the required roles:

```bash
npm run studio:role -- grant user_AUTHOR_SUBJECT author responsible-operator
npm run studio:role -- grant user_REVIEWER_SUBJECT reviewer responsible-operator
npm run studio:role -- grant user_ADMIN_SUBJECT administrator responsible-operator
npm run studio:role -- revoke user_AUTHOR_SUBJECT author responsible-operator
```

These subject names are placeholders, not accounts to create or secrets. Use the
actual managed subject recorded by the application. There is no public role
selector/grant endpoint, and no account receives editorial rights merely by
signing up. The CLI appends a role-change audit event. Keep reviewer and author
identities independent; administrator alone does not grant reviewer permission.

For disposable local development only, Studio also permits local identities when
`ALLOW_LOCAL_DEMO=true`, `ALLOW_LOCAL_STUDIO=true`, browser-demo mode is off,
`NODE_ENV` is not production, and Vercel is absent. The existing user must still
receive a trusted database role. Stop the app before CLI operations against its
PGlite directory. These flags do not make a hosted customer authentication
system. The guarded `npm run test:e2e:studio` configuration uses its own isolated
`.local/studio-e2e` directory and never approves the supplied demo material.

## Authoring

An author creates a question or lesson using the structured editor. Required
metadata includes certification, registered blueprint revision, domain,
objective, topic/subtopic, title and origin. A draft may be saved while its
blueprint is unverified or sources are incomplete; blockers explain why it
cannot be approved or published.

Questions support multiple choice, scenarios, calculation, image-supported and
multi-step formats. Record all choice rationales, the correct-answer explanation,
difficulty, worked solution steps where applicable, and source references with
edition and exact section. Question media is image-only with description and
rights metadata. Media URLs use public HTTPS or restricted local `/media/` paths;
there is no file upload/storage service in this checkpoint.

Lessons support objectives, section paragraphs/reflections, knowledge checks,
estimated duration, prerequisites, related questions/lessons, image/video/audio
metadata and transcripts. Written content is structured plain text, not arbitrary
executable HTML or a WYSIWYG editor. This checkpoint stores/render media assets;
it does not implement the planned Instructor profiles, persistent video playback,
chapters, interactive checkpoints or avatar generation.

Every saved edit creates a new immutable draft revision. Identity, certification
and original ownership do not change. Prior approvals and review evidence do not
transfer to the new draft. A new draft can coexist with the prior published
revision until an administrator approves the replacement process.

## Canonical blueprint and technical review

The canonical certification/blueprint must already be registered in the database.
The Studio administrator can record a human blueprint review only after actually
examining the official document: source URL, edition, exact section, findings and
objective/domain map. Existing provisional metadata must be compared to the
actual document. If identity, domains, weights or version are wrong, register a
new canonical revision through a reviewed migration/operator process; do not
assert verification merely to unblock publishing. Verified revisions are
immutable and need new revisions for changes.

An author submits the exact current draft for technical review. A reviewer who
has never contributed to the logical item records findings and a supporting,
contradictory or insufficient outcome for every source examined, then approves,
requests changes or rejects the revision. Approval requires supporting evidence
for every cited source, exact canonical blueprint objective/domain mapping,
complete pedagogical fields and explicit human attestation. Missing-source or
unverified-blueprint items can be returned for revision; they cannot be approved.

Check answers, distractors, calculations/units, explanations, diagrams/media,
lesson claims and checks against actual authoritative source text. A reference
URL is not proof of verification. The application records who attested and what
was examined; it cannot establish that a person read the document or guarantee
technical truth. No automated URL fetch or AI-generated approval substitutes for
independent review.

## Publish, replace and retire

Only an administrator may publish the current approved revision. The service
rechecks authorization, expected revision/row version, source evidence and
canonical mapping inside one transaction. SQL guards require the learner
question/lesson snapshot to match the reviewed content, plus matching Studio and
learner publication pointers. Audit and status advance in the same transaction.

Published instructional lessons enter the connected Learn catalog; published
questions enter the separate connected practice bank. Unpublished drafts are
never learner selection candidates or public fixture imports. Empty published
banks display honest empty/shortage states. Sessions pin exact question revisions
and published lesson progress belongs to an exact revision. Paid subscriptions
and entitlements are not part of this access boundary.

Replacing a published revision retires the superseded workflow revision while
preserving canonical history. Retirement removes active publication pointers,
not historical content. Existing owned attempts still grade/review their pinned
revision. New attempts cannot select retired material. Stale tabs receive a
conflict and must reload; they cannot approve or publish an old revision.

## JSON bulk import

Download the JSON question template from the Studio importer. Import supports
structured JSON arrays, at most 50 question records per request. CSV parsing is
not implemented. Fill original question content and preserve source edition/
section/rights metadata; do not include roles, owner IDs, approval states,
reviewer identities or verification flags.

Preview validates every record, identifies duplicates in the file and database,
and displays errors before any draft is created. The owner-bound preview expires
after 15 minutes. Confirmation rechecks authorization, expiry, one-use status and
duplicates, then creates all records as drafts and appends audit in one
transaction. Declared origin, including `ai_generated`, remains on the immutable
revision; a separate `import_ingested` event records the ingestion method and
preview identity. Invalid/duplicate previews must be corrected and previewed
again. Confirmation is not technical review or publication.

## Audit and security boundaries

Inspect revision history, technical findings and audit on each item. Immutable
revisions, review records, source evidence and audit cannot be updated/deleted
through the service or ordinary SQL operations; corrections append new records.
Database infrastructure credentials remain trusted, and least-privilege runtime
roles, audit retention/export, backups and monitoring require operational review.
Do not put licensed source text, customer data, secrets or credentials in the
public repository. See [content policy](../CONTENT_REVIEW_POLICY.md) and
[security](../SECURITY.md).
