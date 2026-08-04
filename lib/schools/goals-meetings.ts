import { prisma } from "@/lib/prisma";

/**
 * Student goals and parent meetings.
 *
 * Two small things a school does that nothing else in the pack covers: what a
 * child is aiming for, and the ten minutes a parent gets to hear about it.
 */

export class GoalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoalError";
  }
}

export class MeetingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MeetingError";
  }
}

/**
 * Set or change a goal.
 *
 * One per subject per term, upserted — a child revising their target is
 * changing the same goal, not setting a second one, and two goals for one
 * subject leave a progress screen picking between them.
 *
 * The baseline is stamped from the child's current term mark when the goal is
 * first set. Without it "aiming for 70" says nothing about whether that is
 * ambitious or already achieved.
 */
export async function saveGoal(input: {
  companyId: string;
  studentId: string;
  termId: string;
  subjectId: string;
  targetMark?: number | null;
  plan?: string | null;
  teacherNote?: string | null;
  baselineMark?: number | null;
}) {
  if (input.targetMark != null && (input.targetMark < 0 || input.targetMark > 100)) {
    throw new GoalError("A target is a percentage between 0 and 100");
  }

  const existing = await prisma.schoolStudentGoal.findFirst({
    where: {
      companyId: input.companyId,
      studentId: input.studentId,
      termId: input.termId,
      subjectId: input.subjectId,
    },
    select: { id: true, baselineMark: true },
  });

  const data = {
    targetMark: input.targetMark ?? null,
    plan: input.plan ?? null,
    ...(input.teacherNote !== undefined ? { teacherNote: input.teacherNote } : {}),
  };

  if (existing) {
    return prisma.schoolStudentGoal.update({
      where: { id: existing.id },
      data,
      select: { id: true, targetMark: true, baselineMark: true },
    });
  }

  return prisma.schoolStudentGoal.create({
    data: {
      companyId: input.companyId,
      studentId: input.studentId,
      termId: input.termId,
      subjectId: input.subjectId,
      baselineMark: input.baselineMark ?? null,
      ...data,
    },
    select: { id: true, targetMark: true, baselineMark: true },
  });
}

/** A child's goals for a term, with where they actually are. */
export async function goalsForStudent(input: {
  companyId: string;
  studentId: string;
  termId: string;
}) {
  const [goals, lines] = await Promise.all([
    prisma.schoolStudentGoal.findMany({
      where: {
        companyId: input.companyId,
        studentId: input.studentId,
        termId: input.termId,
      },
      select: {
        id: true,
        targetMark: true,
        baselineMark: true,
        plan: true,
        teacherNote: true,
        achievedAt: true,
        subject: { select: { id: true, code: true, name: true } },
      },
      orderBy: { subject: { name: "asc" } },
    }),
    prisma.schoolResultLine.findMany({
      where: {
        companyId: input.companyId,
        studentId: input.studentId,
        sheet: { termId: input.termId },
      },
      select: { subjectCode: true, score: true },
    }),
  ]);

  const currentBySubject = new Map(lines.map((line) => [line.subjectCode, line.score]));

  return goals.map((goal) => {
    const target = goal.targetMark === null ? null : Number(goal.targetMark);
    const current = currentBySubject.get(goal.subject.code) ?? null;
    return {
      ...goal,
      targetMark: target,
      baselineMark: goal.baselineMark === null ? null : Number(goal.baselineMark),
      currentMark: current,
      // Null when either side is missing: "on track" against no mark is a claim
      // nothing supports.
      onTrack: target === null || current === null ? null : current >= target,
    };
  });
}

/**
 * Open a teacher's evening: a row per slot, all free.
 *
 * Slots are created empty rather than on booking, which is what lets a parent
 * see when the teacher is available. A list of bookings can only show when they
 * are not.
 */
