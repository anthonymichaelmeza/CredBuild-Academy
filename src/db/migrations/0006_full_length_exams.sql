-- Additive full-exam metadata; existing practice and lesson data remain intact.
CREATE TABLE full_exam_attempts (
  session_id text PRIMARY KEY REFERENCES learning_sessions(id),
  owner_id text NOT NULL REFERENCES users(id),
  request_key text NOT NULL,
  policy_version text NOT NULL,
  development_fixture boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id,request_key)
);
CREATE INDEX full_exam_session_deadline ON learning_sessions ((data->>'deadlineAt'))
  WHERE data->>'examKind'='chst_full_length' AND status='in_progress';
CREATE INDEX full_exam_history ON learning_sessions(owner_id,created_at DESC,id)
  WHERE data->>'examKind'='chst_full_length';
CREATE INDEX published_exam_domain ON question_versions(certification_id,domain,question_id,version)
  WHERE review_status='approved' AND content_kind='instructional';

CREATE OR REPLACE FUNCTION guard_full_exam_session() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pin text; selected_count integer;
BEGIN
  IF TG_OP='UPDATE' AND OLD.data->>'examKind'='chst_full_length' THEN
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.id IS DISTINCT FROM OLD.id OR
      (NEW.data - 'answers' - 'flags' - 'currentQuestionIndex' - 'status' - 'submittedAt' - 'submissionReason' - 'revision') IS DISTINCT FROM
      (OLD.data - 'answers' - 'flags' - 'currentQuestionIndex' - 'status' - 'submittedAt' - 'submissionReason' - 'revision') THEN
      RAISE EXCEPTION 'Full exam identity, question pins, policy and deadline are immutable';
    END IF;
    IF OLD.status='submitted' AND (NEW.data IS DISTINCT FROM OLD.data OR NEW.status IS DISTINCT FROM OLD.status) THEN
      RAISE EXCEPTION 'Submitted full examinations are immutable';
    END IF;
  END IF;
  IF NEW.data->>'examKind' IS DISTINCT FROM 'chst_full_length' THEN RETURN NEW; END IF;
  IF jsonb_typeof(NEW.data->'questionVersions') IS DISTINCT FROM 'object' OR
    jsonb_typeof(NEW.data->'answers') IS DISTINCT FROM 'object' OR
    jsonb_typeof(NEW.data->'flags') IS DISTINCT FROM 'array' OR
    jsonb_typeof(NEW.data->'currentQuestionIndex') IS DISTINCT FROM 'number' OR
    NEW.data->>'createdAt' IS NULL OR NEW.data->>'deadlineAt' IS NULL OR
    NEW.data->>'examPolicyVersion' IS NULL OR
    (NEW.data->>'revision')::integer IS DISTINCT FROM NEW.revision THEN
    RAISE EXCEPTION 'Complete full examination state and matching revision are required';
  END IF;
  IF NEW.data->>'mode' IS DISTINCT FROM 'exam' OR NEW.data->>'ownerId' IS DISTINCT FROM NEW.owner_id OR
    NEW.data->>'status' IS DISTINCT FROM NEW.status OR (NEW.data->>'durationSeconds')::integer IS DISTINCT FROM 14400 OR
    jsonb_typeof(NEW.data->'questionIds') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.data->'questionIds')<>200 THEN
    RAISE EXCEPTION 'Full examinations require 200 pinned questions and a four-hour configured deadline';
  END IF;
  SELECT count(DISTINCT value) INTO selected_count FROM jsonb_array_elements_text(NEW.data->'questionIds');
  IF selected_count<>200 OR (NEW.data->>'currentQuestionIndex')::integer NOT BETWEEN 0 AND 199 OR
    extract(epoch FROM ((NEW.data->>'deadlineAt')::timestamptz-(NEW.data->>'createdAt')::timestamptz)) <> 14400 THEN
    RAISE EXCEPTION 'Invalid full examination question set, position or deadline';
  END IF;
  FOR pin IN SELECT jsonb_array_elements_text(NEW.data->'questionIds') LOOP
    IF NOT (NEW.data->'questionVersions' ? pin) OR (NEW.data->'questionVersions'->>pin) IS NULL OR (NEW.data->'questionVersions'->>pin)::integer<1 THEN
      RAISE EXCEPTION 'Every full examination question requires an immutable revision pin';
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(NEW.data->'answers') key WHERE NOT (NEW.data->'questionIds' ? key)) OR
    EXISTS (SELECT 1 FROM jsonb_array_elements_text(NEW.data->'flags') flag WHERE NOT (NEW.data->'questionIds' ? flag)) THEN
    RAISE EXCEPTION 'Full examination answers and flags must belong to selected questions';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_full_exam_session BEFORE INSERT OR UPDATE ON learning_sessions FOR EACH ROW EXECUTE FUNCTION guard_full_exam_session();
