-- New attempts pin randomized presentation without changing answer identities.
-- Existing full-exam snapshots have no choice map and retain their old order.
CREATE FUNCTION guard_full_exam_choice_orders() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE selected_id text; choice_order jsonb; pinned_choices jsonb; selected_count integer;
BEGIN
  IF NEW.data->>'examKind' IS DISTINCT FROM 'chst_full_length' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND NEW.data->'questionChoiceOrders' IS NOT DISTINCT FROM OLD.data->'questionChoiceOrders' THEN
    RETURN NEW;
  END IF;
  IF NOT (NEW.data ? 'questionChoiceOrders') THEN
    IF TG_OP='INSERT' THEN
      RAISE EXCEPTION 'New full examinations require pinned answer option orders';
    END IF;
    RETURN NEW;
  END IF;
  IF jsonb_typeof(NEW.data->'questionChoiceOrders') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Full examination answer option orders must be an object';
  END IF;
  SELECT count(*) INTO selected_count FROM jsonb_object_keys(NEW.data->'questionChoiceOrders');
  IF selected_count<>200 THEN
    RAISE EXCEPTION 'Every selected examination question requires one answer option order';
  END IF;
  FOR selected_id IN SELECT jsonb_array_elements_text(NEW.data->'questionIds') LOOP
    choice_order := NEW.data->'questionChoiceOrders'->selected_id;
    IF jsonb_typeof(choice_order) IS DISTINCT FROM 'array' OR jsonb_array_length(choice_order)<>4 THEN
      RAISE EXCEPTION 'Examination answer option orders require four identities';
    END IF;
    SELECT count(DISTINCT value) INTO selected_count FROM jsonb_array_elements_text(choice_order);
    SELECT data->'choices' INTO pinned_choices FROM question_versions
      WHERE question_versions.question_id=selected_id AND version=(NEW.data->'questionVersions'->>selected_id)::integer;
    IF selected_count<>4 OR pinned_choices IS NULL OR jsonb_array_length(pinned_choices)<>4 OR
      EXISTS(SELECT 1 FROM jsonb_array_elements_text(choice_order) AS option_id
        WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(pinned_choices) AS choice WHERE choice->>'id'=option_id)) THEN
      RAISE EXCEPTION 'Saved examination answer orders must match the pinned question choices';
    END IF;
  END LOOP;
  -- The existing full-exam guard also makes this field immutable on UPDATE.
  RETURN NEW;
END $$;
CREATE TRIGGER zz_validate_full_exam_choice_orders BEFORE INSERT OR UPDATE ON learning_sessions
  FOR EACH ROW EXECUTE FUNCTION guard_full_exam_choice_orders();
