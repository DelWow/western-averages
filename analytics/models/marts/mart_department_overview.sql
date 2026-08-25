{% set minimum_sample_size = var('min_public_sample_size') %}

select
    course.department,
    count(distinct course.course_id)::bigint as course_count,
    count(submission.submission_id)::bigint as submission_count,
    count(distinct submission.course_id)::bigint as courses_with_submissions,
    count(submission.submission_id) >= {{ minimum_sample_size }} as has_sufficient_sample,
    case
        when count(submission.submission_id) >= {{ minimum_sample_size }}
            then round(avg(submission.grade), 2)
    end as average_grade,
    case
        when count(submission.submission_id) >= {{ minimum_sample_size }}
            then round(
                (
                    percentile_cont(0.5)
                    within group (order by submission.grade)
                )::numeric,
                2
            )
    end as median_grade,
    case
        when count(submission.submission_id) >= {{ minimum_sample_size }}
            then round(variance(submission.grade), 2)
    end as grade_variance
from {{ ref('stg_courses') }} as course
left join {{ ref('stg_student_averages') }} as submission using (course_id)
group by course.department
