-- Private source research records; discovery, parsing and actual human verification
-- remain separate from question-specific source checks and publication evidence.
CREATE TABLE research_sources (
 id text PRIMARY KEY, parent_id text REFERENCES research_sources(id), canonical_url text UNIQUE,
 metadata jsonb NOT NULL CHECK(jsonb_typeof(metadata)='object'), metadata_revision integer NOT NULL DEFAULT 1 CHECK(metadata_revision>0), resolved_url text,
 status text NOT NULL DEFAULT 'discovered' CHECK(status IN('discovered','queued','retrieved','parsed','partially_parsed','verified','restricted_access','paywalled','not_found','failed','requires_manual_review')),
 parse_status text NOT NULL DEFAULT 'not_processed', extraction_complete boolean NOT NULL DEFAULT false, format text, document_hash text, document_title text,
 page_count integer CHECK(page_count>=0), pages_processed jsonb NOT NULL DEFAULT '[]', sections_processed integer NOT NULL DEFAULT 0 CHECK(sections_processed>=0),
 etag text,last_modified text,error text, retrieved_at timestamptz,created_by text REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE research_jobs (
 id text PRIMARY KEY,source_id text NOT NULL REFERENCES research_sources(id),run_key text NOT NULL,
 root_id text NOT NULL REFERENCES research_sources(id),depth integer NOT NULL CHECK(depth BETWEEN 0 AND 2),policy jsonb NOT NULL,
 state text NOT NULL DEFAULT 'queued' CHECK(state IN('queued','running','retry','complete','blocked')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_token text,lease_owner text,lease_until timestamptz,error text,created_by text NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(source_id,run_key)
);
CREATE INDEX research_jobs_claim ON research_jobs(state,next_attempt_at,created_at);
CREATE TABLE research_attempts (
 id text PRIMARY KEY,event_number bigserial NOT NULL UNIQUE,source_id text NOT NULL REFERENCES research_sources(id),job_id text REFERENCES research_jobs(id),
 actor_id text NOT NULL REFERENCES users(id),attempted_at timestamptz NOT NULL,data jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE research_sections (
 id text PRIMARY KEY,source_id text NOT NULL REFERENCES research_sources(id),document_hash text NOT NULL,locator text NOT NULL,title text NOT NULL,body text NOT NULL,
 page_number integer CHECK(page_number>0),needs_manual_review boolean NOT NULL DEFAULT true,notes jsonb NOT NULL DEFAULT '[]',created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(source_id,document_hash,locator)
);
CREATE INDEX research_sections_source ON research_sections(source_id,document_hash);
CREATE TABLE research_objective_links (
 id text PRIMARY KEY,source_id text NOT NULL REFERENCES research_sources(id),objective_id text NOT NULL REFERENCES curriculum_objectives(id),section_id text REFERENCES research_sections(id),
 relation_kind text NOT NULL CHECK(relation_kind IN('candidate','supports','conflicts')),notes text NOT NULL,
 created_by text NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(source_id,objective_id,section_id,relation_kind)
);
CREATE INDEX research_objective_links_objective ON research_objective_links(objective_id);
CREATE TABLE research_source_reviews (
 id text PRIMARY KEY,event_number bigserial NOT NULL UNIQUE,source_id text NOT NULL REFERENCES research_sources(id),document_hash text NOT NULL,
 reviewer_id text NOT NULL REFERENCES users(id),metadata_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,decision text NOT NULL CHECK(decision IN('verified','needs_revision')),findings text NOT NULL,
 human_attestation boolean NOT NULL CHECK(human_attestation=true),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX research_source_reviews_current ON research_source_reviews(source_id,document_hash,event_number DESC);
CREATE FUNCTION guard_research_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Research processing evidence is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER research_attempt_immutable BEFORE INSERT OR UPDATE OR DELETE ON research_attempts FOR EACH ROW EXECUTE FUNCTION guard_research_evidence();
CREATE TRIGGER research_section_immutable BEFORE INSERT OR UPDATE OR DELETE ON research_sections FOR EACH ROW EXECUTE FUNCTION guard_research_evidence();
CREATE TRIGGER research_review_immutable BEFORE INSERT OR UPDATE OR DELETE ON research_source_reviews FOR EACH ROW EXECUTE FUNCTION guard_research_evidence();
CREATE TABLE research_section_reviews (
 id text PRIMARY KEY,event_number bigserial NOT NULL UNIQUE,source_id text NOT NULL REFERENCES research_sources(id),section_id text NOT NULL REFERENCES research_sections(id),document_hash text NOT NULL,
 metadata_snapshot jsonb NOT NULL,reviewer_id text NOT NULL REFERENCES users(id),decision text NOT NULL CHECK(decision IN('resolved','needs_revision')),notes text NOT NULL CHECK(length(trim(notes))>0),
 human_attestation boolean NOT NULL CHECK(human_attestation=true),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX research_section_reviews_current ON research_section_reviews(section_id,document_hash,event_number DESC);
CREATE TRIGGER research_section_review_immutable BEFORE INSERT OR UPDATE OR DELETE ON research_section_reviews FOR EACH ROW EXECUTE FUNCTION guard_research_evidence();
CREATE FUNCTION research_section_review_is_current(p_section_id text,p_hash text,p_metadata jsonb) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT coalesce((SELECT r.decision='resolved' AND r.metadata_snapshot=p_metadata AND EXISTS(SELECT 1 FROM editorial_roles e WHERE e.subject_id=r.reviewer_id AND e.role='administrator')
 FROM research_section_reviews r WHERE r.section_id=p_section_id AND r.document_hash=p_hash ORDER BY r.event_number DESC LIMIT 1),false)
$$;
CREATE FUNCTION research_source_evidence_is_current(p_source_id text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT coalesce((SELECT s.status='verified' AND s.extraction_complete AND s.metadata->>'classification'<>'unclassified' AND s.sections_processed>0 AND
 coalesce((SELECT r.decision='verified' AND r.metadata_snapshot=s.metadata AND EXISTS(SELECT 1 FROM editorial_roles e WHERE e.subject_id=r.reviewer_id AND e.role='administrator')
 FROM research_source_reviews r WHERE r.source_id=s.id AND r.document_hash=s.document_hash ORDER BY r.event_number DESC LIMIT 1),false) AND
 NOT EXISTS(SELECT 1 FROM research_sections t WHERE t.source_id=s.id AND t.document_hash=s.document_hash AND(length(trim(t.body))=0 OR (t.needs_manual_review AND NOT research_section_review_is_current(t.id,s.document_hash,s.metadata))))
 FROM research_sources s WHERE s.id=p_source_id),false)
$$;
CREATE FUNCTION guard_research_section_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM editorial_roles WHERE subject_id=NEW.reviewer_id AND role='administrator') OR
 NOT EXISTS(SELECT 1 FROM research_sections t JOIN research_sources s ON s.id=t.source_id WHERE t.id=NEW.section_id AND s.id=NEW.source_id AND t.document_hash=NEW.document_hash AND s.document_hash=NEW.document_hash AND s.metadata=NEW.metadata_snapshot AND(NEW.decision<>'resolved' OR length(trim(t.body))>0)) THEN
 RAISE EXCEPTION 'Manual resolution requires administrator attestation, current source metadata and actual readable section text';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER research_section_review_validate BEFORE INSERT ON research_section_reviews FOR EACH ROW EXECUTE FUNCTION guard_research_section_review();
CREATE FUNCTION guard_research_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM editorial_roles WHERE subject_id=NEW.reviewer_id AND role='administrator') OR
 NOT EXISTS(SELECT 1 FROM research_sources WHERE id=NEW.source_id AND document_hash=NEW.document_hash AND metadata=NEW.metadata_snapshot) THEN
 RAISE EXCEPTION 'Source review requires administrator authority and the current exact source metadata and checksum';
 END IF;
 IF NEW.decision='verified' AND (
 NOT EXISTS(SELECT 1 FROM research_sources WHERE id=NEW.source_id AND extraction_complete AND metadata->>'classification'<>'unclassified' AND sections_processed>0) OR
 EXISTS(SELECT 1 FROM research_sections t WHERE t.source_id=NEW.source_id AND t.document_hash=NEW.document_hash AND(length(trim(t.body))=0 OR(t.needs_manual_review AND NOT research_section_review_is_current(t.id,NEW.document_hash,NEW.metadata_snapshot))))) THEN
 RAISE EXCEPTION 'Actual source verification requires complete extraction and resolved current manual-review sections';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER research_review_validate BEFORE INSERT ON research_source_reviews FOR EACH ROW EXECUTE FUNCTION guard_research_review();
