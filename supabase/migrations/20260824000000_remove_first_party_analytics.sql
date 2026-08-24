-- Google Analytics and Microsoft Clarity now provide all application analytics.
-- Remove the legacy first-party visit counter and its stored identifiers.

DROP FUNCTION IF EXISTS public.record_daily_visit(text, text, boolean);
DROP FUNCTION IF EXISTS public.record_daily_visit(text);
DROP TABLE IF EXISTS private.analytics_visitor_issuance_limits;
DROP TABLE IF EXISTS public.daily_visits;
