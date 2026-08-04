"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileList, MobileListEmpty, MobileListSectionHeader } from "@corelithzw/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RecordDialog } from "@/components/crm/records/record-dialog";
import { FilterBar, FilterSelect } from "@/components/schools/common/filter-select";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { CONSENT_LABELS, type ConsentKey } from "@/lib/schools/health-consents";
import { fetchSchoolsClasses } from "@/lib/schools/admin-v2";

type HealthRecord = {
  id: string;
  allergies: string | null;
  chronicConditions: string | null;
  medications: string | null;
  dietaryRequirements: string | null;
  doctorName: string | null;
  doctorPhone: string | null;
  consentFirstAid: boolean;
  consentEmergencyTreatment: boolean;
  consentPhotography: boolean;
  consentOutings: boolean;
  consentGivenBy: string | null;
  consentGivenAt: string | null;
};

type Row = {
  student: {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    isBoarding: boolean;
    className: string | null;
  };
  record: HealthRecord | null;
  gaps: string[];
};

type Draft = {
  allergies: string;
  chronicConditions: string;
  medications: string;
  dietaryRequirements: string;
  doctorName: string;
  doctorPhone: string;
  consentGivenBy: string;
} & Record<ConsentKey, boolean>;

function draftFrom(row: Row | null): Draft {
  const record = row?.record ?? null;
  return {
    allergies: record?.allergies ?? "",
    chronicConditions: record?.chronicConditions ?? "",
    medications: record?.medications ?? "",
    dietaryRequirements: record?.dietaryRequirements ?? "",
    doctorName: record?.doctorName ?? "",
    doctorPhone: record?.doctorPhone ?? "",
    consentGivenBy: record?.consentGivenBy ?? "",
    consentFirstAid: record?.consentFirstAid ?? false,
    consentEmergencyTreatment: record?.consentEmergencyTreatment ?? false,
    consentPhotography: record?.consentPhotography ?? false,
    consentOutings: record?.consentOutings ?? false,
  };
}

/**
 * The welfare list.
 *
 * Built from the children outward, not from the health records, so a child with
 * nothing on file is a row saying so rather than an absence. That is the whole
 * job of this screen: an allergy nobody has recorded looks exactly like a child
 * with no allergies, and only a list of the gaps tells them apart.
 *
 * The gaps lead each row. "No consent to treat" against a child with a peanut
 * allergy is the sentence a boarding school needs in front of it, and burying
 * it inside a detail page means nobody reads it until the night it matters.
 */
