-- Stage 1 of the auth-unification migration (2026-09-15). Additive only --
-- no behavior change yet. Companion to umrt-portal's
-- migrations/0007_central_identity_prep.sql.
--
-- Adds a nullable linkage column to this repo's OWN `users` table
-- (umrt_forum, host to real forum threads/posts foreign-keyed to these
-- existing row IDs -- never rewritten). Stage 4 of the migration
-- backfills this by matching each forum user to a row in the central
-- identity store (umrt-portal-db, already bound here as PORTAL_DB) by
-- email, so a real person's forum identity and portal identity become
-- linkable without ever touching the historical author_id foreign keys
-- on threads/posts.
--
-- Nothing reads or writes this column yet.

ALTER TABLE users ADD COLUMN central_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_central_user_id ON users(central_user_id);
