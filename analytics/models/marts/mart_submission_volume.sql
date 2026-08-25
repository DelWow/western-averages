select
    academic_year,
    term,
    case term
        when 'winter' then 1
        when 'summer' then 2
        when 'fall' then 3
    end as term_sort_order,
    count(*)::bigint as submission_count,
    count(distinct course_id)::bigint as courses_with_submissions,
    min(submitted_on) as first_submission_on,
    max(submitted_on) as latest_submission_on
from {{ ref('stg_student_averages') }}
group by academic_year, term
