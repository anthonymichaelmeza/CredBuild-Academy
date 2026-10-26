-- External source identities are separate from trusted generated content IDs.
CREATE TABLE studio_import_question_ids (
  certification_id text NOT NULL REFERENCES certifications(id),
  external_id text NOT NULL CHECK (external_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$'),
  content_id text NOT NULL UNIQUE REFERENCES studio_content(id),
  imported_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (certification_id,external_id)
);
CREATE OR REPLACE FUNCTION guard_question_import_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Imported question identities are immutable'; END IF;
  IF NOT EXISTS(SELECT 1 FROM studio_content WHERE id=NEW.content_id AND kind='question' AND certification_id=NEW.certification_id AND owner_id=NEW.imported_by) THEN
    RAISE EXCEPTION 'Imported question identity must match the original owned question';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_question_import_identity BEFORE INSERT OR UPDATE OR DELETE ON studio_import_question_ids FOR EACH ROW EXECUTE FUNCTION guard_question_import_identity();
