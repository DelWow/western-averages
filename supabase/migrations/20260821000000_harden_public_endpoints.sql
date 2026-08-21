-- Add the narrow Data API functions and transactional abuse controls required
-- by the hardened application. Direct legacy privileges are intentionally left
-- in place until the follow-up lockdown migration, allowing this migration to
-- be applied before the application without interrupting the existing deploy.

ALTER TABLE public.student_averages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.student_averages'::regclass
      AND conname = 'student_averages_grade_security_check'
  ) THEN
    ALTER TABLE public.student_averages
      ADD CONSTRAINT student_averages_grade_security_check
      CHECK (grade >= 0 AND grade <= 100) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.student_averages'::regclass
      AND conname = 'student_averages_term_security_check'
  ) THEN
    ALTER TABLE public.student_averages
      ADD CONSTRAINT student_averages_term_security_check
      CHECK (term IN ('fall', 'winter', 'summer')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.student_averages'::regclass
      AND conname = 'student_averages_year_security_check'
  ) THEN
    ALTER TABLE public.student_averages
      ADD CONSTRAINT student_averages_year_security_check
      CHECK (
        year IS NULL OR (
          year ~ '^[0-9]{4}$'
          AND year::integer >= 2000
          AND year::integer <= 2200
        )
      ) NOT VALID;
  END IF;
END
$$;

