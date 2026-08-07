# Analytics setup

Western Averages loads Google Analytics 4 (GA4) and Microsoft Clarity only in
production and only when their corresponding public ID is present and valid.
Missing or invalid IDs leave the trackers disabled. Because Next.js embeds
`NEXT_PUBLIC_*` values during the build, redeploy the site after adding or
changing either value.

## Google Analytics setup

1. Sign in to [Google Analytics](https://analytics.google.com/).
2. Create or select the GA4 property for Western Averages.
3. Go to **Admin → Data collection and modification → Data streams**.
4. Create or open the **Web** data stream for the production website.
5. In **Stream details**, copy the **Measurement ID**. It starts with `G-`, for
   example `G-XXXXXXXXXX`.
6. Configure it as:

   ```env
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

Keep **Enhanced measurement** enabled and, in its advanced settings, keep
**Page changes based on browser history events** selected. GA4 then records the
initial page and Next.js client-side route changes without a second manual
page-view implementation.

## Microsoft Clarity setup

1. Sign in to [Microsoft Clarity](https://clarity.microsoft.com/) and create or
   open the Western Averages project.
2. Open **Settings → Overview** and copy the **Project ID**. It is also the value
   after `/projects/view/` in the project URL.
3. You can confirm it against **Settings → Setup → Installation methods →
   Install manually → Get tracking code**; the ID is the final argument in the
   tracking snippet.
4. Configure it as:

   ```env
   NEXT_PUBLIC_CLARITY_PROJECT_ID=xxxxxxxxxx
   ```

Clarity's default sensitive-content masking remains enabled. Do not change
Clarity's masking settings to expose form contents or other private data.

## Netlify setup

In Netlify, open the Western Averages site and go to **Site configuration →
Environment variables**. Add these two variables with their real values:

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_CLARITY_PROJECT_ID=xxxxxxxxxx
```

Make them available to production builds, save them, and trigger a new
production deploy. No `netlify.toml` changes or Netlify Analytics subscription
are required.

## Verification

Analytics intentionally does not run under `npm run dev`. Verify a deployed
production build (or a local `npm run build && npm start` build made with the
two variables set).

### Verify GA4

1. Open the production site with browser developer tools open.
2. In **Network**, filter for `gtag/js` and confirm one request to
   `googletagmanager.com/gtag/js?id=G-...`. Filter for `collect` and confirm GA4
   requests to `google-analytics.com/g/collect`.
3. Navigate between **All Courses**, **Browse by Subject**, **SQCT Grades**, and
   a course detail without reloading. In GA4, open **Reports → Realtime** and
   confirm `page_view` activity and the visited page paths. Realtime data can
   take several minutes to appear.
4. Exercise the existing search, subject filter, sort, pagination, view toggle,
   and course-detail interactions. Confirm these event names in Realtime:
   `course_search`, `filter_courses`, `sort_courses`, `pagination`,
   `view_mode_change`, and `course_view`.
5. For deeper troubleshooting, connect the deployed site with
   [Google Tag Assistant](https://tagassistant.google.com/) to enable debug mode,
   then open **Admin → Data display → DebugView** and inspect each event and its
   parameters.

Only non-sensitive parameters are sent: the interaction type, sort method,
target page number, view mode, filter action, and broad course level. The
subject search text, subject name, course ID/name/code, grades, form contents,
and user/account identifiers are not sent by custom events.

### Verify Clarity

1. Open the production site and interact with several pages.
2. In browser developer tools, open **Network**, filter for `clarity`, and
   confirm the script loads once from `https://www.clarity.ms/tag/<project-id>`.
3. Filter for `collect` and confirm successful `POST` requests to
   `https://www.clarity.ms/collect` while interacting with the site.
4. Open the project in Clarity. Check the live-user/session view, then
   **Recordings** and **Dashboard**. Live activity can appear immediately;
   processed dashboard data can take longer.
5. Navigate through the site with Next.js links and confirm the session shows
   the page changes without creating a duplicate Clarity installation.

Browser privacy extensions, consent controls, or network blocking can prevent
either service from sending test traffic. Test in a clean browser profile if
requests do not appear.

## Privacy notes

- The IDs are public routing identifiers, not secrets; no server-only variables
  are exposed.
- No authentication tracking or user identification was added.
- No custom event includes user-entered text, user-submitted grades, names,
  emails, Supabase user IDs, auth tokens, or personal/database account IDs.
- GA4 and Clarity still perform their standard collection, including cookies,
  device/browser details, approximate location, and network-derived data. Keep
  the site's privacy notice current and add a consent mechanism if required by
  the laws and policies applicable to the site's visitors.
- The pre-existing first-party daily visit counter remains separate from GA4
  and Clarity.
