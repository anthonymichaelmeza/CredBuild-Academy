-- A shorter deadline is permitted only for isolated, synthetic engineering
-- attempts. Real instructional examinations retain the four-hour invariant.
CREATE OR REPLACE FUNCTION guard_full_exam_session() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pin text; selected_count integer; duration_seconds integer;
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
    jsonb_typeof(NEW.data->'durationSeconds') IS DISTINCT FROM 'number' OR
    NEW.data->>'createdAt' IS NULL OR NEW.data->>'deadlineAt' IS NULL OR
    NEW.data->>'examPolicyVersion' IS NULL OR
    (NEW.data->>'revision')::integer IS DISTINCT FROM NEW.revision THEN
    RAISE EXCEPTION 'Complete full examination state and matching revision are required';
  END IF;
  IF (NEW.data->>'durationSeconds') !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'Full examination duration must be an integer';
  END IF;
  duration_seconds := (NEW.data->>'durationSeconds')::integer;
  IF NEW.data->>'mode' IS DISTINCT FROM 'exam' OR NEW.data->>'ownerId' IS DISTINCT FROM NEW.owner_id OR
    NEW.data->>'status' IS DISTINCT FROM NEW.status OR
    jsonb_typeof(NEW.data->'questionIds') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.data->'questionIds')<>200 THEN
    RAISE EXCEPTION 'Full examinations require 200 pinned questions';
  END IF;
  IF duration_seconds<>14400 AND (
    NEW.data->'developmentFixture' IS DISTINCT FROM 'true'::jsonb OR
    NEW.data->>'bank' IS DISTINCT FROM 'demonstration' OR duration_seconds NOT BETWEEN 5 AND 14400
  ) THEN
    RAISE EXCEPTION 'Production examinations require the standard four-hour duration';
  END IF;
  SELECT count(DISTINCT value) INTO selected_count FROM jsonb_array_elements_text(NEW.data->'questionIds');
  IF selected_count<>200 OR (NEW.data->>'currentQuestionIndex')::integer NOT BETWEEN 0 AND 199 OR
    extract(epoch FROM ((NEW.data->>'deadlineAt')::timestamptz-(NEW.data->>'createdAt')::timestamptz)) <> duration_seconds THEN
    RAISE EXCEPTION 'Invalid full examination question set, position or deadline';
  END IF;
  FOR pin IN SELECT jsonb_array_elements_text(NEW.data->'questionIds') LOOP
    IF NOT (NEW.data->'questionVersions' ? pin) OR (NEW.data->'questionVersions'->>pin) IS NULL OR (NEW.data->'questionVersions'->>pin)::integer<1 THEN
      RAISE EXCEPTION 'Every full examination question requires an immutable revision pin';
    END IF;
    IF duration_seconds<>14400 AND NOT EXISTS (
      SELECT 1 FROM question_versions q WHERE q.id=pin || ':v' || (NEW.data->'questionVersions'->>pin)
        AND q.question_id=pin AND q.question_id ~ '^dev-full-d[1-4]-[0-9]{3}$'
        AND q.author_id='development-only-engine-fixture' AND q.certification_id='chst'
        AND q.content_kind='demonstration' AND q.review_status='draft' AND q.reviewer_id IS NULL
        AND q.data->>'contentKind'='demonstration' AND q.data->>'reviewStatus'='draft'
        AND q.data->'reference'->'verifiedAt'='null'::jsonb
        AND NOT EXISTS(SELECT 1 FROM published_questions p WHERE p.question_version_id=q.id)
    ) THEN
      RAISE EXCEPTION 'Short examination timers require only unapproved synthetic engineering fixtures';
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(NEW.data->'answers') key WHERE NOT (NEW.data->'questionIds' ? key)) OR
    EXISTS (SELECT 1 FROM jsonb_array_elements_text(NEW.data->'flags') flag WHERE NOT (NEW.data->'questionIds' ? flag)) THEN
    RAISE EXCEPTION 'Full examination answers and flags must belong to selected questions';
  END IF;
  RETURN NEW;
END $$;
