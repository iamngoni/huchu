# Schools — open questions and caveats

Things I decided on your behalf so the work could continue, and things I could
not decide at all. Nothing here blocks the build; everything here is a call you
may want to make differently.

Each entry says what I did, why, and what changing it would cost.

---

## Decisions I made, reversible

### 1. A calendar event's kind decides whether the school is open

`HOLIDAY`, `PUBLIC_HOLIDAY`, `HALF_TERM` and `STAFF_ONLY` default to *closed*;
`EXAM` and `EVENT` default to *open*. The flag is still a separate column an
author can override per event — a speech day that closes lessons is an `EVENT`
with the flag turned off.

Cost to change: a one-line map in `lib/schools/calendar.ts`
(`defaultIsTeachingDay`). Existing rows keep whatever flag they were saved with.

### 2. Saturday and Sunday are closed unless an event says otherwise

Saturday school is normal here, so I did not hard-code a five-day week — but I
did make the weekend the default. A school that teaches every Saturday has to
enter a recurring teaching event, which is tedious.

The alternative is a per-school "teaching days of the week" setting. I did not
build it because it is a settings screen, a migration and a UI for something
that may affect zero of your schools. Say the word and it is half a day.

### 3. Overlapping grade bands are refused in code, not by the database

Two bands covering the same mark give one score two grades. Postgres can make
that unrepresentable — `EXCLUDE USING gist ("schemeId" WITH =,
numrange("minScore","maxScore",'[]') WITH &&)` — but only with the `btree_gist`
extension, and `prisma migrate deploy` already has a known failure on an empty
database. Requiring an extension raises the cost of a failed deploy above the
cost of this bug, so the rule lives in `findBandProblems` and the one route that
writes bands calls it.

Cost to change: one migration, one `CREATE EXTENSION`. Say the word if your
Postgres has `btree_gist` and you would rather have the constraint.

### 4. An absent child is left out of the average, not scored zero

Off sick for one of three tests, she is marked on the other two. The alternative
— an absence scores zero — is what some schools do, and it is a policy, not a
bug either way. If yours counts absences as zero, it is a flag on the grading
scheme and about an hour's work.

### 5. A subject with no exam yet reports its continuous mark whole

Mid-term, before any paper has been sat, a 30/70 scheme would otherwise report a
child who scored 80 on everything set as having 24. The mark carries a caveat
saying which side is missing. The alternative is to report nothing until both
sides exist, which makes the screen useless for two thirds of the term.

### 6. The teacher, parent and student portal navigations point at pages that do not exist

`/portal/teacher/classes`, `/portal/teacher/moderation`, `/portal/parent/fees`
and nine others are links in `lib/platform/gating/portal-isolation.ts` with no
route behind them. They are Iteration 6, and they will be built there. Until
then a portal user clicking them gets a 404.

I fixed the one that was a typo rather than a missing page —
`/portal/teacher/registers` should have been `/portal/teacher/register` — and
left the rest, because stripping the nav now means rebuilding it in three
commits' time. **If you would rather the nav only showed what exists, say so and
it is ten minutes.**

### 7. Portals must not use the dashboard shell — done

`/portal/**` already bypassed the dashboard chrome in `app-shell.tsx`; what was
missing was a shell of its own. The teacher portal now has one, built from the
design system's `AppShell` + `NavRail` rather than hand-rolled, with the class
list held above the navigation so every screen agrees which lesson it is
looking at. The student portal's is next.


### 8. Provisioning creates students with a current class but no enrolment rows

Found by the year roll-up, which reads `SchoolEnrollment` — the record of who
was in which class in which term — and correctly found nobody in the demo
tenant. Every seeded student has a `currentClassId` and no enrolment.

Rather than have the roll-up silently do nothing, it falls back to each
student's current year group and says so on screen. That is the honest
behaviour, but the underlying gap is real: without enrolment rows the school has
no history of who was where, so "which class was she in last year" has no
answer.

