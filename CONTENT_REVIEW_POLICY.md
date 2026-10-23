# Content review policy

CredBuilt Academy is independent and is not affiliated with or endorsed by
BCSP. Content must not be described as source-verified or approved unless the
exact supporting material and revision have actually been reviewed.

## Current content and supplied documents

The original 12 AI-generated demonstration questions and eight representative
lessons remain unreviewed. The new 100 original AI instructional drafts also
have **zero source verification, technical approval or publication**. Their
browser projection is explicitly demonstration content, not a production bank.
Source URLs and bibliography entries are discovery/candidate references, not
evidence of answer support.

The complete supplied CHST5 blueprint **V.2022.04.12** and bibliography
**V.2021.06.09** were read and transcribed, preserving all 78 statements and 21
listings. Exact attachment transcription is distinct from independent human
technical review. Online-version checks were blocked by the environment's
CONNECT proxy before reaching the target service; the latest official versions
remain unconfirmed. No official duration, passing score or source-verification
date is invented. The older provisional blueprint remains for historical
compatibility. See [document provenance](docs/chst-source-provenance.md).

The new batch is original AI working material, not copied official BCSP exam
questions or a copyrighted commercial bank. Isolated fictional QA approvals test
the guards; they are not production content, actual technical reviews or seed
approvals. Content cannot be promoted merely to meet quantity targets.

## Operational workflow and trusted roles

**Draft → Source Verification Pending → Source Verified → Technical Review →
Approved → Published → Retired**

Source examination may request changes. Technical reviewers may request changes
or reject a submitted revision. Addressing a decision creates a new immutable
draft; approval/source evidence never transfers automatically. Revising approved
or published content also creates a draft while preserving the released snapshot.
An administrator replaces or retires the prior publication separately. Historical
attempts retain their exact content versions.

Protected `/studio` and `/api/studio` use trusted server-stored roles:

- **Learner:** no editorial access.
- **Author:** create/revise own question/lesson drafts and request source
  examination or submit for technical review.
- **Technical reviewer:** independently examine sources and separately record
  technical review. Anyone who contributed to the logical item is excluded from
  reviewing it, including an administrator who authored a revision.
- **Administrator:** author/revise, record actual canonical blueprint review and
  publish/retire eligible revisions. Administrator alone does not grant
  technical-review permission.

Roles are granted/revoked only through the trusted operator CLI after a verified
managed subject and first saved activity exist. There is no public role selector.
Browser-demo mode cannot use Studio. Explicit local test access is restricted to
non-production, non-Vercel execution and requires database roles. See
[editorial operations](docs/editorial-workflow.md) and
[CHST setup](docs/chst-content-engine.md).

## Separate source examination and technical approval

Keep origin (`ai_generated`, `human_authored`, `imported`) separate from status.
AI generation, successful import and source verification are not technical
approval. Every review applies to the exact immutable revision.

Record certification, canonical blueprint revision, domain, exact objective,
topic/subtopic, instructional content and candidate references. Each source needs
a classification, title, edition and exact supporting locator before approval.
A public HTTPS URL is used when available. A physical book without a URL must
match a registered publication's identity, exact title and edition; the reviewer
must still actually examine its cited section. Unknown fields may remain empty
in a draft; they block positive verification/approval rather than receiving
invented textbook pages or standards sections.

An independent authorized source examiner records findings, supporting/
contradictory/insufficient outcomes, exact citation metadata, timestamp and human
attestation. Every cited reference must have a distinct supporting check for
positive source verification. Technical review then separately checks correctness,
answer and distractor quality, explanations, calculations/units, diagrams/media,
rights, lesson claims and knowledge checks. Calculation/multi-step questions need
worked reasoning; image questions require original/licensed described images.
The canonical blueprint needs actual human review and an exact objective/domain
map before technical approval/publication.

Classify each source as a **regulatory requirement**, **consensus standard**,
**professional guidance** or **supplemental learning resource**. Legal
applicability depends on identified jurisdiction/scope; a consensus standard or
textbook is not automatically binding law. BCSP bibliography inclusion does not
prove support for an answer. Unknown currency/link status stays unknown; an old
publication year alone does not establish that a source is outdated.

The application records attestations and evidence; it cannot establish that a
person read a source or independently guarantee technical truth. It does not
fetch, scrape or auto-approve external references. Respect copyright/licensing,
including restricted standards. Do not upload licensed source text or private
review/customer material into the public repository.

## Server, SQL and historical enforcement

The Studio service validates schemas, identity/role, exact revision and optimistic
row version inside transactions. Migration `0004` adds immutable revisions,
independent reviews and transactional publication/audit. Additive `0005` separates
source-verification events, requires exact supporting citation metadata and
current reviewer authorization at approval/publication, and orders evidence by
monotonic event number. It also guards the canonical attached objective/domain
mapping. Migrations `0001`–`0004` are preserved.

Legacy question states remain `draft/in_review/changes_requested/approved/
rejected`; Studio records the expanded workflow separately and uses publication
pointers. Legacy items already in technical review can request source examination
but cannot bypass it to approve/publish. All 78 canonical statements must be
preserved in a human blueprint review. CredBuilt's objective IDs encode the
printed statement location; they are not BCSP-issued codes. Seeding exact
attachments does not mark the blueprint independently verified.

Only an administrator may publish the current approved revision. The transaction
rechecks separate source evidence and technical approval, materializes the exact
reviewed learner snapshot, sets matching publication pointers and appends audit.
Retirement removes active pointers without deleting canonical learner history.
Unpublished drafts never enter connected production selection. Safe learner DTOs
withhold keys/references until appropriate feedback and after exam submission.
Paid entitlements remain future work.

## Import, coverage and content reports

Structured JSON import validates at most 50 question records, previews
errors/duplicates and requires owner-bound expiring one-use confirmation. It
creates drafts transactionally and preserves declared AI/human origin while
recording ingestion separately. Client approval, role or verification fields are
rejected. The separate trusted `content:import-chst` command imports the stable-ID
100-question AI batch under an existing authorized author; it cannot create
identities, grant roles, verify, approve or publish. Identical repeats skip;
conflicts reject without overwrite. Public fixture totals must not be mistaken
for database import counts.

Protected `/studio/coverage` reads actual current database heads and active
publication pointers, including question/domain/objective/status totals and
coverage gaps. Reported source currency is unknown, not an invented outdated
count. Connected learners can report current published or owned historical
content. Authorized reviewer/administrator triage is append-only; resolving a
concern does not automatically edit, verify, approve, retire or republish content.
The public `/admin` inspector and denying `/api/admin` remain separate.

## Before beta or commercial publication

Actually examine the technical references and the current official blueprint,
record editions/locators/reviewer evidence, resolve all draft accuracy concerns
and complete independent technical approval. Confirm that the supplied versions
remain applicable. Add reviewed instructional lessons; study outlines alone do
not provide a complete approved curriculum. A 300-reviewed-question private beta
is a future target, followed by 1,000 and 2,000 reviewed-content targets. Quantity
must not replace source verification or review.

Complete live-provider validation, least-privilege database access, editorial
operator training and operational/security checks before commercial use. Local
tests, successful imports and fictional QA approvals do not satisfy those gates.
