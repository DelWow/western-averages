select course_id
from {{ ref('mart_course_grade_quality') }}
where not has_sufficient_sample
  and (
      average_grade is not null
      or median_grade is not null
      or grade_variance is not null
      or grade_standard_deviation is not null
      or minimum_grade is not null
      or maximum_grade is not null
  )
