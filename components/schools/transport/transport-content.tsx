"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileList, MobileListEmpty, MobileListSectionHeader } from "@corelithzw/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VerticalDataViews } from "@/components/ui/vertical-data-views";
import { FilterBar, FilterSelect } from "@/components/schools/common/filter-select";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";

type Stop = {
  id: string;
  name: string;
  sequence: number;
  pickupMinute: number | null;
  dropMinute: number | null;
};

type Route = {
  id: string;
  code: string;
  name: string;
  termFee: number | null;
  capacity: number | null;
  vehicleReg: string | null;
  driverName: string | null;
  driverPhone: string | null;
  isActive: boolean;
  stops: Stop[];
  _count: { riders: number };
};

type Billing = {
  route: { id: string; code: string; name: string; termFee: number; capacity: number | null };
  riders: number;
  unbilled: number;
  due: number;
};

type RegisterRow = {
  riderId: string;
  student: {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    currentClass: { id: string; name: string } | null;
  };
  stop: { id: string; name: string; sequence: number; pickupMinute: number | null } | null;
  boarding: { id: string; boarded: boolean } | null;
};

function clock(minute: number | null) {
  if (minute === null) return null;
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * The transport office, and the driver's register.
 *
 * Two views. "Routes" is the standing arrangement — where the bus stops, who
 * rides it and what that is worth in fees. "Register" is this morning: every
 * rider in stop order, marked or not, because a driver works down the route and
 * not down an alphabet, and a child who has not got on is a row rather than an
 * absence.
 *
 * The billing figure is *reported*, not posted. Turning it into invoice lines
 * belongs with the fee run, and a transport module that silently created
 * charges is one nobody can reconcile.
 */
export function TransportContent() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"routes" | "register">("routes");
  const [routeFilter, setRouteFilter] = useState("");
  const [onDate, setOnDate] = useState(today);
  const [direction, setDirection] = useState<"MORNING" | "AFTERNOON">("MORNING");
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const routesQuery = useQuery({
    queryKey: ["schools", "transport", "routes"],
    queryFn: () =>
      fetchJson<{ routes: Route[]; billing: Billing[] }>("/api/v2/schools/transport"),
  });

  const routes = useMemo(() => routesQuery.data?.routes ?? [], [routesQuery.data]);
  const billing = useMemo(() => routesQuery.data?.billing ?? [], [routesQuery.data]);
  const activeRoute = routeFilter || routes[0]?.id || "";

  const registerQuery = useQuery({
    queryKey: ["schools", "transport", "register", activeRoute, onDate, direction],
    queryFn: () =>
      fetchJson<{
        register: {
          route: { code: string; name: string; driverName: string | null };
          rows: RegisterRow[];
          summary: { expected: number; on: number; notOn: number; unmarked: number };
        };
      }>(
        `/api/v2/schools/transport?routeId=${activeRoute}&onDate=${onDate}&direction=${direction}`,
      ),
    enabled: view === "register" && Boolean(activeRoute),
  });

  const register = registerQuery.data?.register ?? null;
  const rows = useMemo(() => register?.rows ?? [], [register]);

  const markMutation = useMutation({
    mutationFn: () =>
      fetchJson("/api/v2/schools/transport", {
        method: "POST",
        body: JSON.stringify({
          action: "register",
          onDate,
          direction,
          entries: rows.map((row) => ({
            riderId: row.riderId,
            boarded: marks[row.riderId] ?? row.boarding?.boarded ?? true,
          })),
        }),
      }),
    onSuccess: () => {
      setActionError(null);
      setNote("Register saved");
      void queryClient.invalidateQueries({ queryKey: ["schools", "transport"] });
    },
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });

  const totalDue = billing.reduce((sum, row) => sum + row.due, 0);

  return (
    <div className="space-y-4">
      {routesQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load transport</AlertTitle>
          <AlertDescription>{getApiErrorMessage(routesQuery.error)}</AlertDescription>
        </Alert>
      ) : null}
      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>That did not save</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}
      {note ? (
        <Alert>
          <AlertTitle>Done</AlertTitle>
          <AlertDescription>{note}</AlertDescription>
        </Alert>
      ) : null}

      <VerticalDataViews
        items={[
          { id: "routes", label: "Routes", count: routes.length },
          { id: "register", label: "This morning" },
        ]}
        value={view}
        onValueChange={(value) => setView(value as "routes" | "register")}
        railLabel="Transport views"
      >
        {view === "routes" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {routes.length} route{routes.length === 1 ? "" : "s"} ·{" "}
              {billing.reduce((sum, row) => sum + row.riders, 0)} riders ·{" "}
              {totalDue.toFixed(2)} still to bill this term
            </p>

            <MobileList>
              {routes.length === 0 ? (
                <MobileListEmpty>
                  {routesQuery.isLoading
                    ? "Loading routes…"
                    : "No routes set up yet."}
                </MobileListEmpty>
              ) : (
                routes.map((route) => {
                  const money = billing.find((row) => row.route.id === route.id);
                  return (
                    <div key={route.id}>
                      <MobileListSectionHeader>
                        {route.code} · {route.name}
                        {route.driverName ? ` · ${route.driverName}` : ""}
                        {money ? ` · ${money.riders} riding` : ""}
                        {money && money.due > 0 ? ` · ${money.due.toFixed(2)} to bill` : ""}
                      </MobileListSectionHeader>
                      {route.stops.length === 0 ? (
                        <MobileList.Row
                          static
                          title="No stops yet"
                          subtitle="A route with no stops is a bus with nowhere to pull in."
                        />
                      ) : (
                        route.stops.map((stop) => (
                          <MobileList.Row
                            key={stop.id}
                            static
                            title={`${stop.sequence}. ${stop.name}`}
                            subtitle={
                              <span className="mt-1 flex flex-wrap items-center gap-2">
                                <span>
                                  {clock(stop.pickupMinute)
                                    ? `Pick up ${clock(stop.pickupMinute)}`
                                    : "No pick-up time set"}
                                  {clock(stop.dropMinute)
                                    ? ` · drop ${clock(stop.dropMinute)}`
                                    : ""}
                                </span>
                                {route.capacity ? (
                                  <Badge variant="outline">
                                    {money?.riders ?? 0} of {route.capacity} seats
                                  </Badge>
                                ) : null}
                              </span>
                            }
                          />
                        ))
                      )}
                    </div>
                  );
                })
              )}
            </MobileList>
          </div>
        ) : null}

        {view === "register" ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <FilterBar>
                <FilterSelect
                  label="Route"
                  allLabel={routes[0]?.name ?? "Choose a route"}
                  value={routeFilter}
                  options={routes.map((route) => ({
                    value: route.id,
                    label: `${route.code} · ${route.name}`,
                  }))}
                  onChange={setRouteFilter}
                />
                <div className="min-w-0 flex-1 basis-[160px] sm:max-w-[180px]">
                  <Label htmlFor="bus-date" className="text-sm text-muted-foreground">
                    Date
                  </Label>
                  <Input
                    id="bus-date"
                    type="date"
                    value={onDate}
                    onChange={(event) => setOnDate(event.target.value)}
                  />
                </div>
                <FilterSelect
                  label="Journey"
                  allLabel="Morning"
                  value={direction === "MORNING" ? "" : direction}
                  options={[{ value: "AFTERNOON", label: "Afternoon" }]}
                  onChange={(value) =>
                    setDirection(value === "AFTERNOON" ? "AFTERNOON" : "MORNING")
                  }
                />
              </FilterBar>
              <Button
                disabled={rows.length === 0 || markMutation.isPending}
                onClick={() => markMutation.mutate()}
              >
                {markMutation.isPending ? "Saving…" : "Save the register"}
              </Button>
            </div>

            {register ? (
              <p className="text-sm text-muted-foreground">
                {register.route.code} · {register.route.name} · {register.summary.on} on,{" "}
                {register.summary.notOn} not on, {register.summary.unmarked} unmarked of{" "}
                {register.summary.expected}
              </p>
            ) : null}

            <MobileList>
              {rows.length === 0 ? (
                <MobileListEmpty>
                  {registerQuery.isLoading
                    ? "Loading the register…"
                    : "Nobody rides this route this term."}
                </MobileListEmpty>
              ) : (
                rows.map((row) => {
                  const marked = marks[row.riderId] ?? row.boarding?.boarded ?? true;
                  return (
                    <MobileList.Row
                      key={row.riderId}
                      static
                      title={`${row.student.lastName}, ${row.student.firstName}`}
                      subtitle={
                        <span className="mt-1 flex flex-wrap items-center gap-2">
                          <span>
                            {row.student.studentNo}
                            {row.stop
                              ? ` · ${row.stop.name}${clock(row.stop.pickupMinute) ? ` ${clock(row.stop.pickupMinute)}` : ""}`
                              : " · no stop set"}
                            {row.student.currentClass
                              ? ` · ${row.student.currentClass.name}`
                              : ""}
                          </span>
                          {row.boarding === null ? (
                            <Badge variant="outline">Not marked</Badge>
                          ) : null}
                          <Button
                            size="sm"
                            variant={marked ? "default" : "outline"}
                            onClick={() =>
                              setMarks((current) => ({ ...current, [row.riderId]: true }))
                            }
                          >
                            On
                          </Button>
                          <Button
                            size="sm"
                            variant={marked ? "outline" : "destructive"}
                            onClick={() =>
                              setMarks((current) => ({
                                ...current,
                                [row.riderId]: false,
                              }))
                            }
                          >
                            Not on
                          </Button>
                        </span>
                      }
                    />
                  );
                })
              )}
            </MobileList>
          </div>
        ) : null}
      </VerticalDataViews>
    </div>
  );
}
