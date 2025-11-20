# Netlify Setup for Cloudflare Turnstile

## Environment Variables in Netlify

1. Go to your Netlify dashboard
2. Navigate to: **Site settings** → **Environment variables**
3. Add these variables:

```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key-here
TURNSTILE_SECRET_KEY=your-secret-key-here
```

**Important:** 
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` must start with `NEXT_PUBLIC_` to be accessible in client components
- `TURNSTILE_SECRET_KEY` should NOT have `NEXT_PUBLIC_` prefix (server-only)

## Cloudflare Turnstile Hostname Configuration

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Turnstile** → Your widget
3. In **Hostname Management**, add your Netlify domain:
   - `westernaverages.xyz` (your production domain)
   - `westernaverages.netlify.app` (if you want to test on Netlify subdomain)
   - `localhost` (for local development - optional)

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
- Add `localhost` to Cloudflare Turnstile hostname list
- Or test on your production domain after deployment

