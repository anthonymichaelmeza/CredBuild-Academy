# CHST source research and curriculum engine

This development milestone extends the existing application on
`development/stable-learning-foundation`. It does not merge main, grant customer
roles, configure hosted services, or promote production. The browser demonstration
continues to use `NEXT_PUBLIC_BROWSER_DEMO=true` without credentials.

## Actual research boundary

Read [the completion report](../research/chst5/COMPLETION_REPORT.md) and the seven
required audit files in [research/chst5](../research/chst5). The actual access run
attempted 43 distinct URLs: all 14 mandatory URLs, 21 individual official-publisher
title-query candidates and eight supplementary official seeds. All were rejected
by the workspace CONNECT proxy before reaching the publisher. Target response
statuses, current editions, licensing, content and final destinations remain
unknown. Constructed query endpoints are not confirmed product or download links.

The two supplied BCSP PDFs were processed locally: three blueprint pages and two
bibliography pages. Their exact hashes, extracted page counts and page-text hashes
are recorded. The existing transcription checker matched all 78 statements and
21 listings. This does not establish the latest official online versions, human
technical review, an analyzed textbook, or verified answer support. Private source
text and original PDFs are not added to the public repository.

## Connected administrator access

Use the existing managed authentication and PostgreSQL setup in an isolated
Preview with `NEXT_PUBLIC_BROWSER_DEMO=false`, matching Clerk configuration,
`DATABASE_URL` and `APP_ORIGIN`. Apply migrations before the updated server starts:

```bash
npm ci
NEXT_PUBLIC_BROWSER_DEMO=false npm run db:migrate
NEXT_PUBLIC_BROWSER_DEMO=false npm run db:seed
```

No new hosted service, model provider or credential is required by this code.
An existing signed-in subject needs trusted editorial roles through the existing
operator procedure; no browser page can grant roles. Local testing identities are
explicitly isolated outside Vercel/production and do not validate live Clerk or
hosted PostgreSQL.

Open Content Studio and use:

- **Source research** (`/studio/research`) for administrator inventory, private
  document sections, source corrections, objective links, queue and audit records.
- **Curriculum manager** (`/studio/curriculum`) for all 78 statements, separate
  CredBuilt outcomes, real saved content and technical evidence gaps.
- **Question quality and editorial review** (`/studio/questions/quality`) for
  authorized reviewers/administrators. Only an independent reviewer can sign off.
- **Question Bank → AI drafting** (`/studio/questions`) for the existing 50-draft
  import and new persistent source-gated drafting requests.

Browser demonstration mode protects these tools rather than inventing a connected
administrator or publicizing private source text.

## Inventory and historical audit import

The committed inventory contains 113 distinct records: 43 attempted URL records,
21 bibliography publication records, two supplied attachment identities and
47 existing citation URLs awaiting processing. Inventory rows are not successful
visits. Bibliographic/publisher metadata cannot unlock technical drafting merely
by being indexed or reviewed.

An authorized operator can register this catalog and import the actual recorded
access attempts, without making or simulating another network request:

```bash
NEXT_PUBLIC_BROWSER_DEMO=false npm run research:import-audit -- existing-administrator-subject --confirm
```

Optionally provide authorized local PDF paths as `--blueprint=/path/CHST-Blueprint.pdf`
and `--references=/path/CHST-References.pdf`. Explicit paths cause the real parser
to read those bytes privately. The blueprint's extracted pages are linked as
candidate examination-scope references for the 78 statements; they are not
technical support for question answers. Without files, the command registers
metadata only and creates no fake indexed pages. Repeated identical audit imports
are idempotent. It cannot create identities, grant roles, verify sources or publish.
Stop a local app before another process accesses its single-process PGlite path.

## Processing and manual review

Source registration preserves exact URLs, publication date when known, publisher,
classification, access and rights. Corrections require the current metadata
revision, retain an audit trail and invalidate prior verification. Discovery does
not inherit another publisher's identity or reproduction rights.

Authorized HTML/text can be imported in Research Studio with a lawful-use
attestation. HTML extracts meaningful main/article text, headings and locators;
menus and executable content are excluded. Text imports retain their lack of
original page information. Tables, figures, formulas, missing text and uncertain
layout remain explicitly flagged. No technical meaning is inferred from them.

PDF processing runs through the trusted maintenance environment with `pdfinfo`
and `pdftotext`. The workspace has these tools; Vercel is not assumed to have them.
Every extracted page retains its original page locator and checksum. Blank,
scanned, truncated and failed pages remain incomplete. Processing stops at 100
pages or the time budget and reports the remaining pages; automatic page-range
continuation/OCR is not implemented. Use an authorized processing workflow for
remaining chapters/pages rather than claiming the entire book was processed.

