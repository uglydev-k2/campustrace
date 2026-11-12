-- Runs once, the first time the database container starts.
-- The end-to-end tests use their own database so they never touch your data.
CREATE DATABASE campustrace_test OWNER campustrace;
