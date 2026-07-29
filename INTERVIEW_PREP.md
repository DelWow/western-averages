# Western Averages — Repository-Specific Interview Preparation

## 1. The short project explanation

Western Averages is a public course-average browser for Western University. It separates a course's existing `avg_grade` from anonymous, student-submitted grades so the UI can show an official/verified-looking value without silently treating community data as equivalent. Users can browse all courses, filter by department, open a dynamic course page, and contribute a term, year, and grade.

The application is built with the Next.js App Router, React, TypeScript, Tailwind CSS, Supabase, and Cloudflare Turnstile. Most public data access happens directly from client components through Supabase's anonymous client. The notable server boundary is the Turnstile verification route, because the Cloudflare secret must not reach the browser. A separate server-rendered analytics page reads visit data but only permits requests whose `Host` header looks local.

An interview-sized summary:

> I built a Next.js course-average explorer backed by Supabase. I modeled verified course averages separately from anonymous student submissions, aggregate those submissions for browsing and course-level statistics, and use Cloudflare Turnstile to reduce automated submissions without requiring user accounts. I used client-side Supabase access to keep the public read path simple, while keeping the Turnstile secret behind a Next.js route handler. The current version favors a small deployment and fast iteration; the next scaling step would be moving global aggregation and submission writes behind database functions or server endpoints.

## 2. Architecture at a glance

```text
Browser
├── /                         fetches all courses and student grades
├── /subject?subject=...      fetches the same data, derives departments, filters locally
├── /course/[id]              fetches one course, submits and reads student averages
└── global Turnstile widget
       │
       └── POST /api/turnstile/verify
                 │
                 └── Cloudflare siteverify API

Browser client ─────────────── Supabase
                               ├── courses
                               ├── student_averages
                               ├── get_course_average_stats(...) RPC
                               └── daily_visits (analytics read)

Server-rendered /analytics ─── Supabase
```

Important boundaries:

