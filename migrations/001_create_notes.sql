-- Runtime uses the same DDL with a strictly validated `pr_N` suffix.
-- This concrete PR 1 table keeps the migration executable as an example.
CREATE TABLE IF NOT EXISTS preview_notes_pr_1 (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	body VARCHAR(280) NOT NULL,
	created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	PRIMARY KEY (id)
);
