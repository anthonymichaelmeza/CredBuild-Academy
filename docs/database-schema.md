# Database schema design

Status: target logical PostgreSQL schema. The first implementation is a deliberately smaller subset in src/db/migrations/0001_foundation.sql, with Drizzle mappings, local PostgreSQL execution, and integration tests. This document includes future tables and constraints; it must not be read as a list of already-applied migrations or complete production permissions. Typed JSONB carries question details and session snapshots in the initial slice. See README.md and validation.md for the implemented boundary.

Use UUID primary keys, `timestamptz` timestamps in UTC, explicit foreign keys, and indexed foreign-key columns. Keep reporting numbers derived from attempts rather than storing invented dashboard metrics. Server ownership checks are mandatory even where database permissions provide additional protection.

## Catalog and blueprint revisions

| Table                   | Principal columns and constraints                                                                                                                                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `certifications`        | `id`, unique `slug`, `name`, `provider_name`, `kind` (`credential_prep` or `field_course`), `status`; CHST is the first track, not a global assumption                                                                                                            |
| `blueprint_revisions`   | `id`, `certification_id`, `version_label`, `source_url`, `source_title`, `source_published_at`, `effective_from`, `effective_until`, `retrieved_at`, `document_sha256`, `review_status`, `reviewed_by`, `reviewed_at`; unique `(certification_id, version_label)` |
| `blueprint_domains`     | `id`, `blueprint_revision_id`, `code`, `title`, `weight_basis_points`, `source_locator`, `position`; unique `(blueprint_revision_id, code)`; weight between 0 and 10,000                                                                                          |
| `blueprint_objectives`  | `id`, `blueprint_revision_id`, `domain_id`, `code`, `title`, `source_locator`; unique `(blueprint_revision_id, code)`; composite FK ensures domain belongs to the same blueprint revision                                                                         |
| `topics`                | `id`, `certification_id`, `slug`, `title`; unique `(certification_id, slug)`                                                                                                                                                                                      |
| `exam_policy_revisions` | `id`, `certification_id`, `blueprint_revision_id`, `version`, `question_count`, `duration_seconds`, `scoring_policy`, `status`, `source_locator`; positive count and duration; no invented default duration                                                       |

Blueprint activation is transactional: authorized source review must exist, domains must have a valid total weight where weighting is specified, objective relationships must be consistent, and effective dates must not overlap for active revisions of a certification. Preserve old revisions for historical sessions. Field courses may have no exam policy; never force every course into a BCSP model.

## Identity

