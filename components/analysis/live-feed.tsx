"use client";

import { useMemo } from "react";
import {
  LuDownload,
  LuBrush,
  LuBrain,
  LuCheck,
  LuX,
  LuFlag,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import type { AnalysisEvent, AnalysisEventType } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

const ICONS: Partial<Record<AnalysisEventType, React.ComponentType<{ className?: string }>>> = {
  "analysis.started": LuFlag,
  "ticket.fetching": LuDownload,
  "ticket.fetched": LuDownload,
  "ticket.cleaning": LuBrush,
  "ticket.cleaned": LuBrush,
  "ticket.classifying": LuBrain,
  "ticket.completed": LuCheck,
  "ticket.failed": LuX,
  "analysis.completed": LuCheck,
  "analysis.failed": LuX,
};

const TONE: Partial<Record<AnalysisEventType, string>> = {
  "analysis.started": "text-blue-600 dark:text-blue-400",
  "ticket.fetching": "text-sky-600 dark:text-sky-400",
  "ticket.fetched": "text-sky-600 dark:text-sky-400",
  "ticket.cleaning": "text-amber-600 dark:text-amber-400",
  "ticket.cleaned": "text-amber-600 dark:text-amber-400",
  "ticket.classifying": "text-violet-600 dark:text-violet-400",
  "ticket.completed": "text-emerald-600 dark:text-emerald-400",
  "ticket.failed": "text-destructive",
  "analysis.completed": "text-emerald-600 dark:text-emerald-400",
  "analysis.failed": "text-destructive",
};

function describe(evt: AnalysisEvent): string {
  const d = evt.data as Record<string, unknown>;
  const tn = d.ticket_number ? `#${d.ticket_number}` : d.ticket_id ? String(d.ticket_id).slice(-6) : "";
  switch (evt.type) {
    case "analysis.started":
      return `Analysis started — ${d.total} ticket${d.total === 1 ? "" : "s"} queued`;
    case "ticket.fetching":
      return `Fetching ticket ${tn}`;
    case "ticket.fetched":
      return `Got ${d.comment_count ?? 0} comments for ${tn} · ${String(d.subject ?? "").slice(0, 80)}`;
    case "ticket.cleaning":
      return `Cleaning ${tn}`;
    case "ticket.cleaned": {
      const labels = (d.labels ?? {}) as Record<string, unknown>;
      const label = labels.t3_issue_origin ?? "(no label)";
      return `Normalized ${tn} · agent labeled as “${label}”`;
    }
    case "ticket.classifying":
      return `AI classifying ${tn}`;
    case "ticket.completed": {
      const c = (d.classification ?? {}) as Record<string, unknown>;
      const origin = c.inferred_issue_origin ?? "?";
      const res = c.inferred_issue_resolution ?? "?";
      const conf = typeof c.confidence === "number" ? `${Math.round(c.confidence * 100)}%` : "—";
      return `Classified ${tn} · ${origin} → ${res} · ${conf}`;
    }
    case "ticket.failed":
      return `Failed ${tn}: ${String(d.error ?? "unknown")}`;
    case "analysis.completed":
      return `Run complete`;
    case "analysis.failed":
      return `Run failed`;
    default:
      return evt.type;
  }
}

export function LiveFeed({ events }: { events: AnalysisEvent[] }) {
  const items = useMemo(() => [...events].reverse(), [events]);
  return (
    <ScrollArea className="h-[calc(100svh-260px)] pr-2">
      <ol className="space-y-1.5">
        {items.length === 0 ? (
          <li className="py-6 text-center text-sm text-muted-foreground">
            Waiting for events…
          </li>
        ) : (
          items.map((evt, idx) => {
            const Icon = ICONS[evt.type] ?? LuFlag;
            const tone = TONE[evt.type] ?? "text-muted-foreground";
            return (
              <li
                key={idx}
                className="flex items-start gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:bg-muted/40"
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", tone)} />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{describe(evt)}</div>
                </div>
                <div className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {evt.type.replace(/^(analysis|ticket)\./, "")}
                </div>
              </li>
            );
          })
        )}
      </ol>
    </ScrollArea>
  );
}
