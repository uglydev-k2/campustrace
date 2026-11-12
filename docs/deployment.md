# Deployment notes

CampusTrace is built to run on a laptop for a demonstration. It is honest
about what would need to change to run it for a campus.

## What works today

- `npm run build && npm start` produces a standard Next.js production server
  (Node.js). It needs `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`,
  `UPLOAD_DIR` and optionally `ALLOWED_EMAIL_DOMAINS`.
- `npx prisma migrate deploy` applies migrations without prompts, suitable
  for a deploy step.
- Any managed PostgreSQL (Neon, Supabase, RDS, a university server) works
  unchanged.

## Deploying to Vercel

Vercel runs the app as serverless functions, so two things must live
elsewhere: the database and the uploaded files. Both have free tiers.

1. **Push the repository to GitHub** and import it at vercel.com/new. Keep
   the detected framework (Next.js); `vercel.json` sets the build command to
   `prisma migrate deploy && next build`, so every deploy applies pending
   migrations before it builds.
2. **Database.** Any hosted Postgres works: Supabase, Neon (both free), or
   a provider from Vercel's Storage tab. Set `DATABASE_URL` to its
   connection string. With **Supabase**, use the *Session pooler* URI (port
   5432): the direct connection is IPv6-only on the free plan, which Vercel
   cannot reach. Keep the database password to letters and digits, or
   URL-encode any special characters (`@` becomes `%40`).

   Hosted poolers admit only a handful of clients (Supabase's session pooler
   allows 15), and Vercel may run many function instances at once, so the
   app keeps a pool of just 2 connections per instance on Vercel and drops
   idle ones after five seconds (`src/lib/db.ts`). If you ever see
   "max clients reached", lower `DATABASE_POOL_MAX` to 1 or move to the
   provider's transaction-mode pooler.
3. **Uploads.** Open **Storage → Create → Blob** and set the access to
   **Private**. Connecting it gives the deployment permission to read and
   write the store. Then add the environment variables
   `STORAGE_DRIVER=vercel-blob` and `UPLOAD_DIR=uploads` (the folder prefix
   inside the store).
4. **Remaining environment variables** (Settings → Environment Variables):
   - `NEXTAUTH_SECRET`: output of `openssl rand -base64 32`
   - `NEXTAUTH_URL`: the site's address, e.g. `https://campustrace.vercel.app`
   - `ALLOWED_EMAIL_DOMAINS`: `stu.ucc.edu.gh,ucc.edu.gh`
5. **Deploy**, then load the demo data once from your laptop, pointing the
   seed at the hosted database:
   `DATABASE_URL="<the Neon URL>" npm run db:seed`

After that, every push to `main` redeploys. The seed replaces all data, so do
not run it again once real reports exist.

## Limitations to fix before real use

1. **Local-disk uploads do not survive on serverless hosts.** The default
   `STORAGE_DRIVER=local` writes under `UPLOAD_DIR`, which on Vercel or
   Netlify is ephemeral and per-instance. Use `STORAGE_DRIVER=vercel-blob`
   there (above), or implement `FileStorage` over S3-compatible object
   storage (`src/server/storage`) and add it to `createStorage()`. Keep
   serving files through `/api/files/[id]` so the permission check stays in
   place.
2. **The rate limiter is in memory.** `src/server/rate-limit.ts` is per
   process and resets on restart. With more than one instance, back it with
   Redis or a database table.
3. **Notifications are in-app only.** There is no email or SMS. Adding a
   provider (for example Resend or Postmark) would be one call inside
   `notify()` in `src/server/services/shared.ts`.
4. **Authentication is email + password with a university-domain allow
   list.** It does not verify that the address is real. A production
   deployment should add email verification or, better, single sign-on with
   the university identity provider (NextAuth supports OIDC/SAML providers).
5. **Administrator accounts are created by editing the database.** This is
   intentional for the demo; a real deployment needs an audited way for a
   super-user to grant and revoke the desk role.
6. **Server Actions accept up to 14 MB bodies** (three 4 MB files plus the
   form). Put the app behind a reverse proxy with a matching limit, and
   consider direct-to-storage uploads if photos get larger.
7. **No backups, monitoring or log shipping are configured.** Use the
   database provider's point-in-time recovery and add an error tracker before
   relying on it.
8. **Single region, single database.** Row locks (`SELECT … FOR UPDATE`) keep
   concurrent desk actions safe within one PostgreSQL; nothing here assumes
   multiple writers.

## A reasonable first deployment

A single small VM or container (Fly.io, Railway, Render, or a university
server) running `npm start` behind HTTPS, with a managed PostgreSQL and an
S3-compatible bucket for uploads, covers everything above except items 3 to 5,
which are product decisions rather than infrastructure.

Nothing in this repository deploys anywhere or provisions paid services on its
own.
