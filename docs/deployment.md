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

## Limitations to fix before real use

1. **Uploads are on local disk.** `LocalDiskStorage` writes under
   `UPLOAD_DIR`. On serverless hosts (Vercel, Netlify) the filesystem is
   ephemeral and per-instance, so files would vanish. Implement `FileStorage`
   over S3-compatible object storage (`src/server/storage`) and return it
   from `createStorage()`. Keep serving files through `/api/files/[id]` so the
   permission check stays in place, or issue short-lived signed URLs from
   that route.
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