| Table         | Principal columns and constraints                                                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`       | `id`, unique `auth_subject`, `display_name`, `created_at`, `updated_at`, `deleted_at`; managed authentication owns credentials                                              |
| `user_roles`  | `user_id`, `role` (`learner`, `reviewer`, `administrator`), `granted_by`, `granted_at`; primary key `(user_id, role)`; role assignment restricted to trusted administration |
| `enrollments` | `id`, `user_id`, `certification_id`, `created_at`; unique `(user_id, certification_id)`; payment entitlement is a later separate concern                                    |

## Questions, sources, and approval

| Table                  | Principal columns and constraints                                                                                                                                                                                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `questions`            | `id`, `certification_id`, `created_by`, `created_at`, `archived_at`; stable logical identity across versions                                                                                                                                                                                                                                                               |
| `question_versions`    | `id`, `question_id`, `version_number`, `blueprint_revision_id`, `primary_objective_id`, `topic_id`, `difficulty` (`introductory`, `intermediate`, `advanced`), `stem`, `explanation`, `origin`, `origin_details`, `content_kind` (`demonstration`, `instructional`), `review_status`, `created_by`, `created_at`, `content_sha256`; unique `(question_id, version_number)` |
| `question_choices`     | `id`, `question_version_id`, `choice_key`, `text`, `position`, optional `distractor_rationale`; unique `(question_version_id, choice_key)` and `(question_version_id, position)`                                                                                                                                                                                           |
| `question_answer_keys` | `question_version_id` PK, `correct_choice_id`; composite FK `(question_version_id, correct_choice_id)` targets the choice's own version; accessible only to server grading and editorial services                                                                                                                                                                          |
| `technical_sources`    | `id`, `title`, `publisher`, `edition`, `url`, `document_identifier`, `retrieved_at`, optional `document_sha256`; citation metadata does not imply review                                                                                                                                                                                                                   |
| `question_citations`   | `id`, `question_version_id`, `source_id`, `locator`, `claim_supported`; source and precise section/page identify what was checked                                                                                                                                                                                                                                          |
| `source_reviews`       | `id`, `question_citation_id`, `reviewer_id`, `outcome` (`supports`, `contradicts`, `insufficient`), `notes`, `reviewed_at`; evidence applies to this citation and version, not all questions citing the document                                                                                                                                                           |
| `content_reviews`      | `id`, `question_version_id`, `reviewer_id`, `decision` (`request_changes`, `approve`, `reject`), `notes`, `created_at`; append-only review history                                                                                                                                                                                                                         |
| `publication_events`   | `id`, `question_version_id`, `actor_id`, `event` (`publish`, `withdraw`), `reason`, `created_at`; append-only audit trail                                                                                                                                                                                                                                                  |
| `published_questions`  | `question_id` PK, unique `question_version_id`, `published_at`, `published_by`; at most one current published version per logical question                                                                                                                                                                                                                                 |

`primary_objective_id` determines the primary domain through its objective; do not independently store a potentially contradictory domain. Additional objective mappings can use `question_version_objectives` if real editorial requirements call for them. Composite keys or constrained write functions enforce that objective, topic, blueprint, and question belong to the same certification.

Review states are `draft`, `in_review`, `changes_requested`, `approved`, and `rejected`. Publication is a separate operation, not an editable status string. Origin is one of `human_authored`, `ai_generated`, or `imported`; approving AI-generated content does not erase its origin.

### Publication invariant

A dedicated transaction or database function must lock the question and candidate version, check all of the following, write the publication pointer, and append the audit event together:

1. The actor has the appropriate administrative permission and the content is instructional, not demonstration.
2. The exact version has at least two nonempty unique choices, one valid answer key, a nonempty explanation, and the required metadata.
3. The primary objective belongs to a reviewed, active blueprint for the correct certification.
4. Required citations have supporting reviews by authorized reviewers, with locators and review timestamps. Missing, contradictory, and insufficient evidence blocks publication.
5. A qualified reviewer other than the version author has approved this exact immutable version after its supporting evidence was reviewed.
6. No edit has occurred after approval. Reviewable versions are frozen on submission; requested edits create a new version. Choices, answer keys, citations, and review evidence follow the same immutability rules.

The regular application database role cannot insert or update publication pointers, grant roles, fabricate source reviews, or mutate frozen versions directly. A dedicated editorial operation checks the authenticated actor and uses narrowly scoped database privileges. Protect the invariant with grants and triggers/functions as well as service checks; an application convention alone is insufficient. Demo content is supplied by a separate provider and cannot enter the publication table.

Withdrawing a question prevents future selection. Preserve pinned historical versions for existing attempts; handle urgently invalid content through an explicit void/regrade policy and audit event rather than rewriting prior answers.

## Learning sessions

| Table               | Principal columns and constraints                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `learning_sessions` | `id`, `user_id`, `certification_id`, `blueprint_revision_id`, optional `exam_policy_revision_id`, `mode` (`practice` or `exam`), `content_kind`, `requested_count`, `configuration` JSONB, `selection_policy_version`, `scoring_policy_version`, `status` (`in_progress`, `submitted`, `expired`, `abandoned`), `started_at`, `deadline_at`, `submitted_at`, `correct_count`, `question_count`, unique per-user creation `idempotency_key` |
| `session_questions` | `id`, `session_id`, `question_version_id`, `position`, `choice_order` JSONB; unique `(session_id, position)` and `(session_id, question_version_id)`; immutable once the session starts                                                                                                                                                                                                                                                    |
| `session_answers`   | `session_question_id` PK, `selected_choice_id`, `confidence` (`low`, `medium`, `high` or null), `is_flagged`, `answered_at`, `graded_at`, `is_correct`, `explanation_revealed_at`, `revision`; selected choice must belong to the pinned question version                                                                                                                                                                                  |
| `answer_events`     | `id`, `session_question_id`, `selected_choice_id`, `confidence`, `created_at`, `event_kind`; optional append-only history when needed for audit/retry analysis                                                                                                                                                                                                                                                                             |
| `bookmarks`         | `user_id`, `question_id`, `created_at`; primary key `(user_id, question_id)`; bookmarks resolve to a currently eligible version when starting a new session                                                                                                                                                                                                                                                                                |

`configuration` holds validated filters and selection options, not arbitrary SQL or authoritative authorization state. Relational columns carry identity, lifecycle, ownership, and constraints. JSON structures receive versioned Zod validation.

Practice counts are restricted to 10, 25, 50, 100, or 200 by the service and database check. Exam count and duration must match the selected immutable exam policy. Both modes require enough distinct eligible questions. Selection and snapshot creation are one transaction; do not silently reduce a request or sample with replacement.

Do not mix demonstration and instructional questions in a session. Demo question versions may be stored in PostgreSQL for authenticated demo persistence, but have no publication pointer and are available only through an explicitly selected demo provider. Demonstration analytics always remain visibly separate.

Practice locks an answer when its explanation is revealed to preserve first-attempt results; retries create a new practice attempt. Exam answers remain editable until submission or deadline, and neither the key nor explanation is exposed before finalization. Concurrent answer updates and finalization lock the same session row; a late request cannot overwrite a submitted result. Submission is idempotent and computes totals from the stored snapshot within the transaction. Unanswered questions count as incorrect in overall session accuracy and are reported separately.

Use a composite relationship or trigger to ensure each selected answer belongs to its pinned question version. Never accept client-computed correctness, scores, ownership, or deadlines. Server comparisons use database time. A scheduled expiry job and request-time finalization share the same idempotent operation.

## Learning and reference expansion

| Table                 | Principal columns and constraints                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `courses`             | `id`, `certification_id`, `slug`, `title`, `status`; unique `(certification_id, slug)`                                                                                                           |
| `lesson_versions`     | `id`, `course_id`, `lesson_key`, `version_number`, `title`, `body`, `position`, `review_status`, `content_kind`; the same origin/source/approval policy applies before instructional publication |
| `lesson_progress`     | `user_id`, `lesson_version_id`, `status`, `completed_at`; primary key `(user_id, lesson_version_id)`                                                                                             |
| `reference_resources` | `id`, `certification_id`, `source_id`, `title`, `description`, `review_status`, `published_at`; do not redistribute restricted source material without permission                                |

## Indexes and analytics

Index session history on `(user_id, started_at DESC)`, eligible versions by certification/objective/difficulty, session questions by session, source reviews by citation, and bookmarks by user. Add partial indexes for active/expired sessions once the actual queries are implemented. Use keyset pagination for large history and question-bank views.

Compute accuracy by domain/topic/objective from pinned question versions, count distinct attempts, distinguish unattempted from zero accuracy, and report sample size. Exclude demonstration attempts from approved-bank aggregates by default. Avoid readiness percentages, pass predictions, or implied psychometric validity. Add materialized aggregates only after measured query costs justify them.

## Required database tests

- Cross-certification objective and selected-choice mismatches fail.
- Unreviewed, self-approved, demonstration, stale-version, and unsupported-source publication attempts fail.
- Approved content, choices, answer keys, and citation evidence cannot be mutated in place.
- Session selection is distinct, immutable, and does not accept an insufficient pool.
- Two users cannot read or mutate each other's sessions or bookmarks through application APIs.
- Concurrent submission and answer updates yield one consistent final result; deadline checks use server time.
- Withdrawal blocks future selection without changing historical results.
- Clean migrations and idempotent demo seeds work against a temporary PostgreSQL database; never run destructive tests against a user's database.
