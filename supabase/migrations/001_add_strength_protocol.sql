-- Migration 001: Add the "strength" protocol type
--
-- RecoverFlow was reworked into a strength-first plan. Exercise sessions can now
-- be logged under a new `strength` protocol. The exercise_logs.protocol column has
-- a CHECK constraint that must be widened to allow it, or strength sessions will
-- fail to save.
--
-- Run this once in the Supabase SQL editor (Database -> SQL editor -> New query).
-- Safe to run on an existing database with data.

ALTER TABLE exercise_logs
  DROP CONSTRAINT IF EXISTS exercise_logs_protocol_check;

ALTER TABLE exercise_logs
  ADD CONSTRAINT exercise_logs_protocol_check
  CHECK (protocol IN ('cervical','elbow','strength','core','lower_body','foot'));
