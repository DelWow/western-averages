select submission_id
from {{ ref('stg_student_averages') }}
where grade < 0 or grade > 100
