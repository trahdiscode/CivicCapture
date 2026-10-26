-- CivicCapture database schema
-- Run this in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run
-- This creates the exact 3 tables from your ER diagram (slide 8):
--   Citizen  -> 1 : N ->  File  -> 1 : N ->  DeletionRequest

-- Turning this on lets Postgres auto-generate random unique IDs for us.
-- (This is what makes your "File ID" unique and hard to guess.)
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLE 1: citizen
-- One row per citizen who uses the app.
-- ============================================================
create table citizen (
  citizen_id  uuid primary key default gen_random_uuid(),  -- PK, auto-generated
  name        text not null,
  contact     text,                                         -- phone/email, optional for now
  created_at  timestamptz not null default now()
);

-- ============================================================
-- TABLE 2: file
-- One row per capture (photo/video/audio). This is the table
-- that both the "citizen view" and "government view" read from.
-- ============================================================
create table file (
  file_id      uuid primary key default gen_random_uuid(),  -- PK = the "File ID" shown to the citizen
  citizen_id   uuid not null references citizen(citizen_id), -- FK -> citizen
  type         text not null check (type in ('photo', 'video', 'audio')),
  capture_time timestamptz not null default now(),
  file_url     text not null,                                -- where the actual photo/video/audio is stored
  status       text not null default 'active' check (status in ('active', 'deleted'))
);

-- ============================================================
-- TABLE 3: deletion_request
-- A citizen asks to delete a file; only government approval
-- (a manual status update, for now) marks the file "deleted".
-- ============================================================
create table deletion_request (
  request_id   uuid primary key default gen_random_uuid(),
  file_id      uuid not null references file(file_id),       -- FK -> file
  citizen_id   uuid not null references citizen(citizen_id), -- FK -> citizen
  reason       text,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  decided_at   timestamptz
);

-- ============================================================
-- Example query you can demo in the review:
-- "Show every file that currently has an open deletion request"
-- ============================================================
-- select f.file_id, f.type, f.status, c.name, d.reason, d.status as request_status
-- from file f
-- join deletion_request d on d.file_id = f.file_id
-- join citizen c on c.citizen_id = f.citizen_id
-- where d.status = 'pending';
