select
    id::bigint as course_id,
    trim(code::text) as course_code,
    trim(name::text) as course_name,
    trim(department::text) as department,
    level::integer as course_level,
    avg_grade::numeric as verified_average,
    sqct_grade::text as sqct_grade,
    created_at::timestamptz as created_at
from {{ source('western_averages', 'courses') }}
