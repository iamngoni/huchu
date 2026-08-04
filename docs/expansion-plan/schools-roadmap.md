# Schools — Implementation Status

Single source of truth for what is built and what is not. This is also the body of the
schools pull request.

## How this document works

- **The structure never changes.** Iterations, stories and their IDs are fixed. Work updates the
  `Status` cell of an existing row and appends to the changelog — nothing else.
- **A story is a promise to a person**, not a task. If a row cannot be phrased as somebody being
  able to do something, it belongs in the scope notes of another story rather than here.
- **The acceptance signal is the test.** A story is not `done` because code exists; it is `done`
  when the signal in its row can be demonstrated.
- **Story IDs are permanent.** Commits, branches and changelog entries reference them. An abandoned
  story becomes `parked` with a reason; it is never deleted or renumbered.
- **Iterations ship in order.** Each one leaves a product that works end to end. A later iteration
  never leaves an earlier one broken to get started.
- **New scope** joins the iteration it belongs to as the next free ID in that iteration's block.
- **IDs become permanent once a commit references them.** Iteration 6 was renumbered on 2026-08-04,
  before any of its stories had started, because one story per portal screen hid the fact that a
  screen carries a dozen separate promises. No started story has ever been renumbered.
- **Changelog rows land one commit behind.** A commit cannot contain its own hash, so the row
  describing a piece of work is written in the commit after it. Amending to insert the hash is not
  an option — it changes the hash again.

Sources this roadmap is derived from: `docs/expansion-plan/schools-production-readiness.md` (audit),
`docs/design-system/portals/README.md` (portal build contract — every feature in the three
prototypes is mandatory), `app/home/site-data.ts` and `lib/marketing/pricing.ts` (what is sold).

## Definition of Done

Every story, no exceptions:

1. `npx tsc --noEmit` clean
2. `npx eslint <changed files>` clean
3. `npx vitest run` green, with tests covering the story's invariants
4. `npx next build` succeeds
5. Screenshot-verified at 390×844 and 768×1024 if it renders anything
6. No new hard-coded colours, sizes or fonts — design-system tokens only
7. Every privileged action writes a `PlatformAuditEvent`; every query is scoped by `companyId`

**Known debt against item 5.** Stories S-0.1 to S-0.9 and S-3.1 were marked `done` before the
visual pass could run, and met items 1–4, 6 and 7 only. Four school surfaces — academics,
guardians, students, teachers — are now screenshot-verified at both viewports and pass; the rest of
the pack is not, which is what S-10.1 and S-10.2 still track.

`e2e/visual-pass.spec.ts` is skipped unless `VISUAL_PASS=1`, because it needs a tenant hostname, a
matching `PLATFORM_ROOT_DOMAIN` and a password user — `lib/admin-portal.ts` treats localhost as the
*admin* host in dev, so without that setup every tenant page redirects to the admin sign-in.

The spec has been wrong twice, in ways worth keeping written down. It first reported six passes over
six screenshots of the admin sign-in page. Tightened to assert the *absence* of that page's form, it
then reported six more passes over six screenshots of the **tenant** sign-in page — a different
form, so the negative check never fired. It asserts the page's own heading now: proving what a page
is beats enumerating what it is not. Separately, its overflow measure flagged any element wider than
the viewport, which condemned tables that scroll inside their own container while missing badges
genuinely clipped by one; it distinguishes the two cases now.

Two corrections to earlier entries in this document. The hydration failure recorded against
`bb7f70b` was described as contained to Academics — it reproduces on `/dashboard`, `/settings` and
`/human-resources` too, so it is app-wide and not a schools defect. And the overflow reported on
five of six surfaces was measured by the flawed rule above; the real defects were narrower, and are
recorded against `323ea2d` and `d03b444`.

`done` on a story below should be read as "verified by tests and build" unless its changelog row
says it was seen.

## Status legend

| Mark | Meaning |
|---|---|
| `done` | Acceptance signal demonstrated, DoD met |
| `wip` | In progress on the current branch |
| `todo` | Accepted into the roadmap, not started |
| `blocked` | Cannot start; blocker named in the row |
| `parked` | Deliberately not being built; reason named in the row |

---

## Iteration 0 — Truth and safety

Nothing here adds a feature. It makes the existing pack honest: no fabricated screens, no identity
by string match, no unguarded money.

