import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { canEditRecord } from "@/lib/crm/permissions";
import {
  WORK_ORDER_STATUS_LABELS,
  allowedTransitions,
  canTransition,
  completionBlockers,
  updateWorkOrderSchema,
} from "@/lib/crm/work-orders";
import { isCompanyUser } from "../../_helpers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;
    const { id } = await params;

    const order = await prisma.crmWorkOrder.findFirst({
      where: { id, companyId: session.user.companyId },
      include: {
        items: { orderBy: { position: "asc" } },
        assignedTo: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        site: { select: { id: true, name: true, addressLine: true, accessInstructions: true } },
        deal: { select: { id: true, dealNo: true, title: true } },
      },
    });
    if (!order) return errorResponse("Work order not found", 404);

    return successResponse({
      ...order,
      allowedTransitions: allowedTransitions(order.status),
    });
  } catch (error) {
    console.error("[API] GET /api/v2/crm/work-orders/[id] error:", error);
    return errorResponse("Failed to fetch the work order");
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;
    const companyId = session.user.companyId;
    const { id } = await params;

    const existing = await prisma.crmWorkOrder.findFirst({
      where: { id, companyId },
      include: { items: true },
    });
    if (!existing) return errorResponse("Work order not found", 404);

    // The crew on the job can update it; so can whoever it's assigned to.
    const onCrew = existing.crewIds.includes(session.user.id);
    if (!onCrew && !await canEditRecord(session, existing.assignedToId)) {
      return errorResponse("You're not on this job", 403);
    }

    const data = updateWorkOrderSchema.parse(await request.json());

    if (!(await isCompanyUser(companyId, data.assignedToId))) {
      return errorResponse("Invalid assignee", 400);
    }

    if (data.status && data.status !== existing.status) {
      if (!canTransition(existing.status, data.status)) {
        return NextResponse.json(
          {
            error: `A ${WORK_ORDER_STATUS_LABELS[existing.status].toLowerCase()} job can't move to ${WORK_ORDER_STATUS_LABELS[data.status].toLowerCase()}`,
            code: "INVALID_TRANSITION",
            allowed: allowedTransitions(existing.status).map((status) => ({
              value: status,
              label: WORK_ORDER_STATUS_LABELS[status],
            })),
          },
          { status: 409 },
        );
      }

      if (data.status === "COMPLETED") {
        // Progress and signature may arrive in the same request as the
        // completion, so the check runs against what things will be.
        const progress = new Map(
          (data.itemProgress ?? []).map((item) => [item.id, item.completedQuantity]),
        );
        const blockers = completionBlockers({
          items: existing.items.map((item) => ({
            quantity: item.quantity,
            completedQuantity: progress.get(item.id) ?? item.completedQuantity,
          })),
          signedByName: data.signedByName ?? existing.signedByName,
        });
        if (blockers.length > 0) {
          return NextResponse.json(
            { error: "This job isn't ready to close", code: "NOT_COMPLETE", blockers },
            { status: 409 },
          );
        }
      }

      if (data.status === "BLOCKED" && !data.blockedReason?.trim()) {
        return errorResponse("Say why it's blocked — that's the useful part", 400);
      }
    }

    const now = new Date();
    const order = await prisma.$transaction(async (tx) => {
      if (data.itemProgress?.length) {
        for (const item of data.itemProgress) {
          await tx.crmWorkOrderItem.updateMany({
            where: { id: item.id, workOrderId: id },
            data: { completedQuantity: item.completedQuantity },
          });
        }
      }

      // Items are replaced wholesale when a new list is sent, but never while
      // a crew is part-way through — that would throw away their progress.
      if (data.items && existing.status !== "IN_PROGRESS") {
        await tx.crmWorkOrderItem.deleteMany({ where: { workOrderId: id } });
        if (data.items.length) {
          await tx.crmWorkOrderItem.createMany({
            data: data.items.map((item, index) => ({
              companyId,
              workOrderId: id,
              position: index,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit ?? undefined,
              productId: item.productId ?? undefined,
              notes: item.notes ?? undefined,
            })),
          });
        }
      }

      return tx.crmWorkOrder.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : undefined,
          scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : undefined,
          assignedToId: data.assignedToId,
          crewIds: data.crewIds,
          addressLine: data.addressLine,
          accessNotes: data.accessNotes,
          contactName: data.contactName,
          contactPhone: data.contactPhone,
          blockedReason:
            data.status && data.status !== "BLOCKED" ? null : data.blockedReason,
          completionNotes: data.completionNotes,
          signedByName: data.signedByName,
          signatureUrl: data.signatureUrl,
          signedAt: data.signedByName ? now : undefined,
          customerRating: data.customerRating,
          startedAt:
            data.status === "IN_PROGRESS" && !existing.startedAt ? now : undefined,
          completedAt: data.status === "COMPLETED" ? now : undefined,
        },
        include: {
          items: { orderBy: { position: "asc" } },
          assignedTo: { select: { id: true, name: true } },
        },
      });
    });

    if (data.status && data.status !== existing.status && existing.dealId) {
      await prisma.crmActivity.create({
        data: {
          companyId,
          type: "SYSTEM",
          dealId: existing.dealId,
          subject: `Work order ${existing.workOrderNo}: ${WORK_ORDER_STATUS_LABELS[data.status].toLowerCase()}`,
          body: data.status === "BLOCKED" ? data.blockedReason : data.completionNotes,
          metadata: { kind: "WORK_ORDER", workOrderId: id, status: data.status },
          createdById: session.user.id,
          occurredAt: now,
        },
      });
    }

    return successResponse({ ...order, allowedTransitions: allowedTransitions(order.status) });
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation failed", 400, error.issues);
    console.error("[API] PATCH /api/v2/crm/work-orders/[id] error:", error);
    return errorResponse("Failed to update the work order");
  }
}
