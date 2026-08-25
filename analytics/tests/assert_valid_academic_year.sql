select submission_id
from {{ ref('stg_student_averages') }}
where academic_year < 2000
   or academic_year > extract(year from current_date)::integer + 1
