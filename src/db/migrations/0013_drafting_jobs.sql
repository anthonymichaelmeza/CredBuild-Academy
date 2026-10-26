-- Owner-scoped planning jobs. No model execution or instructional approval is
-- represented by these states; actual imported drafts are linked separately.
CREATE TABLE studio_drafting_jobs (
 id text PRIMARY KEY, owner_id text NOT NULL REFERENCES users(id), request_key text NOT NULL,
 objective_id text NOT NULL REFERENCES curriculum_objectives(id),
 request jsonb NOT NULL CHECK(jsonb_typeof(request)='object'),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 status text NOT NULL CHECK(status IN('blocked_sources','brief_ready','awaiting_output','drafts_linked','cancelled')),
 source_pins jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(source_pins)='array'),
 blockers jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(blockers)='array'),
 brief text,prepared_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id,request_key)
);
CREATE INDEX studio_drafting_jobs_owner ON studio_drafting_jobs(owner_id,created_at DESC,id);
CREATE TABLE studio_drafting_job_questions (
 job_id text NOT NULL REFERENCES studio_drafting_jobs(id), question_id text NOT NULL UNIQUE REFERENCES studio_content(id),
 revision_id text NOT NULL REFERENCES studio_revisions(id),linked_by text NOT NULL REFERENCES users(id),
 linked_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(job_id,question_id)
);
CREATE FUNCTION guard_drafting_job() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Drafting job history must be preserved'; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.id<>OLD.id OR NEW.owner_id<>OLD.owner_id OR NEW.request_key<>OLD.request_key OR NEW.objective_id<>OLD.objective_id OR NEW.request<>OLD.request OR NEW.created_at<>OLD.created_at THEN
   RAISE EXCEPTION 'Drafting job requests and ownership are immutable';
  END IF;
  IF NEW.revision<>OLD.revision+1 OR OLD.status='cancelled' THEN RAISE EXCEPTION 'Drafting job revision or cancellation conflict'; END IF;
 END IF;
 IF NEW.status IN('awaiting_output','drafts_linked') AND (NEW.brief IS NULL OR jsonb_array_length(NEW.source_pins)=0 OR NEW.prepared_at IS NULL) THEN
  RAISE EXCEPTION 'Prepared drafting jobs require actual citation pins and a saved brief';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER studio_drafting_job_write BEFORE INSERT OR UPDATE OR DELETE ON studio_drafting_jobs FOR EACH ROW EXECUTE FUNCTION guard_drafting_job();
CREATE FUNCTION guard_drafting_question_link() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE j studio_drafting_jobs%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Drafting job output links are immutable'; END IF;
 SELECT * INTO j FROM studio_drafting_jobs WHERE id=NEW.job_id;
 IF j.owner_id<>NEW.linked_by OR j.status NOT IN('awaiting_output','drafts_linked') OR
    NOT EXISTS(SELECT 1 FROM editorial_roles WHERE subject_id=NEW.linked_by AND role='administrator') OR
    NOT EXISTS(SELECT 1 FROM studio_content c JOIN studio_revisions r ON r.content_id=c.id AND r.revision=c.current_revision
      JOIN studio_workflow w ON w.revision_id=r.id
      WHERE c.id=NEW.question_id AND c.owner_id=NEW.linked_by AND c.kind='question' AND r.id=NEW.revision_id
      AND w.status='draft' AND r.data->>'origin'='ai_generated' AND r.data->>'objectiveCode'=j.objective_id
      AND jsonb_array_length(r.data->'body'->'choices')=4) OR
    NOT EXISTS(SELECT 1 FROM studio_audit WHERE actor_id=NEW.linked_by AND content_id=NEW.question_id AND event='import_ingested') OR
    (SELECT count(*) FROM studio_drafting_job_questions WHERE job_id=j.id)>=(j.request->>'count')::integer THEN
   RAISE EXCEPTION 'Only actual owned AI draft imports within the requested count can be linked';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER studio_drafting_question_link_write BEFORE INSERT OR UPDATE OR DELETE ON studio_drafting_job_questions FOR EACH ROW EXECUTE FUNCTION guard_drafting_question_link();
