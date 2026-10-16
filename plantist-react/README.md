# plantist — React, Vite, Supabase, Vercel

This project keeps the existing plantist layout and stylesheet. `src/style.css` is the preserved original stylesheet; Plant Protocols-specific styles are isolated in `src/protocol.css`.

## Included functionality

- Supabase email/password sign-up and sign-in.
- Account profiles and plant profiles, with image uploads to Supabase Storage.
- Plant Panel posts and replies, including file attachments.
- Plant Protocols article library with a reusable article template: title, author, publication date, source URL, summary, and repeatable heading/body sections.
- Search across article titles, authors, summaries, and section text.
- Sorting by Recommended, newest, oldest, or title.
- Per-user 1–5 star article ratings. Ratings are private under Supabase Row Level Security.
- Recommended sorting uses title keyword overlap with articles the current user rated 4–5 or 1–2 stars. Similarity to both high- and low-rated titles makes the result neutral. A rating of 3 is neutral.

## 1. Put the files in GitHub

1. Open your plantist GitHub repository.
2. Open the repository in GitHub Codespaces.
3. Upload/copy the contents of this project into the repository, keeping the folder structure shown below. If your repo already contains the original `src/style.css`, keep it; the included copy is intended to be byte-for-byte the preserved original.
4. Commit the files to your branch and push them to GitHub.

Expected structure:

```text
plantist/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── .env.example
├── .gitignore
├── README.md
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── style.css
│   ├── protocol.css
│   └── supabase.js
└── supabase/
    └── schema.sql
```

Do not commit `.env.local`. Do not place a Supabase `service_role` or secret key in frontend code or Vercel client-side environment variables.

## 2. Configure Supabase

1. Create/open your project at https://supabase.com/dashboard.
2. In **Project Settings → API** (the label may vary slightly), copy the project URL and the publishable/anon client key.
3. Open **SQL Editor → New query**.
4. If this is a **new** Supabase project, paste the entire `supabase/schema.sql` file into SQL Editor and run it. If you already ran the earlier plantist schema in your existing project, run only `supabase/protocols-migration.sql` to add the new article library and private ratings without reapplying the rest of the schema. Back up production data before making schema changes.
5. In **Authentication → URL Configuration**, set the Site URL to your eventual Vercel domain. Add your Vercel production domain and any preview domains you use to the allowed redirect URLs. Email confirmation behavior is controlled under **Authentication → Providers → Email**.
6. Confirm that the `plantist` Storage bucket exists after running the SQL.

### Create local environment variables

In the repository root (the same folder as `package.json`), create a file named `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Replace both values with your actual Supabase project values. Do not use a secret/service-role key. `.env.local` is ignored by Git.

## 3. Run it in GitHub Codespaces

In the Codespaces terminal, run:

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Open the forwarded Vite port (normally 5173) when Codespaces offers it. Test sign-up/sign-in, create a plant, add a Plant Panel post, and then test Plant Protocols.

### Plant Protocols workflow

1. Sign in.
2. Open **Plants → Plant Protocol**.
3. Choose **+ new article**.
4. Fill in title, author, date, source URL, summary, then add as many header/text sections as needed.
5. Publish. Only the author of an article can edit or delete it; all visitors can read the article library.
6. Rate articles from 1 to 5 stars while signed in. Ratings are stored per account and are not exposed to other users.
7. Leave **Recommended** selected to apply keyword-based personal sorting. Choose another sort to override recommendations.

The recommendation logic tokenizes article titles, ignores common filler words, and checks for at least one shared meaningful keyword with titles you rated 4–5 or 1–2 stars. If an article matches both a high-rated and a low-rated title, it is placed in the neutral group. Unmatched articles are neutral too. Ties are ordered by publication date, newest first.

## 4. Build check in Codespaces

Run:

```bash
npm run build
```

Fix any errors shown before deploying. To preview the production build locally, run `npm run preview -- --host 0.0.0.0`.

## 5. Deploy with Vercel

1. Open https://vercel.com/dashboard and import the GitHub repository.
2. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
3. In **Project Settings → Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = your Supabase publishable/anon key
4. Apply the variables to Production and Preview as needed.
5. Deploy. Every subsequent push to the connected GitHub branch can trigger a new deployment.
6. Copy the Vercel production URL back into Supabase **Authentication → URL Configuration** as the Site URL and allowed redirect URL.

`vercel.json` contains the SPA rewrite so direct navigation to routes such as `/plants`, `/panel`, and `/protocol` loads the React app.

## 6. Final verification checklist

- [ ] `npm run build` passes.
- [ ] Sign-up works (including the email-confirmation flow if enabled).
- [ ] Sign-in and sign-out work.
- [ ] A signed-in user can create and delete their own plant profiles.
- [ ] Plant Panel posts/replies load and attachments upload.
- [ ] Protocol articles can be created, edited, searched, sorted, and deleted by their author.
- [ ] A signed-in user can rate articles; signing in as another account does not reveal the first account's ratings.
- [ ] Recommended sorting moves titles related to 4–5-star articles toward the top and titles related to 1–2-star articles toward the bottom; titles matching both groups stay neutral.
- [ ] Production Vercel URL and Supabase auth redirect settings match.

## Notes

- The original stylesheet is kept separate from `protocol.css` so feature-specific styles can be adjusted without replacing the site's original visual design.
- Article ratings are personal tracking, not public averages.
- This template gives any signed-in user the ability to create an article. If you want only an administrator to publish articles, use a separate admin role/policy before launch.
