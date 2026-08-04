import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * The timetable: periods, rooms, and the slots that place a lesson on a day.
 *
 * A slot does not restate who teaches what to whom. It points at an existing
 * `SchoolClassSubject` — the term's class-subject-teacher assignment — and adds
 * a day, a period and optionally a room. That keeps one answer to "who takes
 * Form 2 maths" instead of two that can disagree.
 *
 * Three things must never be true at once, and all three are database
 * constraints rather than checks in this file:
 *
 *   - a class (or class-and-stream) in two lessons in one slot
 *   - a teacher in two lessons in one slot
 *   - a room hosting two lessons in one slot
 *
 * The functions below still check them first, because a unique-violation on a
 * five-column index is not something to show a timetabler. The check produces
 * the sentence; the constraint is what makes it true under concurrency. Two
 * timetablers dragging lessons into the same slot at the same moment both pass
 * their checks and one loses at commit — which is the correct outcome and the
 * reason the checks are not the whole story.
 */

// The pure helpers live in `timetable-format` so a client component can import
// them without pulling `prisma` — and therefore `pg`, `dns` and `fs` — into the
// browser bundle. Re-exported here so server call sites see one module.
export {
  DAYS_OF_WEEK,
  DAY_NAMES,
  formatMinute,
  isDayOfWeek,
  isValidPeriodRange,
  parseMinute,
  periodsOverlap,
  type DayOfWeek,
} from "./timetable-format";

import { periodsOverlap } from "./timetable-format";

/**
 * Periods within the same set may not overlap: a lesson is placed in a period,
 * so two periods covering 10:20 would make "what is happening at 10:20"
 * ambiguous. Unlike the slot clashes this is not a unique index — overlap is a
 * range predicate, which needs an exclusion constraint and a btree_gist
 * extension. It is checked here and covered by a test.
 */
export async function findOverlappingPeriod(
  input: {
    companyId: string;
    termId: string | null;
    startMinute: number;
    endMinute: number;
    excludePeriodId?: string;
  },
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const candidates = await db.schoolPeriod.findMany({
    where: {
      companyId: input.companyId,
      termId: input.termId,
      ...(input.excludePeriodId ? { id: { not: input.excludePeriodId } } : {}),
    },
    select: { id: true, code: true, name: true, startMinute: true, endMinute: true },
  });

  return (
    candidates.find((period) =>
      periodsOverlap(
        input.startMinute,
        input.endMinute,
        period.startMinute,
        period.endMinute,
      ),
    ) ?? null
  );
}

export type SlotConflictKind = "CLASS" | "TEACHER" | "ROOM" | "LESSON" | "NON_TEACHING";

export type SlotConflict = {
  kind: SlotConflictKind;
  /** Written for the person moving the lesson, not for a log. */
  message: string;
  conflictingSlotId?: string;
};

type SlotPlacement = {
  companyId: string;
  termId: string;
  classSubjectId: string;
  periodId: string;
  dayOfWeek: number;
  roomId?: string | null;
  /** Set when editing, so a slot does not clash with where it already is. */
  excludeSlotId?: string;
};

const slotDescribeSelect = {
  id: true,
  classSubject: {
    select: {
      subject: { select: { code: true, name: true } },
      class: { select: { name: true } },
      stream: { select: { name: true } },
      teacherProfile: { select: { user: { select: { name: true } } } },
    },
  },
  room: { select: { name: true } },
} satisfies Prisma.SchoolTimetableSlotSelect;

type DescribedSlot = Prisma.SchoolTimetableSlotGetPayload<{
  select: typeof slotDescribeSelect;
}>;

function describeLesson(slot: DescribedSlot) {
  const parts = [
    slot.classSubject.class.name,
    slot.classSubject.stream?.name,
    slot.classSubject.subject.name,
  ].filter(Boolean);
  return parts.join(" ");
}

/**
 * Every reason this lesson cannot go here, in the order a timetabler would
 * want to read them. Empty means the placement is free.
 *
 * Returns all conflicts rather than the first: moving one lesson can collide
 * with the class, the teacher and the room at once, and fixing them one refused
 * save at a time is the wrong experience.
 */
