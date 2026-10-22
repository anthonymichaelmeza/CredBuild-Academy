-- Immutable curriculum revisions keep learner history attached to the material studied.
CREATE TABLE lesson_versions (
  id text PRIMARY KEY,
  lesson_id text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  certification_id text NOT NULL REFERENCES certifications(id),
  blueprint_revision_id text NOT NULL REFERENCES blueprint_revisions(id),
  domain text NOT NULL,
  topic text NOT NULL,
  subtopics jsonb NOT NULL,
  objective_codes jsonb NOT NULL,
  content_kind text NOT NULL CHECK (content_kind IN ('demonstration', 'instructional')),
  review_status text NOT NULL CHECK (review_status IN ('draft', 'technical_review', 'approved', 'published', 'retired')),
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, version),
  CHECK (content_kind <> 'demonstration' OR review_status = 'draft')
);
CREATE INDEX lessons_certification_domain ON lesson_versions(certification_id, domain, topic);
CREATE FUNCTION freeze_lesson_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Create a new lesson revision instead of changing historical content';
END $$;
CREATE TRIGGER immutable_lesson_revision BEFORE UPDATE OR DELETE ON lesson_versions
  FOR EACH ROW EXECUTE FUNCTION freeze_lesson_revision();
CREATE TABLE lesson_progress (
  owner_id text NOT NULL REFERENCES users(id),
  lesson_version_id text NOT NULL REFERENCES lesson_versions(id),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, lesson_version_id)
);
CREATE INDEX progress_owner_updated ON lesson_progress(owner_id, updated_at DESC);
