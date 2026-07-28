import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { blockSchema, fieldBlocks } from "@/lib/crm/blocks";

const submitSchema = z.object({
  answers: z.record(z.string().max(60), z.unknown()),
});

/**
 * Public: somebody filled a form in.
 *
 * Required questions are checked here rather than only in the browser, because
 * the browser is not where the guarantee lives — anybody can post to this URL,
 * and a form that only validates client-side collects half-empty rows the
 * moment somebody tries.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const template = await prisma.crmTemplate.findFirst({
    where: { publicToken: token, isActive: true, kind: "FORM" },
    select: { id: true, companyId: true, name: true, blocks: true, attributes: true },
  });

  if (!template) {
    return NextResponse.json({ ok: false, error: "Form not found" }, { status: 404 });
  }

  let body: z.infer<typeof submitSchema>;
  try {
    body = submitSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed submission" }, { status: 400 });
  }

  const blocks = z.array(blockSchema).safeParse(template.blocks);
  if (!blocks.success) {
    return NextResponse.json({ ok: false, error: "Form is misconfigured" }, { status: 500 });
  }

  const questions = fieldBlocks(blocks.data);
  const missing = questions
    .filter((question) => {
      if (!question.required) return false;
      const answer = body.answers[question.key];
      if (answer === undefined || answer === null || answer === "") return true;
      return Array.isArray(answer) && answer.length === 0;
    })
    .map((question) => question.label || question.key);

  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Still needed: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  // Only the questions the form asked are kept. A payload with extra keys is
  // either an old cached form or somebody poking at it; neither is a reason to
  // write unknown columns into a record.
  const known = new Set(questions.map((question) => question.key));
  const answers = Object.fromEntries(
    Object.entries(body.answers).filter(([key]) => known.has(key)),
  );

  await prisma.$transaction([
    prisma.crmTemplateEvent.create({
      data: {
        companyId: template.companyId,
        templateId: template.id,
        type: "SUBMIT",
        source: "public",
        payload: answers as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.crmTemplate.update({
      where: { id: template.id },
      data: { submitCount: { increment: 1 }, lastSubmitAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
