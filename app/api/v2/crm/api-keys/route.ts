import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/crm/api-keys";
import { requireCrmManager } from "../_helpers";

const createSchema = z.object({ name: z.string().trim().min(1).max(120) });

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;
    if (!requireCrmManager(session)) return errorResponse("Manager access required", 403);

    const keys = await prisma.crmApiKey.findMany({
      where: { companyId: session.user.companyId },
      select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, revokedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return successResponse({ data: keys });
  } catch (error) {
    console.error("[API] GET /api/v2/crm/api-keys error:", error);
    return errorResponse("Failed to fetch API keys");
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;
    if (!requireCrmManager(session)) return errorResponse("Manager access required", 403);

    const { name } = createSchema.parse(await request.json());
    const { key, prefix, hash } = generateApiKey();

    const created = await prisma.crmApiKey.create({
      data: {
        companyId: session.user.companyId,
        name,
        keyPrefix: prefix,
        keyHash: hash,
        createdById: session.user.id,
      },
      select: { id: true, name: true, keyPrefix: true, createdAt: true },
    });

    // Plaintext key is returned exactly once.
    return successResponse({ ...created, key }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation failed", 400, error.issues);
    console.error("[API] POST /api/v2/crm/api-keys error:", error);
    return errorResponse("Failed to create API key");
  }
}
