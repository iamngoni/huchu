"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileList, MobileListEmpty, MobileListSectionHeader } from "@corelithzw/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterSelect } from "@/components/schools/common/filter-select";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { normaliseGender } from "@/lib/schools/boarding-rules";
import { fetchSchoolsStudents, fetchSchoolsTerms } from "@/lib/schools/admin-v2";

type Bed = {
  id: string;
  code: string;
  room: { id: string; code: string; floor: string | null; capacity: number | null };
  allocationId: string | null;
  student: {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    gender: string | null;
  } | null;
};

type Board = {
  hostel: {
    id: string;
    code: string;
    name: string;
    genderPolicy: string;
    capacity: number | null;
  };
  unbedded: {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    gender: string | null;
  }[];
  beds: Bed[];
};

/**
 * The bed board.
 *
 * Built from the beds outward, so an empty bed is a row rather than an absence
 * — which is the only thing a warden with a new boarder standing in front of
 * them is looking for. A list of allocations, which is what this page used to
 * be, can tell you who is in the hostel and never where there is space.
 *
 * The student picker leaves the gender and capacity rules to the server. The
 * students list does not carry gender, so a client-side check would either be
 * wrong or need a second request per child; the refusal that comes back names
 * the hostel and the rule, which is what a warden needs to read anyway.
 */
