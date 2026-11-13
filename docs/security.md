# Security, privacy and data integrity review

A walk through what CampusTrace protects, how, and where the evidence is.
Each item names the code that enforces it and the test that proves it, so a
reader can check rather than take it on trust. The last section lists what
is deliberately *not* covered and why.

## 1. Authentication

| Property | How | Where |
| --- | --- | --- |
| Passwords are never stored | bcrypt hash, cost 10 | `src/actions/account.ts`, `src/lib/auth.ts` |
| Wrong email and wrong password look identical | Same message, and a dummy hash is compared when the email is unknown so timing matches | `src/lib/auth.ts` (`DUMMY_HASH`), e2e "a wrong password is refused…" |
| Password guessing is throttled | Failed sign-ins counted per email (8 / 10 min) and per client address (40 / 10 min) in a database table, so the limit holds across server instances and restarts | `src/server/rate-limit.ts`, e2e "repeated wrong passwords lock the account out" |
| Account creation is throttled | 10 new accounts per address per hour | `src/actions/account.ts` |
| Only university addresses can register | `ALLOWED_EMAIL_DOMAINS` allow-list | `src/actions/account.ts` |
| Session cannot be forged or read by scripts | NextAuth signed JWT in an HTTP-only, SameSite cookie; secure on HTTPS | NextAuth defaults |
| Role changes apply immediately | The token holds only the user id; the role is re-read from the database on every request | `getCurrentUser` in `src/lib/auth.ts` |
| Nobody can self-promote to desk staff | Registration always creates `STUDENT`; the role is changed only in the database | `src/actions/account.ts` |
| Login redirects cannot leave the site | `safeNextPath` rejects anything but a local path | `src/lib/auth.ts` |
| Forms cannot be submitted from other sites | Next.js Server Actions verify the `Origin` header; NextAuth sign-in carries a CSRF token; `form-action 'self'` in the CSP | framework + `next.config.ts` |

## 2. Authorisation and privacy

The rules live in two pure modules, `src/lib/workflow/access.ts` (who may
*see* what) and `src/lib/workflow/rules.ts` (who may *do* what, and when).
Pages call them to decide what to render; services call the same functions
inside the transaction before writing. The UI therefore can never be more
permissive than the server, and the rules are unit-tested without a database
(`tests/unit/access.test.ts`, `tests/unit/rules.test.ts`).

What is private, and from whom:

| Data | Visible to | Hidden from | Enforced by |
| --- | --- | --- | --- |
| Finder's private note (`privateDetails`), finder's name and email, custody shelf tag | Finder, desk | Everyone else, including claimants | `canViewReportPrivate`; public listing queries never select these columns (`src/server/queries.ts`) |
| A claim: statement, evidence files, review notes, collection time | Claimant, desk | Everyone else, **including the finder** | `canViewClaim`; claim pages 404 otherwise; events tied to a claim are excluded from the public timeline |
| Who claimed an item | Desk only | Finder and public | The finder's notification says only that "someone" claimed it |
| Photos of ID and bank cards | Finder, desk | Public, even if the finder ticked "show photo" | `isPhotoPublic` forces the sensitive category private |
| Closed reports | Reporter, desk | Public | `canViewReport` |
| The desk area (`/admin`) | Desk | Students get a 404, so the area is not advertised | `requireAdmin` |
| Notifications | Their recipient | Everyone else; marking one read is filtered by `userId` | `src/actions/notifications.ts` |

Uploaded files are stored outside the web root (or in a *private* Vercel
Blob store) under random 128-bit keys. The only way to fetch one is
`/api/files/[id]`, which looks up the attachment, runs `canViewAttachment`
for the current viewer, and answers **404 for both "forbidden" and
"missing"** so the response never confirms a private file exists. Files are
sent with `Cache-Control: private, no-store`, `nosniff`, a sandboxing CSP,
and PDFs as downloads rather than inline. This is covered end to end in
`e2e/return-journey.spec.ts` (step 4, "the claim and its evidence are hidden from the finder and from visitors") and
`e2e/access-and-forms.spec.ts`.

## 3. Input handling

- Every form and action is parsed with Zod on the server
  (`src/lib/validation.ts`, tested in `tests/unit/validation.test.ts`).
  Lengths are bounded, enums are closed, dates are checked.
