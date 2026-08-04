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

---

_Changelog of this document lives in the roadmap; this file is a wall, not a
log._