export function BedBoardContent({ hostelId }: { hostelId: string }) {
  const queryClient = useQueryClient();
  const [roomFilter, setRoomFilter] = useState("");
  const [pendingBed, setPendingBed] = useState<string | null>(null);
  const [chosenStudent, setChosenStudent] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const boardQuery = useQuery({
    queryKey: ["schools", "boarding", "board", hostelId],
    queryFn: () =>
      fetchJson<Board>(`/api/v2/schools/boarding/hostels/${hostelId}/occupancy`),
  });

  const studentsQuery = useQuery({
    queryKey: ["schools", "boarding", "candidates"],
    queryFn: () => fetchSchoolsStudents({ page: 1, limit: 300, status: "ACTIVE" }),
    enabled: pendingBed !== null,
  });

  const board = boardQuery.data ?? null;
  const beds = useMemo(() => board?.beds ?? [], [board]);

  const rooms = useMemo(() => {
    const seen = new Map<string, string>();
    for (const bed of beds) seen.set(bed.room.id, `Room ${bed.room.code}`);
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [beds]);

  const visible = useMemo(
    () => beds.filter((bed) => !roomFilter || bed.room.id === roomFilter),
    [beds, roomFilter],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Bed[]>();
    for (const bed of visible) {
      const key = `Room ${bed.room.code}${bed.room.floor ? ` · ${bed.room.floor}` : ""}`;
      const bucket = map.get(key);
      if (bucket) bucket.push(bed);
      else map.set(key, [bed]);
    }
    return [...map.entries()];
  }, [visible]);

  const termsQuery = useQuery({
    queryKey: ["schools", "terms", "active"],
    queryFn: () => fetchSchoolsTerms({ page: 1, limit: 20, isActive: true }),
  });
  const activeTermId = termsQuery.data?.data?.[0]?.id ?? null;

  // Children already in a bed in this hostel are left out; everybody else is
  // offered, and the server refuses the ones the hostel will not take.
  const candidates = useMemo(() => {
    const occupied = new Set(
      beds.filter((bed) => bed.student).map((bed) => bed.student?.id),
    );
    return (studentsQuery.data?.data ?? [])
      .filter((student) => !occupied.has(student.id))
      .map((student) => ({
        id: student.id,
        label: `${student.lastName}, ${student.firstName}`,
      }));
  }, [beds, studentsQuery.data]);

  const allocateMutation = useMutation({
    mutationFn: (input: { bedId: string; studentId: string }) =>
      fetchJson("/api/v2/schools/boarding/allocations", {
        method: "POST",
        body: JSON.stringify({
          studentId: input.studentId,
          hostelId,
          bedId: input.bedId,
          termId: activeTermId,
        }),
      }),
    onSuccess: () => {
      setActionError(null);
      setPendingBed(null);
      setChosenStudent("");
      void queryClient.invalidateQueries({ queryKey: ["schools", "boarding"] });
    },
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });

  const freeMutation = useMutation({
    mutationFn: (allocationId: string) =>
      fetchJson(`/api/v2/schools/boarding/allocations/${allocationId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ENDED", endDate: new Date().toISOString() }),
      }),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["schools", "boarding"] });
    },
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });

  const taken = beds.filter((bed) => bed.student).length;

  return (
    <div className="space-y-4">
      {boardQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load the bed board</AlertTitle>
          <AlertDescription>{getApiErrorMessage(boardQuery.error)}</AlertDescription>
        </Alert>
      ) : null}
      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>That bed could not be given out</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      {board ? (
        <p className="text-sm text-muted-foreground">
          {board.hostel.name} ·{" "}
          {board.hostel.genderPolicy === "MIXED"
            ? "mixed"
            : board.hostel.genderPolicy === "MALE"
              ? "boys only"
              : "girls only"}{" "}
          · {taken} of {beds.length} bed{beds.length === 1 ? "" : "s"} taken
          {board.hostel.capacity ? ` · capacity ${board.hostel.capacity}` : ""}
        </p>
      ) : null}

      {board && board.unbedded.length > 0 ? (
        <Alert>
          <AlertTitle>
            {board.unbedded.length} boarder
            {board.unbedded.length === 1 ? " has" : "s have"} no bed
          </AlertTitle>
          <AlertDescription>
            {board.unbedded.map((row) => `${row.lastName}, ${row.firstName}`).join(", ")}{" "}
            — allocated to the hostel but not to a bed.
          </AlertDescription>
        </Alert>
      ) : null}

      {rooms.length > 1 ? (
        <FilterBar>
          <FilterSelect
            label="Room"
            allLabel="Every room"
            value={roomFilter}
            options={rooms}
            onChange={setRoomFilter}
          />
        </FilterBar>
      ) : null}

      <MobileList>
        {grouped.length === 0 ? (
          <MobileListEmpty>
            {boardQuery.isLoading
              ? "Loading the bed board…"
              : "No beds set up in this hostel yet."}
          </MobileListEmpty>
        ) : (
          grouped.map(([heading, roomBeds]) => (
            <div key={heading}>
              <MobileListSectionHeader>
                {heading} · {roomBeds.filter((bed) => bed.student).length} of{" "}
                {roomBeds.length}
              </MobileListSectionHeader>
              {roomBeds.map((bed) => (
                <MobileList.Row
                  key={bed.id}
                  static
                  title={`Bed ${bed.code}`}
                  subtitle={
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      {bed.student ? (
                        <>
                          <span>
                            {bed.student.lastName}, {bed.student.firstName} ·{" "}
                            {bed.student.studentNo}
                            {normaliseGender(bed.student.gender)
                              ? ` · ${normaliseGender(bed.student.gender) === "MALE" ? "boy" : "girl"}`
                              : ""}
                          </span>
                          <Badge variant="secondary">Taken</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={freeMutation.isPending}
                            onClick={() =>
                              bed.allocationId && freeMutation.mutate(bed.allocationId)
                            }
                          >
                            Free the bed
                          </Button>
                        </>
                      ) : (
                        <>
                          <span>Empty</span>
                          <Badge variant="outline">Free</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPendingBed(bed.id);
                              setChosenStudent("");
                            }}
                          >
                            Give it to somebody
                          </Button>
                        </>
                      )}
                      {pendingBed === bed.id ? (
                        <span className="flex w-full flex-wrap items-end gap-2">
                          <FilterSelect
                            label="Boarder"
                            allLabel="Choose a child"
                            value={chosenStudent}
                            options={candidates.map((candidate) => ({
                              value: candidate.id,
                              label: candidate.label,
                            }))}
                            onChange={setChosenStudent}
                          />
                          <Button
                            size="sm"
                            disabled={
              !chosenStudent || !activeTermId || allocateMutation.isPending
            }
                            onClick={() =>
                              allocateMutation.mutate({
                                bedId: bed.id,
                                studentId: chosenStudent,
                              })
                            }
                          >
                            {allocateMutation.isPending ? "Saving…" : "Allocate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPendingBed(null)}
                          >
                            Cancel
                          </Button>
                        </span>
                      ) : null}
                    </span>
                  }
                />
              ))}
            </div>
          ))
        )}
      </MobileList>
    </div>
  );
}
