-- Candidate reference metadata is separate from question-specific source evidence.
CREATE TABLE technical_reference_registry (
  id text PRIMARY KEY,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data)='object'),
  created_by text REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE technical_reference_reviews (
  id text PRIMARY KEY,
  event_number bigserial NOT NULL UNIQUE,
  reference_id text NOT NULL REFERENCES technical_reference_registry(id),
  revision integer NOT NULL CHECK (revision>0),
  reference_snapshot jsonb NOT NULL,
  reviewer_id text NOT NULL REFERENCES users(id),
  decision text NOT NULL CHECK (decision IN ('verified','needs_revision')),
  findings text NOT NULL CHECK (length(trim(findings))>0),
  human_attestation boolean NOT NULL CHECK (human_attestation=true),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX technical_reference_reviews_lookup ON technical_reference_reviews(reference_id,revision,event_number DESC);
CREATE FUNCTION guard_reference_registry() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Reference metadata must be preserved'; END IF;
  IF NEW.id<>OLD.id OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at<>OLD.created_at OR NEW.revision<>OLD.revision+1 THEN
    RAISE EXCEPTION 'Reference edit requires next revision and preserved identity';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_reference_registry_update BEFORE UPDATE OR DELETE ON technical_reference_registry FOR EACH ROW EXECUTE FUNCTION guard_reference_registry();
CREATE FUNCTION guard_reference_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Reference review records are immutable'; END IF;
  IF NOT EXISTS(SELECT 1 FROM editorial_roles WHERE subject_id=NEW.reviewer_id AND role='administrator') THEN
    RAISE EXCEPTION 'Reference review requires administrator authorization';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM technical_reference_registry WHERE id=NEW.reference_id AND revision=NEW.revision AND data=NEW.reference_snapshot) THEN
    RAISE EXCEPTION 'Reference review must pin the current metadata revision';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_reference_review_write BEFORE INSERT OR UPDATE OR DELETE ON technical_reference_reviews FOR EACH ROW EXECUTE FUNCTION guard_reference_review();

-- Public candidate links only: no source text, invented dates, or verification.
INSERT INTO technical_reference_registry(id,data) VALUES
('osha-construction-1926', '{"title":"29 CFR Part 1926 — Safety and Health Regulations for Construction","issuer":"Occupational Safety and Health Administration (OSHA)","publicationDate":null,"edition":"","section":"Part 1926; select the applicable current section during question review","url":"https://www.osha.gov/laws-regs/regulations/standardnumber/1926","licensedIdentifier":"","domains":["1","2","3","4"],"topics":["Construction safety","Regulatory requirements"],"access":"public_link","rights":"Public regulatory link and metadata only. Confirm current text and applicability before technical use."}'),
('osha-general-industry-1910', '{"title":"29 CFR Part 1910 — Occupational Safety and Health Standards","issuer":"Occupational Safety and Health Administration (OSHA)","publicationDate":null,"edition":"","section":"Part 1910; determine construction applicability before use","url":"https://www.osha.gov/laws-regs/regulations/standardnumber/1910","licensedIdentifier":"","domains":["1","2","3"],"topics":["Industrial hygiene","Applicable general industry requirements"],"access":"public_link","rights":"Public regulatory link and metadata only. Do not assume every general industry provision applies to construction."}'),
('osha-job-hazard-analysis', '{"title":"Job Hazard Analysis","issuer":"Occupational Safety and Health Administration (OSHA)","publicationDate":null,"edition":"","section":"Candidate job hazard analysis guidance; exact supporting section requires examination","url":"https://www.osha.gov/sites/default/files/publications/osha3071.pdf","licensedIdentifier":"","domains":["1","3"],"topics":["Job hazard analysis","Hazard identification"],"access":"public_link","rights":"Candidate public publication link only; confirm edition and reproduction terms before distributing any text."}'),
('niosh-hierarchy-of-controls', '{"title":"About Hierarchy of Controls","issuer":"National Institute for Occupational Safety and Health (NIOSH)","publicationDate":null,"edition":"","section":"Hierarchy of Controls; exact page revision requires examination","url":"https://www.cdc.gov/niosh/hierarchy-of-controls/about/index.html","licensedIdentifier":"","domains":["1","3"],"topics":["Hierarchy of controls","Risk reduction"],"access":"public_link","rights":"Candidate public guidance link only; verify page currency, scope and reproduction terms before use."}'),
('osha-construction-interpretations', '{"title":"OSHA Standard Interpretations","issuer":"Occupational Safety and Health Administration (OSHA)","publicationDate":null,"edition":"","section":"Select a dated interpretation relevant to the exact construction provision and facts","url":"https://www.osha.gov/laws-regs/standardinterpretations","licensedIdentifier":"","domains":["1","2","3","4"],"topics":["Technical interpretations","Regulatory applicability"],"access":"public_link","rights":"Index metadata only. An interpretation must be reviewed in context and checked for supersession before citation."}');
