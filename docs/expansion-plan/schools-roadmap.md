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
| S-0.5 | As a school, my staff can only do what their role allows | `HOD` and `WARDEN` added to `UserRole`; role→persona resolution built; `requireSchoolPermission` replaces `isPrivilegedRole` across the 56 unguarded routes; a teacher cannot post a receipt. **The middleware matcher in `proxy.ts` does not cover `/api/v2/**`, so the ~220 `scope: "api"` entries in the route registry never run for it — route-level checks are the only defence there, and this story is what supplies them.** | `todo` |
| S-0.6 | As a bursar, a fee receipt reaches the general ledger when I post it | `createJournalEntryFromSource` inline (retail's pattern), idempotency keys kept, period locks respected; balanced journal entry asserted in a test | `todo` |
| S-0.7 | As a teacher, I am not shown a timetable the school never set | `deriveSlot` deleted from the page and the portal endpoint; route, nav entry and gating entry removed until S-1.1 | `todo` |
| S-0.8 | As an engineer, dead code does not imply a feature exists | `lib/platform/entity-triggers.ts` deleted; teacher↔employee is S-1.7 | `todo` |
| S-0.9 | As a staff user, I do not see portal links meant for parents and students | The three portal entries removed from the schools nav group | `todo` |

## Iteration 1 — The domain a school runs on

The models the pack promises but does not have.

| ID | Story | Acceptance signal | Status |
|---|---|---|---|
| S-1.1 | As a timetabler, I can build a timetable of periods, rooms and slots, and be warned of clashes | `SchoolPeriod` / `SchoolRoom` / `SchoolTimetableSlot`; teacher, room and class conflicts rejected; copy-forward from last term | `todo` |
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
| S-3.1 | As an operator, I provision a tenant as a school and it is ready to use | `provisionSchool` seeds year, terms, class ladder, subjects, grading scheme, a fee structure, accounting defaults and roles; invoked by the org-provision wizard on `TEMPLATE_SCHOOLS` | `todo` |
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

Built to the prototypes in `docs/design-system/portals/`. Every feature in a demo is required.

| ID | Story | Acceptance signal | Status |
|---|---|---|---|
| S-6.1 | As a parent, I switch between my children and see attendance, marks and balance for each | Parent portal Home to prototype parity | `todo` |
| S-6.2 | As a parent, I read my fee invoices by line, download receipts and open a statement | Parent portal Fees to prototype parity | `todo` |
| S-6.3 | As a parent, I read school news and reply | News with threaded replies | `todo` |
| S-6.4 | As a parent, I manage my own profile, language and security | Profile, language picker, 2FA with spare recovery codes | `todo` |
| S-6.5 | As a student, I see my timetable by day and week | Student portal timetable — depends on S-1.1 | `todo` |
| S-6.6 | As a student, I see assignments and hand work in | Student assignments to prototype parity — depends on S-1.9 | `todo` |
| S-6.7 | As a student, I see my marks and report card by term | Student marks — depends on S-1.3 and S-5.2 | `todo` |
| S-6.8 | As a student, I borrow, return, renew and reserve library books and settle fines | Student library to prototype parity — depends on S-1.10 | `todo` |
| S-6.9 | As a student, I set goals and sign in with a PIN | Goals, PIN sign-in, PIN change and recovery, theme | `todo` |
| S-6.10 | As a teacher, I open my day and take the register for each lesson | Teacher Today to prototype parity | `todo` |
| S-6.11 | As a teacher, I enter marks with my own columns and publish them to parents | Teacher Marks to prototype parity, including the papers-to-mark queue | `todo` |
| S-6.12 | As a teacher, I plan lessons and set homework from the portal | Teacher Lessons to prototype parity — depends on S-1.11 and S-1.9 | `todo` |
| S-6.13 | As a teacher, I sign out safely from a shared device | Shared-device sign-out, settings, help centre | `todo` |

## Iteration 7 — Messaging and payments

| ID | Story | Acceptance signal | Status |
|---|---|---|---|
| S-7.1 | As a teacher and a parent, we hold a conversation that updates without refreshing | One messaging primitive serving teacher↔parent threads, whole-class broadcast and notice replies; realtime delivery, not polling | `todo` |
| S-7.2 | As a teacher, I answer quickly and message a whole class at once | Quick replies and class broadcast | `todo` |
| S-7.3 | As a parent, I pay fees from the portal by EcoCash, OneMoney, bank transfer or card | Payment recorded against the invoice, reconciled into the existing receipt and allocation flow, posted through accounting | `todo` |
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
| 2026-08-04 | `6fb9f25` | S-0.3 → `done` | Portal invitations and account claim. `SchoolPortalInvite` with a nullable FK per subject kind and a check constraint keeping the discriminator honest; sha256 token hash only, plaintext returned once and not recoverable; reissue revokes the outstanding token; claim is one transaction that creates or reuses the user, bcrypts the password and binds `userId`. Public claim page at `/c/[token]` joining the `/f` `/a` `/v` `/s` convention, with GET returning an identical 404 for unknown, expired, withdrawn and used. Bulk issue from the guardians list, skipping records with no email rather than hiding them. Also recorded a finding against S-0.5: the `proxy.ts` middleware matcher does not cover `/api/v2/**`, so the api-scope route-registry entries never run for it. 18 tests, 2 migration witnesses. |
| 2026-08-04 | `01860fd` | S-0.2 → `done` | Portal identity by account instead of by string. `userId` added to `SchoolStudent` and `SchoolGuardian` with a per-company unique index; `lib/schools/portal-identity.ts` is the one resolver every portal route now calls. Deleted: the student email-local-part→`studentNo` match, the guardian session-email→`email` match, and the fall-through that returned an arbitrary student when the session carried no email. Closed a live hole in the parent fees route, which looked the guardian up by whatever `guardianId` was passed and only compared it afterwards, so any parent could read another family's fees. Naming another subject is now a 403 rather than a silent empty account. One-shot backfill script applies the old rule once as data, skipping anything ambiguous. 17 tests, 3 of them migration witnesses. |
| 2026-08-04 | `cfbb537` | S-0.1 → `done` | Academic year and term management. `lib/schools/calendar.ts` with `getCurrentTerm`/`requireCurrentTerm` replacing ad-hoc active-term lookups; partial unique indexes making a second active year or term unrepresentable, plus date-ordering check constraints; CRUD routes enforcing that a term falls inside its year, does not overlap a sibling, and cannot be deleted once referenced; a calendar view leading the Academics rail that becomes a `MobileList` below `md`. 14 tests, 5 of them migration witnesses. |
| 2026-08-04 | `e831546` | — | Engineering principles added to the top of `AGENTS.md`. Schools production-readiness audit recorded in `docs/expansion-plan/schools-production-readiness.md`; stale delivery-status table in `schools.md` corrected. |
