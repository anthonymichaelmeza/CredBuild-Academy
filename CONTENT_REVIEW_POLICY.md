# Content review policy

CredBuilt Academy is independent and is not affiliated with or endorsed by
BCSP. Content must not be described as source-verified or approved unless the
exact supporting material and revision have actually been reviewed.

## Current content

The 12 original AI-generated questions and eight representative lessons are
unreviewed demonstrations. The source URLs are discovery links, not evidence of
technical verification. CHST5 headings/weights came from the product brief and
are provisional. Official blueprint retrieval is blocked by the workspace's
proxy; no official objective mapping, duration or passing score has been invented.
There are **zero approved commercial questions and zero verified technical
sources** in this milestone.

Demo content remains labeled throughout lessons, configuration, answering and
results. It may support development/testing but cannot be promoted merely to
meet a question-count target. No official exam items are reproduced or claimed.

## Required workflow

**Draft → Technical Review → Approved → Published → Retired**

`src/modules/content/review.ts` implements a tested pure transition policy:

- Keep origin (AI-generated/human-authored/imported) separate from status.
- Require a verified blueprint revision, domain and exact objective mapping.
- Require an explanation and supporting sources with title, HTTPS URL, edition,
  exact section, reviewer, review date and notes.
- Source reviewers and the approving technical reviewer must be independent of
  the author. Technical approval belongs to the exact revision and follows the
  supporting source reviews.
- Authorized reviewers approve/request changes; administrators publish/retire.
  Demonstration content cannot enter the published instructional bank.
- Revision creates a draft, invalidates approval/source-review assertions and
  preserves prior events. Reviewed material is not silently changed in place.

This policy expects a trusted server caller. Passing a role string into a pure
function is not authentication or an operational publishing API.

## Database and interface boundary

`0001_foundation.sql` rejects demonstration publication, self-approval and
publication without a matching verified blueprint/objective/supporting review.
Reviewed question content is protected from in-place changes. SQL question
statuses currently use `draft/in_review/changes_requested/approved/rejected`,
with publication in a separate pointer table; this differs from the pure policy
above. That mapping must be reconciled transactionally before a real editor is
enabled. Source evidence immutability, full field validation and every workflow
audit event also need the completed editorial service.

The `/admin` page is a public read-only inspector of demo requirements.
`/api/admin` denies writes; no learner can publish through it. Lesson revisions
are immutable demo drafts in the database, not a completed approved lesson CMS.
Do not claim that a policy test or rejection trigger alone establishes a secure
content-management workflow.

## Before instructional publication

Obtain the current official blueprint and technical source material. Record the
document/version, retrieval/verification date, exact relevant section, reviewer
and durable provenance. Verify answer, distractors, explanation, calculations,
units, images and lesson claims against actual reviewed material. Link the
review to the exact content revision and record any limitations/disagreement.

Build authenticated author/reviewer/admin roles, a validated editor/importer,
source-review capture, rejection/resubmission, immutable version history,
publication/retirement and append-only audit records. Verify server/database
boundaries, including self-approval, stale revisions, missing sources and role
escalation. Respect source/media licensing and do not redistribute restricted
standards. Expand the reviewed bank gradually; a full exam stays blocked until
each required domain has enough distinct eligible questions.
