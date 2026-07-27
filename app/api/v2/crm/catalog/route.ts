import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { can, denialMessage } from "@/lib/crm/permissions";
import { catalogItemSchema } from "@/lib/crm/catalogue";

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const category = searchParams.get("category")?.trim();
    const includeInactive = searchParams.get("includeInactive") === "1";

    const items = await prisma.crmCatalogItem.findMany({
      where: {
        companyId: session.user.companyId,
        ...(includeInactive ? {} : { isActive: true }),
        ...(category ? { category } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { code: { contains: q, mode: "insensitive" as const } },
                { description: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      include: { tiers: { orderBy: { minQuantity: "asc" } } },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      take: 200,
    });

    return successResponse({ data: items });
  } catch (error) {
    console.error("[API] GET /api/v2/crm/catalog error:", error);
    return errorResponse("Failed to fetch the catalogue");
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;
    const companyId = session.user.companyId;

    if (!can(session, "settings.manage")) {
      return errorResponse(denialMessage("settings.manage"), 403);
    }

    const data = catalogItemSchema.parse(await request.json());

    const clash = await prisma.crmCatalogItem.findFirst({
      where: { companyId, code: data.code },
      select: { id: true },
    });
    if (clash) return errorResponse(`Code "${data.code}" is already in use`, 409);

    const item = await prisma.crmCatalogItem.create({
      data: {
        companyId,
        code: data.code,
        name: data.name,
        description: data.description ?? undefined,
        category: data.category ?? undefined,
        kind: data.kind ?? "SERVICE",
        unit: data.unit ?? undefined,
        unitPrice: data.unitPrice,
        currency: data.currency ?? "USD",
        taxRate: data.taxRate ?? 0,
        costPrice: data.costPrice ?? undefined,
        maxDiscountPercent: data.maxDiscountPercent ?? undefined,
        isActive: data.isActive ?? true,
        createdById: session.user.id,
        tiers: data.tiers?.length
          ? {
              create: data.tiers.map((tier) => ({
                companyId,
                minQuantity: tier.minQuantity,
                unitPrice: tier.unitPrice,
              })),
            }
          : undefined,
      },
      include: { tiers: { orderBy: { minQuantity: "asc" } } },
    });

    return successResponse(item, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation failed", 400, error.issues);
    console.error("[API] POST /api/v2/crm/catalog error:", error);
    return errorResponse("Failed to create the catalogue item");
  }
}
