"use client";

import { LuCheck, LuLoader, LuX } from "react-icons/lu";
import { cn } from "@/lib/utils";
import type { TicketStage } from "@/lib/types";

const ORDER: TicketStage[] = [
  "fetching",
  "cleaning",
  "classifying",
  "completed",
];

const LABELS: Record<TicketStage, string> = {
  pending: "Queued",
  fetching: "Fetch",
  cleaning: "Clean",
  classifying: "Classify",
  completed: "Done",
  failed: "Failed",
};

function stageIndex(s: TicketStage | null | undefined): number {
  if (!s || s === "pending") return -1;
  if (s === "failed") return -1;
  const i = ORDER.indexOf(s);
  return i;
}

export function PipelineStages({
  stage,
  failed,
  compact = false,
}: {
  stage: TicketStage | null | undefined;
  failed?: boolean;
  compact?: boolean;
}) {
  const current = stageIndex(stage);
  return (
    <div
      className={cn(
        "flex items-center gap-1.5",
        compact ? "text-[10px]" : "text-xs"
      )}
    >
      {ORDER.map((s, i) => {
        const isDone = !failed && (current > i || stage === "completed");
        const isActive = !failed && stage === s && s !== "completed";
        const isFailed = failed && s !== "completed";
        return (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className={cn(
                "flex items-center gap-1 rounded-full border px-1.5 py-0.5 transition-colors",
                isDone && "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                isActive && "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
                isFailed && "border-destructive/40 bg-destructive/10 text-destructive",
                !isDone && !isActive && !isFailed && "border-dashed text-muted-foreground"
              )}
            >
              {isDone ? (
                <LuCheck className="size-3" />
              ) : isActive ? (
                <LuLoader className="size-3 animate-spin" />
              ) : isFailed ? (
                <LuX className="size-3" />
              ) : (
                <span className="size-1.5 rounded-full bg-current opacity-50" />
              )}
              {!compact ? <span>{LABELS[s]}</span> : null}
            </div>
            {i < ORDER.length - 1 ? (
              <div
                className={cn(
                  "h-px w-3 bg-border",
                  isDone && "bg-emerald-500/40"
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
