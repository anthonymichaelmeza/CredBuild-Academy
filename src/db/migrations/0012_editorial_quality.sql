-- Separate human editorial sign-off. Existing publication pointers are retained.
CREATE TABLE studio_editorial_reviews (
  id text PRIMARY KEY,
  event_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  revision_id text NOT NULL REFERENCES studio_revisions(id),
  reviewer_id text NOT NULL REFERENCES users(id),
  decision text NOT NULL CHECK(decision IN('approved','changes_requested','rejected')),
  findings text NOT NULL CHECK(length(btrim(findings))>0),
  checks jsonb NOT NULL CHECK(jsonb_typeof(checks)='object'),
  human_attestation boolean NOT NULL CHECK(human_attestation=true),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_editorial_review_revision ON studio_editorial_reviews(revision_id,event_number DESC);
CREATE FUNCTION studio_editorial_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r studio_revisions; c studio_content; w studio_workflow;
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Editorial decisions are immutable'; END IF;
  SELECT * INTO r FROM studio_revisions WHERE id=NEW.revision_id;
  SELECT * INTO c FROM studio_content WHERE id=r.content_id FOR UPDATE;
  SELECT * INTO w FROM studio_workflow WHERE revision_id=r.id FOR UPDATE;
  IF r.revision<>c.current_revision OR w.status<>'approved' THEN RAISE EXCEPTION 'Editorial review requires the current technically approved revision'; END IF;
  IF NOT EXISTS(SELECT 1 FROM editorial_roles WHERE subject_id=NEW.reviewer_id AND role='reviewer') OR
    NEW.reviewer_id=c.owner_id OR EXISTS(SELECT 1 FROM studio_revisions WHERE content_id=c.id AND author_id=NEW.reviewer_id) THEN
    RAISE EXCEPTION 'An independent authorized editorial reviewer is required';
  END IF;
  PERFORM studio_require_approval(r.id);
  IF NEW.decision='approved' AND (
    NEW.checks->'clarity' IS DISTINCT FROM 'true'::jsonb OR NEW.checks->'originality' IS DISTINCT FROM 'true'::jsonb OR
    NEW.checks->'distractors' IS DISTINCT FROM 'true'::jsonb OR NEW.checks->'answerClues' IS DISTINCT FROM 'true'::jsonb OR NEW.checks->'rights' IS DISTINCT FROM 'true'::jsonb) THEN
    RAISE EXCEPTION 'Editorial approval requires every human editorial check';
  END IF;
  IF NEW.decision='approved' AND r.data->>'kind'='lesson' AND r.data->'body'->>'summary' ~* '^SOURCE-BLOCKED AUTHORING BRIEF[.]' THEN
    RAISE EXCEPTION 'Source-blocked authoring briefs require completed source-supported instruction before editorial approval';
  END IF;
  IF NEW.decision='approved' AND r.data->>'kind'='question' AND (
    jsonb_array_length(r.data->'body'->'choices')<>4 OR
    (SELECT count(DISTINCT lower(btrim(choice->>'text'))) FROM jsonb_array_elements(r.data->'body'->'choices') choice)<>4) THEN
    RAISE EXCEPTION 'CHST editorial approval requires four distinct answer options';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER studio_editorial_review_write BEFORE INSERT OR UPDATE OR DELETE ON studio_editorial_reviews
  FOR EACH ROW EXECUTE FUNCTION studio_editorial_review_guard();
CREATE FUNCTION studio_require_editorial_approval(target_revision text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE editorial studio_editorial_reviews;
BEGIN
  SELECT * INTO editorial FROM studio_editorial_reviews WHERE revision_id=target_revision ORDER BY event_number DESC LIMIT 1;
  IF editorial.id IS NULL OR editorial.decision<>'approved' OR NOT EXISTS(
    SELECT 1 FROM editorial_roles WHERE subject_id=editorial.reviewer_id AND role='reviewer') THEN
    RAISE EXCEPTION 'Independent human editorial approval of this exact revision is required before publication';
  END IF;
END $$;
CREATE FUNCTION studio_editorial_publication_gate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM studio_require_editorial_approval(NEW.revision_id);
  RETURN NEW;
END $$;
CREATE TRIGGER studio_separate_editorial_publication BEFORE INSERT OR UPDATE ON studio_publications
  FOR EACH ROW EXECUTE FUNCTION studio_editorial_publication_gate();
