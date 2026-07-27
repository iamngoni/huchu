import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { can, denialMessage } from "@/lib/crm/permissions";
import { catalogItemSchema } from "@/lib/crm/catalogue";

const updateSchema = catalogItemSchema.partial();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;
    const companyId = session.user.companyId;
    const { id } = await params;

    if (!can(session, "settings.manage")) {
      return errorResponse(denialMessage("settings.manage"), 403);
    }

    const existing = await prisma.crmCatalogItem.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!existing) return errorResponse("Catalogue item not found", 404);

    const data = updateSchema.parse(await request.json());

    const item = await prisma.$transaction(async (tx) => {
      // Tiers are replaced wholesale rather than diffed: the set is small, and
      // a half-applied tier change would price things wrongly in a way nobody
      // would notice until an invoice went out.
      if (data.tiers) {
        await tx.crmPriceTier.deleteMany({ where: { catalogItemId: id } });
        if (data.tiers.length) {
          await tx.crmPriceTier.createMany({
            data: data.tiers.map((tier) => ({
              companyId,
              catalogItemId: id,
              minQuantity: tier.minQuantity,
              unitPrice: tier.unitPrice,
            })),
          });
        }
      }

      return tx.crmCatalogItem.update({
        where: { id },
        data: {
          code: data.code,
          name: data.name,
          description: data.description,
          category: data.category,
          kind: data.kind,
          unit: data.unit,
          unitPrice: data.unitPrice,
          currency: data.currency,
          taxRate: data.taxRate,
          costPrice: data.costPrice,
          maxDiscountPercent: data.maxDiscountPercent,
          isActive: data.isActive,
        },
        include: { tiers: { orderBy: { minQuantity: "asc" } } },
      });
    });

    return successResponse(item);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation failed", 400, error.issues);
    console.error("[API] PATCH /api/v2/crm/catalog/[id] error:", error);
    return errorResponse("Failed to update the catalogue item");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;
    const { id } = await params;

    if (!can(session, "settings.manage")) {
      return errorResponse(denialMessage("settings.manage"), 403);
    }

    const existing = await prisma.crmCatalogItem.findFirst({
      where: { id, companyId: session.user.companyId },
      select: { id: true },
    });
    if (!existing) return errorResponse("Catalogue item not found", 404);

    // Retired rather than deleted: quotes already sent name this item, and the
    // history should still say what was sold.
    const item = await prisma.crmCatalogItem.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, isActive: true },
    });

    return successResponse(item);
  } catch (error) {
    console.error("[API] DELETE /api/v2/crm/catalog/[id] error:", error);
    return errorResponse("Failed to retire the catalogue item");
  }
}
