# Netlify Setup for Cloudflare Turnstile

## Environment Variables in Netlify

1. Go to your Netlify dashboard
2. Navigate to: **Site settings** → **Environment variables**
3. Add these variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anonymous-key
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key-here
TURNSTILE_SECRET=your-secret-key-here
SUPABASE_SERVICE_ROLE_KEY=your-server-only-supabase-service-role-key
TURNSTILE_ALLOWED_HOSTNAMES=westernaverages.xyz
ALLOWED_ORIGINS=https://westernaverages.xyz
ABUSE_PREVENTION_SECRET=generate-an-independent-random-value-of-32-or-more-characters
ANALYTICS_SECRET=generate-a-different-random-value-of-32-or-more-characters
```

**Important:** 
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` must start with `NEXT_PUBLIC_` to be accessible in client components
- The public Supabase URL and anonymous key are browser configuration, not
  substitutes for the server-only service-role key
- `TURNSTILE_SECRET` should NOT have `NEXT_PUBLIC_` prefix (server-only)
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never use a
  `NEXT_PUBLIC_` prefix
- Keep both abuse-prevention secrets server-only and use different random values
- Use exact origins and hostnames; wildcards and suffix matching are not supported

## Cloudflare Turnstile Hostname Configuration

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Turnstile** → Your widget
3. In **Hostname Management**, add your Netlify domain:
   - `westernaverages.xyz` (your production domain)
   - `westernaverages.netlify.app` (if you want to test on Netlify subdomain)
   - Do not add `localhost` to the production widget. Use Cloudflare's test keys
     or a separate development widget instead.

## Troubleshooting

### Widget Not Showing
- Check browser console for errors
- Verify environment variables are set in Netlify
- Make sure hostname is configured in Cloudflare dashboard
- Wait a few minutes after adding hostname for changes to propagate

### Error 110200
- This means domain mismatch - add your domain to Cloudflare Turnstile hostname list
- Widget may still render but verification will fail

### Testing Locally
- Use Cloudflare's documented test site key and secret, or a separate
  development widget restricted to `localhost`.
- Keep development and production widgets separate so a development token can
  never satisfy the production hostname allowlist.
