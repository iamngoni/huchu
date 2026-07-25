"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Badge,
  Button,
  Drawer,
  Field,
  Input,
  PageHeader,
  SegmentedControl,
  Select,
  Skeleton,
  StatCard,
  TextArea,
  type DataTableColumn,
} from "@corelithzw/react";
import { useSession } from "next-auth/react";

import { DsDataTable } from "@/components/corelith/ds-data-table";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import {
  fetchAutosDeals,
  fetchAutosInventory,
  fetchAutosLeads,
  fetchAutosPayments,
  fetchAutosSummary,
  type AutosDeal,
  type AutosLead,
  type AutosPayment,
  type AutosVehicle,
  type PaginatedResponse,
} from "@/lib/autos/autos-v2";
import { Plus } from "@/lib/icons";

export type CarSalesRecordKind = "leads" | "inventory" | "deals" | "financing";
type AutosRecord = AutosLead | AutosVehicle | AutosDeal | AutosPayment;
type AutosRecordsResponse = PaginatedResponse<AutosRecord>;

const LEAD_STATUSES: Array<{ value: AutosLead["status"]; label: string }> = [
  { value: "NEW", label: "New" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "CANCELED", label: "Canceled" },
];

const VEHICLE_STATUSES: Array<{ value: AutosVehicle["status"]; label: string }> = [
  { value: "IN_STOCK", label: "In Stock" },
  { value: "RESERVED", label: "Reserved" },
  { value: "SOLD", label: "Sold" },
  { value: "DELIVERED", label: "Delivered" },
];

const DEAL_STATUSES: Array<{ value: AutosDeal["status"]; label: string }> = [
  { value: "DRAFT", label: "Draft" },
  { value: "QUOTED", label: "Quoted" },
  { value: "RESERVED", label: "Reserved" },
  { value: "CONTRACTED", label: "Contracted" },
  { value: "DELIVERY_READY", label: "Delivery Ready" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELED", label: "Canceled" },
  { value: "VOIDED", label: "Voided" },
];

const PAYMENT_STATUSES: Array<{ value: AutosPayment["status"]; label: string }> = [
  { value: "POSTED", label: "Posted" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "VOIDED", label: "Voided" },
];

const PAYMENT_METHODS: Array<{ value: AutosPayment["paymentMethod"]; label: string }> = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CARD", label: "Card" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
];

const RECORD_LABELS: Record<CarSalesRecordKind, { title: string; search: string; empty: string }> = {
  leads: {
    title: "Leads",
    search: "Search leads",
    empty: "No leads found.",
  },
  inventory: {
    title: "Vehicle Inventory",
    search: "Search vehicles",
    empty: "No vehicles in inventory.",
  },
  deals: {
    title: "Deals",
    search: "Search deals",
    empty: "No deals available.",
  },
  financing: {
    title: "Financing",
    search: "Search payments",
    empty: "No payments found.",
  },
};

const OVERVIEW_OPTIONS: Array<{ value: CarSalesRecordKind; label: string }> = [
  { value: "leads", label: "Leads" },
  { value: "inventory", label: "Inventory" },
  { value: "deals", label: "Deals" },
  { value: "financing", label: "Financing" },
];

function canManageAutos(role?: string | null) {
  return role === "SUPERADMIN" || role === "MANAGER" || role === "AUTO_MANAGER";
}

function canCreateForKind(kind: CarSalesRecordKind, role?: string | null) {
  if (canManageAutos(role)) return true;
  if (kind === "leads" || kind === "deals") return role === "SALES_EXEC";
  if (kind === "financing") return role === "FINANCE_OFFICER";
  return false;
}