The fix is to have `provisionSchool` (and any bulk student import) write an
enrolment alongside the student. Half a day, and it wants a backfill for
existing tenants. **Worth doing before a real school goes live** — say the word.

### 9. The teacher portal wears the tenant's brand, not the prototype's purple

`teacher.html` sets its own purple accent (`--te-brand: #6D28D9`) to mark the
portal as a distinct surface. I did not copy the hex. Two rules in
`docs/design-system/05-rules.md` point the other way — "never hard-code a hex"
and "pick the role token" — and the workspace branding system already paints
`--brand` per tenant, so a hard-coded purple would ignore a school's own colours
on the one surface its staff use most.

The portal therefore uses `--brand` and reads blue by default, purple for a
school whose branding is purple. If you want the portal to be purple *because
it is a portal*, that is a per-surface accent token rather than a literal, and
it wants adding to the design system rather than to this repo.

Cost to change: one token declaration on the portal shell.

### 10. Parent messaging has no model yet

Both prototypes have it — the teacher's Messages screen and the parent's
notice replies — and the roadmap already carries it as S-7.1, deliberately as
one primitive rather than three. It needs a thread model, an attachment path
and realtime delivery, which is a domain of its own rather than a screen.

The teacher portal's Messages screen is therefore the one place I cannot build
to the prototype from what exists. I will build it when S-7.1 lands rather than
faking a thread list against notices.

### 11. Where classroom work went

Acting on your instruction, these leave the admin dashboard for the teacher
portal: lesson plans, teaching resources, homework, mark capture, the register
itself. The office keeps what it actually does — who has *not* marked, marks
moderation, publishing, and every admissions, fees, boarding, welfare and
transport screen.

Two calls inside that I want to flag:

- **The master timetable stays with the office.** A teacher sees their week; a
  timetabler builds everybody's. Same tables, two screens.
- **Library is split.** Borrowing and browsing are a student portal screen;
  the catalogue, stock and fines are the librarian's, which is office work.


### 12. Three app-wide bugs the portal build turned up

None of these are schools defects, but all three were breaking the portal, so
they are fixed. Recording them because they affect every module.

**Node's `navigator` made the server think it was offline.** Node 18 and later
define a global `navigator` carrying little more than `userAgent`. The offline
layer guarded on `typeof navigator === "undefined"`, which passed on the
server, read `navigator.onLine` as `undefined`, and concluded the machine was
offline. Every authenticated page server-rendered the offline guard, the client
rendered the app, and React threw the page away on hydration. Guarded on
`onLine` itself now, in `hooks/use-offline-connectivity.ts` and
`lib/offline/connectivity.ts`.

**The design system's `Toaster` renders nothing on the server and a viewport on
the client**, which is the same mismatch one layer down. It is gated on
`useSyncExternalStore` with a server snapshot of `false` so the first client
render matches. Worth reporting upstream. Two obvious-looking fixes are wrong:
`dynamic(…, { ssr: false })` suspends during hydration and the commit never
lands, and a `useState`+`useEffect` mount flag is a cascading render the
compiler's lint rejects.

**A TanStack Query `useQuery` mounted in a Next layout does not re-render when
it resolves.** The request returned 200 with the right body, the `queryFn`
promise resolved, and the observer never notified React — the screen sat on its
skeleton until something else forced a render. The same query in a *page*
component is fine. The teacher portal now loads its day on the server in the
layout and hands it to the client provider as `initialData`, which is better
anyway. **If you see a portal screen stuck loading, this is the first thing to
suspect.** I have not found the root cause and it deserves one.


### 13. A fourth shipped bug: no pupil or parent could reach their portal

`schools.portal.student` and `schools.portal.parent` both depend on
`schools.core` (`lib/platform/gating/feature-dependencies.ts`), and the
`STUDENT` and `PARENT` entries in `lib/platform/user-entitlements.ts` granted
the portal key without it. Every request resolved to "requires schools.core"
and bounced to `/access-blocked` — on every tenant, for every pupil and every
parent, since the entitlement list was written.

The teacher was fine because `TEACHER` inherits the shared schools prefix.