export function WelfareContent() {
  const queryClient = useQueryClient();
  const [classFilter, setClassFilter] = useState("");
  const [boardersOnly, setBoardersOnly] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(null));
  const [actionError, setActionError] = useState<string | null>(null);

  const classesQuery = useQuery({
    queryKey: ["schools", "grades"],
    queryFn: () => fetchSchoolsClasses({ page: 1, limit: 200 }),
  });

  const listQuery = useQuery({
    queryKey: ["schools", "health", classFilter, boardersOnly],
    queryFn: () =>
      fetchJson<{ rows: Row[] }>(
        `/api/v2/schools/health?${new URLSearchParams({
          ...(classFilter ? { classId: classFilter } : {}),
          ...(boardersOnly ? { boardingOnly: "true" } : {}),
        }).toString()}`,
      ),
  });

  const classes = useMemo(() => classesQuery.data?.data ?? [], [classesQuery.data]);
  const rows = useMemo(() => listQuery.data?.rows ?? [], [listQuery.data]);

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of rows) {
      const key = row.student.className ?? "Not in a class";
      const bucket = map.get(key);
      if (bucket) bucket.push(row);
      else map.set(key, [row]);
    }
    return [...map.entries()];
  }, [rows]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error("Nothing being edited");
      return fetchJson(`/api/v2/schools/health/${editing.student.id}`, {
        method: "PUT",
        body: JSON.stringify({
          allergies: draft.allergies.trim() || null,
          chronicConditions: draft.chronicConditions.trim() || null,
          medications: draft.medications.trim() || null,
          dietaryRequirements: draft.dietaryRequirements.trim() || null,
          doctorName: draft.doctorName.trim() || null,
          doctorPhone: draft.doctorPhone.trim() || null,
          consentGivenBy: draft.consentGivenBy.trim() || null,
          consentFirstAid: draft.consentFirstAid,
          consentEmergencyTreatment: draft.consentEmergencyTreatment,
          consentPhotography: draft.consentPhotography,
          consentOutings: draft.consentOutings,
        }),
      });
    },
    onSuccess: () => {
      setActionError(null);
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ["schools", "health"] });
    },
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });

  const missing = rows.filter((row) => row.gaps.length > 0).length;
  const urgent = rows.filter((row) =>
    row.gaps.some((gap) => gap.includes("Allergy on file")),
  ).length;

  return (
    <div className="space-y-4">
      {listQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load the welfare list</AlertTitle>
          <AlertDescription>{getApiErrorMessage(listQuery.error)}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <FilterBar>
          <FilterSelect
            label="Year group"
            allLabel="The whole school"
            value={classFilter}
            options={classes.map((row) => ({ value: row.id, label: row.name }))}
            onChange={setClassFilter}
          />
        </FilterBar>
        <Button variant="outline" onClick={() => setBoardersOnly((on) => !on)}>
          {boardersOnly ? "Everybody" : "Boarders only"}
        </Button>
      </div>

      {urgent > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>
            {urgent} child{urgent === 1 ? "" : "ren"} with an allergy and no consent to
            treat
          </AlertTitle>
          <AlertDescription>
            This is the combination a school cannot be caught by. Ring home before
            anything else on this page.
          </AlertDescription>
        </Alert>
      ) : null}

      <p className="text-sm text-muted-foreground">
        {rows.length} child{rows.length === 1 ? "" : "ren"}, {missing} with something
        still to record.
      </p>

      <MobileList>
        {grouped.length === 0 ? (
          <MobileListEmpty>
            {listQuery.isLoading ? "Loading the welfare list…" : "No children found."}
          </MobileListEmpty>
        ) : (
          grouped.map(([heading, groupRows]) => (
            <div key={heading}>
              <MobileListSectionHeader>
                {heading} · {groupRows.length}
              </MobileListSectionHeader>
              {groupRows.map((row) => (
                <MobileList.Row
                  key={row.student.id}
                  static
                  title={`${row.student.lastName}, ${row.student.firstName}`}
                  subtitle={
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <span>
                        {row.student.studentNo}
                        {row.student.isBoarding ? " · boarder" : ""}
                        {row.record?.allergies
                          ? ` · allergic to ${row.record.allergies}`
                          : ""}
                      </span>
                      {row.gaps.length === 0 ? (
                        <Badge variant="secondary">Complete</Badge>
                      ) : (
                        row.gaps.map((gap) => (
                          <Badge
                            key={gap}
                            variant={
                              gap.includes("Allergy on file") ? "destructive" : "outline"
                            }
                          >
                            {gap}
                          </Badge>
                        ))
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(row);
                          setDraft(draftFrom(row));
                          setActionError(null);
                        }}
                      >
                        {row.record ? "Update" : "Record"}
                      </Button>
                    </span>
                  }
                />
              ))}
            </div>
          ))
        )}
      </MobileList>

      <RecordDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title={
          editing
            ? `${editing.student.lastName}, ${editing.student.firstName}`
            : "Health record"
        }
        description="What the sanatorium needs to know, and what the family has agreed to."
        size="lg"
        errors={actionError ? [actionError] : undefined}
        onSubmit={(event) => {
          event.preventDefault();
          if (!saveMutation.isPending) saveMutation.mutate();
        }}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="health-allergies">Allergies</Label>
            <Textarea
              id="health-allergies"
              rows={2}
              value={draft.allergies}
              placeholder="Peanuts — carries an EpiPen in her bag"
              onChange={(event) =>
                setDraft((current) => ({ ...current, allergies: event.target.value }))
              }
            />
            <p className="text-sm text-muted-foreground">
              Write the sentence a nurse needs, not a list of words.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="health-conditions">Ongoing conditions</Label>
            <Textarea
              id="health-conditions"
              rows={2}
              value={draft.chronicConditions}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  chronicConditions: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="health-medications">Regular medication</Label>
            <Textarea
              id="health-medications"
              rows={2}
              value={draft.medications}
              onChange={(event) =>
                setDraft((current) => ({ ...current, medications: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="health-diet">Dietary requirements</Label>
            <Input
              id="health-diet"
              value={draft.dietaryRequirements}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  dietaryRequirements: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="health-doctor">Doctor</Label>
            <Input
              id="health-doctor"
              value={draft.doctorName}
              onChange={(event) =>
                setDraft((current) => ({ ...current, doctorName: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="health-doctor-phone">Doctor&rsquo;s number</Label>
            <Input
              id="health-doctor-phone"
              value={draft.doctorPhone}
              onChange={(event) =>
                setDraft((current) => ({ ...current, doctorPhone: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="health-consent-by">Consent given by</Label>
            <Input
              id="health-consent-by"
              value={draft.consentGivenBy}
              placeholder="R. Chirwa (mother)"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  consentGivenBy: event.target.value,
                }))
              }
            />
            <p className="text-sm text-muted-foreground">
              Required as soon as any consent below is on. The date is stamped when
              you save.
            </p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            {(Object.keys(CONSENT_LABELS) as ConsentKey[]).map((key) => (
              <Label key={key} className="flex items-start gap-2">
                <Checkbox
                  checked={draft[key]}
                  onCheckedChange={(checked) =>
                    setDraft((current) => ({ ...current, [key]: checked === true }))
                  }
                />
                <span>{CONSENT_LABELS[key]}</span>
              </Label>
            ))}
          </div>
        </div>
      </RecordDialog>
    </div>
  );
}
