-- Run once with the default administrative role. The application role only
-- reads and writes rows belonging to its strictly validated `pr_N` namespace.
CREATE TABLE IF NOT EXISTS public.preview_notes (
	namespace TEXT NOT NULL CHECK (namespace ~ '^pr_[1-9][0-9]*$'),
	id BIGINT GENERATED ALWAYS AS IDENTITY,
	body VARCHAR(280) NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (namespace, id)
);

CREATE INDEX IF NOT EXISTS preview_notes_namespace_created_at_idx
	ON public.preview_notes (namespace, created_at DESC);
