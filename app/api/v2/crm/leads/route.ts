import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  errorResponse,
  getPaginationParams,
  paginationResponse,
  successResponse,
  validateSession,
} from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { reserveIdentifier } from "@/lib/id-generator";
import { defaultProbabilityForStage } from "@/lib/crm/pipeline";
import { deriveLeadChannel } from "@/lib/crm/sources";
import { crmLeadStageSchema, isCompanyUser } from "../_helpers";

const createLeadSchema = z.object({
  title: z.string().trim().max(200).nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  contactName: z.string().trim().max(200).nullable().optional(),
  contactEmail: z.string().trim().email().max(200).nullable().optional(),
  contactPhone: z.string().trim().max(40).nullable().optional(),
  stage: crmLeadStageSchema.optional(),
  estimatedValue: z.number().finite().nonnegative().nullable().optional(),
  currency: z.string().trim().max(10).optional(),
  services: z.array(z.string().trim().max(80)).max(40).optional(),
  source: z.string().trim().max(120).nullable().optional(),
  sourceChannel: z.string().trim().max(20).nullable().optional(),
  utmSource: z.string().trim().max(120).nullable().optional(),
  utmMedium: z.string().trim().max(120).nullable().optional(),
  utmCampaign: z.string().trim().max(120).nullable().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const assignedToId = searchParams.get("assignedToId");
    const source = searchParams.get("source");
    const channel = searchParams.get("channel");
    const search = searchParams.get("q")?.trim();
    const { page, limit, skip } = getPaginationParams(request);

    const where: Prisma.CrmLeadWhereInput = {
      companyId: session.user.companyId,
      ...(stage ? { stage: stage as Prisma.CrmLeadWhereInput["stage"] } : {}),
      ...(assignedToId ? { assignedToId } : {}),
      ...(source ? { source } : {}),
      ...(channel ? { sourceChannel: channel as Prisma.CrmLeadWhereInput["sourceChannel"] } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { leadNo: { contains: search, mode: "insensitive" } },
              { contactName: { contains: search, mode: "insensitive" } },
              { client: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [leads, total] = await Promise.all([
      prisma.crmLead.findMany({
        where,
        include: { client: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true } } },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.crmLead.count({ where }),
    ]);

    return successResponse(paginationResponse(leads, total, page, limit));
  } catch (error) {
    console.error("[API] GET /api/v2/crm/leads error:", error);
    return errorResponse("Failed to fetch leads");
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const data = createLeadSchema.parse(await request.json());
    const stage = data.stage ?? "NEW";

    if (data.clientId) {
      const client = await prisma.crmClient.findFirst({
        where: { id: data.clientId, companyId: session.user.companyId },
        select: { id: true },
      });
      if (!client) return errorResponse("Invalid client", 400);
    }
    if (!(await isCompanyUser(session.user.companyId, data.assignedToId))) {
      return errorResponse("Invalid assignee", 400);
    }

    const leadNo = await reserveIdentifier(prisma, {
      companyId: session.user.companyId,
      entity: "CRM_LEAD",
    });

    const lead = await prisma.crmLead.create({
      data: {
        companyId: session.user.companyId,
        leadNo,
        title: data.title ?? undefined,
        clientId: data.clientId ?? undefined,
        contactName: data.contactName ?? undefined,
        contactEmail: data.contactEmail ?? undefined,
        contactPhone: data.contactPhone ?? undefined,
        stage,
        probability: defaultProbabilityForStage(stage),
        estimatedValue: data.estimatedValue ?? undefined,
        currency: data.currency ?? "USD",
        services: data.services ?? [],
        source: data.source ?? undefined,
        sourceChannel: deriveLeadChannel({
          explicitChannel: data.sourceChannel,
          utmMedium: data.utmMedium,
          utmSource: data.utmSource,
          source: data.source,
          origin: "MANUAL",
        }),
        utmSource: data.utmSource ?? undefined,
        utmMedium: data.utmMedium ?? undefined,
        utmCampaign: data.utmCampaign ?? undefined,
        assignedToId: data.assignedToId ?? undefined,
        createdById: session.user.id,
      },
    });

    return successResponse(lead, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation failed", 400, error.issues);
    console.error("[API] POST /api/v2/crm/leads error:", error);
    return errorResponse("Failed to create lead");
  }
}
