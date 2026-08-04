"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";

export type TeacherClass = {
  classSubjectId: string;
  classId: string;
  classCode: string;
  className: string;
  streamId: string | null;
  streamName: string | null;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  size: number;
};

export type TeacherPeriod = {
  periodId: string;
  slotId: string | null;
  code: string;
  name: string;
  startMinute: number;
  endMinute: number;
  startsAt: string;
  endsAt: string;
  lesson: {
    classSubjectId: string;
    classId: string;
    className: string;
    classCode: string;
    streamId: string | null;
    streamName: string | null;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    roomName: string | null;
  } | null;
  register: { sessionId: string; status: string; marked: number } | null;
};

export type TeacherDay = {
  teacher: {
    id: string;
    employeeCode: string | null;
    user: { id: string; name: string | null; email: string; image: string | null };
    employee: { id: string; jobTitle: string | null } | null;
  } | null;
  term: { id: string; code: string; name: string } | null;
  onDate?: string;
  classes: TeacherClass[];
  periods: TeacherPeriod[];
  workload?: {
    papersToMark: number;
    homeworkOpen: number;
    marking: Array<{
      assessmentId: string;
      title: string;
      kind: string;
      className: string;
      subjectName: string;
      assessedOn: string | null;
      expected: number;
      marked: number;
      outstanding: number;
    }>;
  };
};

type TeacherPortalValue = {
  day: TeacherDay | null;
  isLoading: boolean;
  error: unknown;
  /** The class rail's selection, shared by every screen in the portal. */
  classSubjectId: string | null;
  setClassSubjectId: (value: string) => void;
  selectedClass: TeacherClass | null;
};

const TeacherPortalContext = createContext<TeacherPortalValue | null>(null);

/**
 * The class a teacher is looking at, held above the screens.
 *
 * SHL·07 calls the teacher portal "class/term-anchored": the rail picks a
 * class once and the register, the mark sheet and the lesson planner all
 * follow it. Holding the choice in the layout is what makes that true — a
 * per-screen dropdown would ask the same question on every screen and let the
 * answers disagree. Because this provider lives in the layout, the choice
 * survives every move between screens; only a full reload starts it over.
 *
 * The selection is *derived*, not stored: state holds what the teacher picked,
 * and the effective class falls back to the first one they teach. An earlier
 * version synced a default into state from an effect, which is a cascading
 * render for a value that was already computable.
 */
export function TeacherPortalProvider({ children }: { children: React.ReactNode }) {
  const [chosen, setChosen] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["schools", "portal", "teacher", "today"],
    queryFn: () => fetchJson<TeacherDay>("/api/v2/schools/portal/teacher/me/today"),
  });

  const classes = useMemo(() => query.data?.classes ?? [], [query.data]);

  const value = useMemo<TeacherPortalValue>(() => {
    // A choice that is no longer one of the teacher's classes — the term
    // rolled, an assignment moved — falls back rather than showing nothing.
    const effective =
      (chosen && classes.some((row) => row.classSubjectId === chosen) ? chosen : null) ??
      classes[0]?.classSubjectId ??
      null;

    return {
      day: query.data ?? null,
      isLoading: query.isLoading,
      error: query.error,
      classSubjectId: effective,
      setClassSubjectId: setChosen,
      selectedClass: classes.find((row) => row.classSubjectId === effective) ?? null,
    };
  }, [query.data, query.isLoading, query.error, chosen, classes]);

  return (
    <TeacherPortalContext.Provider value={value}>{children}</TeacherPortalContext.Provider>
  );
}

export function useTeacherPortal() {
  const value = useContext(TeacherPortalContext);
  if (!value) {
    throw new Error("useTeacherPortal must be used inside the teacher portal layout");
  }
  return value;
}