export async function openMeetingSlots(input: {
  companyId: string;
  teacherProfileId: string;
  from: Date;
  to: Date;
  minutesEach: number;
  location?: string | null;
}) {
  if (input.minutesEach <= 0) {
    throw new MeetingError("A slot has to be longer than nothing");
  }
  if (input.to <= input.from) {
    throw new MeetingError("The evening has to end after it starts");
  }

  const span = input.to.getTime() - input.from.getTime();
  const count = Math.floor(span / (input.minutesEach * 60 * 1000));
  if (count === 0) throw new MeetingError("That window is shorter than one slot");
  if (count > 200) throw new MeetingError("That is more than 200 slots — narrow it");

  const existing = await prisma.schoolParentMeeting.findMany({
    where: {
      companyId: input.companyId,
      teacherProfileId: input.teacherProfileId,
      startsAt: { gte: input.from, lt: input.to },
      cancelledAt: null,
    },
    select: { startsAt: true },
  });
  const taken = new Set(existing.map((row) => row.startsAt.getTime()));

  const slots = Array.from({ length: count }, (_, index) => {
    const startsAt = new Date(
      input.from.getTime() + index * input.minutesEach * 60 * 1000,
    );
    return {
      companyId: input.companyId,
      teacherProfileId: input.teacherProfileId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + input.minutesEach * 60 * 1000),
      location: input.location ?? null,
    };
  }).filter((slot) => !taken.has(slot.startsAt.getTime()));

  if (slots.length === 0) {
    return { created: 0, skipped: count };
  }

  await prisma.schoolParentMeeting.createMany({ data: slots });
  return { created: slots.length, skipped: count - slots.length };
}

/**
 * Book a slot.
 *
 * The child's name and the booking time go on together — the database refuses
 * one without the other — because a slot that looks taken and names nobody
 * cannot be chased.
 */
export async function bookMeeting(input: {
  companyId: string;
  meetingId: string;
  studentId: string;
  guardianId?: string | null;
  notes?: string | null;
}) {
  const meeting = await prisma.schoolParentMeeting.findFirst({
    where: { id: input.meetingId, companyId: input.companyId },
    select: { id: true, bookedAt: true, cancelledAt: true },
  });
  if (!meeting) throw new MeetingError("Slot not found");
  if (meeting.cancelledAt) throw new MeetingError("That slot has been withdrawn");
  if (meeting.bookedAt) throw new MeetingError("Somebody has already taken that slot");

  return prisma.schoolParentMeeting.update({
    where: { id: meeting.id },
    data: {
      studentId: input.studentId,
      guardianId: input.guardianId ?? null,
      notes: input.notes ?? null,
      bookedAt: new Date(),
    },
    select: { id: true, bookedAt: true, studentId: true },
  });
}

/** Give a slot back. */
export async function releaseMeeting(input: {
  companyId: string;
  meetingId: string;
}) {
  const meeting = await prisma.schoolParentMeeting.findFirst({
    where: { id: input.meetingId, companyId: input.companyId },
    select: { id: true, bookedAt: true },
  });
  if (!meeting) throw new MeetingError("Slot not found");
  if (!meeting.bookedAt) throw new MeetingError("That slot is already free");

  return prisma.schoolParentMeeting.update({
    where: { id: meeting.id },
    data: { studentId: null, guardianId: null, bookedAt: null, notes: null },
    select: { id: true, bookedAt: true },
  });
}

/** A teacher's evening, free slots included. */
export async function meetingSchedule(input: {
  companyId: string;
  teacherProfileId?: string;
  from: Date;
  to: Date;
}) {
  return prisma.schoolParentMeeting.findMany({
    where: {
      companyId: input.companyId,
      ...(input.teacherProfileId ? { teacherProfileId: input.teacherProfileId } : {}),
      startsAt: { gte: input.from, lt: input.to },
      cancelledAt: null,
    },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      location: true,
      notes: true,
      outcome: true,
      bookedAt: true,
      student: {
        select: {
          id: true,
          studentNo: true,
          firstName: true,
          lastName: true,
          currentClass: { select: { name: true } },
        },
      },
      teacherProfile: {
        select: { id: true, user: { select: { name: true } } },
      },
    },
    orderBy: { startsAt: "asc" },
    take: 400,
  });
}
