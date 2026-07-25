"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  Badge,
  Button,
  Drawer,
  Field,
  Input,
  Switch,
  type DataTableColumn,
} from "@corelithzw/react";

import { DsDataTable } from "@/components/corelith/ds-data-table";
import { useToast } from "@/components/ui/use-toast";
import { useReservedId } from "@/hooks/use-reserved-id";
import {
  createDepartment,
  deleteDepartment,
  fetchDepartments,
  type DepartmentRecord,
  updateDepartment,
} from "@/lib/api";
import { getApiErrorMessage, resolveDisplayErrorMessage } from "@/lib/api-client";
import { Pencil, Plus, Trash2 } from "@/lib/icons";

type DepartmentFormState = {
  code: string;
  name: string;
  isActive: boolean;
};

const emptyForm: DepartmentFormState = {
  code: "",
  name: "",
  isActive: true,
};

function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function DepartmentsPreferences() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [submittedSearch, setSubmittedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DepartmentRecord | null>(null);
  const [formState, setFormState] = React.useState<DepartmentFormState>(emptyForm);
  const {
    reservedId,
    isReserving,
    error: reserveError,
  } = useReservedId({
    entity: "DEPARTMENT",
    enabled: formOpen && !editing,
  });
  const resolvedCode = editing ? formState.code : reservedId;

  const departmentsQuery = useQuery({
    queryKey: ["preferences", "organization", "departments"],
    queryFn: () => fetchDepartments({ limit: 500 }),
  });
  const loadErrorMessage = resolveDisplayErrorMessage([departmentsQuery.error]);

  const createMutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      toast({
        title: "Department created",
        description: "Department record was created.",
        variant: "success",
      });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["preferences", "organization", "departments"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to create department",
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; input: Parameters<typeof updateDepartment>[1] }) =>
      updateDepartment(payload.id, payload.input),
    onSuccess: () => {
      toast({
        title: "Department updated",
        description: "Department record was updated.",
        variant: "success",
      });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["preferences", "organization", "departments"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to update department",
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      toast({
        title: "Department deleted",
        description: "Department record was deleted.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["preferences", "organization", "departments"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to delete department",
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setFormState(emptyForm);
  }

  function openCreateForm() {
    setEditing(null);
    setFormState(emptyForm);
    setFormOpen(true);
  }

  function openEditForm(department: DepartmentRecord) {
    setEditing(department);
    setFormState({
      code: department.code,
      name: department.name,
      isActive: department.isActive,
    });
    setFormOpen(true);
  }

  async function confirmDeleteDepartment(department: DepartmentRecord) {
    const confirmed = await AlertDialog.confirm({
      title: "Delete department",
      description: `Delete ${department.name}. Departments linked to employees cannot be deleted.`,
      variant: "danger",
      confirmLabel: "Delete",
    });
    if (confirmed) deleteMutation.mutate(department.id);
  }

  const filteredRows = React.useMemo(() => {
    const rows = departmentsQuery.data?.data ?? [];
    const query = submittedSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((department) =>
      [department.name, department.code]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [departmentsQuery.data?.data, submittedSearch]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageRows = paginateRows(filteredRows, Math.min(page, pageCount), pageSize);

  React.useEffect(() => {
    setPage(1);
  }, [pageSize, submittedSearch]);

  const columns: DataTableColumn<DepartmentRecord>[] = [
      {
        id: "code",
        header: "Code",
        width: "8rem",
        cell: (row) => <span className="t-mono">{row.code}</span>,
      },
      {
        id: "name",
        header: "Name",
        cell: (row) => row.name,
      },
      {
        id: "employees",
        header: "Employees",
        numeric: true,
        width: "8rem",
        cell: (row) => <span className="t-mono">{row._count?.employees ?? 0}</span>,
      },
      {
        id: "status",
        header: "Status",
        width: "8rem",
        cell: (row) => (
          <Badge tone={row.isActive ? "success" : "outline"}>
            {row.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        width: "10rem",
        cell: (row) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<Pencil className="size-4" aria-hidden="true" />}
              aria-label={`Edit ${row.name}`}
              onClick={() => openEditForm(row)}
            />
            <Button
              type="button"
              variant="ghost"
              tone="danger"
              size="sm"
              icon={<Trash2 className="size-4" aria-hidden="true" />}
              aria-label={`Delete ${row.name}`}
              loading={deleteMutation.isPending}
              onClick={() => confirmDeleteDepartment(row)}
            />
          </div>
        ),
      },
  ];

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!formState.name.trim()) return;
    if (!editing && !resolvedCode.trim()) return;

    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        input: {
          name: formState.name.trim(),
          isActive: formState.isActive,
        },
      });
      return;
    }

    createMutation.mutate({
      code: resolvedCode.trim(),
      name: formState.name.trim(),
      isActive: formState.isActive,
    });
  }

  return (
    <>
      <DsDataTable
        ariaLabel="Departments"
        rows={pageRows}
        columns={columns}
        getRowId={(row) => row.id}
        searchValue={search}
        searchPlaceholder="Search departments"
        onSearchChange={setSearch}
        onSearchSubmit={() => setSubmittedSearch(search)}
        actions={
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={<Plus className="size-4" aria-hidden="true" />}
            onClick={openCreateForm}
          >
            New department
          </Button>
        }
        isLoading={departmentsQuery.isLoading}
        loadingLabel="Fetching departments"
        error={loadErrorMessage}
        errorTitle="Unable to load departments"
        emptyTitle="No departments found"
        emptyDescription="Create departments to organize people and payroll assignments."
        page={Math.min(page, pageCount)}
        pageCount={pageCount}
        pageSize={pageSize}
        pageSizeOptions={[10, 25, 50]}
        total={filteredRows.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <Drawer
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Edit department" : "New department"}
        subtitle={
          editing
            ? "Update department details and active status."
            : "Create a department record for HR and compensation assignment."
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="department-preferences-form"
              loading={createMutation.isPending || updateMutation.isPending}
              disabled={!editing && (isReserving || !resolvedCode)}
            >
              {editing ? "Save changes" : "Create department"}
            </Button>
          </div>
        }
      >
        <form id="department-preferences-form" className="space-y-4" onSubmit={handleSave}>
          <Field
            label="Code"
            description={
              editing
                ? "Department code cannot be changed."
                : reserveError ?? "Code is generated automatically and cannot be edited."
            }
            required
          >
            <Input
              value={resolvedCode}
              readOnly
              placeholder={isReserving ? "Reserving code" : "Auto-generated"}
              required
            />
          </Field>
          <Field label="Name" required>
            <Input
              value={formState.name}
              onChange={(event) =>
                setFormState((current) => ({ ...current, name: event.target.value }))
              }
              required
            />
          </Field>
          <div className="settings-row">
            <div>
              <div className="t-label-sm">Active</div>
              <p className="t-caption t-muted">Inactive departments remain on historical records.</p>
            </div>
            <Switch
              aria-label="Department active status"
              checked={formState.isActive}
              onChange={(event) =>
                setFormState((current) => ({ ...current, isActive: event.target.checked }))
              }
            />
          </div>
        </form>
      </Drawer>
    </>
  );
}
