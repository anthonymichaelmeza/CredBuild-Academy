CREATE TABLE learner_profiles (
  owner_id text PRIMARY KEY REFERENCES users(id),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
