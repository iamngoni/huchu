"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MobileList, MobileListEmpty } from "@corelithzw/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilterBar } from "@/components/schools/common/filter-select";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { fetchSchoolsClasses } from "@/lib/schools/admin-v2";

type SessionRow = {
  id: string;
  status: "DRAFT" | "SUBMITTED" | "LOCKED";
  attendanceDate: string;
  class: { id: string; name: string } | null;
  stream: { id: string; name: string } | null;
};

function today() {
  // Local parts, not `toISOString()`, which would ask for yesterday's registers
  // in any timezone ahead of UTC.
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Which registers have been taken.
 *
 * The administrator's question, and a different one from the teacher's. Taking
 * a register is a class teacher's job and lives in their portal; what an office
 * needs at 09:15 is the list of classes that have not sent one in, so somebody
 * can go and ask.
 *
 * Absence of a register is the signal, so the page is built from the class
 * ladder outward rather than from the sessions that exist — a view listing only
 * submitted registers cannot show you the ones that are missing, which is the
 * only thing anyone opens it for.
 */
export function RegisterOversightContent() {
  const [date, setDate] = useState(today());

  const classesQuery = useQuery({
    queryKey: ["schools", "grades"],
    queryFn: () => fetchSchoolsClasses({ page: 1, limit: 200 }),
  });

  const sessionsQuery = useQuery({
    queryKey: ["schools", "attendance", "oversight", date],
    queryFn: () =>
      fetchJson<{ data: SessionRow[] }>(
        `/api/v2/schools/attendance/sessions?dateFrom=${date}&dateTo=${date}&limit=200`,
      ),
  });

  const classes = useMemo(() => classesQuery.data?.data ?? [], [classesQuery.data]);
  const sessions = useMemo(
    () => sessionsQuery.data?.data ?? [],
    [sessionsQuery.data],
  );

  const takenByClass = useMemo(() => {
    const map = new Map<string, SessionRow[]>();
    for (const session of sessions) {
      const key = session.class?.id;
      if (!key) continue;
      const existing = map.get(key);
      if (existing) existing.push(session);
      else map.set(key, [session]);
    }
    return map;
  }, [sessions]);

  const missing = classes.filter((row) => !takenByClass.has(row.id));

  if (sessionsQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load registers</AlertTitle>
        <AlertDescription>{getApiErrorMessage(sessionsQuery.error)}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar>
        <div className="min-w-0 flex-1 sm:max-w-[200px]">
          <Label htmlFor="oversight-date" className="text-sm text-muted-foreground">
            Date
          </Label>
          <Input
            id="oversight-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
      </FilterBar>

      <p className="text-sm text-muted-foreground">
        {classes.length - missing.length} of {classes.length} year groups have a
        register for {date}.
      </p>

      {missing.length > 0 ? (
        <Alert>
          <AlertTitle>
            {missing.length} still to come in
          </AlertTitle>
          <AlertDescription>{missing.map((row) => row.name).join(", ")}</AlertDescription>
        </Alert>
      ) : null}

      <MobileList>
        {classes.length === 0 ? (
          <MobileListEmpty>
            {classesQuery.isLoading
              ? "Loading year groups…"
              : "No classes configured yet."}
          </MobileListEmpty>
        ) : (
          classes.map((schoolClass) => {
            const taken = takenByClass.get(schoolClass.id) ?? [];
            return (
              <MobileList.Row
                key={schoolClass.id}
                static
                title={schoolClass.name}
                subtitle={
                  <span className="mt-1 flex flex-wrap items-center gap-2">
                    <span>
                      {taken.length === 0
                        ? "No register yet"
                        : `${taken.length} register${taken.length === 1 ? "" : "s"}`}
                    </span>
                    {taken.length === 0 ? (
                      <Badge variant="destructive">Missing</Badge>
                    ) : taken.every((session) => session.status !== "DRAFT") ? (
                      <Badge variant="secondary">Submitted</Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                  </span>
                }
              />
            );
          })
        )}
      </MobileList>
    </div>
  );
}