A qualified administrator must actually examine flagged source sections and
record their exact-section findings and personal attestation. The original parser
flags remain immutable. A current section-resolution record can resolve a
nonblank extracted section; blank/unreadable content cannot be approved by a
checkbox. Hash changes, metadata corrections or reviewer-role revocation invalidate
resolution evidence. Global source verification requires complete extraction and
current human review of all outstanding flags. Parsing alone never verifies a
source, question or lesson.

Link sections to exact canonical objectives as **Candidate**, **Supports** or
**Conflicts**. These are explicit relationships; technical evidence counts also
require current authorized human source review. Blueprint/bibliography/catalog
metadata and CredBuilt explanations do not count as independent technical support.
Current conflicts remain visible and block positive curriculum support scores.

## Bounded maintenance worker

Queue a registered source in Research Studio. That creates persistent work; it
does not run a hidden crawl during the web request. A trusted operator explicitly
runs:

```bash
NEXT_PUBLIC_BROWSER_DEMO=false npm run research:worker -- existing-administrator-subject --execute --max-jobs=10
```

The worker uses a fixed exact-host HTTPS allowlist, public-address checks,
per-redirect policy checks, robots rules, throttling, bounded bytes/time/depth and
reasonable temporary-error backoff. It honors the configured HTTPS proxy and
never falls back to direct access after proxy denial. Authentication, paywalls,
CAPTCHAs and publisher restrictions are not bypassed. Commercial PDF permissions
are bound to the registered host and cannot transfer through another publisher's
redirect. Paid text is not downloaded without explicit processing rights.

Jobs use leases and bounded retries. An expired worker loses its write capability;
a later worker can resume unfinished jobs without duplicating source identity.
ETag/Last-Modified support avoids unnecessary downloads. A 304 response requires
existing indexed evidence; it is not a new successful parse. Parsed versions,
requests, redirects, failures and reviews are retained privately. The worker
schedules at most 50 jobs per invocation with a short scheduling window;
document/network processing also has explicit limits. Larger research is multiple
bounded runs with visible remaining coverage.

## Curriculum and authoring

The master CSV preserves each official statement separately from CredBuilt's
learning outcome, topic, subtopic, four learning levels, candidate sources,
provisional book relevance and current evidence/review status. Title-only book
associations are not confirmed chapter coverage. Mapping all statements does not
make all objectives taught or verified.

Three prioritized excavation, fall-protection and JHA lesson briefs are
source-blocked plans. **Open lesson authoring** loads the existing editor; only an
explicit Save creates a draft. They contain planning prompts, not unsupported
technical explanations or safety assessment answers. A source-blocked authoring
brief cannot pass final editorial approval as a completed lesson.

The prior 100 question drafts and 50-item Domain 1 batch are preserved. Zero new
reference-supported questions were fabricated while access is blocked. Mechanical
checks report structure, objective/citation gaps, answer positions, length clues,
possible contradictions and bounded near-wording candidates. They are review
warnings rather than proof of accuracy, plagiarism, semantic equivalence or legal
applicability. The actual writing audit flags substantial revision work, including
120 of 150 longest keyed options.

Persistent drafting requests are owner-scoped and idempotent. They stay blocked
until current, independently reviewed technical source sections support the
selected objective. Preparing a brief pins source hashes/reviews and contains
citation metadata only. No model is connected, no source text is transmitted and
no question is generated automatically. An author may use an authorized external
tool, then import its JSON/CSV through the existing validated draft-only workflow.
A job can link only actual owned imported AI drafts matching its requested
objective/count; linkage is provenance, not source or answer verification.

Human workflow is **Draft → Source Check → Technical Review → Editorial Review →
Approved → Published**. Technical and editorial decisions are distinct immutable
records. Future publication requires independent authorized editorial sign-off on
the exact revision. Existing publications and historical attempts are preserved.
Final dashboard approval counts require current source, technical and editorial
proof. Publishing remains an administrator action. Approved/published eligibility
continues through the existing four-hour, 200-unique-question engine; shortages
73/40/45/42 remain until enough real publications qualify.

## Migrations and reproduction

- `0011_research_engine.sql`: private inventory, extraction versions, queue/leases,
  immutable retrieval/section/source examination evidence and canonical links.
- `0012_editorial_quality.sql`: separate human editorial decisions and mandatory
  future-publication gate; no existing content is automatically approved.
- `0013_drafting_jobs.sql`: owner-scoped source-pinned requests and actual import
  associations with optimistic revisions.

Earlier migrations are unchanged. No destructive reset or learner-record
replacement is part of deployment. Raw uploads, database files, environment files
and secrets remain excluded from Git.

Rebuild the metadata-only research reports with `npm run research:reports`. To
record a new online access audit, use the explicit bounded Python audit script;
that is an access audit rather than a claim of crawling or textbook processing.
See `TESTING.md` and the completion report for executed validation. Run each
Playwright suite/build sequentially because this checkout shares `.next` files.
