-- Supplied-document curriculum and separate source examination, additive to 0004.
CREATE TABLE curriculum_documents (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK(kind IN ('blueprint','bibliography')),
  version text NOT NULL,
  filename text NOT NULL,
  sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
  pages integer NOT NULL CHECK(pages > 0),
  provenance text NOT NULL,
  current_official_version_confirmed boolean NOT NULL DEFAULT false,
  data jsonb NOT NULL
);
CREATE TABLE curriculum_objectives (
  id text PRIMARY KEY,
  certification_id text NOT NULL REFERENCES certifications(id),
  blueprint_revision_id text NOT NULL REFERENCES blueprint_revisions(id),
  document_id text NOT NULL REFERENCES curriculum_documents(id),
  domain text NOT NULL,
  kind text NOT NULL CHECK(kind IN ('knowledge','skill')),
  official_number integer NOT NULL CHECK(official_number > 0),
  statement text NOT NULL,
  page integer NOT NULL CHECK(page > 0),
  UNIQUE(blueprint_revision_id,domain,kind,official_number)
);
CREATE INDEX curriculum_objective_track_domain ON curriculum_objectives(certification_id,blueprint_revision_id,domain);
CREATE TABLE reference_publications (
  id text PRIMARY KEY,
  document_id text REFERENCES curriculum_documents(id),
  title text NOT NULL,
  edition text NOT NULL DEFAULT '',
  classification text NOT NULL CHECK(classification IN ('regulatory_requirement','consensus_standard','professional_guidance','supplemental_resource')),
  bibliography_listed boolean NOT NULL DEFAULT false,
  url text,
  data jsonb NOT NULL
);
CREATE INDEX reference_publication_title ON reference_publications(title);
CREATE FUNCTION curriculum_blueprint_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM curriculum_objectives WHERE blueprint_revision_id=NEW.blueprint_revision_id) AND
    ((SELECT count(*) FROM curriculum_objectives WHERE blueprint_revision_id=NEW.blueprint_revision_id)<>jsonb_array_length(NEW.objectives) OR EXISTS(
      SELECT 1 FROM curriculum_objectives o WHERE o.blueprint_revision_id=NEW.blueprint_revision_id AND NOT EXISTS(
        SELECT 1 FROM jsonb_array_elements(NEW.objectives) candidate WHERE candidate->>'code'=o.id AND candidate->>'domain'=o.domain AND candidate->>'title'=o.statement))) THEN
    RAISE EXCEPTION 'Supplied blueprint reviews must preserve every canonical objective and its exact statement';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER curriculum_blueprint_review_exact BEFORE INSERT ON studio_blueprint_reviews FOR EACH ROW EXECUTE FUNCTION curriculum_blueprint_review_guard();
CREATE FUNCTION curriculum_draft_mapping_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM curriculum_objectives WHERE blueprint_revision_id=NEW.data->>'blueprintRevisionId') AND coalesce(NEW.data->>'objectiveCode','')<>'' AND
    NOT EXISTS(SELECT 1 FROM curriculum_objectives WHERE blueprint_revision_id=NEW.data->>'blueprintRevisionId' AND id=NEW.data->>'objectiveCode' AND domain=NEW.data->>'domain') THEN
    RAISE EXCEPTION 'Draft objective must belong to the canonical attached blueprint domain';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER curriculum_revision_mapping BEFORE INSERT ON studio_revisions FOR EACH ROW EXECUTE FUNCTION curriculum_draft_mapping_guard();