function createActionLabel(kind: CarSalesRecordKind) {
  if (kind === "leads") return "Add Lead";
  if (kind === "inventory") return "Add Vehicle";
  if (kind === "deals") return "Create Deal";
  return "Post Payment";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function formatDateTimeLocal(value = new Date()) {
  const offsetMs = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatMoney(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCount(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat(undefined).format(value);
}

function mono(value: React.ReactNode) {
  return <span className="font-mono tabular-nums">{value}</span>;
}

function titleCaseStatus(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function leadStatusBadge(status: AutosLead["status"]) {
  const tone =
    status === "WON"
      ? "success"
      : status === "QUALIFIED"
        ? "success"
        : status === "NEGOTIATION"
          ? "warn"
          : status === "LOST" || status === "CANCELED"
            ? "danger"
            : "info";
  return <Badge tone={tone}>{titleCaseStatus(status)}</Badge>;
}

function vehicleStatusBadge(status: AutosVehicle["status"]) {
  const tone =
    status === "IN_STOCK"
      ? "success"
      : status === "RESERVED"
        ? "warn"
        : status === "SOLD"
          ? "info"
          : "neutral";
  return <Badge tone={tone}>{titleCaseStatus(status)}</Badge>;
}

function dealStatusBadge(status: AutosDeal["status"]) {
  const tone =
    status === "CONTRACTED" || status === "DELIVERY_READY"
      ? "success"
      : status === "RESERVED"
        ? "warn"
        : status === "CANCELED" || status === "VOIDED"
          ? "danger"
          : status === "QUOTED"
            ? "info"
            : "neutral";
  return <Badge tone={tone}>{titleCaseStatus(status)}</Badge>;
}

function paymentStatusBadge(status: AutosPayment["status"]) {
  const tone = status === "POSTED" ? "success" : status === "REFUNDED" ? "warn" : "danger";
  return <Badge tone={tone}>{titleCaseStatus(status)}</Badge>;
}

function paymentMethodBadge(method: AutosPayment["paymentMethod"]) {
  return <Badge tone="outline">{titleCaseStatus(method)}</Badge>;
}

function leadColumns(): DataTableColumn<AutosLead>[] {
  return [
    {
      id: "lead",
      header: "Lead",
      cell: (row) => (
        <div>
          <div className="font-mono text-xs tabular-nums">{row.leadNo}</div>
          <div className="font-medium">{row.customerName}</div>
          <div className="text-xs text-[var(--muted-fg)]">{row.phone}</div>
        </div>
      ),
    },
    { id: "status", header: "Status", cell: (row) => leadStatusBadge(row.status) },
    {
      id: "interest",
      header: "Vehicle Interest",
      cell: (row) => row.vehicleInterest || "-",
    },
    {
      id: "budget",
      header: "Budget",
      numeric: true,
      cell: (row) =>
        mono(
          row.budgetMin !== null || row.budgetMax !== null
            ? `${formatMoney(row.budgetMin)} - ${formatMoney(row.budgetMax)}`
            : "-",
        ),
    },
    {
      id: "assigned",
      header: "Assigned To",
      cell: (row) => row.assignedTo?.name || "-",
    },
    {
      id: "deals",
      header: "Deals",
      numeric: true,
      cell: (row) => mono(formatCount(row._count.deals)),
    },
    {
      id: "updated",
      header: "Updated",
      numeric: true,
      cell: (row) => mono(formatDate(row.updatedAt)),
    },
  ];
}

function inventoryColumns(): DataTableColumn<AutosVehicle>[] {
  return [
    {
      id: "vehicle",
      header: "Vehicle",
      cell: (row) => (
        <div>
          <div className="font-mono text-xs tabular-nums">{row.stockNo}</div>
          <div className="font-medium">
            {row.make} {row.model}
          </div>
          <div className="text-xs text-[var(--muted-fg)]">{row.year}</div>
        </div>
      ),
    },
    {
      id: "vin",
      header: "VIN",
      cell: (row) => <span className="font-mono text-xs tabular-nums">{row.vin}</span>,
    },
    { id: "status", header: "Status", cell: (row) => vehicleStatusBadge(row.status) },
    {
      id: "listing",
      header: "Listing Price",
      numeric: true,
      cell: (row) => mono(formatMoney(row.listingPrice)),
    },
    {
      id: "floor",
      header: "Approval Floor",
      numeric: true,
      cell: (row) => mono(formatMoney(row.minApprovalPrice)),
    },
    {
      id: "deals",
      header: "Deals",
      numeric: true,
      cell: (row) => mono(formatCount(row._count.deals)),
    },
  ];
}

function dealColumns(): DataTableColumn<AutosDeal>[] {
  return [
    {
      id: "deal",
      header: "Deal",
      cell: (row) => (
        <div>
          <div className="font-mono text-xs tabular-nums">{row.dealNo}</div>
          <div className="font-medium">{row.customerName}</div>
          <div className="text-xs text-[var(--muted-fg)]">{row.customerPhone}</div>
        </div>
      ),
    },
    {
      id: "vehicle",
      header: "Vehicle",
      cell: (row) => (
        <div>
          <div className="font-mono text-xs tabular-nums">{row.vehicle.stockNo}</div>
          <div>
            {row.vehicle.make} {row.vehicle.model}
          </div>
          <div className="text-xs text-[var(--muted-fg)]">{row.vehicle.year}</div>
        </div>
      ),
    },
    { id: "status", header: "Status", cell: (row) => dealStatusBadge(row.status) },
    { id: "net", header: "Net", numeric: true, cell: (row) => mono(formatMoney(row.netAmount)) },
    { id: "paid", header: "Paid", numeric: true, cell: (row) => mono(formatMoney(row.paidAmount)) },
    {
      id: "balance",
      header: "Balance",
      numeric: true,
      cell: (row) => mono(formatMoney(row.balanceAmount)),
    },
    {
      id: "reservedUntil",
      header: "Reserved Until",
      numeric: true,
      cell: (row) => mono(formatDate(row.reservedUntil)),
    },
  ];
}

function paymentColumns(): DataTableColumn<AutosPayment>[] {
  return [
    {
      id: "payment",
      header: "Payment",
      cell: (row) => (
        <div>
          <div className="font-mono text-xs tabular-nums">{row.paymentNo}</div>
          <div className="text-xs text-[var(--muted-fg)]">{formatDate(row.paymentDate)}</div>
        </div>
      ),
    },
    {
      id: "deal",
      header: "Deal",
      cell: (row) => (
        <div>
          <div className="font-mono text-xs tabular-nums">{row.deal.dealNo}</div>
          <div className="font-medium">{row.deal.customerName}</div>
          <div className="text-xs text-[var(--muted-fg)]">{dealStatusBadge(row.deal.status as AutosDeal["status"])}</div>
        </div>
      ),
    },
    { id: "method", header: "Method", cell: (row) => paymentMethodBadge(row.paymentMethod) },
    { id: "status", header: "Status", cell: (row) => paymentStatusBadge(row.status) },
    {
      id: "amount",
      header: "Amount",
      numeric: true,
      cell: (row) => mono(formatMoney(row.amount)),
    },
    {
      id: "balance",
      header: "Deal Balance",
      numeric: true,
      cell: (row) => mono(formatMoney(row.deal.balanceAmount)),
    },
    { id: "receivedBy", header: "Received By", cell: (row) => row.receivedBy?.name || "-" },
    { id: "reference", header: "Reference", cell: (row) => row.reference || "-" },
  ];
}

function getColumns(kind: CarSalesRecordKind): DataTableColumn<AutosRecord>[] {
  if (kind === "leads") return leadColumns() as unknown as DataTableColumn<AutosRecord>[];
  if (kind === "inventory") return inventoryColumns() as unknown as DataTableColumn<AutosRecord>[];
  if (kind === "deals") return dealColumns() as unknown as DataTableColumn<AutosRecord>[];
  return paymentColumns() as unknown as DataTableColumn<AutosRecord>[];
}

function getStatusOptions(kind: CarSalesRecordKind) {
  const source =
    kind === "leads"
      ? LEAD_STATUSES
      : kind === "inventory"
        ? VEHICLE_STATUSES
        : kind === "deals"
          ? DEAL_STATUSES
          : PAYMENT_STATUSES;
  return [{ value: "", label: "All statuses" }, ...source];
}

function getRowId(row: AutosRecord) {
  return row.id;
}

function useRecordsQuery(kind: CarSalesRecordKind, params: {
  page: number;
  limit: number;
  search: string;
  status: string;
}) {
  return useQuery<AutosRecordsResponse>({
    queryKey: ["autos", kind, params],
    queryFn: async () => {
      const query = {
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
        status: params.status || undefined,
      };
      if (kind === "leads") return (await fetchAutosLeads(query)) as AutosRecordsResponse;
      if (kind === "inventory") return (await fetchAutosInventory(query)) as AutosRecordsResponse;
      if (kind === "deals") return (await fetchAutosDeals(query)) as AutosRecordsResponse;
      return (await fetchAutosPayments(query)) as AutosRecordsResponse;
    },
  });
}

export function CarSalesRecordsTable({ kind }: { kind: CarSalesRecordKind }) {
  const labels = RECORD_LABELS[kind];
  const session = useSession();
  const role = session.data?.user?.role;
  const canCreate = canCreateForKind(kind, role);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  const query = useRecordsQuery(kind, {
    page,
    limit: pageSize,
    search,
    status,
  });

  const pagination = query.data?.pagination;
  const rows = query.data?.data ?? [];

  return (
    <section className="space-y-3">
      <DsDataTable
        columns={getColumns(kind)}
        rows={rows}
        getRowId={getRowId}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={(nextSearch) => {
          setSearch(nextSearch.trim());
          setPage(1);
        }}
        searchPlaceholder={labels.search}
        filters={
          <Select
            aria-label={`${labels.title} status`}
            value={status}
            options={getStatusOptions(kind)}
            onChange={(event) => {
              setStatus(event.currentTarget.value);
              setPage(1);
            }}
          />
        }
        actions={
          canCreate ? (
            <Button
              type="button"
              size="sm"
              icon={<Plus className="size-4" aria-hidden="true" />}
              onClick={() => setDrawerOpen(true)}
            >
              {createActionLabel(kind)}
            </Button>
          ) : null
        }
        loading={query.isLoading}
        error={query.error ? getApiErrorMessage(query.error) : null}
        emptyTitle={labels.empty}
        emptyDescription="Adjust the search or status filter to broaden the list."
        pagination={
          pagination
            ? {
                page: pagination.page,
                pageCount: pagination.pages,
                total: pagination.total,
                pageSize,
                pageSizeOptions: [10, 25, 50, 100],
                onPageChange: setPage,
                onPageSizeChange: (nextPageSize) => {
                  setPageSize(nextPageSize);
                  setPage(1);
                },
              }
            : undefined
        }
        ariaLabel={labels.title}
      />

      <CreateRecordDrawer kind={kind} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </section>
  );
}

export function CarSalesListSurface({
  kind,
  title,
}: {
  kind: CarSalesRecordKind;
  title: string;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <PageHeader title={title} />
      <CarSalesRecordsTable kind={kind} />
    </div>
  );
}

export function CarSalesOverviewSurface() {
  const [activeView, setActiveView] = React.useState<CarSalesRecordKind>("leads");
  const summaryQuery = useQuery({
    queryKey: ["autos", "summary"],
    queryFn: () => fetchAutosSummary(),
  });

  const summary = summaryQuery.data?.summary;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <PageHeader title="Auto Sales" />

      {summaryQuery.error ? (
        <Alert tone="danger" title="Unable to load auto sales summary">
          {getApiErrorMessage(summaryQuery.error)}
        </Alert>
      ) : null}

      {summaryQuery.isLoading ? (
        <Skeleton lines={2} />
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Leads" value={formatCount(summary?.leads ?? 0)} />
          <StatCard label="Qualified Leads" value={formatCount(summary?.qualifiedLeads ?? 0)} tone="success" />
          <StatCard label="Vehicles In Stock" value={formatCount(summary?.vehiclesInStock ?? 0)} />
          <StatCard label="Reserved Vehicles" value={formatCount(summary?.vehiclesReserved ?? 0)} tone="warn" />
          <StatCard label="Active Deals" value={formatCount(summary?.activeDeals ?? 0)} />
          <StatCard label="Contracted Deals" value={formatCount(summary?.contractedDeals ?? 0)} tone="success" />
          <StatCard label="Payments Posted" value={formatCount(summary?.paymentsPosted ?? 0)} />
          <StatCard label="Pipeline Net" value={formatMoney(summary?.pipelineNetAmount ?? 0)} />
        </section>
      )}

      <section className="space-y-3">
        <SegmentedControl<CarSalesRecordKind>
          value={activeView}
          options={OVERVIEW_OPTIONS}
          onChange={(value) => setActiveView(value)}
          aria-label="Auto sales view"
        />
        <CarSalesRecordsTable kind={activeView} />
      </section>
    </div>
  );
}

function CreateRecordDrawer({
  kind,
  open,
  onClose,
}: {
  kind: CarSalesRecordKind;
  open: boolean;
  onClose: () => void;
}) {
  if (kind === "leads") return <CreateLeadDrawer open={open} onClose={onClose} />;
  if (kind === "inventory") return <CreateVehicleDrawer open={open} onClose={onClose} />;
  if (kind === "deals") return <CreateDealDrawer open={open} onClose={onClose} />;
  return <CreatePaymentDrawer open={open} onClose={onClose} />;
}

const initialLeadForm = {
  customerName: "",
  phone: "",
  email: "",
  source: "WALK_IN",
  vehicleInterest: "",
  budgetMin: "",
  budgetMax: "",
  notes: "",
};

function CreateLeadDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState(initialLeadForm);
  const mutation = useMutation({
    mutationFn: async (payload: typeof initialLeadForm) =>
      fetchJson("/api/v2/autos/leads", {
        method: "POST",
        body: JSON.stringify({
          customerName: payload.customerName,
          phone: payload.phone,
          email: payload.email || null,
          source: payload.source || undefined,
          vehicleInterest: payload.vehicleInterest || null,
          budgetMin: payload.budgetMin ? Number(payload.budgetMin) : null,
          budgetMax: payload.budgetMax ? Number(payload.budgetMax) : null,
          notes: payload.notes || null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autos"] });
      setForm(initialLeadForm);
      onClose();
    },
  });

  const close = () => {
    mutation.reset();
    setForm(initialLeadForm);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Add Lead"
      subtitle="Capture the customer and vehicle interest."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="autos-create-lead" loading={mutation.isPending}>
            Create Lead
          </Button>
        </>
      }
    >
      <form
        id="autos-create-lead"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(form);
        }}
      >
        {mutation.error ? (
          <Alert tone="danger" title="Unable to create lead">
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}
        <Field label="Customer name" required>
          <Input
            value={form.customerName}
            onChange={(event) => setForm((current) => ({ ...current, customerName: event.currentTarget.value }))}
            required
          />
        </Field>
        <Field label="Phone" required>
          <Input
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.currentTarget.value }))}
            required
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.currentTarget.value }))}
          />
        </Field>
        <Field label="Source">
          <Input
            value={form.source}
            onChange={(event) => setForm((current) => ({ ...current, source: event.currentTarget.value }))}
          />
        </Field>
        <Field label="Vehicle interest">
          <Input
            value={form.vehicleInterest}
            onChange={(event) => setForm((current) => ({ ...current, vehicleInterest: event.currentTarget.value }))}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Budget min">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.budgetMin}
              onChange={(event) => setForm((current) => ({ ...current, budgetMin: event.currentTarget.value }))}
            />
          </Field>
          <Field label="Budget max">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.budgetMax}
              onChange={(event) => setForm((current) => ({ ...current, budgetMax: event.currentTarget.value }))}
            />
          </Field>
        </div>
        <Field label="Notes">
          <TextArea
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.currentTarget.value }))}
          />
        </Field>
      </form>
    </Drawer>
  );
}