export async function findSlotConflicts(
  placement: SlotPlacement,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<SlotConflict[]> {
  const conflicts: SlotConflict[] = [];

  const [assignment, period] = await Promise.all([
    db.schoolClassSubject.findFirst({
      where: { id: placement.classSubjectId, companyId: placement.companyId },
      select: {
        id: true,
        classId: true,
        streamId: true,
        teacherProfileId: true,
        class: { select: { name: true } },
        stream: { select: { name: true } },
        teacherProfile: { select: { user: { select: { name: true } } } },
      },
    }),
    db.schoolPeriod.findFirst({
      where: { id: placement.periodId, companyId: placement.companyId },
      select: { id: true, name: true, isTeaching: true },
    }),
  ]);

  // A caller naming an assignment or period from another company, or one that
  // does not exist, is not a clash to explain — it is a bad request, and the
  // route turns a null into a 404 rather than this function inventing a reason.
  if (!assignment || !period) return conflicts;

  if (!period.isTeaching) {
    conflicts.push({
      kind: "NON_TEACHING",
      message: `${period.name} is not a teaching period, so nothing can be scheduled in it.`,
    });
    return conflicts;
  }

  const sameSlot = {
    companyId: placement.companyId,
    termId: placement.termId,
    dayOfWeek: placement.dayOfWeek,
    periodId: placement.periodId,
    ...(placement.excludeSlotId ? { id: { not: placement.excludeSlotId } } : {}),
  } satisfies Prisma.SchoolTimetableSlotWhereInput;

  const [classClash, teacherClash, roomClash, lessonClash] = await Promise.all([
    db.schoolTimetableSlot.findFirst({
      where: { ...sameSlot, classId: assignment.classId, streamId: assignment.streamId },
      select: slotDescribeSelect,
    }),
    db.schoolTimetableSlot.findFirst({
      where: { ...sameSlot, teacherProfileId: assignment.teacherProfileId },
      select: slotDescribeSelect,
    }),
    placement.roomId
      ? db.schoolTimetableSlot.findFirst({
          where: { ...sameSlot, roomId: placement.roomId },
          select: slotDescribeSelect,
        })
      : Promise.resolve(null),
    db.schoolTimetableSlot.findFirst({
      where: { ...sameSlot, classSubjectId: assignment.id },
      select: slotDescribeSelect,
    }),
  ]);

  const className = [assignment.class.name, assignment.stream?.name]
    .filter(Boolean)
    .join(" ");

  if (lessonClash) {
    conflicts.push({
      kind: "LESSON",
      message: `This lesson is already on the timetable in ${period.name}.`,
      conflictingSlotId: lessonClash.id,
    });
  }

  if (classClash && classClash.id !== lessonClash?.id) {
    conflicts.push({
      kind: "CLASS",
      message: `${className} already has ${describeLesson(classClash)} in ${period.name}.`,
      conflictingSlotId: classClash.id,
    });
  }

  if (teacherClash && teacherClash.id !== lessonClash?.id) {
    const teacher = assignment.teacherProfile.user.name ?? "That teacher";
    conflicts.push({
      kind: "TEACHER",
      message: `${teacher} is already teaching ${describeLesson(teacherClash)} in ${period.name}.`,
      conflictingSlotId: teacherClash.id,
    });
  }

  if (roomClash && roomClash.id !== lessonClash?.id) {
    conflicts.push({
      kind: "ROOM",
      message: `${roomClash.room?.name ?? "That room"} is taken by ${describeLesson(roomClash)} in ${period.name}.`,
      conflictingSlotId: roomClash.id,
    });
  }

  return conflicts;
}

/**
 * Place a lesson, or explain why it cannot go there.
 *
 * `classId`, `streamId` and `teacherProfileId` are copied from the assignment
 * rather than accepted from the caller. They exist so the clash rules can be
 * unique indexes, and a caller that could set them independently could set them
 * to something the assignment does not say, which would defeat the indexes
 * while looking like it obeyed them.
 */
export async function createTimetableSlot(input: {
  companyId: string;
  termId: string;
  classSubjectId: string;
  periodId: string;
  dayOfWeek: number;
  roomId?: string | null;
}): Promise<
  | { ok: true; slotId: string }
  | { ok: false; conflicts: SlotConflict[] }
  | { ok: false; notFound: true }
> {
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.schoolClassSubject.findFirst({
      where: { id: input.classSubjectId, companyId: input.companyId },
      select: { id: true, classId: true, streamId: true, teacherProfileId: true },
    });
    if (!assignment) return { ok: false as const, notFound: true as const };

    const conflicts = await findSlotConflicts(input, tx);
    if (conflicts.length > 0) return { ok: false as const, conflicts };

    const slot = await tx.schoolTimetableSlot.create({
      data: {
        companyId: input.companyId,
        termId: input.termId,
        classSubjectId: assignment.id,
        periodId: input.periodId,
        dayOfWeek: input.dayOfWeek,
        roomId: input.roomId ?? null,
        classId: assignment.classId,
        streamId: assignment.streamId,
        teacherProfileId: assignment.teacherProfileId,
      },
      select: { id: true },
    });

    return { ok: true as const, slotId: slot.id };
  });
}

