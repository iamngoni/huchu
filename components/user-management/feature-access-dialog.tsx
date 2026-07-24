"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import {
  fetchManagedUserFeatureAccess,
  resetManagedUserFeatureAccess,
  setManagedUserFeatureAccess,
  type ManagedUserFeatureAccessEntry,
  type ManagedUserFeatureAccessResponse,
  type ManagedUserSummary,
} from "@/lib/user-management-api";

export type FeatureAccessTarget = {
  userId: string;
  userEmail: string;
};

function featureAccessQueryKey(userId: string | undefined) {
  return ["managed-user-feature-access", userId] as const;
}

function matchesSearch(entry: ManagedUserFeatureAccessEntry, search: string): boolean {
  if (!search) return true;
  const haystack = `${entry.name} ${entry.featureKey} ${entry.description}`.toLowerCase();
  return haystack.includes(search);
}

export function FeatureAccessDialog({
  target,
  users,
  onTargetChange,
  onClose,
}: {
  target: FeatureAccessTarget | null;
  users: ManagedUserSummary[];
  onTargetChange: (target: FeatureAccessTarget) => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const targetUserId = target?.userId || "";
  const [search, setSearch] = React.useState("");
  const [pendingKeys, setPendingKeys] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    setSearch("");
    setPendingKeys(new Set());
  }, [targetUserId]);

  const featureAccessQuery = useQuery({
    queryKey: featureAccessQueryKey(targetUserId),
    queryFn: () => fetchManagedUserFeatureAccess(targetUserId),
    enabled: Boolean(targetUserId),
  });

  const targetUser = featureAccessQuery.data?.user;
  const features = React.useMemo(
    () => featureAccessQuery.data?.features ?? [],
    [featureAccessQuery.data?.features],
  );

  const normalizedSearch = search.trim().toLowerCase();
  const groupedFeatures = React.useMemo(() => {
    const groups = new Map<string, ManagedUserFeatureAccessEntry[]>();
    for (const entry of features) {
      if (!matchesSearch(entry, normalizedSearch)) continue;
      const group = groups.get(entry.domain);
      if (group) {
        group.push(entry);
      } else {
        groups.set(entry.domain, [entry]);
      }
    }
    return [...groups.entries()];
  }, [features, normalizedSearch]);

  const enabledCount = React.useMemo(
    () => features.filter((entry) => entry.isEnabled).length,
    [features],
  );
  const overrideCount = React.useMemo(
    () => features.filter((entry) => entry.hasOverride).length,
    [features],
  );

  const toggleMutation = useMutation({
    mutationFn: setManagedUserFeatureAccess,
    onMutate: async (input) => {
      const queryKey = featureAccessQueryKey(input.userId);
      setPendingKeys((current) => new Set(current).add(input.featureKey));
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ManagedUserFeatureAccessResponse>(queryKey);
      queryClient.setQueryData<ManagedUserFeatureAccessResponse>(queryKey, (current) =>
        current
          ? {
              ...current,
              features: current.features.map((entry) =>
                entry.featureKey === input.featureKey
                  ? {
                      ...entry,
                      isEnabled: input.isEnabled,
                      hasOverride: input.isEnabled !== entry.roleDefault,
                    }
                  : entry,
              ),
            }
          : current,
      );
      return { previous };
    },
    onError: (error, input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(featureAccessQueryKey(input.userId), context.previous);
      }
      toast({
        title: "Unable to update feature access",
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    },
    onSettled: (_data, _error, input) => {
      setPendingKeys((current) => {
        const next = new Set(current);
        next.delete(input.featureKey);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: featureAccessQueryKey(input.userId) });
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetManagedUserFeatureAccess,
    onSuccess: (_data, input) => {
      toast({
        title: "Feature access reset",
        description: "All overrides were removed. Role defaults now apply.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: featureAccessQueryKey(input.userId) });
    },
    onError: (error) => {
      toast({
        title: "Unable to reset feature access",
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const handleToggle = (entry: ManagedUserFeatureAccessEntry, nextEnabled: boolean) => {
    if (!targetUserId) return;
    toggleMutation.mutate({
      userId: targetUserId,
      featureKey: entry.featureKey,
      isEnabled: nextEnabled,
    });
  };

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Manage Feature Access</DialogTitle>
          <DialogDescription>
            Toggle the features this user can access. Features not provisioned for the company are
            not listed. Changes take effect on the user&apos;s next session refresh.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              value={targetUserId || "__none"}
              onValueChange={(value) => {
                if (value === "__none") return;
                const selected = users.find((user) => user.id === value);
                if (!selected) return;
                onTargetChange({ userId: selected.id, userEmail: selected.email });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Select user</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {`${user.name} (${user.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search features by name or key"
              disabled={!targetUserId}
            />
          </div>

          {!targetUserId ? (
            <div className="rounded-lg border border-dashed border-[var(--edge-subtle)] p-6 text-center text-sm text-muted-foreground">
              Select a user to manage their feature access.
            </div>
          ) : featureAccessQuery.error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load feature access</AlertTitle>
              <AlertDescription>{getApiErrorMessage(featureAccessQuery.error)}</AlertDescription>
            </Alert>
          ) : featureAccessQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {targetUser ? (
                    <Badge variant="outline">{targetUser.role}</Badge>
                  ) : null}
                  <span>
                    {enabledCount} of {features.length} features enabled
                  </span>
                  {overrideCount > 0 ? (
                    <Badge variant="secondary">
                      {overrideCount} {overrideCount === 1 ? "override" : "overrides"}
                    </Badge>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={overrideCount === 0 || resetMutation.isPending}
                  onClick={() => resetMutation.mutate({ userId: targetUserId })}
                >
                  {resetMutation.isPending ? "Resetting..." : "Reset to Role Defaults"}
                </Button>
              </div>

              <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
                {groupedFeatures.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[var(--edge-subtle)] p-6 text-center text-sm text-muted-foreground">
                    {features.length === 0
                      ? "No features are provisioned for this company."
                      : "No features match this search."}
                  </div>
                ) : (
                  groupedFeatures.map(([domain, entries]) => (
                    <div key={domain} className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {domain}
                      </div>
                      <div className="space-y-1.5">
                        {entries.map((entry) => {
                          const pending = pendingKeys.has(entry.featureKey);
                          return (
                            <div
                              key={entry.featureKey}
                              className="flex items-center gap-3 rounded-lg border border-[var(--edge-subtle)] px-3 py-2"
                            >
                              <Checkbox
                                checked={entry.isEnabled}
                                disabled={pending}
                                onCheckedChange={(value) => handleToggle(entry, value === true)}
                                aria-label={`Toggle ${entry.name}`}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium">{entry.name}</span>
                                  {entry.hasOverride ? (
                                    <Badge variant="secondary">
                                      {entry.isEnabled ? "Granted" : "Revoked"}
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="truncate font-mono text-xs text-muted-foreground">
                                  {entry.featureKey}
                                </div>
                              </div>
                              {entry.hasOverride ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="shrink-0 text-xs text-muted-foreground"
                                  disabled={pending}
                                  onClick={() => handleToggle(entry, entry.roleDefault)}
                                >
                                  Use role default
                                </Button>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
