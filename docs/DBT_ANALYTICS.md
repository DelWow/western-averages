# dbt analytics

The `analytics/` project transforms the operational Supabase PostgreSQL tables
into privacy-safe views for data-quality analysis and Tableau. Google Analytics
continues to cover site traffic and product events; dbt covers application data.

## Models

- `stg_courses` and `stg_student_averages` standardize source fields. The
  submission model explicitly excludes IP addresses, user agents, fingerprints,
  and other abuse-prevention fields.
- `mart_course_grade_quality` reports course coverage and masks every submitted
  grade statistic until at least five submissions exist.
- `mart_submission_volume` reports broad term-level submission counts without
  grades or visitor identifiers.
- `mart_department_overview` reports department coverage and masks aggregate
  grades until the same minimum sample size is met.

Change `min_public_sample_size` in `analytics/dbt_project.yml` to enforce a
larger threshold. Do not lower it below five for a public dashboard.

## Run locally against Supabase

From the repository root:

```bash
python3 -m venv analytics/.venv
source analytics/.venv/bin/activate
python -m pip install --requirement analytics/requirements.txt
```

Set the PostgreSQL values from the Supabase **Connect** panel. Use a dedicated
dbt database user rather than the application service-role key:

```bash
export DBT_POSTGRES_HOST="your-postgres-host"
export DBT_POSTGRES_PORT="5432"
export DBT_POSTGRES_USER="western_averages_dbt"
export DBT_POSTGRES_PASSWORD="your-database-password"
export DBT_POSTGRES_DATABASE="postgres"
export DBT_POSTGRES_SCHEMA="analytics"
export DBT_POSTGRES_SSLMODE="require"
```

Then validate the connection and build the project:

```bash
dbt debug --project-dir analytics --profiles-dir analytics
dbt build --project-dir analytics --profiles-dir analytics
dbt docs generate --project-dir analytics --profiles-dir analytics
dbt docs serve --project-dir analytics --profiles-dir analytics
```

Never commit database credentials. The checked-in profile reads them only from
environment variables.

## Least-privilege production access

Create a dedicated dbt role that can read only `public.courses` and
`public.student_averages` and can create objects in the configured analytics
schemas. Do not grant it access to the `private` schema. Because dbt's default
custom-schema naming combines the target schema with the model schema, the
default configuration creates `analytics_staging` and `analytics_marts`.

Create a separate Tableau role with `USAGE` on `analytics_marts` and `SELECT`
only on its three mart views. Do not connect Tableau with the dbt role, the
Supabase owner, or the application service-role credentials.

## Tableau dashboard

Connect Tableau to PostgreSQL with the read-only Tableau role, then use only:

- `analytics_marts.mart_submission_volume`: submission volume by term and year
- `analytics_marts.mart_course_grade_quality`: sample-status counts and masked
  course-level grade statistics
- `analytics_marts.mart_department_overview`: department coverage and masked
  aggregate grade statistics

A useful first dashboard has three sheets: submission volume over academic
terms, courses by sample status, and department coverage. Filter grade visuals
to `has_sufficient_sample = true`. Do not publish staging models or row-level
submissions as Tableau data sources.

## Continuous integration

The `Build and test dbt analytics` CI job starts an isolated PostgreSQL service,
loads the synthetic rows in `analytics/ci/bootstrap.sql`, runs `dbt build`, and
generates the documentation artifacts. It requires no Supabase secrets and does
not contain production student data.

For a production refresh, run `dbt build` from a trusted scheduler with the dbt
role's credentials. The marts are views, so Tableau queries current source data;
rerun dbt after model changes to update their definitions and execute tests.