`schools.core` is added to both lists now. It grants nothing on its own: the
admin pages are gated on `schools.students`, `schools.fees` and the rest, which
are still absent from those two lists, and a portal user's records are resolved
from their own linked account regardless of any feature key.

**Worth checking whether any real tenant has parents or pupils who have been
quietly locked out.**


### 14. Three things Iteration 2 left open for you

**The printable documents screen hard-codes twenty colours.**
`components/schools/documents/school-documents-content.tsx` uses `#e5e7eb`,
`#f9fafb`, `#6b7280` and `#000` in inline styles. It predates this work
(`d03b444`), and there is a real argument for it — a print target does not
inherit the app's cascade, and a fee statement that comes out of a printer
grey-on-grey is worse than one that ignores the token system. But nothing in
the file says that, so it reads as an oversight rather than a decision.

Either it wants a comment marking it a deliberate print exception, or the
tokens want resolving to literals at build time. **Your call which.**

**Six bursar actions were writing no audit event**, against DoD item 7:
issuing an invoice, writing one off, bulk generation, creating an invoice,
approving a waiver and applying one. All six change what a parent owes, and a
school that cannot answer "who wrote off this $400" has no answer at all. This
is being closed now rather than left, but it is worth knowing it was possible
to ship six privileged money actions with no trail — the DoD says every
privileged action, and nothing enforces it the way
`route-guard-coverage.test.ts` enforces the guards. **A coverage test for audit
events would stop this recurring.**

**`prisma migrate deploy` still cannot build this database.** S-3.2 already
tracks it, but Iteration 2 made it concrete: the dev database has no
`_prisma_migrations` table at all, because it was built by `db push`. Every
migration this project has written has been applied by hand with `psql`. They
are all replayable in principle — but nobody has ever proved it, and the first
person to find out will be whoever provisions the first real school.

_Closed by S-3.2. It was worse than this paragraph guessed: the history was
missing forty tables, and two Gold-module migrations had been quietly
disagreeing with the schema since May. See entry 15._

---

### 15. What replaying the migration history turned up

Three things worth your attention, all found by S-3.2 and none of them
schools defects.

**Forty tables were never migrated.** The whole CRM and product-catalogue
schema was built with `prisma db push` and no migration was ever written. Seven
later migrations alter those tables, so the history stopped dead at
2026-07-28 on any database that had not been built by `db push`. The catch-up
reconstructs the schema as it stood that day — current form minus everything
the later seven add — so those seven were left untouched and still do exactly
what they say.

**Two migrations had drifted from the schema they claim to write.**
`add_correction_models` gave `id` a database default and `createdAt` a wider
type than `prisma/schema.prisma` declares. More interesting:
`add_company_id_to_buyer_receipt` deliberately created
`BuyerReceipt_companyId_receiptNumber_key` as a *partial* index — `WHERE
"companyId" IS NOT NULL`, with a comment explaining why — but Prisma has no way
to express an index predicate, so the schema declares a plain `@@unique` and a
`db push` database has always had the full index. The two have behaved
identically in practice, because Postgres treats NULLs in a unique index as
distinct, which is exactly what the predicate was there to arrange. Converged
on the full index, since that is what the schema means and what every existing
database already has. **If you have a Postgres partial index you actually need,
it cannot live in `schema.prisma` and this will happen again** — it wants a
comment on the migration saying so, and a line in the replay script's expected
drift.

**The dev database is now baselined.** 56 migrations resolved as applied,
`prisma migrate status` clean. Applying migrations by hand with `psql` should
stop; `prisma migrate deploy` works now, and
`scripts/verify-migration-replay.sh` will tell you the moment it stops working
again. **Run it whenever you add a migration** — the reason this got forty
tables deep is that nothing ever checked.

_One unrelated observation while running the suite: `lib/schools/provision.test.ts`
failed once and passed on a re-run and in isolation. It provisions against the
shared dev database, so it contends with whatever else is running. Not
investigated._

---

_The changelog for this work lives in the roadmap; this file is a wall, not a
log._
