-- Run this only after the application using the new narrow RPCs has been
-- deployed and smoke-tested. Keeping destructive privilege changes separate
-- gives the production rollout a zero-downtime compatibility window.

-- Public clients only need the course columns rendered by the application.
REVOKE ALL PRIVILEGES ON TABLE public.courses
FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, code, name, department, level, avg_grade, sqct_grade, created_at)
ON TABLE public.courses TO anon, authenticated;

-- Student submissions are now read exclusively through narrow aggregate and
-- projection RPCs. Remove all base-table policies as defense in depth so a
-- future accidental table grant does not silently restore public access.
REVOKE ALL PRIVILEGES ON TABLE public.student_averages
FROM PUBLIC, anon, authenticated;
ALTER TABLE public.student_averages ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_averages'
      AND roles && ARRAY['public', 'anon', 'authenticated']::name[]
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON public.student_averages',
      policy_record.policyname
    );
  END LOOP;
END
$$;

-- The old one-argument function was callable with the public anon key, letting
-- anyone forge identifiers and grow the table without bound.
DROP FUNCTION IF EXISTS public.record_daily_visit(text);

REVOKE ALL PRIVILEGES ON TABLE public.daily_visits
FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.daily_visits TO service_role;
ALTER TABLE public.daily_visits ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'daily_visits'
      AND roles && ARRAY['public', 'anon', 'authenticated']::name[]
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON public.daily_visits',
      policy_record.policyname
    );
  END LOOP;
END
$$;