- The root layout and metadata are server-rendered, but the main browsing pages are client components: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/subject/page.tsx`, and `src/app/course/[id]/page.tsx`.
- Client components share a singleton anonymous Supabase client from `src/lib/supabase.ts`.
- Server code creates a fresh Supabase client through `src/lib/supabase-server.ts`.
- The Turnstile secret is used only by `src/app/api/turnstile/verify/route.ts`.
- There is no authentication system in this repository. Public access therefore depends on the database's row-level security policies being correct.

## 3. Main user and data flows

### Browse all courses

`src/app/page.tsx` repeatedly requests `courses` in 1,000-row ranges, deduplicates them by `id`, and then repeats the process for `student_averages`. It groups grades by `course_id`, computes an unverified mean for each course, and merges that derived value into the course objects.

The page then:

- sorts by verified average, unverified average, letter grade, name, or level;
- places missing values after real values;
- displays either `ClassCard` or `CourseListItem`;
- paginates the already-downloaded array at 300 courses per page.

Why it was likely chosen: it is straightforward, avoids a custom API, and allows every sort mode to run instantly after the initial load.

Trade-off: UI pagination does not reduce network or database work. Every visit still downloads every course and every student grade. The cost grows linearly with the full dataset, and the same aggregation is repeated independently in each browser.

Interview framing:

> I intentionally started with client-side aggregation because the dataset and deployment were small and it made multiple local sort modes simple. I understand that the 300-item pagination only limits rendering. At larger scale I would expose a database view or RPC returning one pre-aggregated row per course, then add server-side filtering and cursor or range pagination.

### Browse by subject

`src/app/subject/page.tsx` uses the same paginated fetch and aggregation algorithm, derives department counts from the resulting courses, and filters the course array locally. The selected subject is mirrored into the `subject` query parameter with `router.replace`, so a selection is linkable and survives refreshes. `useMemo` avoids recomputing the subject-name search unless the subject list or query changes.

Why it was likely chosen: the URL remains the source of shareable navigation state, while client state keeps interaction responsive.

Trade-offs:

- The all-courses fetch and aggregation logic is duplicated from the home page.
- Changing the URL parameter causes the data-loading effect to fetch the entire dataset again.
- `filteredCourses` is derived state stored separately from `courses` and `selectedSubject`, which creates extra synchronization work.

A stronger next version would extract a shared data layer and derive filtered courses with `useMemo`.

### View and contribute to a course

`src/app/course/[id]/page.tsx` reads the dynamic route parameter with `useParams`, fetches one `courses` row using `.eq('id', courseId).single()`, and renders verified grade information.

`src/app/components/SubmitAverageForm.tsx`:

1. validates a grade from 0–100;
2. requires `fall`, `winter`, or `summer`;
3. constrains the year from 2000 through next calendar year;
4. verifies the cached Turnstile token if Turnstile is configured;
5. obtains the browser's public IP through ipify when possible;
6. inserts `course_id`, `grade`, `term`, `year`, `user_ip`, and `user_agent` directly into `student_averages`;
7. notifies the course page, which increments `refreshTrigger`;
8. causes `UnverifiedAveragesSection` to refetch.

`src/app/components/UnverifiedAveragesSection.tsx` first calls the Supabase RPC `get_course_average_stats`. If that fails, it fetches all submissions for the course and computes count, mean, minimum, maximum, and median in JavaScript. Recent rows are displayed separately, normally limited to 10 and capped at 50 when expanded.

Why this design is useful: the database function is the efficient path, but the component still works if that function is missing or unavailable.

Trade-offs:

- The fallback hides schema/deployment drift and can become expensive for a popular course.
- The UI calls `.single()` on the RPC result, so its return shape is part of the frontend contract.
- Submission success is followed by a two-second delay before refreshing the statistics.
- The direct browser insert means Turnstile verification and the insert are separate operations. A client that bypasses the UI can attempt the Supabase insert directly if RLS permits anonymous inserts.

The security-critical improvement is a server-side submission endpoint or database function that accepts the form, validates it, verifies Turnstile, and writes the row as one controlled flow.

## 4. How each technology is actually used

### Next.js 16 App Router

Relevant files: `src/app/layout.tsx`, all `page.tsx` files, `src/app/api/turnstile/verify/route.ts`, and `next.config.ts`.

The App Router provides filesystem routes, the dynamic `/course/[id]` route, global metadata/layout, a route handler, font optimization, and a server-rendered analytics route. `next.config.ts` enables the React Compiler and leaves `output` unset for the Netlify runtime.

Why it fits: the project needs routing, metadata, client interactivity, and one small trusted server endpoint without maintaining a separate backend application.

Trade-off: the main public pages opt into `'use client'`, so they do not benefit much from server data fetching, streaming, or server-rendered course content. That can delay useful content until JavaScript loads and Supabase requests finish, and dynamic course content is less directly available for SEO.

Interview framing:

> I used the App Router for route composition and the server/client boundary, but the current browsing experience is client-heavy. If SEO or initial-load performance became a priority, I would fetch initial course data in server components and pass only interactive sorting and filtering into smaller client components.

### React 19

Relevant files: the three client pages and `src/app/components`.

React state controls loading, sorting, pagination, view mode, subject selection, form validation, Turnstile state, and refreshes. Effects synchronize with Supabase, URL state, DOM event listeners, timers, the Turnstile script, and session storage.

Reusable presentational components include `ClassCard`, `CourseListItem`, `StatsCard`, and `Header`. Stateful integration components include `Turnstile`, `GlobalTurnstile`, `SubmitAverageForm`, and `UnverifiedAveragesSection`.

Trade-off: grade-letter and grade-style logic is repeated across several components and pages. The two browsing pages also duplicate their data-loading pipeline. Shared utilities/hooks would make the behavior more consistent and easier to test.

The enabled React Compiler is configured in `next.config.ts`. It can reduce the need for manual memoization, but the application must follow React's effect and purity rules; the current lint failures around synchronous state updates in effects show why those rules matter.

### TypeScript

Relevant files: all `.ts` and `.tsx` source files plus `tsconfig.json`.

The repository uses strict TypeScript, no emitted JavaScript from `tsc`, bundler-style resolution, the `@/*` alias for `src/*`, and local interfaces for courses, submissions, statistics, and component props.

Why it fits: the UI depends on nullable grades and specific database result shapes, so explicit types make null handling and component contracts visible.

Trade-off: the Supabase client has no generated database type parameter. Query results are therefore not checked against the real schema end to end, and casts such as `statsData as AverageStats` can mask drift. Generating Supabase types would catch column and RPC mismatches earlier.

### Supabase and its PostgreSQL-facing API

Relevant files: `src/lib/supabase.ts`, `src/lib/supabase-server.ts`, the three public pages, `SubmitAverageForm.tsx`, `UnverifiedAveragesSection.tsx`, and `src/app/analytics/page.tsx`.

The repository uses Supabase for:

- `courses` reads;
- anonymous `student_averages` reads and inserts;
- the `get_course_average_stats` PostgreSQL function exposed as an RPC;
- `daily_visits` reads for local analytics.

The browser client is a module-level singleton to avoid creating multiple client instances. The server helper creates a fresh client per use. Both use the public URL and anonymous key; there is no service-role key in this repository.

The application code expects these effective columns:

- `courses`: `id`, `code`, `name`, `department`, `level`, `avg_grade`, `created_at`;
- `student_averages`: `id`, `course_id`, `grade`, `term`, `year`, `created_at`, `user_ip`, `user_agent`;
- `daily_visits`: `date`, `visit_count`, `visitor_id`.

The repository does not contain an executable migration directory, so the deployed schema cannot be reproduced from the code alone. `IMPLEMENTATION_PLAN.md` describes a planned `student_averages` schema, but it uses `average`, `submitted_at`, and `ip_address`, while the running frontend contract uses `grade`, `created_at`, and `user_ip`. That mismatch is important technical debt, not a detail to conceal.

Interview framing:

> Supabase let me ship the data layer quickly and use PostgreSQL aggregation through an RPC. Because the browser uses the anonymous key, I treat RLS as the real authorization boundary. One improvement I would prioritize is checking in migrations and generated TypeScript types so the database contract is versioned with the application.

### Cloudflare Turnstile

Relevant files: `src/app/layout.tsx`, `src/app/components/Turnstile.tsx`, `src/app/components/GlobalTurnstile.tsx`, `src/app/components/SubmitAverageForm.tsx`, `src/app/components/AddClassForm.tsx`, and `src/app/api/turnstile/verify/route.ts`.

The global layout lazy-loads Cloudflare's script. `Turnstile.tsx` owns widget rendering, callback handling, fallback script loading, cleanup, and an imperative reset method. `GlobalTurnstile.tsx` displays a floating challenge and caches a token plus a five-minute client-side expiry in `sessionStorage`. Forms send that token to the Next.js route handler, which sends the secret and token to Cloudflare's `siteverify` endpoint.

Why it was likely chosen: the project allows anonymous writes, so Turnstile adds bot friction without introducing accounts.

Trade-offs and limitations:

- Turnstile is optional; if the public site key is absent, forms proceed without it.
- The browser's five-minute expiry is a convenience assumption, not proof that Cloudflare will accept or allow reuse of the token.
- Successful verification is not cryptographically bound by this application to the later Supabase insert.
- The route does not send the user's remote IP to Cloudflare or inspect hostname/action fields in the result.
- `Turnstile.tsx` contains extensive production console logging and fairly complex script-loading code.

### Tailwind CSS 4 and custom CSS

Relevant files: `postcss.config.mjs`, `src/app/globals.css`, and JSX class names throughout `src/app`.

Tailwind utility classes implement responsive layout and component styling. `globals.css` imports Tailwind, defines Western-themed colors and font variables, and centralizes grade and course-level badge classes. `layout.tsx` loads Source Sans 3 and Source Serif 4 with `next/font` and exposes them as CSS variables.

Why it fits: the UI has many small responsive variations and repeated color states, which are quick to express as utilities.

Trade-off: some design rules are centralized in CSS, but many colors and layout decisions are repeated as arbitrary utility values such as `[#4F2683]`. A clearer theme token layer would reduce duplication.

### Netlify

Relevant files: `netlify.toml`, `README.md`, and `NETLIFY_SETUP.md`.

Netlify is the documented production target. It runs `npm run build`, uses Node 20, and declares the Netlify Next.js plugin. Deployment documentation lists the Supabase and Turnstile environment variables.

One repository consistency issue: `netlify.toml` declares `@netlify/plugin-nextjs`, but it is not listed in `package.json` or found in `package-lock.json`. The deployment platform may inject runtime support, but a reproducible local/plugin setup should make that ownership explicit and verify it in CI.

## 5. Data integrity, privacy, and security

The positive design choice is the separation between `courses.avg_grade` and community rows in `student_averages`. Components label community-derived values as unverified and prefer `avg_grade` when both exist.

The repository currently relies on several layers:

- browser validation for grade, term, and year;
- Turnstile verification when configured;
- Supabase database constraints and RLS, which are described in `IMPLEMENTATION_PLAN.md` but not checked in as migrations.

Key risks to discuss honestly:

- Browser validation is not a security boundary.
- A public anonymous key is normal for Supabase, but only if RLS and database constraints enforce every invariant.
- The plan's open insert policy, `WITH CHECK (true)`, does not enforce grade range, term values, year limits, rate limits, or a successful Turnstile result.
- Public IP and user-agent collection creates privacy obligations. The IP is obtained from a third-party service and then sent to Supabase from the client.
- There is no edit/delete flow, moderation workflow, or user ownership.
- The repository documents possible rate limiting but does not implement it in the application flow.

Strong interview answer:

> The current threat model is anonymous community contribution, not authenticated ownership. I added Turnstile and client validation for usability and bot friction, but I would never describe those as sufficient authorization. The durable controls need to be checked-in database constraints/RLS or a server submission endpoint. I would also revisit whether raw IP retention is necessary, and prefer a short-lived server-side hash if rate limiting is the only purpose.

## 6. Performance and scalability

Current strengths:

- Supabase reads are paged in 1,000-row batches rather than silently stopping at a default response cap.
- The course-detail path fetches only one course.
- The course-level statistics RPC moves aggregation into PostgreSQL when available.
- UI lists use stable course IDs in their keys, although they unnecessarily append the array index.

Primary bottlenecks:

1. `/` and `/subject` download all course rows and all student grades.
2. The browser groups every submission and recalculates all means.
3. The same pipeline is duplicated and rerun on the subject page.
4. `select('*')` transfers columns not required by several screens.
5. Array spreading inside page-fetch loops repeatedly copies accumulated arrays.
6. The analytics page reads the entire `daily_visits` table and aggregates it in application memory.
7. No caching or revalidation policy is used for public data.

A sensible scaling path:

1. Add versioned migrations and generated database types.
2. Create a course-summary view/RPC containing verified average, unverified average, and submission count.
3. Fetch only the requested course/department page and necessary columns.
4. Move anonymous writes behind a rate-limited server endpoint that verifies Turnstile.
5. Aggregate analytics with SQL and query only the requested date range.
6. Add cache/revalidation where slightly stale public averages are acceptable.

## 7. Analytics implementation

`src/app/analytics/page.tsx` is one of the few true server components in the project. It forces dynamic rendering, checks the request `Host`, reads all `daily_visits`, and derives all-time, weekly, daily, and unique-visitor counts. It passes serializable statistics to the client-side `AnalyticsDashboard`, which draws a CSS bar chart and a recent-activity table without a charting dependency.

Why the CSS chart is a reasonable choice: the visualization is simple, so avoiding a chart library reduces dependencies and bundle size.

Important limitations:

- Host-header checking is a convenience gate, not robust authentication, and forwarded/proxy host behavior must be understood.
- No code in this repository writes to `daily_visits`; the data producer exists outside the checked-in code or is incomplete.
- Reading all history on every analytics request will not scale.
- Date boundaries use server UTC via `toISOString`, which may differ from the product's intended Toronto day boundary.

## 8. Current quality state

Commands available in `package.json` are development, build, production start, and lint. There is no test script, test framework, or CI configuration in this repository.

At the time this guide was prepared, `npm run lint` failed with five errors and three warnings. The errors are concentrated in the Turnstile components and `AddClassForm`: synchronous state updates inside effects and one unescaped apostrophe. Warnings include an unused `useRef` import and unused catch variables.

`AddClassForm.tsx` is not imported anywhere in `src`, so it is currently dead code rather than part of the active add-course flow.

The first production-build validation did not complete cleanly during inspection; a Next build process remained running with `.next/lock`, and a second attempt correctly refused to start. Do not claim a clean build without rerunning it after that process exits.

Testing priorities:

- unit tests for grade boundaries, sorting with null values, and median/mean aggregation;
- component tests for form validation and success/error states;
- integration tests for Turnstile verification plus submission;
- database tests for constraints and RLS using the anonymous role;
- route tests for malformed Turnstile bodies and Cloudflare failures;
- end-to-end tests for subject query parameters and post-submission refresh.

## 9. Likely interview questions and good answers

### Why are the main pages client components?

The initial implementation performs browser-side Supabase reads, sorting, filtering, and view switching. That keeps interactions simple and avoids a custom API. The trade-off is a larger client workload and delayed initial content. A more mature version would server-render initial summaries and isolate only interactive controls in client components.

### Why use both an RPC and a JavaScript fallback?

The RPC is efficient because PostgreSQL computes aggregate statistics close to the data. The fallback kept the feature usable during database-function rollout or drift. The downside is duplicated business logic and the possibility that database and JavaScript calculations diverge. Once migrations and deployment are reliable, the RPC contract should be tested and the fallback narrowed.

### How do verified and unverified data differ?

`courses.avg_grade` is the primary displayed course average. Anonymous rows live separately in `student_averages`. Cards use the unverified mean only when the verified value is null; when both exist, they show the verified value prominently and the unverified value as secondary context.

### Why is the Supabase anonymous key in a public environment variable?

The browser must have that key to call Supabase, and an anonymous key is designed to be public. Security comes from RLS and database constraints, not secrecy of the key. A service-role key would never belong in `NEXT_PUBLIC_*` or in client code.

### Does Turnstile make anonymous inserts secure?

It reduces automated abuse through the normal form, but the current architecture does not bind verification to the direct Supabase insert. The stronger design is to send the form and token to a server endpoint, verify the token there, validate again, rate limit, and perform the insert server-side.

### How would you make the home page scale?

Replace the two full-table scans with a typed course-summary query or materialized view, request only the current page and sort, return an exact or estimated count separately, and cache results with an acceptable revalidation interval. PostgreSQL should aggregate submissions once instead of every browser repeating the work.

### What would you refactor first?

First, version the actual schema and generate Supabase types because correctness depends on that contract. Second, secure the submission transaction behind the server. Third, extract duplicated course-fetching, grade formatting, and sorting logic. Then add tests and make lint/build mandatory.

### What was a thoughtful product decision?

Keeping anonymous submissions visibly separate from verified averages. The data model and UI both preserve provenance instead of blending values that have different trust levels.

## 10. What not to overclaim

Based on this repository alone, do not claim:

- authenticated users, roles, or ownership;
- a complete moderation system;
- server-enforced Turnstile on the database write;
- implemented application-level rate limiting;
- reproducible database migrations;
- an active analytics collection pipeline;
- automated tests or CI;
- a currently clean lint/build pipeline;
- server-side pagination of the public course list.

It is stronger in an interview to explain why the present design was sufficient for its stage, identify the precise boundary where it stops scaling or protecting data, and propose the next change in repository-specific terms.
