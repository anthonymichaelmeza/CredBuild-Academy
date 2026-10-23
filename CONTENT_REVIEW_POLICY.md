# Content review policy

CredBuilt Academy is independent and is not affiliated with or endorsed by
BCSP. Content must not be described as source-verified or approved unless the
exact supporting material and revision have actually been reviewed.

## Current content

The 12 original AI-generated questions and eight representative lessons remain
unreviewed demonstrations. Source URLs are discovery links, not evidence of
technical verification. CHST5 headings/weights came from the product brief and
are provisional. Official-source retrieval is blocked by the workspace proxy;
no official objective mapping, duration or passing score has been invented.
There are **zero approved commercial questions and zero verified technical
sources** supplied by this milestone.

Demo content remains labeled in lessons, configuration, answering and results.
It cannot be promoted to meet a question-count target. No official examination
items are reproduced or claimed. Isolated fictional QA fixtures test publication
rules; they are not instructional seed content or actual source reviews.

## Operational workflow

**Draft → Technical Review → Approved → Published → Retired**

Technical reviewers may instead request changes or reject a submitted revision.
The author creates a new draft revision to address either decision. Revising an
approved/published item also creates a new draft; it does not alter the approved
snapshot or reuse approval. A previously published revision remains available
until an administrator replaces or retires it. Historical learner attempts keep
their exact question/lesson versions.

The protected `/studio` interface and `/api/studio` service enforce this workflow
using trusted server-stored roles:

- **Learner:** no editorial access.
- **Author:** create/revise own question/lesson drafts and submit for review.
- **Technical reviewer:** inspect and review submitted items. Every contributor
  to the logical item is excluded from independent review, including an
  administrator who authored a revision.
- **Administrator:** create/revise, record canonical blueprint reviews and
  publish/retire eligible content. Administrator alone does not grant technical
  reviewer permission.

There is no public role-grant action. A trusted operator grants/revokes roles
through the CLI after the managed subject exists. Browser-demo mode cannot use
the Studio. Local test identities require explicit non-production opt-in and
are disabled on Vercel. See [editorial operations](docs/editorial-workflow.md).

## Evidence required for approval

Keep origin (`ai_generated`, `human_authored`, `imported`) separate from status.
AI generation or successful import is never evidence of correctness.

The submitted immutable revision must include certification, canonical blueprint
revision, domain, exact objective code, topic/subtopic, content and authoritative
references. Each reference records title, public HTTPS URL, edition and exact
supporting section. The canonical blueprint must have a recorded human review
and matching objective/domain map. An independently reviewed source check must
support every cited reference and contain findings. Approval records reviewer,
timestamp, exact revision, source outcomes and explicit human attestation.

Review the answer, every distractor, explanations, calculations/units, media
rights and factual accuracy, knowledge checks and lesson claims against the
actual source. Calculation/multi-step questions require worked steps;
image-supported questions require licensed/original images with descriptions
and rights metadata. Unsupported or contradictory source evidence blocks
approval. Demonstration material cannot enter the instructional bank.

The application records human attestations; it cannot establish that a person
actually read a source. A valid URL or completed form does not independently
verify technical truth. The service does not fetch, scrape or auto-approve
external references. Respect copyright and licensing, including restricted
standards. Do not upload licensed source material to the public repository.

## Server and database enforcement

`src/modules/studio/service.ts` validates schemas, authorization, exact revision
and optimistic row version inside transactions. `0004_content_studio.sql`
adds append-only revision/review/source/audit records and SQL workflow,
independence, canonical blueprint and publication guards. Migration `0001` stays
unchanged. Legacy question states remain `draft/in_review/changes_requested/
approved/rejected`; the new Studio workflow uses `technical_review` and
publication pointers rather than rewriting historical rows.

Only a trusted administrator can publish an approved current revision. The
transaction materializes the exact reviewed immutable learner snapshot, sets
matching Studio and learner pointers, advances workflow and appends audit.
Retirement removes current pointers while preserving history. Published learner
APIs apply safe projections; unpublished drafts and grading keys are not sent
to learners. Paid entitlements remain future work.

Structured JSON bulk import validates at most 50 question records, reports
duplicates/errors and requires confirmation of an owner-bound expiring preview.
Confirmation rechecks duplicates and inserts all records as drafts in one
transaction. Imported records cannot supply approval, roles or review evidence.
The public `/admin` inspector remains read-only and `/api/admin` still denies
writes; these are separate from protected Content Studio.

## Before commercial use

Obtain and actually review the current official blueprint and technical sources.
Register new canonical revisions as needed; never relabel supplied provisional
metadata as official without comparing the actual document. Record source
edition, exact locators, review dates, reviewer identity and durable provenance.
Complete live-provider validation, least-privilege database access, editorial
operator training, independent review and operational/security checks before
commercial publication. Policy tests and isolated fixtures do not complete
those gates.
