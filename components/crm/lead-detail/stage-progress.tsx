"use client";

import type { CrmLeadStage } from "@prisma/client";

import { CRM_LEAD_STAGES, CRM_STAGE_LABELS } from "@/lib/crm/pipeline";
import { cn } from "@/lib/utils";

// Won and Lost are outcomes, not steps along the way — the stepper shows the
// path, and the two terminal stages sit apart from it.
const PATH_STAGES: CrmLeadStage[] = CRM_LEAD_STAGES.filter(
  (stage) => stage !== "WON" && stage !== "LOST",
);

export function StageProgress({
  stage,
  onChange,
  disabled,
}: {
  stage: CrmLeadStage;
  onChange: (stage: CrmLeadStage) => void;
  disabled?: boolean;
}) {
  const isClosed = stage === "WON" || stage === "LOST";
  const currentIndex = PATH_STAGES.indexOf(stage);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {PATH_STAGES.map((entry, index) => {
        const isCurrent = entry === stage;
        const isPast = !isClosed && currentIndex > index;
        return (
          <button
            key={entry}
            type="button"
            disabled={disabled}
            onClick={() => onChange(entry)}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "rounded-[var(--button-radius)] px-2.5 py-1 text-xs font-medium transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-60",
              isCurrent
                ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-text)]"
                : isPast
                  ? "bg-[var(--surface-subtle)] text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)]",
            )}
          >
            {CRM_STAGE_LABELS[entry]}
          </button>
        );
      })}

      <span className="mx-1 h-4 w-px bg-[var(--border)]" />

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("WON")}
        className={cn(
          "rounded-[var(--button-radius)] px-2.5 py-1 text-xs font-medium transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-60",
          stage === "WON"
            ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
            : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)]",
        )}
      >
        Won
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("LOST")}
        className={cn(
          "rounded-[var(--button-radius)] px-2.5 py-1 text-xs font-medium transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-60",
          stage === "LOST"
            ? "bg-[var(--status-error-bg)] text-[var(--status-error-text)]"
            : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)]",
        )}
      >
        Lost
      </button>
    </div>
  );
}
