# Database schema

This is the implemented PostgreSQL schema, not the larger target model in the
historical `docs/database-schema.md`. SQL migrations are authoritative; Drizzle
maps the application-used subset in `src/db/schema.ts`.

The current question-bank additions are `0009_reference_registry.sql`
(candidate metadata and immutable human review snapshots) and
`0010_exam_choice_orders.sql` (validated per-attempt option permutations).
Registry verification never supplies question-specific review evidence. Existing
full attempts without a choice-order map retain their original option order.
Earlier migration checksums and learner records are preserved.

## Migrations

| Migration                      | Additions                                                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001_foundation.sql`          | Users, certification/blueprint identity, question versions/source reviews/publication/audit, sessions and bookmarks                                   |
| `0002_learning.sql`            | Immutable lesson revisions and owner/revision progress                                                                                                |
| `0003_learner_profiles.sql`    | Owner-scoped goals/planner profile with optimistic revision                                                                                           |
| `0004_content_studio.sql`      | Trusted editorial roles, immutable revisions/reviews/audit, guarded workflow/publication, JSON import previews and lesson publication                 |
| `0005_curriculum_sources.sql`  | Supplied-document/objective/publication catalog, separate source verification, canonical mapping guards, content reports/triage and editorial indexes |
| `0006_full_length_exams.sql`   | Full-exam metadata/owner request-key uniqueness, domain/history/deadline indexes and immutable full-session validation                                |
| `0007_exam_demo_timing.sql`    | Narrowly guarded shortened demonstration timing; reviewed production attempts retain the four-hour deadline invariant                                 |
| `0008_question_import_ids.sql` | Immutable external question-import IDs per certification, linked to actual imported content for durable batch deduplication                           |

`_credbuilt_migrations(id, sha256)` records applied source hashes. Never rewrite
an applied file; add a numbered migration and register its literal path in
`src/db/client.ts`. The runner checks every hash. Explicit managed migration
jobs use a transaction/advisory lock; normal managed startup verifies the ledger
and rejects pending migrations instead of applying them. Local PGlite may
initialize/update automatically. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Tables

| Table                         | Implemented fields / constraints                                                                                                                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                       | Text primary ID; `identity_mode` demo/managed; created timestamp. No local password or duplicate email store.                                                                                                                                                           |
| `certifications`              | Text ID, name, kind credential_prep/field_course. Only CHST is seeded.                                                                                                                                                                                                  |
| `blueprint_revisions`         | Certification FK, version label, source URL, provenance, verification timestamp/reviewer, JSONB data; unique certification/version; verification fields are paired.                                                                                                     |
| `question_versions`           | Unique logical question/version; certification/optional blueprint FK, optional objective/subtopic, type, domain/topic/difficulty, content kind/origin/review state, author/reviewer/time, JSONB question data. Approval requires an independent reviewer and timestamp. |
| `source_reviews`              | Exact question-version FK, reviewer, source title/URL/version/locator, supports/contradicts/insufficient outcome, notes and review timestamp.                                                                                                                           |
| `published_questions`         | One pointer per logical question to a unique approved version; publisher/time. Trigger validates instructional content, matching verified blueprint/objective and supporting review.                                                                                    |
| `content_audit_events`        | Identity sequence, question-version ID, actor, event and timestamp. Legacy publication audit; append-only after `0004`. Full Studio workflow events are in `studio_audit`.                                                                                              |
| `learning_sessions`           | UUID-valued text ID, owner FK, status, optimistic revision, typed JSONB session snapshot and created timestamp; owner/created index.                                                                                                                                    |
| `full_exam_attempts`          | Existing session FK, owner FK, trusted policy version, development-fixture marker, creation timestamp and unique owner/request key; replay-safe creation identity.                                                                                                      |
| `bookmarks`                   | Composite owner/question ID key, created timestamp. Question identity is logical; it is not a question-version FK.                                                                                                                                                      |
| `lesson_versions`             | Unique lesson ID/version, certification/blueprint FKs, domain/topic, subtopic/objective-code arrays, content/review state, structured lesson JSONB and created timestamp. All revisions are immutable by trigger; demo revisions must be draft.                         |
| `lesson_progress`             | Composite owner/lesson-version FK key, optimistic revision, typed section/check/completion JSONB and updated timestamp; owner/updated index.                                                                                                                            |
| `learner_profiles`            | Owner FK primary key, optimistic revision, versioned profile/checklist JSONB, updated timestamp.                                                                                                                                                                        |
| `editorial_roles`             | Existing user subject + author/reviewer/administrator composite key, trusted granting operator and timestamp. No public role-write API.                                                                                                                                 |
| `studio_content`              | Logical content ID, question/lesson kind, certification, original owner, current revision and optimistic row version; identity/authorship immutable.                                                                                                                    |
| `studio_revisions`            | Exact `content:vN` snapshot, author and timestamp; unique content/revision, append-only.                                                                                                                                                                                |
| `studio_workflow`             | One status/optimistic row version per immutable revision; SQL-enforced transitions and publication relationships.                                                                                                                                                       |
| `studio_reviews`              | Exact revision/reviewer, decision, findings, source-check array and timestamp; append-only and independent of all item contributors.                                                                                                                                    |
| `studio_audit`                | Append-only event identity, actor, optional content/revision, bounded structured event details and timestamp. Includes role/import/workflow events.                                                                                                                     |
| `studio_publications`         | Current logical content → exact revision pointer, publishing administrator and timestamp. Guards require matching reviewed canonical learner snapshot.                                                                                                                  |
| `published_lessons`           | Lesson → immutable lesson-version pointer, publishing administrator and timestamp; guarded against bypassing Studio.                                                                                                                                                    |
| `studio_import_batches`       | Owner-bound validated JSON payload/issues, expiry and consumed timestamp; confirmation is transactional and one-use.                                                                                                                                                    |
| `studio_import_question_ids`  | Certification/external-ID unique identity mapped to imported content, importing actor and timestamp; immutable and used by transactional CSV/JSON confirmation.                                                                                                         |
| `studio_blueprint_reviews`    | Canonical blueprint revision, reviewing administrator, source edition/section/notes, exact objective map and timestamp; append-only.                                                                                                                                    |
| `curriculum_documents`        | Supplied blueprint/bibliography identity, printed version, filename, SHA-256, page count, provenance, latest-version-confirmed flag and structured metadata; immutable.                                                                                                 |
| `curriculum_objectives`       | Certification/blueprint/document FKs, exact official statement, domain, knowledge/skill kind, printed number/page; unique blueprint/domain/kind/number and immutable.                                                                                                   |
| `reference_publications`      | Bibliography document FK, title/edition, regulatory/consensus/guidance/supplemental classification, listed flag, optional HTTPS URL and full bibliographic metadata. Listing alone establishes no answer support.                                                       |
| `studio_source_verifications` | Exact revision, independent reviewer, monotonic event number, verified/changes_requested decision, findings, exact source checks and timestamp; append-only.                                                                                                            |
| `content_error_reports`       | Exact content/revision, reporter, accuracy/citation/ambiguity/other category, concern text and timestamp; append-only.                                                                                                                                                  |
| `content_error_triage`        | Report, authorized actor, monotonic event number, under_review/resolved/dismissed status, notes and timestamp; append-only.                                                                                                                                             |

Most timestamps are `timestamptz` in UTC. Calendar preferences/target dates are
validated date strings. The profile contains certification, target date, study
days/minutes, preference, priority domains, onboarding time and bounded
self-reported task IDs; it does not require a name, email or employer.

## State and historical integrity

Session JSONB stores selected logical IDs and exact `questionVersions` pins,
answers/confidence/response time, flags, mode/status, creation/submission times
and optional deadline/reason/topic. Legacy records without pins mean version 1;
missing pinned content fails rather than substituting a newer key. Selection
deduplicates logical identities before applying filters/counts.

Full attempts reuse session snapshots with `examKind='chst_full_length'`, saved
current position, policy/duration and an optional development-fixture marker.
Migration `0006` enforces 200 distinct IDs with explicit revision pins, a valid
0–199 position, matching owner/status/mode, answers/flags belonging to that
attempt and a 14,400-second deadline. Additive `0007` permits 5–14,400 seconds
only for fully marked, unapproved demonstration fixtures; ordinary published
attempts still require four hours. Identity, pins, policy/deadline and submitted
snapshots cannot be edited. The dedicated service serializes owner-scoped
updates and finalizes expired attempts on access using the fixed deadline;
there is no independent background-expiry worker. See
[current exam activation and lifecycle](docs/exam-activation.md).

Question data contains choice rationales, answer key, explanation and reference;
it stays server-side on server grading paths. `SessionView` and performance DTOs
project only the fields needed by the client. Browser-demo fixtures are public
and do not constitute a protected commercial bank.

Lesson progress belongs to one immutable stored revision. Every required
section/check is validated; checks are server-graded in account mode. Revision
comparisons reject stale writes. Historical progress is retained when a new
lesson version is introduced; only the current revision appears as current
completion. Seed edits need a new lesson version instead of mutating a stored
revision.

## Scope and data access

There is no installed PostgreSQL row-level-security/tenant policy. Current
privacy relies on server-verified identities and owner predicates in the
application services. Runtime DB credentials are trusted and must be restricted;
production roles, a secure editorial CMS and commercial content delivery still
need operational hardening and provider validation. The editorial CMS now has
trusted application roles and SQL guards; database credential holders remain
trusted. Browser-only mode never connects to these tables. Its full demonstration uses
200 public fixtures and the existing local store; it cannot create editorial
roles, verification records or publication pointers.

Question/source details and sessions use JSONB for this small foundation. A
fully normalized source/media catalog, session items, flashcard reviews,
subscriptions, organizations and reporting aggregates are not implemented.
Account deletion, retention and restore automation are not
implemented; foreign keys must not be mistaken for a deletion workflow.

## Editorial state reconciliation

Studio workflow uses `draft → source_verification_pending → source_verified →
technical_review → approved → published → retired`, with `changes_requested`
and `rejected` decisions. Separate source evidence is mandatory for approval
and publication, including legacy in-flight technical reviews. Revisions never change in
place: an edit creates the next draft and preserves all prior decisions. The
legacy question row retains `review_status='approved'`; publication is represented
by pointer tables, not by adding an incompatible legacy status. Studio advances
to `published` only after canonical snapshot and both publication pointers match
in the same transaction. Replacement retires the superseded workflow revision;
retirement removes active pointers without deleting canonical history.

Source evidence, Studio reviews/revisions/audit and reviewed blueprint records
are append-only. Approval/publication require exact canonical objective/domain
mapping, source edition/locator, independent supporting checks and matching
reviewed content. Verified blueprint identity/data cannot be edited in place;
changed source material requires a new registered blueprint revision. None of
these migrations marks the existing provisional CHST blueprint verified.

## Supplied CHST curriculum and scale boundary

`seedAttachedCurriculum` adds the attached `chst5-2022.04.12` revision with four
exact domain weights, all 78 objective rows and 21 bibliography records from
V.2021.06.09. It checks immutable identity/wording against the canonical catalog
before idempotent insertion. It does not populate `verified_at`, create a human
review or confirm the latest online version. The older provisional blueprint,
questions and learner pins remain intact. Supplied PDFs and copyrighted book
contents are not stored in the repository.

The 100 original AI question records are not automatic seed data. A trusted
explicit import assigns an existing authorized author and creates stable
`v1` drafts plus audit; identical repeat imports skip, conflicting existing
content rejects without overwrite. Browser demo uses a separate public
demonstration projection, never canonical published pointers.

Objective/domain indexes and certification/kind indexes support editorial
filtering; the Studio list paginates 25 rows with a true total, including records
beyond the first page. Coverage derives current draft/review totals and active
publication counts separately. This schema has no 100-question cap and targets
2,000+ records per certification. The dedicated full-exam candidate loader now
uses keyset pagination across active publication pointers. Large-bank load
tests, broader practice-query scaling, normalized session items and operations
remain separate scale work.

Source verification records exact URL/edition/section and per-source findings.
A source without a URL must match a registered physical publication's title
and edition and still include an exact locator. A bibliography row alone does
not satisfy verification. The latest source/triage decision uses monotonic event
numbers, avoiding timestamp ties. Source currency/link monitoring is not
implemented; freshness remains unknown unless separately examined.

Planner JSON also stores a seven-day assignment snapshot (date, lesson revision, activity kind and rationale). Refreshing the plan explicitly replaces assignments using current evidence; lesson completion does not silently reorder them. Old profiles without a snapshot are readable and gain one on the next saved action.

## Imported question identifiers

Administrator Question Bank CSV/JSON imports separate optional external stable
IDs from system-generated logical content UUIDs. A preview validates canonical
mapping, four choices/key, explanations, candidate citations and duplicate IDs.
The immutable `studio_import_question_ids` mapping is unique per certification
and external ID; confirmation persists it with the draft creation in one
transaction. Duplicate existing IDs reject rather than overwriting an earlier
question. Imported candidates remain drafts and must pass the existing separate
source-verification, technical-review and administrator-publication gates.
