"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileList, MobileListEmpty, MobileListSectionHeader } from "@corelithzw/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterSelect } from "@/components/schools/common/filter-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-client";
import { fetchSchoolsClasses } from "@/lib/schools/admin-v2";
import {
  ALLOWED_TRANSITIONS,
  CLOSED_STAGES,
  PIPELINE_STAGES,
  STAGE_LABELS,
  offerHasLapsed,
  type ApplicationStage,
} from "@/lib/schools/admissions-stages";
import {
  createSchoolApplication,
  enrolSchoolApplicant,
  fetchSchoolApplications,
  updateSchoolApplication,
  type DuplicateCandidateRecord,
  type SchoolsApplicationRecord,
} from "@/lib/schools/admissions-v2";
import { VerticalDataViews } from "@/components/ui/vertical-data-views";
import { SchoolsAdmissionsContent } from "./schools-admissions-content";
import {
  ApplicationFormSheet,
  type ApplicationFormValues,
} from "./application-form-sheet";

const STAGE_OPTIONS = [...PIPELINE_STAGES, ...CLOSED_STAGES].map((stage) => ({
  value: stage,
  label: STAGE_LABELS[stage],
}));

function stageBadge(stage: ApplicationStage) {
  if (stage === "ENROLLED") return <Badge variant="secondary">Enrolled</Badge>;
  if (stage === "DECLINED" || stage === "WITHDRAWN") {
    return <Badge variant="destructive">{STAGE_LABELS[stage]}</Badge>;
  }
  return <Badge variant="outline">{STAGE_LABELS[stage]}</Badge>;
}

/**
 * The admissions pipeline, as a board.
 *
 * Grouped by stage rather than filtered to one, because the question an
 * admissions office asks in September is "where is everybody" — how many at
 * assessment, how many offers out, how many offers about to lapse — and a list
 * showing one stage at a time answers none of it.
 *
 * Columns are sections rather than a horizontal kanban. Nine columns do not fit
 * a phone, and a board you have to swipe sideways hides exactly the column
 * nobody has looked at.
 *
 * Lapsed offers are called out. An offer nobody answers is a place held for a
 * family that has gone elsewhere, and a waiting list that never moves is what
 * that costs.
 */
