# Architecture

This document explains how CampusTrace is put together and why. It is written
for students who will read, present or extend the code.

## One request, one render

Every page is rendered on the server at request time (`ƒ` in the build
output). Nothing workflow-related is cached, because almost every screen
depends on who is signed in and on state that must never be stale: whether an
item is in custody, whether a claim has been approved, whether a handover has
been recorded. `next.config.ts` therefore leaves Cache Components off. The
cost is a database round-trip per page, which is fine at campus scale.

## Layers

```
browser ──► src/app (pages, Server Actions)      what the user sees and submits
              │
              ▼
            src/actions                           parse FormData with Zod, map errors to fields
              │
              ▼
            src/server/services                  one workflow transition per function,
              │                                   each inside a database transaction
              ▼
            src/lib/workflow (pure rules)  +  Prisma (src/lib/db) + FileStorage (src/server/storage)
```

- **Pages** (`src/app/**/page.tsx`) are async Server Components. They read
  with Prisma, decide what the viewer may see using `src/lib/workflow/access.ts`,
  and render. Forms are client components that call Server Actions with
  `useActionState`, so validation errors come back next to the field and what
  the user typed is kept.
- **Actions** (`src/actions`) are thin: authenticate, validate with Zod,
  call one service, `revalidatePath`, return a typed `FormState`.
- **Services** (`src/server/services`) own every state change. Each one opens
  a transaction, locks the report row (`lockReport`, a `SELECT … FOR UPDATE`)
  so two desk officers cannot act on the same item at once, re-checks the
  rule, writes the change, appends a `WorkflowEvent` and creates
  `Notification`s. If anything fails, nothing is written.
- **Rules** (`src/lib/workflow/rules.ts`, `access.ts`, `journey.ts`) are pure
  functions with no database or framework imports. They answer "may this
  actor do this to this report or claim right now?" with an `allow` or a
  `deny(reason)`. The same function runs in the page (to decide whether to
  show a button and explain why not) and in the service (to enforce it), so
  the UI can never be more permissive than the server. These are what the
  Vitest suite covers.

## Data model

Seven tables (`prisma/schema.prisma`):

| Model | Purpose |
| --- | --- |
| `User` | Students and desk staff (`role`: `STUDENT` or `ADMIN`) |
| `CollectionPoint` | Staffed places where items are handed in and collected |
| `Report` | A found or lost item. Carries custody fields once the desk holds it. |
| `Claim` | One student's private ownership claim on one found report |
| `Attachment` | A stored file: a report photo or claim evidence |
| `WorkflowEvent` | Append-only history shown on report and claim pages |
| `Notification` | In-app notices for one user |

Human-readable references (`CT-…` for reports, `CL-…` for claims) are generated
in the transaction and unique, so people can quote them at a desk.

### States

```
Report.status   OPEN ──► IN_CUSTODY ──► RETURNED
                  │           │
                  └───────────┴──► CLOSED        (withdrawn, duplicate, lost item recovered…)

Claim.status    SUBMITTED ──► APPROVED ──► COLLECTION_SCHEDULED ──► HANDED_OVER ──► COMPLETED
                    │            │
                    ├──► REJECTED│
                    └──► WITHDRAWN (by the claimant, before handover)
```

The rule the project is built around lives in `canScheduleCollection` and
`canRecordHandover`: both require `report.status === "IN_CUSTODY"`. A claim can
be submitted and approved while the report is still `OPEN`, so the desk can
do its reading before the item arrives, but the physical steps wait for
custody. Recording the handover is the moment the item physically changes
hands, so that transaction also marks the report `RETURNED`, rejects any
other open claims on it, and resolves the lost report the claim cited (if
any). The owner's receipt confirmation then completes the claim, which is
the signal that closes the loop for the finder's "thank you" notification.

## Authorisation and privacy

Priority one in the brief, so it is worth listing what is enforced:

- **Private details.** A found report's `privateDetails` (the identifying
  feature the finder kept back) is readable by the finder and the desk only.
  A claim's `statement` and evidence are readable by the claimant and the desk
  only. The finder never learns who claimed their item.
- **Files.** Uploads live outside `/public` and are served only by
  `/api/files/[id]`, which applies `canViewAttachment`. A forbidden file and a
  missing file both answer 404. Photos of ID cards and documents are kept off
  the public report (`isPhotoPublic`).
- **Roles.** Desk accounts cannot claim items; finders cannot claim their own
  report; students cannot open `/admin` or act on claims that are not theirs.
- **Sign-in.** bcrypt password hashes, HTTP-only JWT session cookie, a fixed
  message for wrong email *or* password, and a per-email rate limit of eight
  attempts per ten minutes. Registration is limited to the university email
  domains in `ALLOWED_EMAIL_DOMAINS`.
- **Input.** Every action parses its input with Zod on the server. Uploads
  are checked by magic bytes (`src/lib/file-types.ts`), capped in size and
  count, and stored under generated keys, never under the uploaded name.

## Storage interface

`src/server/storage/index.ts` defines `FileStorage { put, get, delete }`.
`LocalDiskStorage` writes under `UPLOAD_DIR`. Because pages never link to a
file's location, swapping in S3, R2 or GCS means writing one more class and
returning it from `createStorage()`; see `docs/deployment.md`.

## Design system

Tokens are CSS variables in `src/app/globals.css` and exposed to Tailwind
through `@theme`: warm off-white surfaces, deep navy for navigation and
headings, teal as the primary action colour, amber reserved for lost-item
indicators, green reserved for completed returns. The type scale
(`type-page`, `type-section`, `type-card`, `text-lead`, `text-small`,
`type-reference`) pairs Fraunces headings with Atkinson Hyperlegible body
text, both served from `src/fonts` with `next/font/local`.

Motion is deliberately light: CSS keyframes for small entrances and status
pulses, and Motion for React for the orchestrated parts (the staggered hero
cards and the journey track that draws itself in). `useReducedMotion` turns
the orchestration off for people who have asked their OS for less movement.

## Testing

- `tests/unit` (Vitest, 76 tests): every rule in `src/lib/workflow` and every
  Zod schema. No database, no browser.
- `e2e` (Playwright, 19 tests): the nine-step return journey across three
  browser sessions (finder, owner, desk) with a real database, plus access
  control and form behaviour. The suite proves the "custody before
  collection" rule end to end and that state survives a page refresh.
