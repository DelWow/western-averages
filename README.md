This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Netlify

This project is configured to deploy on Netlify using the Next.js Runtime.

### Prerequisites

1. A Netlify account (sign up at [netlify.com](https://www.netlify.com))
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

### Deployment Steps

#### Option 1: Deploy via Netlify UI (Recommended)

1. **Push your code to Git**
   ```bash
   git add .
   git commit -m "Add Netlify configuration"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider and select this repository

3. **Configure Build Settings**
   - Build command: `npm run build` (should be auto-detected)
   - Publish directory: `.next` (should be auto-detected)
   - The `netlify.toml` file will automatically configure these settings

4. **Set Environment Variables**
   - In Netlify dashboard, go to Site settings → Environment variables
   - Add the following variables:
     - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
     - `SUPABASE_SERVICE_ROLE_KEY` - Server-only key used by protected API routes
     - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` - Your Cloudflare Turnstile site key
     - `TURNSTILE_SECRET` - Your Cloudflare Turnstile secret key
     - `TURNSTILE_ALLOWED_HOSTNAMES` - Exact comma-separated widget hostnames
     - `ALLOWED_ORIGINS` - Exact comma-separated browser origins allowed to post
     - `ABUSE_PREVENTION_SECRET` - A random server-only value (32+ characters)
     - `ANALYTICS_SECRET` - A different random server-only value (32+ characters)

5. **Deploy**
   - Click "Deploy site"
   - Netlify will automatically install dependencies, build, and deploy your site

#### Option 2: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Initialize and Deploy**
   ```bash
   netlify init
   netlify deploy --prod
   ```

4. **Set Environment Variables**
   ```bash
   netlify env:set NEXT_PUBLIC_SUPABASE_URL "your-supabase-url"
   netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "your-supabase-anon-key"
   netlify env:set SUPABASE_SERVICE_ROLE_KEY "your-service-role-key"
   netlify env:set NEXT_PUBLIC_TURNSTILE_SITE_KEY "your-turnstile-site-key"
   netlify env:set TURNSTILE_SECRET "your-turnstile-secret-key"
   netlify env:set TURNSTILE_ALLOWED_HOSTNAMES "westernaverages.xyz"
   netlify env:set ALLOWED_ORIGINS "https://westernaverages.xyz"
   netlify env:set ABUSE_PREVENTION_SECRET "a-random-value-at-least-32-characters-long"
   netlify env:set ANALYTICS_SECRET "a-different-random-value-at-least-32-characters"
   ```

### Post-Deployment

- Your site will be available at `https://your-site-name.netlify.app`
- Netlify will automatically deploy on every push to your main branch
- You can configure a custom domain in Site settings → Domain management

### Troubleshooting

- If build fails, check the build logs in the Netlify dashboard
- Ensure all environment variables are set correctly
- Verify your Supabase project is accessible and the keys are correct

## Cloudflare Turnstile Setup

This project includes Cloudflare Turnstile for bot protection on forms. To enable it:

1. **Get Turnstile Keys**
   - Sign up for a Cloudflare account at [cloudflare.com](https://www.cloudflare.com)
   - Go to the Turnstile dashboard: [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
   - Create a new site and get your Site Key and Secret Key

2. **Set Environment Variables**
   - Create a `.env.local` file in the root directory (for local development)
   - Add the following variables:
     ```
     NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key-here
     TURNSTILE_SECRET=your-secret-key-here
     ```
   - For production (Netlify), add these in the Netlify dashboard under Environment variables

3. **How It Works**
   - The Turnstile widget automatically appears on `SubmitAverageForm`
   - Users must complete the verification challenge before submitting
   - Tokens are verified server-side when the form posts to `/api/averages`

Both Turnstile variables are required for course-average submissions.

## Daily and weekly user analytics

The app records one anonymous browser visit per Toronto calendar day and shows
daily, rolling seven-day, and all-time totals at
`http://localhost:3000/analytics`. The dashboard intentionally redirects on the
deployed site.

For an existing production site, apply the additive `20260821000000` migration,
deploy and smoke-test this application, then apply the restrictive
`20260821000001` migration. A fresh environment can apply every migration in
timestamp order before its first deploy.
The hardened tracker uses a signed, HTTP-only random browser cookie and stores
only keyed identifiers. It does not store raw IP addresses or account data.
The final security migration also makes visit recording idempotent, rate-limits
new identifiers, prevents direct anonymous RPC access, and restricts public
student-average reads to safe projections.

See `docs/SECURITY.md` for the required deployment order and verification steps.

The Netlify and Docker production runtimes use Node.js 24. For Docker, pass the
configured `NEXT_PUBLIC_*` values as build arguments and inject every
server-only secret (`SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET`,
`ABUSE_PREVENTION_SECRET`, and `ANALYTICS_SECRET`) only when the container runs.
Also inject `ALLOWED_ORIGINS` and `TURNSTILE_ALLOWED_HOSTNAMES`. A Docker deploy
must sit behind a trusted reverse proxy that discards inbound
`X-Forwarded-For`, writes the canonical client address, and sets
`TRUST_PROXY_HEADERS=true`; otherwise protected POST endpoints intentionally
fail closed.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
