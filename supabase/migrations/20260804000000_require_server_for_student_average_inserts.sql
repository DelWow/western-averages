-- Student-average writes must go through the Next.js endpoint that verifies
-- a single-use Cloudflare Turnstile token before inserting with service_role.
ALTER TABLE public.student_averages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit student averages"
ON public.student_averages;

REVOKE INSERT ON TABLE public.student_averages FROM anon, authenticated;
