select
    id::text as submission_id,
    course_id::bigint as course_id,
    grade::numeric as grade,
    lower(term::text) as term,
    case
        when year::text ~ '^[0-9]{4}$' then year::integer
        else null
    end as academic_year,
    created_at::timestamptz as submitted_at,
    (created_at at time zone 'America/Toronto')::date as submitted_on
from {{ source('western_averages', 'student_averages') }}
