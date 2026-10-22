CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  identity_mode text NOT NULL CHECK (identity_mode IN ('demo', 'managed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS certifications (
  id text PRIMARY KEY, name text NOT NULL, kind text NOT NULL CHECK (kind IN ('credential_prep', 'field_course'))
);
CREATE TABLE IF NOT EXISTS blueprint_revisions (
  id text PRIMARY KEY, certification_id text NOT NULL REFERENCES certifications(id),
  version_label text NOT NULL, source_url text NOT NULL,
  provenance text NOT NULL, verified_at timestamptz, verified_by text,
  data jsonb NOT NULL, UNIQUE(certification_id, version_label),
  CHECK ((verified_at IS NULL) = (verified_by IS NULL))
);
CREATE TABLE IF NOT EXISTS question_versions (
  id text PRIMARY KEY, question_id text NOT NULL, version integer NOT NULL CHECK(version > 0),
  certification_id text NOT NULL REFERENCES certifications(id),
  blueprint_revision_id text REFERENCES blueprint_revisions(id), objective_code text, subtopic text,
  question_type text NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'scenario', 'calculation', 'image_hazard', 'multi_step')),
  domain text NOT NULL, topic text NOT NULL, difficulty text NOT NULL,
  content_kind text NOT NULL CHECK(content_kind IN ('demonstration', 'instructional')),
  origin text NOT NULL CHECK(origin IN ('ai_generated', 'human_authored', 'imported')),
  review_status text NOT NULL CHECK(review_status IN ('draft', 'in_review', 'changes_requested', 'approved', 'rejected')),
  author_id text NOT NULL, reviewer_id text, reviewed_at timestamptz,
  data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(question_id, version),
  CHECK (review_status <> 'approved' OR (reviewer_id IS NOT NULL AND reviewer_id <> author_id AND reviewed_at IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS source_reviews (
  id text PRIMARY KEY, question_version_id text NOT NULL REFERENCES question_versions(id),
  reviewer_id text NOT NULL, source_title text NOT NULL, source_url text NOT NULL,
  source_version text NOT NULL, source_locator text NOT NULL,
  outcome text NOT NULL CHECK(outcome IN ('supports', 'contradicts', 'insufficient')),
  notes text NOT NULL, reviewed_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS published_questions (
  question_id text PRIMARY KEY, question_version_id text NOT NULL UNIQUE REFERENCES question_versions(id),
  published_by text NOT NULL, published_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS content_audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, question_version_id text NOT NULL,
  actor_id text NOT NULL, event text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION check_publication() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE q question_versions; b blueprint_revisions;
BEGIN
  SELECT * INTO q FROM question_versions WHERE id = NEW.question_version_id FOR UPDATE;
  IF q.question_id <> NEW.question_id OR q.content_kind <> 'instructional' OR q.review_status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved instructional versions may be published';
  END IF;
  SELECT * INTO b FROM blueprint_revisions WHERE id = q.blueprint_revision_id;
  IF b.id IS NULL OR b.verified_at IS NULL OR b.certification_id <> q.certification_id OR q.objective_code IS NULL THEN
    RAISE EXCEPTION 'Reviewed matching blueprint and objective required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM source_reviews WHERE question_version_id = q.id AND outcome = 'supports' AND reviewer_id <> q.author_id AND reviewed_at <= q.reviewed_at AND length(source_locator) > 0)
    OR EXISTS (SELECT 1 FROM source_reviews WHERE question_version_id = q.id AND outcome <> 'supports') THEN
    RAISE EXCEPTION 'Supporting source review required';
  END IF;
  INSERT INTO content_audit_events(question_version_id, actor_id, event) VALUES (q.id, NEW.published_by, 'publish');
  RETURN NEW;
END $$;
CREATE TRIGGER guard_publication BEFORE INSERT OR UPDATE ON published_questions FOR EACH ROW EXECUTE FUNCTION check_publication();
CREATE OR REPLACE FUNCTION freeze_reviewed_question() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.review_status = 'approved' OR
    (OLD.review_status = 'in_review' AND (TG_OP = 'DELETE' OR
      (to_jsonb(NEW) - 'review_status' - 'reviewer_id' - 'reviewed_at') IS DISTINCT FROM
      (to_jsonb(OLD) - 'review_status' - 'reviewer_id' - 'reviewed_at'))) THEN
    RAISE EXCEPTION 'Create a new version instead of mutating reviewed content';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_reviewed_question BEFORE UPDATE OR DELETE ON question_versions FOR EACH ROW EXECUTE FUNCTION freeze_reviewed_question();
CREATE TABLE IF NOT EXISTS learning_sessions (
  id text PRIMARY KEY, owner_id text NOT NULL REFERENCES users(id),
  status text NOT NULL CHECK(status IN ('in_progress', 'submitted')),
  revision integer NOT NULL DEFAULT 0, data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_owner_created ON learning_sessions(owner_id, created_at DESC);
CREATE TABLE IF NOT EXISTS bookmarks (
  owner_id text NOT NULL REFERENCES users(id), question_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner_id, question_id)
);
CREATE INDEX IF NOT EXISTS question_eligibility ON question_versions(certification_id, content_kind, review_status, domain);
