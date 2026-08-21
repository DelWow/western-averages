# Security hardening and deployment

## Confirmed findings addressed

- Anonymous Supabase clients could request stored submitter IP addresses and user
  agents, even though the UI omitted those columns.
- Anonymous clients could read persistent analytics identifiers and invoke the
  visit-recording `SECURITY DEFINER` function directly.
- Attacker-chosen analytics IDs and replayed requests could inflate metrics and
  grow the analytics table without a serverless-safe bound.
- Average submissions had no atomic quota or same-course cooldown after a valid
  Turnstile challenge.
- Turnstile validation did not bind successful tokens to an exact hostname and
  had no upstream timeout.
- API routes accepted unbounded JSON, did not enforce content type or an exact
  browser origin, and trusted a generic forwarded-IP header.
- The application lacked a strict script CSP, clickjacking controls, and several
  standard browser security headers.
- The installed framework and transitive dependency tree had known high-severity
  vulnerabilities.

## Required rollout order

For an existing production deployment, do not run both `20260821` migrations in
one pre-deploy batch. They are deliberately split to avoid breaking the old app
while the new release is being verified:

1. Apply `20260821000000_harden_public_endpoints.sql`. This additive phase
   creates the new RPCs and limits but leaves the legacy API available.
2. Set the server-only environment values below. Generate independent random
   values with at least 32 characters for the two application secrets.
3. Deploy the updated application.
4. Smoke-test course reads, average submission, and analytics on the new deploy.
5. Apply `20260821000001_lock_down_public_access.sql`. This phase revokes the
   vulnerable anonymous table/RPC access and removes legacy RLS policies.
6. Run the verification checks below.

On a fresh environment where the base application schema has already been
provisioned, all migrations may be applied in timestamp order before the first
application deploy. If the application must be rolled back
after step 5, roll forward with a fixed build or explicitly restore the old
database privileges during a controlled maintenance window.

Required or recommended production values:

```env
ALLOWED_ORIGINS=https://westernaverages.xyz
TURNSTILE_ALLOWED_HOSTNAMES=westernaverages.xyz
ABUSE_PREVENTION_SECRET=<independent random value, 32+ characters>
ANALYTICS_SECRET=<different independent random value, 32+ characters>
```

Netlify also supplies its canonical `URL` and deploy-preview URL to the exact
origin allowlist. Production rejects missing or reused application secrets so
the Turnstile and Supabase credentials can be rotated independently. Local
development retains compatibility fallbacks only when `NODE_ENV` is not
`production`.

Do not enable `TRUST_PROXY_HEADERS` on Netlify. On another hosting provider,
enable it only when a trusted reverse proxy removes every inbound
`X-Forwarded-For` header and writes its own canonical value.

## Controls now enforced

- Public table reads are replaced by narrow, explicitly granted RPCs. Raw IP,
  user-agent, abuse-fingerprint, and analytics-identifier data are not returned.
- Successful average submissions are limited to five per browser fingerprint
  per hour, 30 per network per hour, and one matching course/term/year
  submission per browser fingerprint per 24 hours.
- Turnstile verification itself is limited to 300 attempts per network in each
  ten-minute window. The deliberately higher shared-network ceiling bounds
  outbound traffic without trivially blocking a university NAT; enforce tighter
  bot limits at the CDN/WAF where available.
- Rate checks and inserts run in one PostgreSQL transaction under advisory locks,
  so parallel serverless workers cannot race past them.
- New analytics cookies are signed, HTTP-only, SameSite=Lax, and Secure in
  production. At most 100 new visitor cookies can be issued per network daily,
  and an existing visitor records at most one row per Toronto day. Failed
  best-effort analytics requests are not retried on every client navigation.
- Public recent-submission data omits stable row identifiers and buckets the
  submission time to the Toronto calendar date to reduce correlation risk.
- Only Netlify's platform client-IP header is trusted on Netlify. Generic proxy
  headers require an explicit opt-in.
- Turnstile tokens are limited to the documented size, checked server-side,
  bound to the expected action and exact hostname, and verified with a timeout.
- API mutations require an exact allowed `Origin`; JSON requests are streamed
  through an 8 KiB limit.
- HTML responses receive a fresh script nonce. Framework, Turnstile, Google
  Analytics, and Clarity scripts receive that nonce; arbitrary inline scripts
  are blocked in production. Nonce-based pages are dynamically rendered.

## Verification

Run the local checks:

```bash
npm test
npm run lint
npm run build
npm audit --audit-level=high
```

After the lockdown migration and deploy, verify with the anonymous key while
suppressing response bodies:

- Selecting `user_ip` or `user_agent` from `student_averages` must be non-2xx.
- Selecting `visitor_id` from `daily_visits` must be non-2xx.
- Calling the old one-argument `record_daily_visit` RPC must be non-2xx.
- Intended course reads and the three `get_public_*` RPCs must still succeed.
- A cross-origin or `text/plain` submission must return `403` or `415` before
  Turnstile is contacted.
- Production HTML must include CSP, `frame-ancestors 'none'`, `nosniff`, HSTS,
  Referrer-Policy, and Permissions-Policy headers, and must omit `X-Powered-By`.

## Operational follow-up

The lockdown migration prevents future public access, and the application stops
writing raw network metadata. Existing `user_ip` and `user_agent` values remain
private in the base table so the migration does not destroy historical data.
Decide on a documented retention period, then purge those legacy values if they
are no longer required.

Monitor 403/413/415/429 rates, Turnstile failures, and database RPC errors. Tune
the quotas if legitimate users behind a shared university network are blocked.
Rotate server secrets through the hosting and Supabase dashboards; never commit
them to the repository.

No finite review can prove that all vulnerabilities are absent. Re-run dependency
and authorization checks on every release, and repeat an external assessment
after material authentication, upload, payment, or administrative features are
added.