const initialVehicleForm = {
  vin: "",
  make: "",
  model: "",
  year: "",
  color: "",
  mileageKm: "",
  acquisitionCost: "",
  listingPrice: "",
  minApprovalPrice: "",
};

function CreateVehicleDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState(initialVehicleForm);
  const mutation = useMutation({
    mutationFn: async (payload: typeof initialVehicleForm) =>
      fetchJson("/api/v2/autos/inventory", {
        method: "POST",
        body: JSON.stringify({
          vin: payload.vin,
          make: payload.make,
          model: payload.model,
          year: Number(payload.year),
          color: payload.color || null,
          mileageKm: payload.mileageKm ? Number(payload.mileageKm) : null,
          acquisitionCost: payload.acquisitionCost ? Number(payload.acquisitionCost) : undefined,
          listingPrice: Number(payload.listingPrice),
          minApprovalPrice: Number(payload.minApprovalPrice),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autos"] });
      setForm(initialVehicleForm);
      onClose();
    },
  });

  const close = () => {
    mutation.reset();
    setForm(initialVehicleForm);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Add Vehicle"
      subtitle="Add stock details and approval pricing."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="autos-create-vehicle" loading={mutation.isPending}>
            Create Vehicle
          </Button>
        </>
      }
    >
      <form
        id="autos-create-vehicle"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(form);
        }}
      >
        {mutation.error ? (
          <Alert tone="danger" title="Unable to create vehicle">
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}
        <Field label="VIN" required>
          <Input
            value={form.vin}
            onChange={(event) => setForm((current) => ({ ...current, vin: event.currentTarget.value }))}
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Make" required>
            <Input
              value={form.make}
              onChange={(event) => setForm((current) => ({ ...current, make: event.currentTarget.value }))}
              required
            />
          </Field>
          <Field label="Model" required>
            <Input
              value={form.model}
              onChange={(event) => setForm((current) => ({ ...current, model: event.currentTarget.value }))}
              required
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Year" required>
            <Input
              type="number"
              min="1950"
              max="2100"
              value={form.year}
              onChange={(event) => setForm((current) => ({ ...current, year: event.currentTarget.value }))}
              required
            />
          </Field>
          <Field label="Color">
            <Input
              value={form.color}
              onChange={(event) => setForm((current) => ({ ...current, color: event.currentTarget.value }))}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Mileage km">
            <Input
              type="number"
              min="0"
              value={form.mileageKm}
              onChange={(event) => setForm((current) => ({ ...current, mileageKm: event.currentTarget.value }))}
            />
          </Field>
          <Field label="Acquisition cost">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.acquisitionCost}
              onChange={(event) => setForm((current) => ({ ...current, acquisitionCost: event.currentTarget.value }))}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Listing price" required>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.listingPrice}
              onChange={(event) => setForm((current) => ({ ...current, listingPrice: event.currentTarget.value }))}
              required
            />
          </Field>
          <Field label="Approval floor" required>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.minApprovalPrice}
              onChange={(event) => setForm((current) => ({ ...current, minApprovalPrice: event.currentTarget.value }))}
              required
            />
          </Field>
        </div>
      </form>
    </Drawer>
  );
}