/**
 * Re-copy the derived columns from the assignments they came from.
 *
 * Call after a class-subject assignment changes hands. Without it a slot keeps
 * the previous teacher's id, the teacher-clash index protects the wrong person,
 * and the new teacher can be double-booked. A test asserts the two cannot
 * drift, which is the only thing keeping the denormalisation honest.
 *
 * Returns the ids of slots whose placement became impossible — the new teacher
 * was already busy in that slot. They are not deleted: a timetabler needs to
 * see the collision and decide, and silently dropping a lesson from a printed
 * timetable is worse than showing a clash.
 */
export async function syncSlotDenormalisation(input: {
  companyId: string;
  classSubjectId: string;
}): Promise<{ updated: number; nowClashing: string[] }> {
  const assignment = await prisma.schoolClassSubject.findFirst({
    where: { id: input.classSubjectId, companyId: input.companyId },
    select: { id: true, classId: true, streamId: true, teacherProfileId: true },
  });
  if (!assignment) return { updated: 0, nowClashing: [] };

  const slots = await prisma.schoolTimetableSlot.findMany({
    where: { companyId: input.companyId, classSubjectId: assignment.id },
    select: { id: true, termId: true, dayOfWeek: true, periodId: true },
  });

  const nowClashing: string[] = [];
  let updated = 0;

  for (const slot of slots) {
    const busy = await prisma.schoolTimetableSlot.findFirst({
      where: {
        companyId: input.companyId,
        termId: slot.termId,
        dayOfWeek: slot.dayOfWeek,
        periodId: slot.periodId,
        teacherProfileId: assignment.teacherProfileId,
        id: { not: slot.id },
      },
      select: { id: true },
    });
    if (busy) {
      nowClashing.push(slot.id);
      continue;
    }

    await prisma.schoolTimetableSlot.update({
      where: { id: slot.id },
      data: {
        classId: assignment.classId,
        streamId: assignment.streamId,
        teacherProfileId: assignment.teacherProfileId,
      },
    });
    updated += 1;
  }

  return { updated, nowClashing };
}

/**
 * Copy a term's timetable into another term.
 *
 * A school's timetable is largely stable across terms, and rebuilding it by
 * hand each time is the reason timetables end up maintained in a spreadsheet.
 *
 * A slot is only copied when the same assignment exists in the target term —
 * matched on class, stream and subject, because the assignment row itself is
 * per-term and its id will not carry over. Anything without a match is reported
 * rather than dropped quietly, so the timetabler can see what the new term is
 * missing. Existing slots in the target term are left alone; this adds, it does
 * not overwrite.
 */
export async function copyTimetableToTerm(input: {
  companyId: string;
  fromTermId: string;
  toTermId: string;
}): Promise<{ copied: number; skippedNoAssignment: number; skippedClash: number }> {
  const source = await prisma.schoolTimetableSlot.findMany({
    where: { companyId: input.companyId, termId: input.fromTermId },
    select: {
      dayOfWeek: true,
      periodId: true,
      roomId: true,
      classSubject: {
        select: { classId: true, streamId: true, subjectId: true },
      },
      period: { select: { code: true, termId: true } },
    },
  });

  let copied = 0;
  let skippedNoAssignment = 0;
  let skippedClash = 0;

  for (const slot of source) {
    const target = await prisma.schoolClassSubject.findFirst({
      where: {
        companyId: input.companyId,
        termId: input.toTermId,
        classId: slot.classSubject.classId,
        streamId: slot.classSubject.streamId,
        subjectId: slot.classSubject.subjectId,
      },
      select: { id: true },
    });
    if (!target) {
      skippedNoAssignment += 1;
      continue;
    }

    // A term-scoped period does not exist in the target term, so resolve the
    // equivalent by code. A shared period (termId null) carries over as itself.
    let periodId = slot.periodId;
    if (slot.period.termId) {
      const targetPeriod = await prisma.schoolPeriod.findFirst({
        where: {
          companyId: input.companyId,
          termId: input.toTermId,
          code: slot.period.code,
        },
        select: { id: true },
      });
      if (!targetPeriod) {
        skippedNoAssignment += 1;
        continue;
      }
      periodId = targetPeriod.id;
    }

    const result = await createTimetableSlot({
      companyId: input.companyId,
      termId: input.toTermId,
      classSubjectId: target.id,
      periodId,
      dayOfWeek: slot.dayOfWeek,
      roomId: slot.roomId,
    });

    if (result.ok) copied += 1;
    else skippedClash += 1;
  }

  return { copied, skippedNoAssignment, skippedClash };
}
