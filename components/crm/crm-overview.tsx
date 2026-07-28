"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Alert, EmptyState, Skeleton } from "@corelithzw/react";
import { Button } from "@/components/ui/button";
import { PageActions } from "@/components/layout/page-chrome";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { Check, Grid3x3, RotateCcw } from "@/lib/icons";
import type { OverviewScope, WidgetInstance } from "@/lib/crm/widgets";

import { CustomNoteWidget } from "./widgets/custom-note-widget";
import { renderHomeWidget, type HomeData } from "./widgets/home-widgets";
import { WidgetGrid } from "./widgets/widget-grid";

type LayoutResponse = {
  scope: OverviewScope;
  widgets: WidgetInstance[];
  isCustomised: boolean;
};

/**
 * The CRM home, as a grid the reader owns.
 *
 * Editing is a mode, and the draft lives in local state until it is saved —
 * dragging six widgets around should be one write, not six, and abandoning a
 * rearrangement halfway should leave the page as it was.
 */
export function CrmOverview() {
  const scope: OverviewScope = "HOME";
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WidgetInstance[] | null>(null);

  const layoutQuery = useQuery({
    queryKey: ["crm", "overview-layout", scope],
    queryFn: () => fetchJson<LayoutResponse>(`/api/v2/crm/overview-layout?scope=${scope}`),
  });

  const dataQuery = useQuery({
    queryKey: ["crm-dashboard"],
    queryFn: () => fetchJson<HomeData>("/api/v2/crm/dashboard"),
  });

  const save = useMutation({
    mutationFn: (widgets: WidgetInstance[]) =>
      fetchJson<LayoutResponse>("/api/v2/crm/overview-layout", {
        method: "PUT",
        body: JSON.stringify({ scope, widgets }),
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(["crm", "overview-layout", scope], result);
      setEditing(false);
      setDraft(null);
      toast({ title: "Overview saved" });
    },
    onError: (error) =>
      toast({
        title: "Could not save the overview",
        description: getApiErrorMessage(error),
        variant: "destructive",
      }),
  });

  const reset = useMutation({
    mutationFn: () =>
      fetchJson(`/api/v2/crm/overview-layout?scope=${scope}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "overview-layout", scope] });
      setEditing(false);
      setDraft(null);
      toast({ title: "Back to the standard overview" });
    },
  });

  const saved = layoutQuery.data?.widgets ?? [];
  const widgets = draft ?? saved;
  const data = dataQuery.data;

  if (layoutQuery.isLoading || dataQuery.isLoading) {
    return (
      <div className="grid grid-cols-12 gap-4" aria-busy="true">
        {/* Spelled out: Tailwind cannot see a computed `lg:col-span-${n}`, so
            the loading grid was one column wide in production and seven
            columns wide in development. */}
        {[
          "lg:col-span-4",
          "lg:col-span-4",
          "lg:col-span-4",
          "lg:col-span-8",
          "lg:col-span-4",
          "lg:col-span-6",
          "lg:col-span-6",
        ].map((span, index) => (
          <Skeleton key={index} height={140} className={`col-span-12 ${span}`} />
        ))}
      </div>
    );
  }

  if (dataQuery.error) {
    return (
      <Alert tone="danger" title="Couldn't load the overview">
        {getApiErrorMessage(dataQuery.error)}
      </Alert>
    );
  }

  if (!data) return null;

  const nothingYet =
    data.pipeline.openDeals === 0 &&
    data.won.count === 0 &&
    data.documents.quotationsRaised === 0;

  if (nothingYet) {
    return (
      <EmptyState
        title="Nothing in the pipeline yet"
        body="Once a deal is open, this page shows what is in flight, what is owed to a customer, and what is owed to you."
        action={
          <Link href="/crm/deals?new=1" className="btn btn-primary">
            Start a deal
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageActions>
        {editing ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDraft(null);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            {layoutQuery.data?.isCustomised ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => reset.mutate()}
              >
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            ) : null}
            <Button
              size="sm"
              className="gap-1.5"
              disabled={save.isPending}
              onClick={() => save.mutate(widgets)}
            >
              <Check className="size-3.5" />
              {save.isPending ? "Saving…" : "Done"}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              setDraft(saved);
              setEditing(true);
            }}
          >
            <Grid3x3 className="size-3.5" />
            Arrange
          </Button>
        )}
      </PageActions>

      {editing ? (
        <p className="text-sm text-[var(--text-muted)]">
          Drag a widget by its handle to move it, or use its menu to resize or
          remove it. Only you see this arrangement.
        </p>
      ) : null}

      <WidgetGrid
        scope={scope}
        widgets={widgets}
        editing={editing}
        onChange={setDraft}
        renderWidget={(instance) =>
          instance.type === "custom-note" ? (
            <CustomNoteWidget
              instance={instance}
              editing={editing}
              onChange={(config) =>
                setDraft(
                  widgets.map((widget) =>
                    widget.id === instance.id ? { ...widget, config } : widget,
                  ),
                )
              }
            />
          ) : (
            renderHomeWidget(instance.type, data)
          )
        }
      />
    </div>
  );
}
