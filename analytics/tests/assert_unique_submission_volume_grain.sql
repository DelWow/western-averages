select academic_year, term
from {{ ref('mart_submission_volume') }}
group by academic_year, term
having count(*) > 1
