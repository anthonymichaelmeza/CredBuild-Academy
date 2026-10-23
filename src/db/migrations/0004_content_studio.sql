-- Content Studio is additive. Legacy demo revisions and migration checksums are preserved.
CREATE TABLE editorial_roles (
  subject_id text NOT NULL REFERENCES users(id),
  role text NOT NULL CHECK (role IN ('author', 'reviewer', 'administrator')),
  granted_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subject_id, role)
);
CREATE TABLE studio_content (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('question', 'lesson')),
  certification_id text NOT NULL REFERENCES certifications(id),
  owner_id text NOT NULL REFERENCES users(id),
  current_revision integer NOT NULL DEFAULT 1 CHECK (current_revision > 0),
  row_version integer NOT NULL DEFAULT 0 CHECK (row_version >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_content_owner ON studio_content(owner_id, created_at DESC);
CREATE TABLE studio_revisions (
  id text PRIMARY KEY,
  content_id text NOT NULL REFERENCES studio_content(id),
  revision integer NOT NULL CHECK (revision > 0),
  author_id text NOT NULL REFERENCES users(id),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_id, revision),
  CHECK (id = content_id || ':v' || revision::text)
);
CREATE TABLE studio_workflow (
  revision_id text PRIMARY KEY REFERENCES studio_revisions(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'technical_review', 'changes_requested', 'rejected', 'approved', 'published', 'retired')),
  row_version integer NOT NULL DEFAULT 0 CHECK (row_version >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_workflow_status ON studio_workflow(status, updated_at DESC);
CREATE TABLE studio_reviews (
  id text PRIMARY KEY,
  revision_id text NOT NULL REFERENCES studio_revisions(id),
  reviewer_id text NOT NULL REFERENCES users(id),
  decision text NOT NULL CHECK (decision IN ('approved', 'changes_requested', 'rejected')),
  findings text NOT NULL CHECK (length(btrim(findings)) > 0),
  source_checks jsonb NOT NULL CHECK (jsonb_typeof(source_checks) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_reviews_revision ON studio_reviews(revision_id, created_at DESC);
CREATE TABLE studio_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  content_id text,
  revision_id text,
  actor_id text NOT NULL,
  event text NOT NULL CHECK (length(btrim(event)) > 0),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_audit_content ON studio_audit(content_id, id);
CREATE TABLE studio_publications (
  content_id text PRIMARY KEY REFERENCES studio_content(id),
  revision_id text NOT NULL UNIQUE REFERENCES studio_revisions(id),
  published_by text NOT NULL REFERENCES users(id),
  published_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE studio_import_batches (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES users(id),
  payload jsonb NOT NULL,
  errors jsonb NOT NULL CHECK (jsonb_typeof(errors) = 'array'),
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);
CREATE INDEX studio_import_owner_expiry ON studio_import_batches(owner_id, expires_at);
CREATE TABLE studio_blueprint_reviews (
  id text PRIMARY KEY,
  blueprint_revision_id text NOT NULL REFERENCES blueprint_revisions(id),
  reviewer_id text NOT NULL REFERENCES users(id),
  source_url text NOT NULL CHECK (source_url ~ '^https://'),
  edition text NOT NULL CHECK (length(btrim(edition)) > 0),
  section text NOT NULL CHECK (length(btrim(section)) > 0),
  notes text NOT NULL CHECK (length(btrim(notes)) > 0),
  objectives jsonb NOT NULL CHECK (jsonb_typeof(objectives) = 'array' AND jsonb_array_length(objectives) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_blueprint_review_revision ON studio_blueprint_reviews(blueprint_revision_id, created_at DESC);
CREATE TABLE published_lessons (
  lesson_id text PRIMARY KEY,
  lesson_version_id text NOT NULL UNIQUE REFERENCES lesson_versions(id),
  published_by text NOT NULL REFERENCES users(id),
  published_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION studio_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; create a new revision or event', TG_TABLE_NAME;
END $$;
CREATE TRIGGER studio_revision_immutable BEFORE UPDATE OR DELETE ON studio_revisions FOR EACH ROW EXECUTE FUNCTION studio_append_only();
CREATE TRIGGER studio_review_immutable BEFORE UPDATE OR DELETE ON studio_reviews FOR EACH ROW EXECUTE FUNCTION studio_append_only();
CREATE TRIGGER studio_audit_immutable BEFORE UPDATE OR DELETE ON studio_audit FOR EACH ROW EXECUTE FUNCTION studio_append_only();
CREATE TRIGGER studio_blueprint_review_immutable BEFORE UPDATE OR DELETE ON studio_blueprint_reviews FOR EACH ROW EXECUTE FUNCTION studio_append_only();
CREATE TRIGGER reviewed_sources_immutable BEFORE UPDATE OR DELETE ON source_reviews FOR EACH ROW EXECUTE FUNCTION studio_append_only();
CREATE TRIGGER legacy_audit_immutable BEFORE UPDATE OR DELETE ON content_audit_events FOR EACH ROW EXECUTE FUNCTION studio_append_only();

CREATE FUNCTION studio_content_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id <> OLD.id OR NEW.owner_id <> OLD.owner_id OR NEW.kind <> OLD.kind OR NEW.certification_id <> OLD.certification_id OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Content identity and original authorship are immutable';
  END IF;
  IF NEW.current_revision < OLD.current_revision THEN
    RAISE EXCEPTION 'A content head cannot return to an older revision';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER studio_content_identity BEFORE UPDATE ON studio_content FOR EACH ROW EXECUTE FUNCTION studio_content_identity_guard();

-- Independent review means independent of every contributor to the logical item,
-- even when an administrator also possesses the technical-review role.
CREATE FUNCTION studio_independent_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r studio_revisions; c studio_content; w studio_workflow;
BEGIN
  SELECT * INTO r FROM studio_revisions WHERE id = NEW.revision_id;
  SELECT * INTO c FROM studio_content WHERE id = r.content_id;
  SELECT * INTO w FROM studio_workflow WHERE revision_id = r.id FOR UPDATE;
  IF w.status IS DISTINCT FROM 'technical_review' THEN
    RAISE EXCEPTION 'Only a submitted exact revision can be reviewed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM editorial_roles WHERE subject_id = NEW.reviewer_id AND role = 'reviewer') THEN
    RAISE EXCEPTION 'A trusted technical-review role is required';
  END IF;
  IF NEW.reviewer_id = c.owner_id OR EXISTS (SELECT 1 FROM studio_revisions WHERE content_id = c.id AND author_id = NEW.reviewer_id) THEN
    RAISE EXCEPTION 'Authors cannot review their own content';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER studio_review_independence BEFORE INSERT ON studio_reviews FOR EACH ROW EXECUTE FUNCTION studio_independent_review_guard();

CREATE FUNCTION studio_blueprint_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE b blueprint_revisions;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM editorial_roles WHERE subject_id = NEW.reviewer_id AND role = 'administrator') THEN
    RAISE EXCEPTION 'Only a trusted administrator can record blueprint verification';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.objectives) AS objective WHERE
    jsonb_typeof(objective) <> 'object' OR
    coalesce(btrim(objective->>'code'), '') = '' OR
    coalesce(btrim(objective->>'domain'), '') = '' OR
    coalesce(btrim(objective->>'title'), '') = '') THEN
    RAISE EXCEPTION 'Verified objectives require code, domain and title';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(NEW.objectives)) <>
    (SELECT count(DISTINCT objective->>'code') FROM jsonb_array_elements(NEW.objectives) AS objective) THEN
    RAISE EXCEPTION 'Verified objective codes cannot be duplicated';
  END IF;
  SELECT * INTO b FROM blueprint_revisions WHERE id = NEW.blueprint_revision_id;
  IF jsonb_typeof(b.data) IS DISTINCT FROM 'array' OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(NEW.objectives) AS objective WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(b.data) AS domain WHERE domain->>'code' = objective->>'domain')) THEN
    RAISE EXCEPTION 'Verified objectives must belong to canonical blueprint domains';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER studio_blueprint_review_authority BEFORE INSERT ON studio_blueprint_reviews FOR EACH ROW EXECUTE FUNCTION studio_blueprint_review_guard();

CREATE FUNCTION studio_verified_blueprint_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.verified_at IS NOT NULL OR NEW.verified_by IS NOT NULL THEN
      RAISE EXCEPTION 'New blueprint revisions must begin unverified';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.verified_at IS NOT NULL OR OLD.verified_by IS NOT NULL THEN
    RAISE EXCEPTION 'Verified blueprint revisions are immutable; create a new version';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NEW.id <> OLD.id OR NEW.certification_id <> OLD.certification_id OR NEW.version_label <> OLD.version_label THEN
    RAISE EXCEPTION 'Blueprint identity is immutable';
  END IF;
  IF NEW.verified_at IS NOT NULL OR NEW.verified_by IS NOT NULL THEN
    IF NEW.verified_at IS NULL OR NEW.verified_by IS NULL OR NOT EXISTS (
      SELECT 1 FROM studio_blueprint_reviews WHERE blueprint_revision_id = NEW.id AND reviewer_id = NEW.verified_by AND source_url = NEW.source_url) THEN
      RAISE EXCEPTION 'Canonical blueprint verification requires an immutable administrator review record';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER studio_blueprint_verification BEFORE INSERT OR UPDATE OR DELETE ON blueprint_revisions FOR EACH ROW EXECUTE FUNCTION studio_verified_blueprint_guard();

CREATE FUNCTION studio_import_batch_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id <> OLD.id OR NEW.owner_id <> OLD.owner_id OR NEW.payload IS DISTINCT FROM OLD.payload OR NEW.errors IS DISTINCT FROM OLD.errors OR
    NEW.created_at <> OLD.created_at OR NEW.expires_at <> OLD.expires_at THEN
    RAISE EXCEPTION 'An import preview is immutable';
  END IF;
  IF OLD.consumed_at IS NOT NULL OR NEW.consumed_at IS NULL OR OLD.expires_at <= now() OR jsonb_array_length(OLD.errors) > 0 THEN
    RAISE EXCEPTION 'Only an unexpired valid import preview can be consumed once';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER studio_import_consumption BEFORE UPDATE ON studio_import_batches FOR EACH ROW EXECUTE FUNCTION studio_import_batch_guard();

-- Called at both approval and publication. Source-check timestamps and subjects
-- are supplied by the authenticated server, never imported content metadata.
CREATE FUNCTION studio_require_approval(target_revision text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r studio_revisions; c studio_content; b blueprint_revisions; review studio_reviews; source jsonb;
BEGIN
  SELECT * INTO r FROM studio_revisions WHERE id = target_revision;
  SELECT * INTO c FROM studio_content WHERE id = r.content_id;
  IF r.id IS NULL OR c.id IS NULL OR r.data->>'contentKind' IS DISTINCT FROM 'instructional' THEN
    RAISE EXCEPTION 'Only instructional content can be approved or published';
  END IF;
  IF r.data->>'certificationId' IS DISTINCT FROM c.certification_id OR r.data->>'kind' IS DISTINCT FROM c.kind THEN
    RAISE EXCEPTION 'Content mapping does not match its immutable identity';
  END IF;
  SELECT * INTO b FROM blueprint_revisions WHERE id = r.data->>'blueprintRevisionId';
  IF b.id IS NULL OR b.verified_at IS NULL OR b.verified_by IS NULL OR b.certification_id <> c.certification_id OR
    NOT EXISTS (SELECT 1 FROM studio_blueprint_reviews br WHERE br.blueprint_revision_id = b.id AND br.reviewer_id = b.verified_by AND
      br.objectives @> jsonb_build_array(jsonb_build_object('code', r.data->>'objectiveCode', 'domain', r.data->>'domain'))) THEN
    RAISE EXCEPTION 'An actually reviewed matching blueprint and objective are required';
  END IF;
  SELECT * INTO review FROM studio_reviews WHERE revision_id = r.id ORDER BY created_at DESC, id DESC LIMIT 1;
  IF review.id IS NULL OR review.decision <> 'approved' OR review.reviewer_id = c.owner_id OR
    EXISTS (SELECT 1 FROM studio_revisions WHERE content_id = c.id AND author_id = review.reviewer_id) THEN
    RAISE EXCEPTION 'Independent approval of this exact content revision is required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM editorial_roles WHERE subject_id = review.reviewer_id AND role = 'reviewer') THEN
    RAISE EXCEPTION 'The approving technical reviewer must remain authorized';
  END IF;
  IF jsonb_typeof(r.data->'sources') IS DISTINCT FROM 'array' OR jsonb_array_length(r.data->'sources') = 0 THEN
    RAISE EXCEPTION 'Reviewed technical source evidence is required';
  END IF;
  IF (SELECT count(DISTINCT cited->>'id') FROM jsonb_array_elements(r.data->'sources') AS cited) <> jsonb_array_length(r.data->'sources') OR
    (SELECT count(DISTINCT evidence->>'sourceId') FROM jsonb_array_elements(review.source_checks) AS evidence) <> jsonb_array_length(review.source_checks) THEN
    RAISE EXCEPTION 'Source and evidence identifiers must be unique';
  END IF;
  IF jsonb_array_length(review.source_checks) <> jsonb_array_length(r.data->'sources') OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(review.source_checks) AS evidence
    WHERE evidence->>'outcome' IS DISTINCT FROM 'supports' OR coalesce(btrim(evidence->>'notes'), '') = '') THEN
    RAISE EXCEPTION 'Every cited source requires an independent supporting source check';
  END IF;
  FOR source IN SELECT * FROM jsonb_array_elements(r.data->'sources') LOOP
    IF coalesce(btrim(source->>'id'), '') = '' OR coalesce(btrim(source->>'title'), '') = '' OR
      coalesce(source->>'url', '') !~ '^https://' OR coalesce(btrim(source->>'edition'), '') = '' OR coalesce(btrim(source->>'section'), '') = '' OR
      (SELECT count(*) FROM jsonb_array_elements(review.source_checks) AS evidence WHERE evidence->>'sourceId' = source->>'id' AND evidence->>'outcome' = 'supports') <> 1 THEN
      RAISE EXCEPTION 'A cited source is missing its title, URL, edition, exact section or independent evidence';
    END IF;
  END LOOP;
END $$;

CREATE FUNCTION studio_workflow_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c studio_content; r studio_revisions;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Editorial workflow history cannot be deleted'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' OR NEW.row_version <> 0 THEN RAISE EXCEPTION 'New revisions must begin as drafts'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.revision_id <> OLD.revision_id OR NEW.row_version <> OLD.row_version + 1 THEN
    RAISE EXCEPTION 'Workflow identity is immutable and updates require a new row version';
  END IF;
  IF NOT ((OLD.status = 'draft' AND NEW.status = 'technical_review') OR
    (OLD.status = 'technical_review' AND NEW.status IN ('approved', 'changes_requested', 'rejected')) OR
    (OLD.status = 'approved' AND NEW.status IN ('published', 'retired')) OR
    (OLD.status = 'published' AND NEW.status = 'retired')) THEN
    RAISE EXCEPTION 'Invalid editorial transition; changes require a new draft revision';
  END IF;
  SELECT * INTO r FROM studio_revisions WHERE id = NEW.revision_id;
  SELECT * INTO c FROM studio_content WHERE id = r.content_id;
  IF NEW.status IN ('technical_review', 'approved', 'published') AND r.revision <> c.current_revision THEN
    RAISE EXCEPTION 'Only the current exact revision can advance';
  END IF;
  IF NEW.status = 'approved' THEN PERFORM studio_require_approval(r.id); END IF;
  IF NEW.status IN ('changes_requested', 'rejected') AND NOT EXISTS (
    SELECT 1 FROM studio_reviews WHERE revision_id = r.id AND decision = NEW.status) THEN
    RAISE EXCEPTION 'A recorded independent review decision is required';
  END IF;
  IF NEW.status = 'published' THEN
    IF NOT EXISTS (SELECT 1 FROM studio_publications WHERE content_id = c.id AND revision_id = r.id) OR
      (c.kind = 'question' AND NOT EXISTS (SELECT 1 FROM published_questions WHERE question_id = c.id AND question_version_id = r.id)) OR
      (c.kind = 'lesson' AND NOT EXISTS (SELECT 1 FROM published_lessons WHERE lesson_id = c.id AND lesson_version_id = r.id)) THEN
      RAISE EXCEPTION 'Publication requires matching Studio and learner pointers in the same transaction';
    END IF;
  END IF;
  IF NEW.status = 'retired' AND (EXISTS (SELECT 1 FROM studio_publications WHERE revision_id = r.id) OR
    EXISTS (SELECT 1 FROM published_questions WHERE question_version_id = r.id) OR
    EXISTS (SELECT 1 FROM published_lessons WHERE lesson_version_id = r.id)) THEN
    RAISE EXCEPTION 'Remove active publication pointers before retirement';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER studio_workflow_transitions BEFORE INSERT OR UPDATE OR DELETE ON studio_workflow FOR EACH ROW EXECUTE FUNCTION studio_workflow_guard();

CREATE FUNCTION studio_publication_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r studio_revisions; c studio_content; w studio_workflow; q question_versions; l lesson_versions; review studio_reviews;
BEGIN
  SELECT * INTO r FROM studio_revisions WHERE id = NEW.revision_id;
  SELECT * INTO c FROM studio_content WHERE id = NEW.content_id;
  SELECT * INTO w FROM studio_workflow WHERE revision_id = NEW.revision_id FOR UPDATE;
  IF r.content_id IS DISTINCT FROM c.id OR r.revision IS DISTINCT FROM c.current_revision OR w.status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Only the current approved revision may be published';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM editorial_roles WHERE subject_id = NEW.published_by AND role = 'administrator') THEN
    RAISE EXCEPTION 'Only a trusted administrator may publish';
  END IF;
  PERFORM studio_require_approval(r.id);
  SELECT * INTO review FROM studio_reviews WHERE revision_id = r.id ORDER BY created_at DESC, id DESC LIMIT 1;
  IF c.kind = 'question' THEN
    SELECT * INTO q FROM question_versions WHERE id = r.id;
    IF q.id IS NULL OR q.question_id <> c.id OR q.version <> r.revision OR q.certification_id <> c.certification_id OR q.content_kind <> 'instructional' OR q.review_status <> 'approved' OR
      q.author_id <> r.author_id OR q.reviewer_id IS DISTINCT FROM review.reviewer_id OR q.blueprint_revision_id IS DISTINCT FROM r.data->>'blueprintRevisionId' OR q.objective_code IS DISTINCT FROM r.data->>'objectiveCode' OR q.domain IS DISTINCT FROM r.data->>'domain' OR
      q.data->>'id' IS DISTINCT FROM c.id OR q.data->>'version' IS DISTINCT FROM r.revision::text OR q.data->>'domain' IS DISTINCT FROM r.data->>'domain' OR q.data->>'topic' IS DISTINCT FROM r.data->>'topic' OR
      q.data->>'difficulty' IS DISTINCT FROM r.data#>>'{body,difficulty}' OR q.data->>'contentKind' IS DISTINCT FROM 'instructional' OR q.question_type IS DISTINCT FROM r.data#>>'{body,type}' OR
      q.data->>'stem' IS DISTINCT FROM r.data#>>'{body,stem}' OR q.data->'choices' IS DISTINCT FROM r.data#>'{body,choices}' OR q.data->>'correctChoice' IS DISTINCT FROM r.data#>>'{body,correctChoice}' OR
      q.data->>'explanation' IS DISTINCT FROM r.data#>>'{body,explanation}' OR coalesce(q.data->'media', '[]'::jsonb) IS DISTINCT FROM r.data#>'{body,media}' OR
      coalesce(q.data->'solutionSteps', '[]'::jsonb) IS DISTINCT FROM r.data#>'{body,solutionSteps}' THEN
      RAISE EXCEPTION 'Learner question snapshot must match the independently reviewed revision';
    END IF;
  ELSE
    SELECT * INTO l FROM lesson_versions WHERE id = r.id;
    IF l.id IS NULL OR l.lesson_id <> c.id OR l.version <> r.revision OR l.certification_id <> c.certification_id OR l.content_kind <> 'instructional' OR l.review_status NOT IN ('approved', 'published') OR
      l.blueprint_revision_id IS DISTINCT FROM r.data->>'blueprintRevisionId' OR l.domain IS DISTINCT FROM r.data->>'domain' OR
      l.data->>'id' IS DISTINCT FROM c.id OR l.data->>'version' IS DISTINCT FROM r.revision::text OR l.data->>'certification' IS DISTINCT FROM c.certification_id OR l.data->>'domain' IS DISTINCT FROM r.data->>'domain' OR
      l.data->>'topic' IS DISTINCT FROM r.data->>'topic' OR l.data->>'contentKind' IS DISTINCT FROM 'instructional' OR l.data->>'title' IS DISTINCT FROM r.data->>'title' OR
      l.data->>'summary' IS DISTINCT FROM r.data#>>'{body,summary}' OR l.data->'objectives' IS DISTINCT FROM r.data#>'{body,objectives}' OR
      l.data->'sections' IS DISTINCT FROM r.data#>'{body,sections}' OR l.data->'checks' IS DISTINCT FROM r.data#>'{body,checks}' OR
      l.data->>'readingMinutes' IS DISTINCT FROM r.data#>>'{body,readingMinutes}' OR l.data->'questionIds' IS DISTINCT FROM r.data#>'{body,questionIds}' OR
      coalesce(jsonb_array_length(l.data->'media'), 0) <> jsonb_array_length(r.data#>'{body,media}') OR coalesce(l.data->>'transcript', '') IS DISTINCT FROM r.data#>>'{body,transcript}' OR
      coalesce(l.data->'prerequisites', '[]'::jsonb) IS DISTINCT FROM r.data#>'{body,prerequisites}' OR coalesce(l.data->'relatedLessonIds', '[]'::jsonb) IS DISTINCT FROM r.data#>'{body,relatedLessonIds}' THEN
      RAISE EXCEPTION 'Learner lesson snapshot must match the independently reviewed revision';
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(r.data#>'{body,media}') WITH ORDINALITY AS source(asset, position)
      LEFT JOIN LATERAL jsonb_array_elements(coalesce(l.data->'media', '[]'::jsonb)) WITH ORDINALITY AS canonical(asset, position) ON canonical.position = source.position
      WHERE canonical.asset->>'url' IS DISTINCT FROM source.asset->>'url' OR canonical.asset->>'kind' IS DISTINCT FROM source.asset->>'kind' OR
        canonical.asset->>'title' IS DISTINCT FROM source.asset->>'alt' OR canonical.asset->>'caption' IS DISTINCT FROM source.asset->>'rights' OR
        canonical.asset->>'captionsUrl' IS DISTINCT FROM source.asset->>'captionsUrl' OR canonical.asset->>'transcript' IS DISTINCT FROM source.asset->>'transcript') THEN
      RAISE EXCEPTION 'Learner media must match its reviewed URLs, descriptions and rights';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER studio_publication_authority BEFORE INSERT OR UPDATE ON studio_publications FOR EACH ROW EXECUTE FUNCTION studio_publication_guard();

CREATE FUNCTION studio_question_pointer_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM studio_publications p JOIN studio_content c ON c.id = p.content_id WHERE c.kind = 'question' AND
    p.content_id = NEW.question_id AND p.revision_id = NEW.question_version_id AND p.published_by = NEW.published_by) OR
    NOT EXISTS (SELECT 1 FROM editorial_roles WHERE subject_id = NEW.published_by AND role = 'administrator') THEN
    RAISE EXCEPTION 'Question publication requires a matching authorized Studio publication';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER studio_question_publication BEFORE INSERT OR UPDATE ON published_questions FOR EACH ROW EXECUTE FUNCTION studio_question_pointer_guard();
CREATE FUNCTION studio_lesson_pointer_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM studio_publications p JOIN studio_content c ON c.id = p.content_id WHERE c.kind = 'lesson' AND
    p.content_id = NEW.lesson_id AND p.revision_id = NEW.lesson_version_id AND p.published_by = NEW.published_by) OR
    NOT EXISTS (SELECT 1 FROM editorial_roles WHERE subject_id = NEW.published_by AND role = 'administrator') THEN
    RAISE EXCEPTION 'Lesson publication requires a matching authorized Studio publication';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER studio_lesson_publication BEFORE INSERT OR UPDATE ON published_lessons FOR EACH ROW EXECUTE FUNCTION studio_lesson_pointer_guard();