- Uploads are identified by their **bytes** (`src/lib/file-types.ts`), not by
  extension or the browser's claimed type; only JPEG, PNG, WebP (and PDF for
  evidence) are accepted, with per-file and per-form limits. The original
  filename is kept only as a sanitised label and never used as a path.
- Storage keys are validated against a strict pattern before any disk
  access, so a key can never contain `../`.
- React escapes all rendered text; the codebase has no
  `dangerouslySetInnerHTML`. Rule failures reach the browser as plain
  messages; unexpected errors are logged on the server and shown as a
  generic message, so stack traces and SQL never leak.
- Prisma parameterises every query, including the raw `SELECT … FOR UPDATE`
  and the rate-limit upsert (tagged-template parameters, not string
  concatenation).

## 4. HTTP hardening

Every response carries (`next.config.ts`, checked by the e2e test
"responses carry the hardening headers"):

- `Content-Security-Policy`: same-origin by default; `frame-ancestors 'none'`
  (no clickjacking), `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`. Scripts and styles allow inline because Next.js
  needs its bootstrap scripts; a nonce-based policy is the natural next step.
- `Strict-Transport-Security` (one year, subdomains).
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` denying camera, microphone and location.

## 5. Data integrity

The return journey is a state machine (`docs/architecture.md`). What keeps
it consistent under concurrent use:

- **One transaction per transition.** Each service function in
  `src/server/services/` runs inside `db.$transaction`. The status change,
  the append-only `WorkflowEvent` row and the `Notification` rows commit
  together or not at all.
- **Row lock per item.** Every transition first runs
  `SELECT … FOR UPDATE` on the report (`lockReport` in `services/shared.ts`).
  Two desk officers acting on the same item at the same instant are
  serialised: the second one re-reads the state after the first commits and
  re-evaluates the rule, so, for example, two different claims on one item
  cannot both be approved, and custody cannot be recorded twice.
- **Rules are re-checked inside the lock,** not just in the page that
  rendered the button. A stale page or a hand-crafted request gets a
  refusal (`WorkflowError`), never a half-applied change.
- **Custody before collection.** `canScheduleCollection` and
  `canRecordHandover` require `report.status === "IN_CUSTODY"`. The e2e
  journey asserts scheduling is blocked before custody and allowed after.
- **Database constraints** back the rules: one claim per person per item
  (`@@unique([reportId, claimantId])`), unique human references, unique
  storage keys, foreign keys with cascades, closed enums for every status.
- **No deletes in the workflow.** Reports are closed, claims are rejected or
  withdrawn; history rows are never edited or removed.
- **Uploads and database stay in step.** Files are written before the
  transaction; if the transaction fails they are deleted again
  (`discardUploads`). An orphaned row can therefore not point at a missing
  file, and a failed claim leaves no stray file behind.
- **Persistence.** Nothing lives in browser or server memory: refresh,
  redeploy or restart and every report, claim, event and notification is
  still there. The e2e suite reloads mid-journey to prove it.

## 6. Known limitations

Honest gaps, with the reason each is left for now:

1. **No email verification or password reset.** Registration trusts that a
   `@ucc.edu.gh` address belongs to the person typing it. Production should
   verify by email or, better, use the university's single sign-on.
2. **Desk accounts are created in the database.** Deliberate for the demo;
   a real deployment needs an audited role-management screen.
3. **CSP allows inline scripts.** Next.js requires it without a nonce
   middleware. Adding one is routine but was not needed for this scope.
4. **Account-existence hint on registration.** "An account with this email
   already exists" confirms an address is registered. The sign-in form does
   not leak this; the trade-off on registration is the usual one for
   usability.
5. **Rate-limit address detection** relies on `X-Forwarded-For`, which the
   hosting platform sets. Behind no proxy, all clients share one bucket.
6. **Vercel accepts request bodies up to about 4.5 MB.** The form allows
   three 4 MB photos; on Vercel a submission over the platform limit fails
   before reaching the app. Lower `UPLOAD_LIMITS` for that host or upload
   directly to object storage.
7. **No audit log of desk sign-ins** and no admin action log beyond the
   per-item workflow history.
