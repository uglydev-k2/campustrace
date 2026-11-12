# CampusTrace

A campus lost-and-found web application, built as a university Software
Engineering project and using the **University of Cape Coast** as its
demonstration setting. Students report what they have found or lost, search
reports, submit private ownership claims, and the collection desk coordinates
verified returns.

> CampusTrace is not an official university service. The accounts, collection
> points and items in it are sample data.

## The return journey

Every found item follows the same six stops, and the app enforces the order:

```
Found item reported → published → finder drops it at a collection point
→ desk records custody → owner submits evidence → desk approves the claim
→ collection arranged → handover recorded → owner confirms receipt
```

Two rules shape the whole design:

- **Claims may be reviewed before the item arrives**, but a collection time
  can only be set, and a handover only recorded, once the desk has confirmed
  custody. Nobody travels for an item that is not there.
- **Proof stays private.** Finders keep identifying details in a private note;
  owners describe those details in a claim that only desk staff can read. The
  finder never sees who claimed an item or what they wrote.

Students can also publish **lost-item reports** and cite one when they claim a
found item; the lost report is resolved automatically when the item is
handed over.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, TypeScript, Server Actions) |
| Styling | Tailwind CSS 4 with design tokens in `src/app/globals.css` |
| Database | PostgreSQL 16 via Prisma 7 (`@prisma/adapter-pg`) |
| Auth | NextAuth.js (Auth.js v4), email + password, bcrypt hashes |
| Validation | Zod, on the server, for every form and action |
| Icons | Lucide |
| Motion | CSS transitions/keyframes + [Motion for React](https://motion.dev) (`motion/react`) |
| Fonts | Fraunces (headings) and Atkinson Hyperlegible Next (body), served locally through `next/font/local` |
| Tests | Vitest (business rules) and Playwright (end-to-end journey) |

## Setup on macOS

You need **Node.js 20.19 or newer** and **Docker Desktop** (for PostgreSQL).

```bash
# 1. Install dependencies (also generates the Prisma client)
npm install

# 2. Create your local environment file
cp .env.example .env
# then set NEXTAUTH_SECRET to the output of:  openssl rand -base64 32

# 3. Start PostgreSQL in Docker (creates both the dev and the test database)
npm run db:up

# 4. Create the tables and load the demo data
npm run db:migrate
npm run db:seed

# 5. Run the app
npm run dev
```

Open <http://localhost:3000>.

If you prefer a PostgreSQL you already have installed, skip step 3 and point
`DATABASE_URL` at it; create a second database named `campustrace_test` if you
want to run the end-to-end tests.

### Demo accounts

All demo accounts use the password `CampusTrace1!`.

| Account | Role | Email |
| --- | --- | --- |
| Abena Owusu | Collection desk (admin) | `desk@ucc.edu.gh` |
| Kofi Mensah | Student | `kofi.mensah@stu.ucc.edu.gh` |
| Ama Boateng | Student | `ama.boateng@stu.ucc.edu.gh` |
| Yaw Asante | Student | `yaw.asante@stu.ucc.edu.gh` |
| Esi Quansah | Student | `esi.quansah@stu.ucc.edu.gh` |

New accounts can be registered with an email on one of the domains in
`ALLOWED_EMAIL_DOMAINS` (by default `stu.ucc.edu.gh` and `ucc.edu.gh`). Desk
accounts are created by changing a user's `role` to `ADMIN` in the database
(for example with `npm run db:studio`); there is deliberately no self-service
route to become an administrator.

### A five-minute demo

1. Sign in as **Kofi** and report a found item (*I found something*). Put the
   identifying detail in the private note, not the public description.
2. Sign in as **Ama** in a private window, find the item under *Browse items*,
   and claim it with the identifying detail as evidence.
3. Sign in as the **desk**. Approve the claim from *Claims to review*; notice
   that scheduling is still blocked.
4. Record custody for the item (*Awaiting drop-off → Record custody*). Now
   schedule the collection, then record the handover.
5. Back as **Ama**, open the notification and confirm receipt. The report
   shows *Returned to owner*, Kofi is thanked, and a refresh changes nothing:
   everything lives in PostgreSQL.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | Route type generation + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests for the workflow rules, access rules and validation |
| `npm run test:e2e` | Playwright end-to-end tests (run `npx playwright install chromium` once first) |
| `npm run db:up` / `db:down` | Start / stop the PostgreSQL container |
| `npm run db:migrate` | Create or apply migrations in development |
| `npm run db:seed` | Load the demo data (replaces existing data) |
| `npm run db:reset` | Drop everything, re-apply migrations, re-seed |
| `npm run db:studio` | Prisma Studio, a browser UI for the database |

The end-to-end tests build the app, start it on port 3100 against the
`campustrace_test` database, reset and seed that database, and then drive a
real browser through the complete return journey and the access rules. They
never touch the development database.

## Project layout

```
prisma/              schema, migrations and the demo seed
src/app/             routes (App Router); every page renders on request
src/actions/         Server Actions: parse the form with Zod, call a service
src/server/services/ workflow transitions, each in one database transaction
src/server/storage/  FileStorage interface + local-disk implementation
src/lib/workflow/    pure business rules (who may do what, and when)
src/components/      UI, including the Motion-driven journey track
src/fonts/           locally served font files and their licences
tests/unit/          Vitest tests for src/lib
e2e/                 Playwright tests
docs/                architecture and deployment notes
```

Read `docs/architecture.md` for how the pieces fit and why, and
`docs/deployment.md` for what it would take to run this outside a laptop.

## Uploads

Report photos and claim evidence are stored under `UPLOAD_DIR`
(`./storage/uploads` by default), which is outside the public web root and
ignored by git. Browsers can only reach a file through
`/api/files/[id]`, which checks the same access rules the pages use before
sending a byte. Files are validated by their actual bytes, not their extension.

## Licence

The application code is provided for educational use. Font licences are in
`src/fonts/LICENSES.md`.
