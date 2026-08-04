"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { MobileList, MobileListEmpty } from "@corelithzw/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PortalInviteDialog } from "@/components/schools/portal/portal-invite-dialog";
import { fetchSchoolsGuardians } from "@/lib/schools/admin-v2";
import type { SchoolsGuardianRecord } from "@/lib/schools/admin-v2";

export function GuardiansContent() {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);

  const guardiansQuery = useQuery({
    queryKey: ["schools", "guardians", "list"],
    queryFn: () => fetchSchoolsGuardians({ limit: 100 }),
  });

  const guardians = useMemo(
    () => guardiansQuery.data?.data ?? [],
    [guardiansQuery.data],
  );

  const inviteCandidates = useMemo(
    () =>
      guardians.map((guardian) => ({
        subjectId: guardian.id,
        name: `${guardian.firstName} ${guardian.lastName}`,
        reference: guardian.guardianNo,
        email: guardian.email,
        hasAccount: Boolean(guardian.userId),
      })),
    [guardians],
  );

  const withoutAccount = inviteCandidates.filter(
    (candidate) => !candidate.hasAccount && candidate.email,
  ).length;

  const columns = useMemo<ColumnDef<SchoolsGuardianRecord>[]>(
    () => [
      {
        id: "guardianNo",
        header: "Guardian No",
        cell: ({ row }) => (
          <Link
            href={`/schools/guardians/${row.original.id}`}
            className="font-mono text-sm hover:underline"
          >
            {row.original.guardianNo}
          </Link>
        ),
      },
      {
        id: "name",
        header: "Name",
        cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`,
      },
      {
        id: "phone",
        header: "Phone",
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.phone}</span>
        ),
      },
      {
        id: "email",
        header: "Email",
        cell: ({ row }) => row.original.email ?? "-",
      },
      {
        id: "portal",
        header: "Portal",
        cell: ({ row }) =>
          row.original.userId ? (
            <Badge variant="secondary">Active</Badge>
          ) : (
            <span className="text-muted-foreground">Not invited</span>
          ),
      },
      {
        id: "students",
        header: "Linked Students",
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {row.original._count?.studentLinks ?? 0}
          </span>
        ),
      },
    ],
    [],
  );

  if (guardiansQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load guardians</AlertTitle>
        <AlertDescription>
          {guardiansQuery.error instanceof Error
            ? guardiansQuery.error.message
            : "Unknown error occurred"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-section-title">Guardians</h2>
        <Button
          size="sm"
          disabled={withoutAccount === 0}
          onClick={() => setInviteOpen(true)}
        >
          Invite {withoutAccount} to the portal
        </Button>
      </div>

      <DataTable
        data={guardians}
        columns={columns}
        searchPlaceholder="Search guardians"
        searchSubmitLabel="Search"
        pagination={{ enabled: true }}
        mobileListRenderer={({ rows }) => (
          <MobileList>
            {rows.length === 0 ? (
              <MobileListEmpty>
                {guardiansQuery.isLoading
                  ? "Loading guardians…"
                  : "No guardians found."}
              </MobileListEmpty>
            ) : (
              rows.map(({ row }) => (
                <MobileList.Row
                  key={row.id}
                  title={`${row.firstName} ${row.lastName}`}
                  subtitle={`${row.guardianNo} · ${row.phone} · ${
                    row._count?.studentLinks ?? 0
                  } children`}
                  trailing={
                    row.userId ? <Badge variant="secondary">Portal</Badge> : undefined
                  }
                  onClick={() => {
                    window.location.href = `/schools/guardians/${row.id}`;
                  }}
                />
              ))
            )}
          </MobileList>
        )}
        emptyState={
          guardiansQuery.isLoading ? "Loading guardians..." : "No guardians found."
        }
      />

      <PortalInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        subject="GUARDIAN"
        candidates={inviteCandidates}
        onIssued={() =>
          queryClient.invalidateQueries({ queryKey: ["schools", "guardians", "list"] })
        }
      />
    </div>
  );
}