const initialDealForm = {
  leadId: "",
  vehicleId: "",
  customerName: "",
  customerPhone: "",
  quoteAmount: "",
  discountAmount: "",
  taxAmount: "",
  reservedUntil: "",
  notes: "",
};

function CreateDealDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState(initialDealForm);
  const leadsQuery = useQuery({
    queryKey: ["autos", "deal-lead-options"],
    queryFn: () => fetchAutosLeads({ page: 1, limit: 100 }),
    enabled: open,
  });
  const vehiclesQuery = useQuery({
    queryKey: ["autos", "deal-vehicle-options"],
    queryFn: () => fetchAutosInventory({ page: 1, limit: 100, status: "IN_STOCK" }),
    enabled: open,
  });
  const mutation = useMutation({
    mutationFn: async (payload: typeof initialDealForm) =>
      fetchJson("/api/v2/autos/deals", {
        method: "POST",
        body: JSON.stringify({
          leadId: payload.leadId || null,
          vehicleId: payload.vehicleId,
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          quoteAmount: Number(payload.quoteAmount),
          discountAmount: payload.discountAmount ? Number(payload.discountAmount) : undefined,
          taxAmount: payload.taxAmount ? Number(payload.taxAmount) : undefined,
          reservedUntil: payload.reservedUntil ? new Date(payload.reservedUntil).toISOString() : null,
          notes: payload.notes || null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autos"] });
      setForm(initialDealForm);
      onClose();
    },
  });

  const close = () => {
    mutation.reset();
    setForm(initialDealForm);
    onClose();
  };

  const leads = leadsQuery.data?.data ?? [];
  const vehicles = vehiclesQuery.data?.data ?? [];

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Create Deal"
      subtitle="Quote or reserve an available vehicle."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="autos-create-deal" loading={mutation.isPending}>
            Create Deal
          </Button>
        </>
      }
    >
      <form
        id="autos-create-deal"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(form);
        }}
      >
        {mutation.error ? (
          <Alert tone="danger" title="Unable to create deal">
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}
        <Field label="Lead">
          <Select
            value={form.leadId}
            options={[
              { value: "", label: "No linked lead" },
              ...leads.map((lead) => ({
                value: lead.id,
                label: `${lead.leadNo} - ${lead.customerName}`,
              })),
            ]}
            onChange={(event) => {
              const leadId = event.currentTarget.value;
              const lead = leads.find((item) => item.id === leadId);
              setForm((current) => ({
                ...current,
                leadId,
                customerName: lead?.customerName || current.customerName,
                customerPhone: lead?.phone || current.customerPhone,
              }));
            }}
          />
        </Field>
        <Field label="Vehicle" required>
          <Select
            value={form.vehicleId}
            options={[
              { value: "", label: vehiclesQuery.isLoading ? "Loading vehicles..." : "Select a vehicle" },
              ...vehicles.map((vehicle) => ({
                value: vehicle.id,
                label: `${vehicle.stockNo} - ${vehicle.make} ${vehicle.model} (${vehicle.year})`,
              })),
            ]}
            onChange={(event) => setForm((current) => ({ ...current, vehicleId: event.currentTarget.value }))}
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer name" required>
            <Input
              value={form.customerName}
              onChange={(event) => setForm((current) => ({ ...current, customerName: event.currentTarget.value }))}
              required
            />
          </Field>
          <Field label="Customer phone" required>
            <Input
              value={form.customerPhone}
              onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.currentTarget.value }))}
              required
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Quote amount" required>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.quoteAmount}
              onChange={(event) => setForm((current) => ({ ...current, quoteAmount: event.currentTarget.value }))}
              required
            />
          </Field>
          <Field label="Discount">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.discountAmount}
              onChange={(event) => setForm((current) => ({ ...current, discountAmount: event.currentTarget.value }))}
            />
          </Field>
          <Field label="Tax">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.taxAmount}
              onChange={(event) => setForm((current) => ({ ...current, taxAmount: event.currentTarget.value }))}
            />
          </Field>
        </div>
        <Field label="Reserve until">
          <Input
            type="datetime-local"
            value={form.reservedUntil}
            onChange={(event) => setForm((current) => ({ ...current, reservedUntil: event.currentTarget.value }))}
          />
        </Field>
        <Field label="Notes">
          <TextArea
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.currentTarget.value }))}
          />
        </Field>
      </form>
    </Drawer>
  );
}

