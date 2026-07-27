import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import {
  errorResponse,
  getPaginationParams,
  paginationResponse,
  successResponse,
  validateSession,
} from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { reserveIdentifier } from "@/lib/id-generator";
import {
  createWorkOrderSchema,
  quoteLinesToWorkItems,
  type WorkOrderQueue,
} from "@/lib/crm/work-orders";
import { isCompanyUser } from "../_helpers";

const QUEUES: WorkOrderQueue[] = [
  "TODAY",
  "SCHEDULED",
  "IN_PROGRESS",
  "BLOCKED",
  "MINE",
  "DONE",
];

function queueWhere(
  queue: WorkOrderQueue,
  companyId: string,
  userId: string,
): Prisma.CrmWorkOrderWhereInput {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  switch (queue) {
    case "TODAY":
      // Anything that should already have started counts as today's problem,
      // the same way an overdue task does.
      return {
        companyId,
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        scheduledStart: { lte: endOfDay },
      };
    case "SCHEDULED":
      return { companyId, status: "SCHEDULED" };
    case "IN_PROGRESS":
      return { companyId, status: "IN_PROGRESS" };
    case "BLOCKED":
      return { companyId, status: "BLOCKED" };
    case "MINE":
      return {
        companyId,
        assignedToId: userId,
        status: { in: ["SCHEDULED", "IN_PROGRESS", "BLOCKED"] },
      };
    case "DONE":
      return { companyId, status: "COMPLETED" };
    default:
      return { companyId };
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(request);
    const requested = searchParams.get("queue");
    const queue = QUEUES.find((value) => value === requested) ?? "TODAY";

    const where = {
      ...queueWhere(queue, session.user.companyId, session.user.id),
      ...(searchParams.get("dealId") ? { dealId: searchParams.get("dealId")! } : {}),
      ...(searchParams.get("siteId") ? { siteId: searchParams.get("siteId")! } : {}),
      ...(searchParams.get("clientId") ? { clientId: searchParams.get("clientId")! } : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.crmWorkOrder.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
          site: { select: { id: true, name: true, addressLine: true } },
          deal: { select: { id: true, dealNo: true, title: true } },
          items: { orderBy: { position: "asc" } },
        },
        orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.crmWorkOrder.count({ where }),
    ]);

    return successResponse(paginationResponse(orders, total, page, limit));
  } catch (error) {
    console.error("[API] GET /api/v2/crm/work-orders error:", error);
    return errorResponse("Failed to fetch work orders");
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;
    const companyId = session.user.companyId;

    const data = createWorkOrderSchema.parse(await request.json());

    if (!(await isCompanyUser(companyId, data.assignedToId))) {
      return errorResponse("Invalid assignee", 400);
    }
    for (const crewId of data.crewIds ?? []) {
      if (!(await isCompanyUser(companyId, crewId))) {
        return errorResponse("A crew member isn't in this company", 400);
      }
    }

    // Everything it hangs off has to be in this tenant.
    const checks: Array<[string, string | null | undefined, () => Promise<unknown>]> = [
      ["deal", data.dealId, () => prisma.crmDeal.findFirst({ where: { id: data.dealId!, companyId }, select: { id: true } })],
      ["company", data.clientId, () => prisma.crmClient.findFirst({ where: { id: data.clientId!, companyId }, select: { id: true } })],
      ["site", data.siteId, () => prisma.crmSite.findFirst({ where: { id: data.siteId!, companyId }, select: { id: true } })],
    ];
    for (const [label, id, check] of checks) {
      if (!id) continue;
      if (!(await check())) return errorResponse(`Invalid ${label}`, 400);
    }

    // The checklist can be lifted from the quote that was won rather than
    // retyped, which is where transcription errors come from.
    let items = data.items ?? [];
    if (data.documentId && items.length === 0) {
      const document = await prisma.crmLeadDocument.findFirst({
        where: { id: data.documentId, companyId },
        select: {
          id: true,
          quotation: { select: { lines: { select: { description: true, quantity: true } } } },
        },
      });
      if (!document) return errorResponse("Invalid document", 400);
      items = quoteLinesToWorkItems(document.quotation?.lines ?? []);
    }

    const workOrderNo = await reserveIdentifier(prisma, {
      companyId,
      entity: "CRM_WORK_ORDER",
    });

    const order = await prisma.crmWorkOrder.create({
      data: {
        companyId,
        workOrderNo,
        title: data.title,
        description: data.description ?? undefined,
        // A job with a slot booked is scheduled; without one it's still a plan.
        status: data.scheduledStart ? "SCHEDULED" : "DRAFT",
        priority: data.priority ?? "NORMAL",
        dealId: data.dealId ?? undefined,
        clientId: data.clientId ?? undefined,
        siteId: data.siteId ?? undefined,
        documentId: data.documentId ?? undefined,
        scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : undefined,
        scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : undefined,
        assignedToId: data.assignedToId ?? undefined,
        crewIds: data.crewIds ?? [],
        addressLine: data.addressLine ?? undefined,
        accessNotes: data.accessNotes ?? undefined,
        contactName: data.contactName ?? undefined,
        contactPhone: data.contactPhone ?? undefined,
        createdById: session.user.id,
        items: items.length
          ? {
              create: items.map((item, index) => ({
                companyId,
                position: index,
                description: item.description,
                quantity: item.quantity,
                unit: "unit" in item ? (item.unit ?? undefined) : undefined,
                productId:
                  "productId" in item ? (item.productId ?? undefined) : undefined,
                notes: "notes" in item ? (item.notes ?? undefined) : undefined,
              })),
            }
          : undefined,
      },
      include: {
        items: { orderBy: { position: "asc" } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    if (data.dealId) {
      await prisma.crmActivity.create({
        data: {
          companyId,
          type: "SYSTEM",
          dealId: data.dealId,
          subject: `Work order ${workOrderNo} raised`,
          metadata: { kind: "WORK_ORDER", workOrderId: order.id },
          createdById: session.user.id,
          occurredAt: new Date(),
        },
      });
    }

    return successResponse(order, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation failed", 400, error.issues);
    console.error("[API] POST /api/v2/crm/work-orders error:", error);
    return errorResponse("Failed to create the work order");
  }
}