CREATE TABLE studio_source_verifications (
  id text PRIMARY KEY,
  event_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  revision_id text NOT NULL REFERENCES studio_revisions(id),
  reviewer_id text NOT NULL REFERENCES users(id),
  decision text NOT NULL CHECK(decision IN ('verified','changes_requested')),
  findings text NOT NULL CHECK(length(btrim(findings)) > 0),
  source_checks jsonb NOT NULL CHECK(jsonb_typeof(source_checks)='array'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_source_verification_revision ON studio_source_verifications(revision_id,created_at DESC);
CREATE TRIGGER studio_source_verification_immutable BEFORE UPDATE OR DELETE ON studio_source_verifications FOR EACH ROW EXECUTE FUNCTION studio_append_only();
CREATE TRIGGER curriculum_objective_immutable BEFORE UPDATE OR DELETE ON curriculum_objectives FOR EACH ROW EXECUTE FUNCTION studio_append_only();
CREATE TRIGGER curriculum_document_immutable BEFORE UPDATE OR DELETE ON curriculum_documents FOR EACH ROW EXECUTE FUNCTION studio_append_only();

ALTER TABLE studio_workflow DROP CONSTRAINT studio_workflow_status_check;
ALTER TABLE studio_workflow ADD CONSTRAINT studio_workflow_status_check CHECK(status IN ('draft','source_verification_pending','source_verified','technical_review','changes_requested','rejected','approved','published','retired'));

CREATE FUNCTION studio_source_verification_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r studio_revisions; c studio_content; source jsonb; evidence jsonb; w studio_workflow;
BEGIN
  SELECT * INTO r FROM studio_revisions WHERE id=NEW.revision_id;
  SELECT * INTO c FROM studio_content WHERE id=r.content_id;
  SELECT * INTO w FROM studio_workflow WHERE revision_id=r.id FOR UPDATE;
  IF r.revision IS DISTINCT FROM c.current_revision OR w.status NOT IN ('source_verification_pending','technical_review') THEN
    RAISE EXCEPTION 'Only a current revision awaiting source examination may receive evidence';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM editorial_roles WHERE subject_id=NEW.reviewer_id AND role='reviewer') OR
    NEW.reviewer_id=c.owner_id OR EXISTS(SELECT 1 FROM studio_revisions WHERE content_id=c.id AND author_id=NEW.reviewer_id) THEN
    RAISE EXCEPTION 'Independent authorized source examination is required';
  END IF;
  IF NEW.decision='verified' THEN
    IF jsonb_array_length(r.data->'sources')=0 OR jsonb_array_length(NEW.source_checks)<>jsonb_array_length(r.data->'sources') OR
      (SELECT count(DISTINCT x->>'sourceId') FROM jsonb_array_elements(NEW.source_checks) x)<>jsonb_array_length(NEW.source_checks) THEN
      RAISE EXCEPTION 'Every source needs a distinct examination record';
    END IF;
    FOR source IN SELECT * FROM jsonb_array_elements(r.data->'sources') LOOP
      SELECT x INTO evidence FROM jsonb_array_elements(NEW.source_checks) x WHERE x->>'sourceId'=source->>'id';
      IF evidence IS NULL OR evidence->>'outcome' IS DISTINCT FROM 'supports' OR coalesce(btrim(evidence->>'notes'),'')='' OR
        coalesce(btrim(source->>'edition'),'')='' OR coalesce(btrim(source->>'section'),'')='' OR (coalesce(source->>'url','') !~ '^https://' AND NOT EXISTS(SELECT 1 FROM reference_publications publication WHERE publication.id=source->>'bibliographyId' AND publication.title=source->>'title' AND publication.edition=source->>'edition')) OR
        evidence->>'edition' IS DISTINCT FROM source->>'edition' OR evidence->>'section' IS DISTINCT FROM source->>'section' OR evidence->>'url' IS DISTINCT FROM source->>'url' THEN
        RAISE EXCEPTION 'Source examination must support the exact cited URL, edition and locator';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER studio_source_verification_authority BEFORE INSERT ON studio_source_verifications FOR EACH ROW EXECUTE FUNCTION studio_source_verification_guard();

CREATE FUNCTION studio_require_source_verification(target_revision text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE record studio_source_verifications; r studio_revisions; c studio_content;
BEGIN
  SELECT * INTO record FROM studio_source_verifications WHERE revision_id=target_revision ORDER BY event_number DESC LIMIT 1;
  SELECT * INTO r FROM studio_revisions WHERE id=target_revision;
  SELECT * INTO c FROM studio_content WHERE id=r.content_id;
  IF record.id IS NULL OR record.decision<>'verified' OR NOT EXISTS(SELECT 1 FROM editorial_roles WHERE subject_id=record.reviewer_id AND role='reviewer') OR
    record.reviewer_id=c.owner_id OR EXISTS(SELECT 1 FROM studio_revisions WHERE content_id=c.id AND author_id=record.reviewer_id) THEN
    RAISE EXCEPTION 'Separate independent source verification of this exact revision is required';
  END IF;
END $$;
CREATE FUNCTION studio_technical_review_source_gate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.decision='approved' THEN PERFORM studio_require_source_verification(NEW.revision_id); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER studio_technical_source_requirement BEFORE INSERT ON studio_reviews FOR EACH ROW EXECUTE FUNCTION studio_technical_review_source_gate();
ALTER FUNCTION studio_require_approval(text) RENAME TO studio_require_approval_v04;
CREATE OR REPLACE FUNCTION studio_require_approval_v04(target_revision text) RETURNS void LANGUAGE plpgsql AS $$
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
      (coalesce(source->>'url', '') !~ '^https://' AND NOT EXISTS(SELECT 1 FROM reference_publications publication WHERE publication.id=source->>'bibliographyId' AND publication.title=source->>'title' AND publication.edition=source->>'edition')) OR coalesce(btrim(source->>'edition'), '') = '' OR coalesce(btrim(source->>'section'), '') = '' OR
      (SELECT count(*) FROM jsonb_array_elements(review.source_checks) AS evidence WHERE evidence->>'sourceId' = source->>'id' AND evidence->>'outcome' = 'supports') <> 1 THEN
      RAISE EXCEPTION 'A cited source is missing its title, URL, edition, exact section or independent evidence';
    END IF;
  END LOOP;
END $$;

CREATE FUNCTION studio_require_approval(target_revision text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM studio_require_approval_v04(target_revision);
  PERFORM studio_require_source_verification(target_revision);
  IF EXISTS(SELECT 1 FROM studio_revisions r CROSS JOIN LATERAL jsonb_array_elements(r.data->'sources') source WHERE r.id=target_revision AND coalesce(source->>'classification','') NOT IN ('regulatory_requirement','consensus_standard','professional_guidance','supplemental_resource')) THEN
    RAISE EXCEPTION 'Every source requires an explicit regulatory, consensus, guidance or supplemental classification';
  END IF;
END $$;
CREATE FUNCTION studio_source_publication_gate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM studio_require_approval(NEW.revision_id);
  RETURN NEW;
END $$;
CREATE TRIGGER studio_separate_source_publication BEFORE INSERT OR UPDATE ON studio_publications FOR EACH ROW EXECUTE FUNCTION studio_source_publication_gate();

CREATE OR REPLACE FUNCTION studio_workflow_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c studio_content; r studio_revisions;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Editorial workflow history cannot be deleted'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status<>'draft' OR NEW.row_version<>0 THEN RAISE EXCEPTION 'New revisions must begin as drafts'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.revision_id<>OLD.revision_id OR NEW.row_version<>OLD.row_version+1 THEN RAISE EXCEPTION 'Workflow updates require a new row version'; END IF;
  IF NOT ((OLD.status='draft' AND NEW.status IN ('source_verification_pending','technical_review')) OR
    (OLD.status='source_verification_pending' AND NEW.status IN ('source_verified','changes_requested')) OR
    (OLD.status='source_verified' AND NEW.status='technical_review') OR
    (OLD.status='technical_review' AND NEW.status IN ('source_verification_pending','source_verified','approved','changes_requested','rejected')) OR
    (OLD.status='approved' AND NEW.status IN ('published','retired')) OR (OLD.status='published' AND NEW.status='retired')) THEN
    RAISE EXCEPTION 'Invalid editorial transition; changes require a new draft revision';
  END IF;
  SELECT * INTO r FROM studio_revisions WHERE id=NEW.revision_id;
  SELECT * INTO c FROM studio_content WHERE id=r.content_id;
  IF NEW.status IN ('source_verification_pending','source_verified','technical_review','approved','published') AND r.revision<>c.current_revision THEN
    RAISE EXCEPTION 'Only the current exact revision can advance';
  END IF;
  IF NEW.status='source_verified' THEN PERFORM studio_require_source_verification(r.id); END IF;
  IF NEW.status='approved' THEN PERFORM studio_require_approval(r.id); END IF;
  IF NEW.status IN ('changes_requested','rejected') AND NOT EXISTS(SELECT 1 FROM studio_reviews WHERE revision_id=r.id AND decision=NEW.status) AND
    NOT EXISTS(SELECT 1 FROM studio_source_verifications WHERE revision_id=r.id AND decision=NEW.status) THEN RAISE EXCEPTION 'A recorded independent decision is required'; END IF;
  IF NEW.status='published' AND (NOT EXISTS(SELECT 1 FROM studio_publications WHERE content_id=c.id AND revision_id=r.id) OR
    (c.kind='question' AND NOT EXISTS(SELECT 1 FROM published_questions WHERE question_id=c.id AND question_version_id=r.id)) OR
    (c.kind='lesson' AND NOT EXISTS(SELECT 1 FROM published_lessons WHERE lesson_id=c.id AND lesson_version_id=r.id))) THEN
    RAISE EXCEPTION 'Matching Studio and learner publication pointers are required';
  END IF;
  IF NEW.status='retired' AND (EXISTS(SELECT 1 FROM studio_publications WHERE revision_id=r.id) OR EXISTS(SELECT 1 FROM published_questions WHERE question_version_id=r.id) OR EXISTS(SELECT 1 FROM published_lessons WHERE lesson_version_id=r.id)) THEN
    RAISE EXCEPTION 'Remove publication pointers before retirement';
  END IF;
  RETURN NEW;
END $$;

CREATE TABLE content_error_reports (
  id text PRIMARY KEY,
  content_id text NOT NULL REFERENCES studio_content(id),
  revision_id text NOT NULL REFERENCES studio_revisions(id),
  reporter_id text NOT NULL REFERENCES users(id),
  category text NOT NULL CHECK(category IN ('accuracy','citation','ambiguity','other')),
  message text NOT NULL CHECK(length(btrim(message))>0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE content_error_triage (
  id text PRIMARY KEY,
  event_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  report_id text NOT NULL REFERENCES content_error_reports(id),
  actor_id text NOT NULL REFERENCES users(id),
  status text NOT NULL CHECK(status IN ('under_review','resolved','dismissed')),
  notes text NOT NULL CHECK(length(btrim(notes))>0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_error_report_content ON content_error_reports(content_id,created_at DESC);
CREATE TRIGGER content_error_report_immutable BEFORE UPDATE OR DELETE ON content_error_reports FOR EACH ROW EXECUTE FUNCTION studio_append_only();
CREATE TRIGGER content_error_triage_immutable BEFORE UPDATE OR DELETE ON content_error_triage FOR EACH ROW EXECUTE FUNCTION studio_append_only();
CREATE INDEX studio_content_certification_kind ON studio_content(certification_id,kind,created_at DESC);
CREATE INDEX studio_revision_objective ON studio_revisions((data->>'objectiveCode'));
CREATE INDEX studio_revision_domain ON studio_revisions((data->>'domain'));
