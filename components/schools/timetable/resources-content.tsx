"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileList, MobileListEmpty, MobileListSectionHeader } from "@corelithzw/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RecordDialog } from "@/components/crm/records/record-dialog";
import { FilterBar, FilterSelect } from "@/components/schools/common/filter-select";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { fetchSchoolsSubjects } from "@/lib/schools/admin-v2";

type Resource = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  linkUrl: string | null;
  isShared: boolean;
  subject: { id: string; code: string; name: string } | null;
  class: { id: string; name: string } | null;
  uploadedBy: { id: string; user: { name: string | null } } | null;
};

/**
 * The staff-room shelf.
 *
 * Resources hang off a *subject*, not a class: a Form 2 worksheet is the same
 * worksheet next September, and pinning it to a class means re-uploading it
 * every year. The year group is a hint, not the key.
 *
 * A teacher's own unshared drafts are visible to them and to nobody else, which
 * is what makes it safe to put a half-finished worksheet here rather than on a
 * memory stick.
 */
export function TeachingResourcesContent() {
  const queryClient = useQueryClient();
  const [subjectFilter, setSubjectFilter] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    subjectId: "",
    linkUrl: "",
    isShared: true,
  });

  const subjectsQuery = useQuery({
    queryKey: ["schools", "academics", "subjects", "all"],
    queryFn: () => fetchSchoolsSubjects({ page: 1, limit: 200 }),
  });

  const resourcesQuery = useQuery({
    queryKey: ["schools", "resources", subjectFilter, search],
    queryFn: () =>
      fetchJson<{ resources: Resource[] }>(
        `/api/v2/schools/teaching-resources?${new URLSearchParams({
          ...(subjectFilter ? { subjectId: subjectFilter } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        }).toString()}`,
      ),
  });

  const subjects = useMemo(
    () => subjectsQuery.data?.data ?? [],
    [subjectsQuery.data],
  );
  const resources = useMemo(
    () => resourcesQuery.data?.resources ?? [],
    [resourcesQuery.data],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Resource[]>();
    for (const resource of resources) {
      const key = resource.subject?.name ?? "Anything";
      const bucket = map.get(key);
      if (bucket) bucket.push(resource);
      else map.set(key, [resource]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [resources]);

  const createMutation = useMutation({
    mutationFn: () =>
      fetchJson("/api/v2/schools/teaching-resources", {
        method: "POST",
        body: JSON.stringify({
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          subjectId: draft.subjectId || null,
          linkUrl: draft.linkUrl.trim() || null,
          isShared: draft.isShared,
        }),
      }),
    onSuccess: () => {
      setFormOpen(false);
      setActionError(null);
      setDraft({
        title: "",
        description: "",
        subjectId: "",
        linkUrl: "",
        isShared: true,
      });
      void queryClient.invalidateQueries({ queryKey: ["schools", "resources"] });
    },
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });

  return (
    <div className="space-y-4">
      {resourcesQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load the shelf</AlertTitle>
          <AlertDescription>{getApiErrorMessage(resourcesQuery.error)}</AlertDescription>
        </Alert>
      ) : null}
      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>That did not save</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <FilterBar>
          <div className="min-w-0 flex-1 basis-[200px] sm:max-w-[280px]">
            <Label htmlFor="resource-search" className="text-sm text-muted-foreground">
              Find
            </Label>
            <Input
              id="resource-search"
              value={search}
              placeholder="Worksheet, past paper…"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <FilterSelect
            label="Subject"
            allLabel="Every subject"
            value={subjectFilter}
            options={subjects.map((subject) => ({
              value: subject.id,
              label: subject.name,
            }))}
            onChange={setSubjectFilter}
          />
        </FilterBar>
        <Button onClick={() => setFormOpen(true)}>Add a resource</Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {resources.length} resource{resources.length === 1 ? "" : "s"} on the shelf.
      </p>

      <MobileList>
        {grouped.length === 0 ? (
          <MobileListEmpty>
            {resourcesQuery.isLoading
              ? "Loading the shelf…"
              : "Nothing here yet. Add a worksheet or a link."}
          </MobileListEmpty>
        ) : (
          grouped.map(([subject, rows]) => (
            <div key={subject}>
              <MobileListSectionHeader>{subject}</MobileListSectionHeader>
              {rows.map((resource) => (
                <MobileList.Row
                  key={resource.id}
                  static
                  title={resource.title}
                  subtitle={
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <span>
                        {resource.description ?? "No description"}
                        {resource.uploadedBy?.user.name
                          ? ` · ${resource.uploadedBy.user.name}`
                          : ""}
                      </span>
                      {resource.isShared ? (
                        <Badge variant="secondary">Shared</Badge>
                      ) : (
                        <Badge variant="outline">Only you</Badge>
                      )}
                      {resource.linkUrl || resource.fileUrl ? (
                        <a
                          className="text-sm underline"
                          href={(resource.fileUrl ?? resource.linkUrl) as string}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                      ) : null}
                    </span>
                  }
                />
              ))}
            </div>
          ))
        )}
      </MobileList>

      <RecordDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Add a resource"
        size="md"
        errors={createMutation.isError && actionError ? [actionError] : undefined}
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.title.trim() && draft.linkUrl.trim() && !createMutation.isPending) {
            createMutation.mutate();
          }
        }}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !draft.title.trim() || !draft.linkUrl.trim() || createMutation.isPending
              }
            >
              {createMutation.isPending ? "Saving…" : "Add it"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="resource-title">What is it</Label>
            <Input
              id="resource-title"
              value={draft.title}
              maxLength={300}
              placeholder="Simultaneous equations worksheet"
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="resource-link">Link</Label>
            <Input
              id="resource-link"
              value={draft.linkUrl}
              placeholder="https://…"
              onChange={(event) =>
                setDraft((current) => ({ ...current, linkUrl: event.target.value }))
              }
            />
            <p className="text-sm text-muted-foreground">
              File upload comes with the documents work in Iteration 5. A link is
              what the shelf holds until then.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="resource-subject">Subject</Label>
            <FilterSelect
              label=""
              allLabel="Any subject"
              value={draft.subjectId}
              options={subjects.map((subject) => ({
                value: subject.id,
                label: subject.name,
              }))}
              onChange={(value) =>
                setDraft((current) => ({ ...current, subjectId: value }))
              }
              className="min-w-0"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="resource-description">Notes</Label>
            <Textarea
              id="resource-description"
              rows={2}
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="flex items-start gap-2">
              <Checkbox
                checked={draft.isShared}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({ ...current, isShared: checked === true }))
                }
              />
              <span>
                Share it with the other teachers
                <span className="block text-muted-foreground">
                  Leave it off for a draft. Only you will see it.
                </span>
              </span>
            </Label>
          </div>
        </div>
      </RecordDialog>
    </div>
  );
}