export function AdmissionsBoardContent() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"pipeline" | "enrolments">("pipeline");
  const [classFilter, setClassFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [search, setSearch] = useState("");
  const [includeClosed, setIncludeClosed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateCandidateRecord[]>([]);
  const [enrolNote, setEnrolNote] = useState<string | null>(null);

  const classesQuery = useQuery({
    queryKey: ["schools", "grades"],
    queryFn: () => fetchSchoolsClasses({ page: 1, limit: 200 }),
  });

  const applicationsQuery = useQuery({
    queryKey: ["schools", "applications", classFilter, stageFilter, search, includeClosed],
    queryFn: () =>
      fetchSchoolApplications({
        classId: classFilter || undefined,
        stage: (stageFilter || undefined) as ApplicationStage | undefined,
        search: search.trim() || undefined,
        includeClosed: includeClosed || undefined,
      }),
  });

  const classes = useMemo(() => classesQuery.data?.data ?? [], [classesQuery.data]);
  const applications = useMemo(
    () => applicationsQuery.data?.applications ?? [],
    [applicationsQuery.data],
  );
  const counts = applicationsQuery.data?.counts ?? {};

  const now = useMemo(() => new Date(), []);

  const grouped = useMemo(() => {
    const map = new Map<ApplicationStage, SchoolsApplicationRecord[]>();
    for (const application of applications) {
      const bucket = map.get(application.stage);
      if (bucket) bucket.push(application);
      else map.set(application.stage, [application]);
    }
    const order = includeClosed || stageFilter
      ? [...PIPELINE_STAGES, ...CLOSED_STAGES]
      : PIPELINE_STAGES;
    return order
      .filter((stage) => (map.get(stage) ?? []).length > 0)
      .map((stage) => [stage, map.get(stage) as SchoolsApplicationRecord[]] as const);
  }, [applications, includeClosed, stageFilter]);

  const lapsed = applications.filter((application) =>
    offerHasLapsed(application, now),
  );

  const createMutation = useMutation({
    mutationFn: (values: ApplicationFormValues) =>
      createSchoolApplication({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        dateOfBirth: values.dateOfBirth || null,
        gender: values.gender || null,
        guardianName: values.guardianName.trim() || null,
        guardianPhone: values.guardianPhone.trim() || null,
        guardianEmail: values.guardianEmail.trim() || null,
        previousSchool: values.previousSchool.trim() || null,
        source: values.source || null,
        appliedForClassId: values.appliedForClassId || null,
        notes: values.notes.trim() || null,
      }),
    onSuccess: (result) => {
      setFormOpen(false);
      setActionError(null);
      setDuplicates(result.duplicates);
      void queryClient.invalidateQueries({ queryKey: ["schools", "applications"] });
    },
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });

  const moveMutation = useMutation({
    mutationFn: (input: { id: string; stage: ApplicationStage }) =>
      updateSchoolApplication(input.id, {
        stage: input.stage,
        // Two weeks is the usual window here, and an offer with no expiry is
        // one nobody ever chases.
        offerExpiresAt:
          input.stage === "OFFERED"
            ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 10)
            : undefined,
      }),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["schools", "applications"] });
    },
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });

  const enrolMutation = useMutation({
    mutationFn: (id: string) => enrolSchoolApplicant(id),
    onSuccess: (result) => {
      setActionError(null);
      setEnrolNote(`On the roll as ${result.studentNo}.`);
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });

  return (
    <VerticalDataViews
      items={[
        { id: "pipeline", label: "Pipeline", count: applications.length },
        { id: "enrolments", label: "Enrolments" },
      ]}
      value={view}
      onValueChange={(value) => setView(value as "pipeline" | "enrolments")}
      railLabel="Admissions views"
    >
      {view === "enrolments" ? <SchoolsAdmissionsContent /> : null}

      <div className={view === "pipeline" ? "space-y-4" : "hidden"}>
      {applicationsQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load applications</AlertTitle>
          <AlertDescription>
            {getApiErrorMessage(applicationsQuery.error)}
          </AlertDescription>
        </Alert>
      ) : null}
      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>That did not work</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}
      {enrolNote ? (
        <Alert>
          <AlertTitle>Enrolled</AlertTitle>
          <AlertDescription>{enrolNote}</AlertDescription>
        </Alert>
      ) : null}
      {duplicates.length > 0 ? (
        <Alert>
          <AlertTitle>
            {duplicates.length} existing application
            {duplicates.length === 1 ? "" : "s"} worth a look
          </AlertTitle>
          <AlertDescription>
            {duplicates
              .map(
                (row) =>
                  `${row.lastName}, ${row.firstName} (${row.applicationNo}) — ${row.reason}`,
              )
              .join("; ")}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <FilterBar>
          <div className="min-w-0 flex-1 basis-[180px] sm:max-w-[220px]">
            <Label htmlFor="admissions-search" className="text-sm text-muted-foreground">
              Find
            </Label>
            <Input
              id="admissions-search"
              value={search}
              placeholder="Name or number"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <FilterSelect
            label="Year group"
            allLabel="Any year group"
            value={classFilter}
            options={classes.map((row) => ({ value: row.id, label: row.name }))}
            onChange={setClassFilter}
          />
          <FilterSelect
            label="Stage"
            allLabel="Open stages"
            value={stageFilter}
            options={STAGE_OPTIONS}
            onChange={setStageFilter}
          />
        </FilterBar>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => setIncludeClosed((on) => !on)}>
            {includeClosed ? "Hide closed" : "Show closed"}
          </Button>
          <Button onClick={() => setFormOpen(true)}>New application</Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {PIPELINE_STAGES.map((stage) => `${counts[stage] ?? 0} ${STAGE_LABELS[stage].toLowerCase()}`).join(
          " · ",
        )}
      </p>

      {lapsed.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>
            {lapsed.length} offer{lapsed.length === 1 ? " has" : "s have"} run out
          </AlertTitle>
          <AlertDescription>
            {lapsed.map((row) => `${row.lastName}, ${row.firstName}`).join(", ")} — the
            place is being held for a family that has not answered.
          </AlertDescription>
        </Alert>
      ) : null}

      <MobileList>
        {grouped.length === 0 ? (
          <MobileListEmpty>
            {applicationsQuery.isLoading
              ? "Loading applications…"
              : "No applications yet."}
          </MobileListEmpty>
        ) : (
          grouped.map(([stage, rows]) => (
            <div key={stage}>
              <MobileListSectionHeader>
                {STAGE_LABELS[stage]} · {rows.length}
              </MobileListSectionHeader>
              {rows.map((application) => {
                const next = ALLOWED_TRANSITIONS[application.stage];
                return (
                  <MobileList.Row
                    key={application.id}
                    static
                    title={`${application.lastName}, ${application.firstName}`}
                    subtitle={
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <span>
                          {application.applicationNo}
                          {application.appliedForClass
                            ? ` · ${application.appliedForClass.name}`
                            : ""}
                          {application.guardianName
                            ? ` · ${application.guardianName}`
                            : ""}
                          {application.assessmentScore !== null
                            ? ` · entrance ${Number(application.assessmentScore)}%`
                            : ""}
                        </span>
                        {stageBadge(application.stage)}
                        {offerHasLapsed(application, now) ? (
                          <Badge variant="destructive">Offer lapsed</Badge>
                        ) : null}
                        {application.stage === "ACCEPTED" ? (
                          <Button
                            size="sm"
                            disabled={enrolMutation.isPending}
                            onClick={() => enrolMutation.mutate(application.id)}
                          >
                            Enrol
                          </Button>
                        ) : null}
                        {next
                          .filter((target) => target !== "ENROLLED")
                          .map((target) => (
                            <Button
                              key={target}
                              size="sm"
                              variant="ghost"
                              disabled={moveMutation.isPending}
                              onClick={() =>
                                moveMutation.mutate({
                                  id: application.id,
                                  stage: target,
                                })
                              }
                            >
                              {STAGE_LABELS[target]}
                            </Button>
                          ))}
                      </span>
                    }
                  />
                );
              })}
            </div>
          ))
        )}
      </MobileList>

      <ApplicationFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        classes={classes.map((row) => ({ id: row.id, name: row.name }))}
        isSubmitting={createMutation.isPending}
        error={createMutation.isError ? actionError : null}
        onSubmit={(values) => createMutation.mutate(values)}
      />
      </div>
    </VerticalDataViews>
  );
}
