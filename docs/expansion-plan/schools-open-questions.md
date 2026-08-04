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

### 7. Portals must not use the dashboard shell

Noted from your message mid-run. `/portal/teacher/register` and
`/portal/teacher/marks` currently render inside the same shell as the admin
side, because they were built before that instruction. They need the portal
layout from `docs/design-system/portals/`, and I will do that as part of
Iteration 6 rather than half-doing it now — the other portal pages do not exist
yet, and the shell is worth building once against all of them.

---

_The changelog for this work lives in the roadmap; this file is a wall, not a
log._

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
