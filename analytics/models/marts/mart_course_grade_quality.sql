{% set minimum_sample_size = var('min_public_sample_size') %}

with submission_stats as (
    select
        course_id,
        count(*)::bigint as submission_count,
        avg(grade) as average_grade,
        percentile_cont(0.5) within group (order by grade) as median_grade,
        variance(grade) as grade_variance,
        stddev_samp(grade) as grade_standard_deviation,
        min(grade) as minimum_grade,
        max(grade) as maximum_grade,
        min(submitted_on) as first_submission_on,
        max(submitted_on) as latest_submission_on
    from {{ ref('stg_student_averages') }}
    group by course_id
)

select
    course.course_id,
    course.course_code,
    course.course_name,
    course.department,
    course.course_level,
    course.verified_average,
    course.sqct_grade,
    coalesce(stats.submission_count, 0)::bigint as submission_count,
    case
        when coalesce(stats.submission_count, 0) = 0 then 'no_submissions'
        when stats.submission_count < {{ minimum_sample_size }} then 'insufficient'
        else 'sufficient'
    end as sample_status,
    coalesce(stats.submission_count, 0) >= {{ minimum_sample_size }} as has_sufficient_sample,
    case when stats.submission_count >= {{ minimum_sample_size }} then round(stats.average_grade, 2) end as average_grade,
    case when stats.submission_count >= {{ minimum_sample_size }} then round(stats.median_grade::numeric, 2) end as median_grade,
    case when stats.submission_count >= {{ minimum_sample_size }} then round(stats.grade_variance, 2) end as grade_variance,
    case when stats.submission_count >= {{ minimum_sample_size }} then round(stats.grade_standard_deviation, 2) end as grade_standard_deviation,
    case when stats.submission_count >= {{ minimum_sample_size }} then stats.minimum_grade end as minimum_grade,
    case when stats.submission_count >= {{ minimum_sample_size }} then stats.maximum_grade end as maximum_grade,
    stats.first_submission_on,
    stats.latest_submission_on
from {{ ref('stg_courses') }} as course
left join submission_stats as stats using (course_id)
