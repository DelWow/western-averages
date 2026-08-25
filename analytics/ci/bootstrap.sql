create table public.courses (
    id bigint primary key,
    code text not null unique,
    name text not null,
    department text not null,
    level integer not null,
    avg_grade numeric,
    sqct_grade text,
    created_at timestamptz not null default now()
);

create table public.student_averages (
    id bigint primary key,
    course_id bigint not null references public.courses (id),
    grade numeric not null,
    term text not null,
    year text,
    created_at timestamptz not null default now()
);

insert into public.courses (
    id, code, name, department, level, avg_grade, sqct_grade, created_at
) values
    (1, 'CS 1026', 'Computer Science Fundamentals I', 'Computer Science', 1000, 78.2, 'A', '2026-01-01T12:00:00Z'),
    (2, 'CS 1027', 'Computer Science Fundamentals II', 'Computer Science', 1000, 74.8, 'B', '2026-01-01T12:00:00Z'),
    (3, 'MATH 1600', 'Linear Algebra I', 'Mathematics', 1000, 71.5, 'B', '2026-01-01T12:00:00Z');

insert into public.student_averages (
    id, course_id, grade, term, year, created_at
) values
    (1, 1, 82.0, 'fall', '2025', '2025-09-15T14:00:00Z'),
    (2, 1, 78.5, 'fall', '2025', '2025-09-20T14:00:00Z'),
    (3, 1, 86.0, 'fall', '2025', '2025-10-01T14:00:00Z'),
    (4, 1, 74.0, 'fall', '2025', '2025-10-10T14:00:00Z'),
    (5, 1, 80.0, 'fall', '2025', '2025-10-20T14:00:00Z'),
    (6, 1, 77.0, 'winter', '2026', '2026-01-20T14:00:00Z'),
    (7, 2, 72.0, 'winter', '2026', '2026-01-22T14:00:00Z'),
    (8, 2, 69.5, 'winter', '2026', '2026-02-01T14:00:00Z'),
    (9, 2, 75.0, 'winter', '2026', '2026-02-10T14:00:00Z'),
    (10, 3, 73.0, 'summer', '2026', '2026-05-15T14:00:00Z');