const initialPaymentForm = {
  dealId: "",
  paymentDate: formatDateTimeLocal(),
  paymentMethod: "CASH" as AutosPayment["paymentMethod"],
  amount: "",
  reference: "",
  notes: "",
};

function CreatePaymentDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState(initialPaymentForm);
  const dealsQuery = useQuery({
    queryKey: ["autos", "payment-deal-options"],
    queryFn: () => fetchAutosDeals({ page: 1, limit: 100 }),
    enabled: open,
  });
  const mutation = useMutation({
    mutationFn: async (payload: typeof initialPaymentForm) =>
      fetchJson("/api/v2/autos/financing", {
        method: "POST",
        body: JSON.stringify({
          dealId: payload.dealId,
          paymentDate: new Date(payload.paymentDate).toISOString(),
          paymentMethod: payload.paymentMethod,
          amount: Number(payload.amount),
          reference: payload.reference || null,
          notes: payload.notes || null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autos"] });
      setForm({ ...initialPaymentForm, paymentDate: formatDateTimeLocal() });
      onClose();
    },
  });

  const close = () => {
    mutation.reset();
    setForm({ ...initialPaymentForm, paymentDate: formatDateTimeLocal() });
    onClose();
  };

  const deals = dealsQuery.data?.data ?? [];

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Post Payment"
      subtitle="Record an offline payment against an active deal."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="autos-create-payment" loading={mutation.isPending}>
            Post Payment
          </Button>
        </>
      }
    >
      <form
        id="autos-create-payment"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(form);
        }}
      >
        {mutation.error ? (
          <Alert tone="danger" title="Unable to post payment">
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}
        <Field label="Deal" required>
          <Select
            value={form.dealId}
            options={[
              { value: "", label: dealsQuery.isLoading ? "Loading deals..." : "Select a deal" },
              ...deals.map((deal) => ({
                value: deal.id,
                label: `${deal.dealNo} - ${deal.customerName} (${formatMoney(deal.balanceAmount)} due)`,
              })),
            ]}
            onChange={(event) => setForm((current) => ({ ...current, dealId: event.currentTarget.value }))}
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Payment date" required>
            <Input
              type="datetime-local"
              value={form.paymentDate}
              onChange={(event) => setForm((current) => ({ ...current, paymentDate: event.currentTarget.value }))}
              required
            />
          </Field>
          <Field label="Method" required>
            <Select
              value={form.paymentMethod}
              options={PAYMENT_METHODS}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  paymentMethod: event.currentTarget.value as AutosPayment["paymentMethod"],
                }))
              }
              required
            />
          </Field>
        </div>
        <Field label="Amount" required>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(event) => setForm((current) => ({ ...current, amount: event.currentTarget.value }))}
            required
          />
        </Field>
        <Field label="Reference">
          <Input
            value={form.reference}
            onChange={(event) => setForm((current) => ({ ...current, reference: event.currentTarget.value }))}
          />
        </Field>
        <Field label="Notes">
          <TextArea
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.currentTarget.value }))}
          />
        </Field>
      </form>
    </Drawer>
  );
}
