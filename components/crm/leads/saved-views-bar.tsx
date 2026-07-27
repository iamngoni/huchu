"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { DotsThree, Plus, Users } from "@/lib/icons";
import {
  createCrmSavedView,
  deleteCrmSavedView,
  updateCrmSavedView,
  type CrmSavedViewRecord,
} from "@/lib/crm/crm-v2";
import type { LeadSort, LeadViewFilters } from "@/lib/crm/views";
import { cn } from "@/lib/utils";

export type BuiltInView = {
  key: string;
  name: string;
  filters: LeadViewFilters;
};

/** Views everyone gets, without anyone having to create them. */
export const BUILT_IN_VIEWS: BuiltInView[] = [
  { key: "all", name: "All leads", filters: {} },
  { key: "mine", name: "My leads", filters: { mineOnly: true } },
  { key: "open", name: "Open pipeline", filters: { stages: ["NEW", "CONTACTED", "QUALIFIED", "SITE_VISIT", "QUOTED", "INVOICED"] } },
  { key: "overdue", name: "Needs attention", filters: { overdueOnly: true } },
];

function sameFilters(a: LeadViewFilters, b: LeadViewFilters): boolean {
  const normalise = (filters: LeadViewFilters) =>
    JSON.stringify(
      Object.entries(filters)
        .filter(([, value]) =>
          Array.isArray(value) ? value.length > 0 : value !== undefined && value !== "" && value !== false,
        )
        .map(([key, value]) => [key, Array.isArray(value) ? [...value].sort() : value])
        .sort(([left], [right]) => String(left).localeCompare(String(right))),
    );
  return normalise(a) === normalise(b);
}

export function SavedViewsBar({
  views,
  filters,
  sort,
  activeViewId,
  onSelectView,
  className,
}: {
  views: CrmSavedViewRecord[];
  filters: LeadViewFilters;
  sort: LeadSort;
  activeViewId: string | null;
  onSelectView: (view: { id: string | null; filters: LeadViewFilters; sort?: LeadSort | null }) => void;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [saveOpen, setSaveOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftShared, setDraftShared] = useState(false);
  const [renaming, setRenaming] = useState<CrmSavedViewRecord | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["crm", "saved-views"] });

  const failed = (title: string) => (error: unknown) =>
    toast({ title, description: getApiErrorMessage(error), variant: "destructive" });

  const createView = useMutation({
    mutationFn: () =>
      createCrmSavedView({ name: draftName.trim(), filters, sort, isShared: draftShared }),
    onSuccess: (result) => {
      setSaveOpen(false);
      setDraftName("");
      setDraftShared(false);
      refresh();
      onSelectView({ id: result.data.id, filters: result.data.filters, sort: result.data.sort });
      toast({ title: "View saved", description: `"${result.data.name}" is ready to reuse.` });
    },
    onError: failed("Could not save view"),
  });

  const updateView = useMutation({
    mutationFn: (input: { id: string; body: Parameters<typeof updateCrmSavedView>[1]; message: string }) =>
      updateCrmSavedView(input.id, input.body).then(() => input.message),
    onSuccess: (message) => {
      setRenaming(null);
      refresh();
      toast({ title: message });
    },
    onError: failed("Could not update view"),
  });

  const removeView = useMutation({
    mutationFn: (id: string) => deleteCrmSavedView(id),
    onSuccess: (_result, id) => {
      refresh();
      if (activeViewId === id) onSelectView({ id: null, filters: {} });
      toast({ title: "View deleted" });
    },
    onError: failed("Could not delete view"),
  });

  const activeSaved = views.find((view) => view.id === activeViewId) ?? null;
  // "Dirty" means the visible filters have drifted from whatever view is
  // selected — that's when offering to save is useful rather than noise.
  const isDirty = activeSaved
    ? !sameFilters(activeSaved.filters, filters)
    : !BUILT_IN_VIEWS.some((view) => sameFilters(view.filters, filters));

  const activeBuiltIn =
    !activeSaved && BUILT_IN_VIEWS.find((view) => sameFilters(view.filters, filters));

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {BUILT_IN_VIEWS.map((view) => (
        <Button
          key={view.key}
          size="sm"
          variant={activeBuiltIn && activeBuiltIn.key === view.key ? "secondary" : "ghost"}
          onClick={() => onSelectView({ id: null, filters: view.filters })}
        >
          {view.name}
        </Button>
      ))}

      {views.length > 0 ? <span className="mx-1 h-5 w-px bg-[var(--border)]" /> : null}

      {views.map((view) => {
        const isActive = view.id === activeViewId;
        return (
          <div key={view.id} className="flex items-center">
            <Button
              size="sm"
              variant={isActive ? "secondary" : "ghost"}
              className="gap-1.5 pr-1.5"
              onClick={() => onSelectView({ id: view.id, filters: view.filters, sort: view.sort })}
            >
              {view.isShared ? <Users className="h-3.5 w-3.5 opacity-70" /> : null}
              {view.name}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-7 px-0"
                  aria-label={`Options for ${view.name}`}
                >
                  <DotsThree className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => {
                    setRenaming(view);
                    setRenameDraft(view.name);
                  }}
                >
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    updateView.mutate({
                      id: view.id,
                      body: { filters, sort },
                      message: `"${view.name}" updated to match your current filters`,
                    })
                  }
                >
                  Update with current filters
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    updateView.mutate({
                      id: view.id,
                      body: { isShared: !view.isShared },
                      message: view.isShared
                        ? `"${view.name}" is now private to you`
                        : `"${view.name}" shared with the team`,
                    })
                  }
                >
                  {view.isShared ? "Make private" : "Share with team"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-[var(--status-error-text)]"
                  onClick={() => removeView.mutate(view.id)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}

      {isDirty ? (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => {
            setDraftName("");
            setDraftShared(false);
            setSaveOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Save view
        </Button>
      ) : null}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save this view</DialogTitle>
            <DialogDescription>
              Your current filters and sort order, saved under a name you can come back to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="view-name">Name</Label>
              <Input
                id="view-name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="e.g. Big deals awaiting quotes"
                maxLength={80}
                autoFocus
              />
            </div>
            <label className="flex cursor-pointer items-start gap-2.5">
              <Checkbox
                checked={draftShared}
                onCheckedChange={(checked) => setDraftShared(checked === true)}
                className="mt-0.5"
              />
              <span className="text-sm">
                Share with the team
                <span className="block text-[var(--text-muted)]">
                  Everyone in the company sees this view. Otherwise it stays yours alone.
                </span>
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createView.mutate()}
              disabled={draftName.trim().length === 0 || createView.isPending}
            >
              {createView.isPending ? "Saving…" : "Save view"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(renaming)} onOpenChange={(next) => (!next ? setRenaming(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename view</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="view-rename">Name</Label>
            <Input
              id="view-rename"
              value={renameDraft}
              onChange={(event) => setRenameDraft(event.target.value)}
              maxLength={80}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                renaming &&
                updateView.mutate({
                  id: renaming.id,
                  body: { name: renameDraft.trim() },
                  message: "View renamed",
                })
              }
              disabled={renameDraft.trim().length === 0 || updateView.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