-- These narrow functions replace direct reads of the base table. They expose
-- only the fields the UI renders and never return IP addresses or user agents.
CREATE OR REPLACE FUNCTION public.get_public_student_averages(
  course_id_param bigint,
  result_limit integer DEFAULT 10
)
RETURNS TABLE (
  grade numeric,
  term text,
  year integer,
  submitted_on date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    student_average.grade::numeric,
    student_average.term::text,
    CASE
      WHEN student_average.year ~ '^[0-9]{4}$'
        THEN student_average.year::integer
      ELSE NULL
    END,
    (student_average.created_at AT TIME ZONE 'America/Toronto')::date
  FROM public.student_averages AS student_average
  WHERE student_average.course_id = course_id_param
  ORDER BY student_average.created_at DESC
  LIMIT least(greatest(coalesce(result_limit, 10), 1), 50)
$$;

REVOKE ALL ON FUNCTION public.get_public_student_averages(bigint, integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_student_averages(bigint, integer)
TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_course_average_stats(
  course_id_param bigint
)
RETURNS TABLE (
  verified_average numeric,
  unverified_count bigint,
  unverified_average numeric,
  unverified_min numeric,
  unverified_max numeric,
  unverified_median numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    course.avg_grade::numeric,
    count(student_average.id)::bigint,
    round(avg(student_average.grade::numeric), 2),
    min(student_average.grade)::numeric,
    max(student_average.grade)::numeric,
    (
      percentile_cont(0.5) WITHIN GROUP (
        ORDER BY student_average.grade
      )
    )::numeric
  FROM public.courses AS course
  LEFT JOIN public.student_averages AS student_average
    ON student_average.course_id = course.id
  WHERE course.id = course_id_param
  GROUP BY course.id, course.avg_grade
$$;

REVOKE ALL ON FUNCTION public.get_public_course_average_stats(bigint)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_course_average_stats(bigint)
TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_course_averages()
RETURNS TABLE (
  course_id bigint,
  unverified_average numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    student_average.course_id::bigint,
    round(avg(student_average.grade::numeric), 2)
  FROM public.student_averages AS student_average
  GROUP BY student_average.course_id
$$;

REVOKE ALL ON FUNCTION public.get_public_course_averages()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_course_averages()
TO anon, authenticated;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.average_submission_abuse_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_fingerprint text NOT NULL CHECK (
    client_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  network_fingerprint text NOT NULL CHECK (
    network_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  course_id bigint NOT NULL,
  term text NOT NULL CHECK (term IN ('fall', 'winter', 'summer')),
  year integer NOT NULL,
  submission_key text NOT NULL UNIQUE CHECK (
    submission_key ~ '^[0-9a-f]{64}$'
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.average_submission_abuse_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.average_submission_abuse_events
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE private.average_submission_abuse_events_id_seq
FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS average_abuse_client_created_idx
  ON private.average_submission_abuse_events (client_fingerprint, created_at DESC);
CREATE INDEX IF NOT EXISTS average_abuse_network_created_idx
  ON private.average_submission_abuse_events (network_fingerprint, created_at DESC);
CREATE INDEX IF NOT EXISTS average_abuse_created_idx
  ON private.average_submission_abuse_events (created_at);

CREATE TABLE IF NOT EXISTS private.average_submission_attempt_windows (
  window_start timestamptz NOT NULL,
  network_fingerprint text NOT NULL CHECK (
    network_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  attempt_count integer NOT NULL DEFAULT 1 CHECK (
    attempt_count > 0 AND attempt_count <= 300
  ),
  PRIMARY KEY (window_start, network_fingerprint)
);

ALTER TABLE private.average_submission_attempt_windows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.average_submission_attempt_windows
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_average_submission_attempt(
  network_fingerprint_param text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_window timestamptz := date_trunc('hour', now())
    + floor(extract(minute FROM now()) / 10)::integer * interval '10 minutes';
  current_attempt_count integer;
BEGIN
  IF network_fingerprint_param IS NULL
     OR network_fingerprint_param !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_attempt_identifier';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('average-attempt:' || network_fingerprint_param, 0)
  );

  SELECT attempt_count INTO current_attempt_count
  FROM private.average_submission_attempt_windows
  WHERE window_start = current_window
    AND network_fingerprint = network_fingerprint_param;

  IF coalesce(current_attempt_count, 0) >= 300 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'attempt_rate_limit_exceeded';
  END IF;

  INSERT INTO private.average_submission_attempt_windows (
    window_start,
    network_fingerprint,
    attempt_count
  ) VALUES (
    current_window,
    network_fingerprint_param,
    1
  )
  ON CONFLICT (window_start, network_fingerprint)
  DO UPDATE SET attempt_count =
    private.average_submission_attempt_windows.attempt_count + 1;

  DELETE FROM private.average_submission_attempt_windows
  WHERE window_start < current_window - interval '1 day';
END;
$$;

REVOKE ALL ON FUNCTION public.check_average_submission_attempt(text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_average_submission_attempt(text)
TO service_role;

CREATE OR REPLACE FUNCTION public.submit_student_average(
  course_id_param bigint,
  grade_param numeric,
  term_param text,
  year_param integer,
  abuse_fingerprint_param text,
  network_fingerprint_param text,
  submission_key_param text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recent_client_count integer;
  recent_network_count integer;
BEGIN
  IF course_id_param IS NULL
     OR grade_param IS NULL
     OR term_param IS NULL
     OR year_param IS NULL
     OR abuse_fingerprint_param IS NULL
     OR network_fingerprint_param IS NULL
     OR submission_key_param IS NULL
     OR course_id_param <= 0
     OR grade_param < 0
     OR grade_param > 100
     OR grade_param * 10 <> trunc(grade_param * 10)
     OR term_param NOT IN ('fall', 'winter', 'summer')
     OR year_param < 2000
     OR year_param > extract(year FROM now())::integer + 1
     OR abuse_fingerprint_param !~ '^[0-9a-f]{64}$'
     OR network_fingerprint_param !~ '^[0-9a-f]{64}$'
     OR submission_key_param !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_submission';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.courses WHERE id = course_id_param
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'invalid_course';
  END IF;

  -- The consistent lock order makes the limits atomic without deadlocks.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('average-network:' || network_fingerprint_param, 0)
  );
  PERFORM pg_advisory_xact_lock(
    hashtextextended('average-client:' || abuse_fingerprint_param, 0)
  );
  PERFORM pg_advisory_xact_lock(
    hashtextextended('average-submission:' || submission_key_param, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM private.average_submission_abuse_events
    WHERE submission_key = submission_key_param
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'duplicate_submission';
  END IF;

  SELECT count(*) INTO recent_client_count
  FROM private.average_submission_abuse_events
  WHERE client_fingerprint = abuse_fingerprint_param
    AND created_at >= now() - interval '1 hour';

  SELECT count(*) INTO recent_network_count
  FROM private.average_submission_abuse_events
  WHERE network_fingerprint = network_fingerprint_param
    AND created_at >= now() - interval '1 hour';

  IF recent_client_count >= 5 OR recent_network_count >= 30 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'rate_limit_exceeded';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM private.average_submission_abuse_events
    WHERE client_fingerprint = abuse_fingerprint_param
      AND course_id = course_id_param
      AND term = term_param
      AND year = year_param
      AND created_at >= now() - interval '24 hours'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'submission_cooldown';
  END IF;

  INSERT INTO public.student_averages (course_id, grade, term, year)
  VALUES (course_id_param, grade_param, term_param, year_param::text);

  INSERT INTO private.average_submission_abuse_events (
    client_fingerprint,
    network_fingerprint,
    course_id,
    term,
    year,
    submission_key
  ) VALUES (
    abuse_fingerprint_param,
    network_fingerprint_param,
    course_id_param,
    term_param,
    year_param,
    submission_key_param
  );

  DELETE FROM private.average_submission_abuse_events
  WHERE created_at < now() - interval '7 days';
END;
$$;

REVOKE ALL ON FUNCTION public.submit_student_average(
  bigint, numeric, text, integer, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_student_average(
  bigint, numeric, text, integer, text, text, text
) TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS daily_visits_date_visitor_idx
  ON public.daily_visits (date, visitor_id);

CREATE TABLE IF NOT EXISTS private.analytics_visitor_issuance_limits (
  date date NOT NULL,
  network_fingerprint text NOT NULL CHECK (
    network_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  issued_count integer NOT NULL DEFAULT 1 CHECK (
    issued_count > 0 AND issued_count <= 100
  ),
  PRIMARY KEY (date, network_fingerprint)
);

ALTER TABLE private.analytics_visitor_issuance_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.analytics_visitor_issuance_limits
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_daily_visit(
  visitor_identifier text,
  issuance_fingerprint text,
  is_new_visitor boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_visit_date date := (
    now() AT TIME ZONE 'America/Toronto'
  )::date;
  new_issued_count integer;
BEGIN
  IF visitor_identifier IS NULL
     OR issuance_fingerprint IS NULL
     OR is_new_visitor IS NULL
     OR visitor_identifier !~ '^[0-9a-f]{32}$'
     OR issuance_fingerprint !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_analytics_identifier';
  END IF;

  IF is_new_visitor THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended('analytics-issuance:' || issuance_fingerprint, 0)
    );

    SELECT issued_count INTO new_issued_count
    FROM private.analytics_visitor_issuance_limits
    WHERE date = current_visit_date
      AND network_fingerprint = issuance_fingerprint;

    IF coalesce(new_issued_count, 0) >= 100 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'analytics_issuance_rate_limited';
    END IF;

    INSERT INTO private.analytics_visitor_issuance_limits (
      date,
      network_fingerprint,
      issued_count
    ) VALUES (
      current_visit_date,
      issuance_fingerprint,
      1
    )
    ON CONFLICT (date, network_fingerprint)
    DO UPDATE SET issued_count =
      private.analytics_visitor_issuance_limits.issued_count + 1;
  END IF;

  INSERT INTO public.daily_visits (date, visitor_id, visit_count)
  VALUES (current_visit_date, visitor_identifier, 1)
  ON CONFLICT (date, visitor_id) DO NOTHING;

  DELETE FROM private.analytics_visitor_issuance_limits
  WHERE date < current_visit_date - 2;
END;
$$;

REVOKE ALL ON FUNCTION public.record_daily_visit(text, text, boolean)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_daily_visit(text, text, boolean)
TO service_role;
