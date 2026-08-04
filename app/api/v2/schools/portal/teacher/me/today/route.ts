import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { getCurrentTerm } from "@/lib/schools/calendar";
import { getTeacherProfile } from "@/lib/schools/governance-v2";
import {
  teacherClasses,
  teacherPeriods,
  teacherWorkload,
} from "@/lib/schools/teacher-day";

const querySchema = z.object({
  onDate: z.string().date().optional(),
  termId: z.string().uuid().optional(),
});

/**
 * Everything the teacher portal shell and its Today screen need, in one call.
 *
 * One request rather than five because the shell cannot paint until it knows
 * who the teacher is and what they teach, and a rail that appears a class at a
 * time is worse than a rail that appears late.
 *
 * No `schoolPermissionDenial` guard: this endpoint is scoped to the caller's
 * own teacher profile and returns nothing when there isn't one, so there is no
 * wider grant for it to check. A teacher who has not been linked to a profile
 * gets an empty day and a screen that says so.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;
    const companyId = session.user.companyId;

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      onDate: searchParams.get("onDate") ?? undefined,
      termId: searchParams.get("termId") ?? undefined,
    });

    const profile = await getTeacherProfile(companyId, session.user.id);
    if (!profile) {
      return successResponse({ teacher: null, term: null, classes: [], periods: [] });
    }

    const term = query.termId
      ? await prisma.schoolTerm.findFirst({
          where: { id: query.termId, companyId },
          select: { id: true, code: true, name: true, startDate: true, endDate: true },
        })
      : await getCurrentTerm(companyId);

    const identity = await prisma.schoolTeacherProfile.findFirst({
      where: { id: profile.id, companyId },
      select: {
        id: true,
        employeeCode: true,
        user: { select: { id: true, name: true, email: true, image: true } },
        employee: { select: { id: true, jobTitle: true } },
      },
    });

    if (!term) {
      return successResponse({ teacher: identity, term: null, classes: [], periods: [] });
    }

    const onDate = query.onDate ? new Date(query.onDate) : new Date();

    const [classes, periods, workload] = await Promise.all([
      teacherClasses({ companyId, teacherProfileId: profile.id, termId: term.id }),
      teacherPeriods({
        companyId,
        teacherProfileId: profile.id,
        termId: term.id,
        onDate,
      }),
      teacherWorkload({ companyId, teacherProfileId: profile.id, termId: term.id }),
    ]);

    return successResponse({
      teacher: identity,
      term,
      onDate: onDate.toISOString().slice(0, 10),
      classes,
      periods,
      workload,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse("Validation failed", 400, error.issues);
    }
    console.error("[API] GET /api/v2/schools/portal/teacher/me/today error:", error);
    return errorResponse("Failed to load your day");
  }
}