| ID | Story | Acceptance signal | Status |
|---|---|---|---|
| S-0.1 | As a school admin, I can open an academic year and its terms, and make one current | A new tenant creates a year and term; every term-scoped screen resolves against it | `done` |
| S-0.2 | As a parent or student, my portal shows my own records because my user account is linked to them, not because my email string matched | `SchoolStudent.userId` / `SchoolGuardian.userId` exist and resolve identity; email matching deleted; a test proves no parameter reaches another student | `done` |
| S-0.3 | As a bursar, I can invite guardians and students to the portal, and they can claim their account | An invite issued from a detail page or in bulk; claim binds `userId`; token single-use and expiring | `done` |
| S-0.4 | As a guardian, I only see finances or results if the school granted me that consent | `canReceiveFinancials` / `canReceiveAcademicResults` enforced in the API handlers, with a test per flag | `done` |
| S-0.5 | As a school, my staff can only do what their role allows | `HOD` and `WARDEN` added to `UserRole`; role→persona resolution built; `requireSchoolPermission` replaces `isPrivilegedRole` across the 56 unguarded routes; a teacher cannot post a receipt. **The route registry gates on the tenant's features, not on the caller — feature-enabled and signed-in is the whole of its answer, and it describes a teacher exactly as it describes the bursar. Per-role authorisation had no other home; this story is what supplies it.** | `done` |
| S-0.6 | As a bursar, a fee receipt reaches the general ledger when I post it | `createJournalEntryFromSource` inline (retail's pattern), idempotency keys kept, period locks respected; balanced journal entry asserted in a test | `done` |
| S-0.7 | As a teacher, I am not shown a timetable the school never set | `deriveSlot` deleted from the page and the portal endpoint; route, nav entry and gating entry removed until S-1.1 | `done` |
| S-0.8 | As an engineer, dead code does not imply a feature exists | `lib/platform/entity-triggers.ts` deleted; teacher↔employee is S-1.7 | `done` |
| S-0.9 | As a staff user, I do not see portal links meant for parents and students | The three portal entries removed from the schools nav group | `done` |

## Iteration 1 — The domain a school runs on

The models the pack promises but does not have.

| ID | Story | Acceptance signal | Status |
|---|---|---|---|
| S-1.1 | As a timetabler, I can build a timetable of periods, rooms and slots, and be warned of clashes | `SchoolPeriod` / `SchoolRoom` / `SchoolTimetableSlot`; teacher, room and class conflicts rejected; copy-forward from last term | `wip` |
| S-1.2 | As a registrar, I can set the school calendar and holidays | `SchoolCalendarEvent`; "registers not taken" becomes computable | `todo` |
| S-1.3 | As a teacher, I record assessments that roll into a term mark under the school's grading scheme | `SchoolAssessment` → `SchoolAssessmentScore` → `SchoolResultLine`; `SchoolGradingScheme` with bands; CA/exam weighting | `todo` |
| S-1.4 | As a registrar, I take an applicant from application through offer to enrolment | `SchoolApplication` pipeline on the intake-form engine, with a board and duplicate detection | `todo` |
| S-1.5 | As a head, I roll the school into the next year in one reviewable batch | Promote / repeat / graduate / transfer as a single reviewed operation | `todo` |
| S-1.6 | As a warden, bed allocation respects gender policy and capacity | Allocation rejects a policy or capacity breach; the check-then-write race is closed by a constraint | `todo` |
| S-1.7 | As HR, a teacher is one person in the system, not two records | `SchoolTeacherProfile` linked to `Employee`, written deliberately | `todo` |
| S-1.8 | As a warden, I keep sanatorium and health records the school is expected to produce | Health, allergy and consent records — sold under "Boarding and welfare" | `todo` |
| S-1.9 | As a teacher, I set homework and see what was handed in | `SchoolAssignment` + submissions; required by the student and teacher prototypes | `todo` |
| S-1.10 | As a librarian, I lend, return, renew and reserve books, and charge overdue fines | Library and lending model; fine payable in the student portal | `todo` |
| S-1.11 | As a teacher, I plan lessons and arrange cover | Lesson plans, cover lessons, copy-from-last-week | `todo` |
| S-1.12 | As a teacher, I keep a resource library I can upload to | Teaching resources on `lib/uploads/` | `todo` |
| S-1.13 | As a student, I set and track a goal per subject | Student goals, per the student prototype | `todo` |
| S-1.14 | As a teacher, I book and manage parent meetings | Meetings and appointments | `todo` |
| S-1.15 | As a transport officer, I run routes, stops and rider registers, billed with fees | Transport — a paid add-on in `SCHOOL_ADD_ONS` | `todo` |

## Iteration 2 — Money correctness

| ID | Story | Acceptance signal | Status |
|---|---|---|---|
| S-2.1 | As a bursar, fee amounts are exact | All school money columns `Float` → `Decimal @db.Decimal(14,2)`, with a migration witness test | `todo` |
| S-2.2 | As a bursar, I invoice and receipt in USD or ZWG | `currency`, `exchangeRate`, `baseAmount` on invoice, receipt and waiver | `todo` |
| S-2.3 | As an accountant, school money posts under its own source types | School members added to `AccountingSourceType`; `SCHOOLS_REQUIRED_SOURCE_TYPES` readiness contract; posting rules seeded | `todo` |
| S-2.4 | As a bursar, I cannot invoice the same student twice for one term | `@@unique([companyId, studentId, termId])` on `SchoolFeeInvoice`; bulk generation skips existing by default | `todo` |
| S-2.5 | As a bursar, an overpayment becomes a credit rather than disappearing | Allocation validated inside the transaction; surplus carried, not clamped to zero | `todo` |
| S-2.6 | As a bursar, I can refund a parent | `SchoolFeeRefund` model and workflow replacing the 501 stub | `todo` |
| S-2.7 | As a school on the fiscalisation add-on, fee receipts are fiscalised | School receipts issue a `FiscalReceipt` through the existing FDMS link | `todo` |

## Iteration 3 — Provisioning

| ID | Story | Acceptance signal | Status |
|---|---|---|---|
| S-3.1 | As an operator, I provision a tenant as a school and it is ready to use | `provisionSchool` seeds year, terms, class ladder, subjects, grading scheme, a fee structure, accounting defaults and roles; invoked by the org-provision wizard on `TEMPLATE_SCHOOLS`. Grading scheme deferred to S-1.3, which introduces the model. | `done` |
| S-3.2 | As an operator, I can build a new production database from the migration history | `prisma migrate deploy` succeeds on an empty database — currently fails at `20260728090000_add_crm_record_marks` because no migration creates `CrmClient` | `todo` |
| S-3.3 | As a school switching systems, my existing records are imported | Students, guardians, classes, fee structures and opening balances — the `$199` migration add-on | `todo` |

## Iteration 4 — Record surface

| ID | Story | Acceptance signal | Status |
|---|---|---|---|
| S-4.1 | As an engineer, the record surface is shared rather than CRM-owned | `components/crm/records/` → `components/records/`, `lib/crm/` → `lib/records/`, behind a record-type registry; imports re-pointed, no behaviour change | `todo` |
| S-4.2 | As an engineer, any record can be the subject of a task, comment, mention, follow or file | `subjectType` + `subjectId` added to `CrmTask` / `CrmComment` / `CrmMention` / `CrmFollower` / `CrmRecordFile`; backfilled, dual-written, CRM FK columns dropped in a later change | `todo` |
| S-4.3 | As a registrar, students, guardians, teachers, classes, subjects and hostels are record pages | Identity strip, editable attributes, Overview tab on narrow screens, one tab per relationship | `todo` |
| S-4.4 | As a school, I can add my own fields to a student or guardian | Custom fields on school record types | `todo` |
| S-4.5 | As a registrar, I can find a student, guardian or staff member by search | School search — generalised from `lib/crm/search.ts` or built deliberately | `todo` |

## Iteration 5 — Documents

| ID | Story | Acceptance signal | Status |
|---|---|---|---|
| S-5.1 | As a bursar, I print a branded invoice, receipt and statement | Registered in `lib/documents/source-registry.ts` with sample payloads, bound to editable templates | `todo` |
| S-5.2 | As a class teacher, I publish report cards | Report card as a registered document source; `SchoolPublishWindow` gates rendering | `todo` |
| S-5.3 | As a registrar, I issue admission and transfer letters, class lists and registers | The remaining school templates registered | `todo` |
| S-5.4 | As a head, report exports are real files | `exportReportToPDF` / `exportReportToCSV` placeholders in `lib/schools/reports.ts` deleted in favour of `lib/documents/` | `todo` |

## Iteration 6 — Portals

Built to the prototypes in `docs/design-system/portals/`. Every feature in a demo is required, so
the stories are one per capability rather than one per screen — a screen that half works is not a
promise kept. Numbering is blocked per portal (parent 1–19, student 20–39, teacher 40–59) so a
capability found later joins its own portal rather than the end of the list.

### Parent — mobile

| ID | Story | Acceptance signal | Status |
|---|---|---|---|
| S-6.1 | As a parent, I sign in with a code sent to me rather than a password I will forget | OTP entry to prototype parity, including resend and the wrong-code state | `todo` |
| S-6.2 | As a parent with more than one child, I switch between them anywhere in the portal | Child switcher and quick-pick, with the choice persisting across screens | `todo` |
| S-6.3 | As a parent, my home screen tells me what changed for this child since I last looked | Home to prototype parity: attendance, marks, balance, unread notices | `todo` |
| S-6.4 | As a parent, I see my child's attendance and can open any single day | Attendance summary plus day detail — depends on S-1.2 for what counts as a school day | `todo` |
| S-6.5 | As a parent, I read my child's published marks | Marks to prototype parity, gated by publish window and `canReceiveAcademicResults` | `todo` |
| S-6.6 | As a parent, I see what I owe, broken down by what it is for | Invoice lines — tuition, boarding levy, sports, books, aftercare — not one total | `todo` |
| S-6.7 | As a parent, I download a receipt for a payment I made | Receipt as a rendered document — depends on S-5.1 | `todo` |
| S-6.8 | As a parent, I open a statement for the term | Statement to prototype parity, downloadable | `todo` |
| S-6.9 | As a parent, I pay fees from my phone | EcoCash, OneMoney, bank transfer and card, recorded against the invoice and reconciled into the receipt flow — depends on S-7.3 | `todo` |
| S-6.10 | As a parent, I pay part of a bill now and the rest later | Split payment to prototype parity | `todo` |
| S-6.11 | As a parent, I look back at what I have paid, by child and by method | Payment history with both filters | `todo` |
| S-6.12 | As a parent, I read school notices | Notices to prototype parity, with read state | `todo` |
| S-6.13 | As a parent, I reply to a notice and see other replies | Threaded replies — depends on S-7.1 | `todo` |
| S-6.14 | As a parent, I message my child's teacher and attach a file | Threads with attachments — depends on S-7.1 and `lib/uploads/` | `todo` |
| S-6.15 | As a parent, I see school events, say whether we are coming, and add one to my calendar | Events, RSVP and calendar export — depends on S-1.2 | `todo` |
| S-6.16 | As a parent, I change my language | Language picker to prototype parity | `todo` |
| S-6.17 | As a parent, I turn on extra security and keep spare codes | Two-factor enrolment with recovery codes | `todo` |
| S-6.18 | As a parent, I can see where I am signed in and end a session | Session list and end-session | `todo` |
| S-6.19 | As a parent, I can find an answer without ringing the office | Help and FAQ to prototype parity | `todo` |

### Student — mobile and tablet

| ID | Story | Acceptance signal | Status |
|---|---|---|---|
| S-6.20 | As a student, I sign in with a PIN | PIN entry to prototype parity | `todo` |
| S-6.21 | As a student, I change my PIN, or recover it when I forget | Change and forgotten-PIN flows | `todo` |
| S-6.22 | As a student, I see my timetable for today and for the week | Day and week views — depends on S-1.1 | `todo` |
| S-6.23 | As a student, I open a class from my timetable | Class detail to prototype parity | `todo` |
| S-6.24 | As a student, I see what work is set and filter it | Assignment list with filters — depends on S-1.9 | `todo` |
| S-6.25 | As a student, I hand work in and see that it arrived | Hand-in flow with the handed-in state — depends on S-1.9 | `todo` |
| S-6.26 | As a student, I see my marks for the term | Marks to prototype parity — depends on S-1.3 | `todo` |
| S-6.27 | As a student, I open my report card | Report card by term — depends on S-1.3 and S-5.2 | `todo` |
| S-6.28 | As a student, I browse the library and borrow a book | Catalogue and borrow — depends on S-1.10 | `todo` |
| S-6.29 | As a student, I return a book, including by scanning it | Return and scan-to-return — depends on S-1.10 | `todo` |
| S-6.30 | As a student, I renew a loan or reserve a book that is out | Renew and reserve — depends on S-1.10 | `todo` |
| S-6.31 | As a student, I see what I owe in fines and settle it | Fines and fine payment — depends on S-1.10 and S-7.3 | `todo` |
| S-6.32 | As a student, I set a goal for a subject and watch it move | Goals to prototype parity — depends on S-1.13 | `todo` |
| S-6.33 | As a student, I choose how often I am notified | Notifications with cadence preference — depends on S-9.5 | `todo` |
| S-6.34 | As a student, I edit my profile and pick a theme | Profile editing and theme | `todo` |
| S-6.35 | As a student, I find help and say whether it helped | Help centre with helpfulness feedback | `todo` |

### Teacher — tablet and desktop

| ID | Story | Acceptance signal | Status |
|---|---|---|---|
| S-6.40 | As a teacher, I open my day and see the lessons I am teaching | Today to prototype parity — depends on S-1.1 | `todo` |
| S-6.41 | As a teacher, I take the register for a lesson, marking the whole class present in one action | Register with mark-all and per-student override | `todo` |
| S-6.42 | As a teacher, I look back at attendance I have taken | Attendance history to prototype parity | `todo` |
| S-6.43 | As a teacher, I enter marks cell by cell and they save as I go | Gradebook entry and save — depends on S-1.3 | `todo` |
| S-6.44 | As a teacher, I add my own assessment column | Custom columns — depends on S-1.3 | `todo` |
| S-6.45 | As a teacher, I work through the papers still to mark | Papers-to-mark queue with filters | `todo` |
| S-6.46 | As a teacher, I send marks to parents under the school's rules | Publish to parents, gated by publish window and the school's publishing rules | `todo` |
| S-6.47 | As a teacher, I hold a conversation with a parent | Message threads — depends on S-7.1 | `todo` |
| S-6.48 | As a teacher, I answer common questions in one tap | Quick replies — depends on S-7.1 | `todo` |
| S-6.49 | As a teacher, I send one message to a whole class | Broadcast — depends on S-7.1 | `todo` |
| S-6.50 | As a teacher, I see my week | Timetable week view — depends on S-1.1 | `todo` |
| S-6.51 | As a teacher, I plan a lesson | Lesson plans — depends on S-1.11 | `todo` |
| S-6.52 | As a teacher, I copy last week's lessons forward | Copy-from-last-week — depends on S-1.11 | `todo` |
| S-6.53 | As a teacher, I stand in for a colleague and see their lesson | Cover lessons — depends on S-1.11 | `todo` |
| S-6.54 | As a teacher, I set homework and see it land with the class | Assignment authoring — depends on S-1.9 | `todo` |
| S-6.55 | As a teacher, I keep teaching resources and upload new ones | Resource library with upload — depends on S-1.12 | `todo` |
| S-6.56 | As a teacher, I book and manage parent meetings | Meetings to prototype parity — depends on S-1.14 | `todo` |
| S-6.57 | As a teacher, I see how my classes are doing | Teacher reports to prototype parity | `todo` |
| S-6.58 | As a teacher, I control notifications, publishing, appearance, security and privacy | The five settings panels to prototype parity | `todo` |
| S-6.59 | As a teacher on a shared staffroom device, I am signed out safely when I walk away | Shared-device sign-out and idle lock | `todo` |

## Iteration 7 — Messaging and payments

| ID | Story | Acceptance signal | Status |
|---|---|---|---|
| S-7.1 | As a teacher and a parent, we hold a conversation that updates without refreshing | One messaging primitive serving teacher↔parent threads, whole-class broadcast and notice replies; realtime delivery, not polling | `todo` |
| S-7.2 | As a teacher, I answer quickly and message a whole class at once | The broadcast and quick-reply primitives S-6.48 and S-6.49 sit on | `todo` |
| S-7.3 | As a parent, I pay fees from the portal by EcoCash, OneMoney, bank transfer or card | The payment primitive S-6.9, S-6.10 and S-6.31 sit on: recorded against the invoice, reconciled into the existing receipt and allocation flow, posted through accounting | `todo` |
| S-7.4 | As a bursar, I can see and reconcile portal payments by method | Payment history filtered by method; reconciliation to receipts | `todo` |

## Iteration 8 — Offline

Sold explicitly: "attendance capture and fee receipting keep working with no connection and sync
once it returns."

| ID | Story | Acceptance signal | Status |
|---|---|---|---|
| S-8.1 | As a teacher, I take a register with no connection and it syncs when the line returns | Schools registered in `lib/offline/module-registry.ts` and `workflow-catalog.ts`; submit goes through the outbox | `todo` |
| S-8.2 | As a bursar, I receipt a fee payment with no connection | Fee receipting through the outbox | `todo` |
| S-8.3 | As a school, a register submitted twice does not produce two registers | Conflict resolution for duplicate offline submissions | `todo` |

## Iteration 9 — Dashboard, reporting and notifications

| ID | Story | Acceptance signal | Status |
|---|---|---|---|
| S-9.1 | As a head, my dashboard is about this term, not row counts | Enrolment against capacity, register completion, collections against target, arrears aging, sheets awaiting moderation, hostel occupancy, boarders out on leave, exceptions — each linking to its list | `todo` |
| S-9.2 | As a parent, I am told when my child is absent | Absence notification on the existing pipeline | `todo` |
| S-9.3 | As a parent, I am reminded before and after fees fall due | Invoice-issued, payment-received and arrears notifications | `todo` |
| S-9.4 | As a parent, I am told when results are published | Results-published notification, gated by the publish window | `todo` |
| S-9.5 | As a school, notifications respect a schools preference category | Schools category added to notification preferences | `todo` |
| S-9.6 | As a registrar, I can write and target a school notice | A school notice entity with audience targeting and compose, replacing the read-only feed | `todo` |
| S-9.7 | As a board, I get enrolment, collections, arrears, attendance and results in the shape we ask for | Board reporting pack | `todo` |

## Iteration 10 — Visual and mobile pass

| ID | Story | Acceptance signal | Status |
|---|---|---|---|
| S-10.1 | As anyone on a phone, every school admin surface works at 390×844 | Screenshotted, fixed, re-shot; no horizontal body scroll; controls one height | `todo` |
| S-10.2 | As anyone on a tablet, every school surface works at 768×1024 | Screenshotted, fixed, re-shot | `todo` |
| S-10.3 | As anyone on a phone, every portal surface matches its prototype | All three portals screenshot-compared against `docs/design-system/portals/` | `todo` |

## Parked

| ID | Story | Reason |
|---|---|---|
| S-P.1 | Behaviour, merits and discipline | Sold in no band and no add-on, and absent from all three prototypes |
| S-P.2 | Communications log | Superseded by S-7.1; revisit only if an audit trail of messages is asked for separately |

---

## Changelog

Newest first. One entry per commit that changes implementation status.

| Date | Commit | Stories | Description |
|---|---|---|---|
| 2026-08-04 | `cce1f7c` | S-1.1 → `wip` | Timetable API. `GET /api/v2/schools/timetable` is deliberately unpaginated — the caller draws a grid of days against periods, and a timetable missing half its lessons because they fell on page two is worse than none; a term's slots are bounded by days x periods x classes. The periods travel with the slots because the grid needs its rows even where nothing is scheduled. Clashes come back as 409 with every conflict in the details, so a timetabler fixes the placement once rather than meeting the class, the teacher and the room one refused save at a time; PATCH passes the slot's own id as `excludeSlotId`, without which nudging the room of a lesson that is not moving would be refused by the lesson itself. PATCH moves a lesson and nothing else — which class, subject and teacher it is belongs to the assignment. Deleting a period is refused with a count rather than cascading its lessons away, and turning one into break time with lessons still in it is refused too. No route-registry change needed: the existing `/api/v2/schools` entry maps to `schools.core`. The guard-coverage test picked the six new files up on its own, at 86 files. |
| 2026-08-04 | `3935193` | S-1.1 → `wip` | Timetable models and clash rules. A slot points at an existing `SchoolClassSubject` and adds a day, a period and optionally a room, so there is one answer to "who takes Form 2 maths" rather than two that can disagree. Three rules are database constraints, not application checks: a class in two lessons in one slot, a teacher in two, a room hosting two. The class and room rules are **partial** unique indexes because Postgres treats two NULLs as distinct — a plain index over a nullable `streamId` would let a class with no stream be double-booked, and one over `roomId` would collapse every unroomed lesson in a period into a single allowed row. That required copying `classId`, `streamId` and `teacherProfileId` onto the slot; they are written from the assignment and never from the caller, since a caller able to set them independently could defeat the indexes while appearing to obey them. `syncSlotDenormalisation` re-copies them when an assignment changes hands and reports rather than deletes a lesson the new teacher cannot take. Period times are minutes from midnight: a period is a wall-clock fact about a school day, not an instant, and a timestamp invites a date and a timezone that mean nothing and shift under `TZ`. 21 tests, 6 migration witnesses — verified as witnesses by dropping the partial index and watching the NULL-stream test fail. |
| 2026-08-04 | `d03b444` | ordering, grouping, filtering | **Directories that read like directories.** Teacher profiles came back `isActive desc, updatedAt desc`, so the staff list reshuffled itself whenever anyone edited a profile; class-subject assignments were `updatedAt desc`, scattering one class's subjects through the list. Both are alphabetical now, and "has left" / "still taught" became filters rather than a sort key nobody could see. Students and guardians were already sorted by surname but *displayed* first name first, so an ordered list read as an unordered one — they render `Chirwa, Rudo` now, the sort key in the position that shows it; the subject columns had the mirror problem, sorted by name and displayed code-first. Students are ordered class-then-surname and both the table and the mobile list draw a heading at each class break: `rowGroup` is a new `DataTable` prop that labels runs of adjacent rows, and because it groups without reordering, the query has to sort by the same thing. Students with no class fall under "Not in a class" rather than an unlabelled run. Filters: students gained status and boarding, both of which the route already accepted with no control to drive them; guardians gained portal-account on a new `hasPortalAccount` parameter, since the guardians list is where invitations are issued from; teachers and subjects gained the active filter their routes had all along. Two layout defects surfaced by screenshotting the result. `VerticalDataViews` laid out its single-column phone layout on an implicit `auto` track, so the rail's max-content width set the width of the whole section — every page using it was wider than a phone, and it did not read as broken because the app shell scrolls horizontally, so the content pane sat half off-screen with its primary action past the edge. The classes, subjects, teacher-profile and assignment tables had no `mobileListRenderer` and rendered desktop tables at 390px. 8/8 visual pass across four pages and two viewports. |
| 2026-08-04 | `323ea2d` | visual gate | **First screenshots that show the app rather than a login page.** Four defects, all found by looking. (1) `MobileList.Row`'s `trailing` is a `1fr 14px` grid column sized for a chevron, and `.mobile-list` is `overflow: clip`, so the "Current", "Portal" and boarding badges were cut mid-word on academics, guardians and students; the status reads on the subtitle line now. (2) `components/ui/table.tsx` put Tailwind's `overflow-hidden` on the element that carries `.table-rail` and `.table-scroll`, both of which set `overflow-x: auto` for exactly this reason. Between `md` and `lg` the table is deliberately given `w-max`, so with the scroll defeated every column past the container edge was unreachable — a 1258px table clipped dead at 768px, on every DataTable in the app, not only in schools. (3) The students and guardians tables inside the Students page had no `mobileListRenderer` and rendered a desktop table on a 390px phone. (4) The visual spec itself: it signed in per test and spent the 10-per-15-minute credentials budget on itself, it proved page identity by the *absence* of the admin magic-link form (the tenant password form is a different page, so six screenshots of a login form passed), and it measured every element against the viewport — flagging a table that scrolls inside its own container as a bug while missing a badge genuinely clipped by one. It now signs in once and reuses the session, asserts the page's own heading, and separates "scrolls inside a container" from "cut off by one". |
| 2026-08-04 | `8b9db9b` | S-3.1 → `done` (re-verified) | **The reason nothing worked.** Every `schools.*` feature is billable, and `getCompanyFeatureMap` keeps a billable feature off unless the tenant is entitled through a tier or an addon bundle. No tier includes `ADDON_SCHOOLS_SUITE` — correctly, it is sold separately — so a school needs a `CompanySubscriptionAddon`, which needs a `FeatureBundle` row to point at. There were none: `syncEntitlementCatalog` returned `FEATURE_CATALOG.length` and wrote nothing, so `pnpm platform` reported "135 features, 24 bundles" over empty tables and every caller believed it. With no bundle row the addon cannot exist, without the addon no billable feature is entitled, and a provisioned school answered `403 FEATURE_DISABLED` on its own pages while redirecting the head teacher to `/access-blocked`. The sync now upserts by natural key and never deactivates. `grantBundleToCompany` is the missing verb — addon plus per-feature flags, since entitlement and enablement are separate records. `provisionSchool` calls it, so opening a school installs the module and not only its data. Found by observation, not review: a browser fetch returned the 403 that code reading had not predicted. 7 tests, asserting rows rather than return values, one of which deletes a row first so it fails against a no-op sync even on a populated database. |
| 2026-08-04 | `8b9db9b` | correction | **A published claim was wrong.** Rows `6fb9f25` and `b032da1`, the S-0.5 story row, `lib/schools/permissions.ts` and `lib/schools/route-guard-coverage.test.ts` all stated that the `proxy.ts` middleware matcher does not cover `/api/v2/**`, and that the `scope: "api"` route-registry entries therefore never run for the schools API. The middleware half is true; the conclusion is not. `requireApiAuth` calls `canAccessRouteWithToken` against the same registry (`lib/auth-core/access.ts:140`), so the api-scope entries are enforced at the route level on every `/api/v2` request. Found by direct observation, not review: a browser fetch of `/api/v2/schools/academic-years` returned `403 FEATURE_DISABLED schools.core` on a tenant with no feature flags, which cannot happen if the registry never runs. All five sites corrected. **S-0.5 is not weakened** — its guards remain the only per-role authorisation in the schools API, because the registry gates on the tenant's features and never on the caller. The correction is to the justification, not to the work. |
| 2026-08-04 | `b7c93d6` | S-3.1 → `done` | Provisioning a tenant now opens the school. `provisionSchool` seeds the current academic year and its three Zimbabwean terms, the class ladder, a subject catalogue and a starter fee structure; the CLI also runs `ensureAccountingDefaults` so a receipt has somewhere to land. Applying `TEMPLATE_SCHOOLS` calls it. Idempotent, and it never moves a term the school has already chosen as current. Verified end to end against a real tenant: a secondary school comes up with T2 current, six forms, thirteen subjects, a fee structure, 27 accounts and 23 posting rules. Taken out of order to unblock the visual gate — every story so far is verified by tests and build, not by eye. |
| 2026-08-04 | `dd7ee8e` | S-0.7, S-0.8, S-0.9 → `done` | Iteration 0 closed. The timetable page and its student-portal endpoint both invented period times from array position against a schema with no timetable, period or room model; page, component, endpoint, nav entry, gating entry and workspace link are gone until S-1.1. The endpoint turned out to have no caller at all. `lib/platform/entity-triggers.ts` — 210 lines, six exports, zero call sites — deleted rather than left implying a feature. The three portal links are out of the staff sidebar, along with a `/portal/student/timetable` nav entry pointing at a route that never existed. |
| 2026-08-04 | `a17ea0b` | S-0.6 → `done` | School fee events post to the ledger instead of queueing. `emitSchoolFeeAccountingEvent` called `captureAccountingEvent` and stopped, writing a PENDING integration event and no journal entry; only a hand-run replay endpoint or CLI turned those into ledger movements, so fee income sat outside the trial balance. It now calls `createJournalEntryFromSource` inline, as retail always has. The posting outcome travels back with the receipt rather than being awaited and discarded — a locked period stays PENDING for the existing drain, everything else surfaces as FAILED with its reason. Idempotent source ids unchanged, so a repeated post returns the existing entry and a void keeps its own key rather than overwriting the receipt it reverses. No backfill written: `retryPendingAccountingEvents` already drains the backlog, so an existing tenant needs one run of `pnpm platform:accounting-replay` after deploy. |
| 2026-08-04 | `b032da1` | S-0.5 → `done` | Every school API route now declares who may call it. Fifty-six of seventy-two checked only that somebody was signed in, so any authenticated user in the tenant — including a parent, since a portal account is an account — could post a receipt, write off a debt, publish results or allocate a bed. Guards are keyed to resource and action, with the specific verb where the path carries one. A coverage test fails any new route file that declares nothing, which matters because a forgotten check has no second line of defence: the route registry gates on the tenant's features, not on the caller. (This row originally justified the test with a claim that the `proxy.ts` matcher leaves `/api/v2/**` ungated; that claim was wrong — see the 2026-08-04 correction row.) The test caught a hole in its own exemption rule on the first run: the three portal entry points delegate to `_handlers` rather than re-exporting, and a narrow check would have waved them through unread. |
| 2026-08-04 | `a7eae91` | S-0.5 → `wip` | `HOD` and `WARDEN` became assignable roles across the enum, `lib/roles`, the entitlement allowlist, the vertical registry and the platform CLI; `SCHOOLS` now lists its own roles rather than the generic four. The persona grants were a sketch — `SCHOOL_ADMIN` carried no `schools.fees` at all despite being described as full administration — and are now complete and coherent per persona. `personaForRole` is the role→persona map that never existed, which is why `hasPersonaPermission` had zero call sites. 19 tests asserting separation of duty as behaviour. |
| 2026-08-04 | `c8adfbb` | S-0.4 → `done` | Guardian consent became changeable. `canReceiveFinancials` and `canReceiveAcademicResults` were enforced in three places but set once at link creation and never updatable, so a school could grant sight of results or finances and never withdraw it. `PATCH /api/v2/schools/guardian-links/[id]` is staff-only and demotes other primary links for the same student in the same transaction. The rule itself now has one definition — `guardianMaySee` / `studentIdsWithConsent` / `consentDeniedMessage` in `portal-identity` replace the array filter in the aggregate handler and the two inline checks in the per-child routes. 4 tests, including the mixed case: consent belongs to the relationship, so a guardian can be on the financial list for one child and the academic list for another. |
| 2026-08-04 | `6fb9f25` | S-0.3 → `done` | Portal invitations and account claim. `SchoolPortalInvite` with a nullable FK per subject kind and a check constraint keeping the discriminator honest; sha256 token hash only, plaintext returned once and not recoverable; reissue revokes the outstanding token; claim is one transaction that creates or reuses the user, bcrypts the password and binds `userId`. Public claim page at `/c/[token]` joining the `/f` `/a` `/v` `/s` convention, with GET returning an identical 404 for unknown, expired, withdrawn and used. Bulk issue from the guardians list, skipping records with no email rather than hiding them. Also recorded a finding against S-0.5 which later proved false — see the 2026-08-04 correction row. 18 tests, 2 migration witnesses. |
| 2026-08-04 | `01860fd` | S-0.2 → `done` | Portal identity by account instead of by string. `userId` added to `SchoolStudent` and `SchoolGuardian` with a per-company unique index; `lib/schools/portal-identity.ts` is the one resolver every portal route now calls. Deleted: the student email-local-part→`studentNo` match, the guardian session-email→`email` match, and the fall-through that returned an arbitrary student when the session carried no email. Closed a live hole in the parent fees route, which looked the guardian up by whatever `guardianId` was passed and only compared it afterwards, so any parent could read another family's fees. Naming another subject is now a 403 rather than a silent empty account. One-shot backfill script applies the old rule once as data, skipping anything ambiguous. 17 tests, 3 of them migration witnesses. |
| 2026-08-04 | `cfbb537` | S-0.1 → `done` | Academic year and term management. `lib/schools/calendar.ts` with `getCurrentTerm`/`requireCurrentTerm` replacing ad-hoc active-term lookups; partial unique indexes making a second active year or term unrepresentable, plus date-ordering check constraints; CRUD routes enforcing that a term falls inside its year, does not overlap a sibling, and cannot be deleted once referenced; a calendar view leading the Academics rail that becomes a `MobileList` below `md`. 14 tests, 5 of them migration witnesses. |
| 2026-08-04 | `e831546` | — | Engineering principles added to the top of `AGENTS.md`. Schools production-readiness audit recorded in `docs/expansion-plan/schools-production-readiness.md`; stale delivery-status table in `schools.md` corrected. |
