"use client";

import { useEffect, useMemo, useState } from "react";
import { LuChevronDown, LuChevronRight, LuRefreshCcw } from "react-icons/lu";

import { PageHeader } from "@/components/page-header";
import { TicketDrawer } from "@/components/analysis/ticket-drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { HierarchyNode, HierarchyResponse, HierarchyTicket } from "@/lib/types";

const DEPTS = [
  { id: "136328001653862461", label: "Customer Success (current)" },
  { id: "136328000001544057", label: "Technical Support — T3 (legacy)" },
] as const;

function nodePath(...parts: string[]): string {
  return parts.join("›");
}

function NodeRow({
  node,
  depth,
  expanded,
  onToggle,
  onPickTicket,
  parentPath,
}: {
  node: HierarchyNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onPickTicket: (t: HierarchyTicket) => void;
  parentPath: string;
}) {
  const path = nodePath(parentPath, node.label);
  const isOpen = expanded.has(path);
  const hasChildren = (node.children && node.children.length > 0) || (node.tickets && node.tickets.length > 0);
  const indent = { paddingLeft: `${depth * 1.25}rem` };
  return (
    <>
      <button
        type="button"
        onClick={() => hasChildren && onToggle(path)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/60"
        style={indent}
      >
        {hasChildren ? (
          isOpen ? <LuChevronDown className="size-3.5 shrink-0 text-muted-foreground" /> : <LuChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <span className="size-3.5 shrink-0" />
        )}
        <span className="truncate font-medium">{node.label}</span>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          {node.count}
        </Badge>
      </button>

      {isOpen && node.children?.map((child) => (
        <NodeRow
          key={child.label}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          onPickTicket={onPickTicket}
          parentPath={path}
        />
      ))}

      {isOpen && node.tickets?.map((t) => (
        <button
          type="button"
          key={`${t.analysis_id}-${t.ticket_id}`}
          onClick={() => onPickTicket(t)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          style={{ paddingLeft: `${(depth + 1) * 1.25}rem` }}
        >
          <span className="size-3.5 shrink-0" />
          <span className="font-mono">#{t.ticket_number ?? t.ticket_id}</span>
          <span className="truncate">{t.subject ?? "(no subject)"}</span>
          {t.source === "agent_labels" ? (
            <Badge variant="outline" className="ml-auto shrink-0 text-[9px]">
              agent
            </Badge>
          ) : t.confidence != null ? (
            <Badge
              variant={t.confidence < 0.6 ? "destructive" : "outline"}
              className="ml-auto shrink-0 text-[9px]"
            >
              {Math.round(t.confidence * 100)}%
            </Badge>
          ) : null}
        </button>
      ))}
    </>
  );
}

export default function HierarchyPage() {
  const [deptId, setDeptId] = useState<string>(DEPTS[0].id);
  const [data, setData] = useState<HierarchyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<{ analysisId: number; ticketId: string } | null>(null);

  const load = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getHierarchy(id);
      setData(res);
      // Auto-expand the top-level origins so the page isn't blank on load.
      setExpanded(new Set(res.tree.map((n) => nodePath("", n.label))));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load hierarchy");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(deptId);
  }, [deptId]);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const summary = useMemo(() => {
    if (!data) return null;
    return `${data.total_tickets} tickets · ${data.label_only_tickets} from agent labels · ${data.classifier_tickets} from classifier`;
  }, [data]);

  return (
    <>
      <PageHeader
        eyebrow="Issue volume"
        title="Issue-type hierarchy by department"
        description="Tickets grouped by inferred (or agent-labeled) issue type. Drill down to spot the dominant categories on each dept and click any ticket to open the full analysis."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => void load(deptId)}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <LuRefreshCcw className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          {DEPTS.map((d) => (
            <Button
              key={d.id}
              variant={d.id === deptId ? "default" : "outline"}
              size="sm"
              onClick={() => setDeptId(d.id)}
            >
              {d.label}
            </Button>
          ))}
          {summary ? (
            <span className="ml-auto text-xs text-muted-foreground">{summary}</span>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading && !data ? (
          <Skeleton className="h-96 w-full" />
        ) : !data || data.tree.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              No classified tickets for this department yet. Run the backfill
              script to populate it.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col gap-0.5 p-3">
              {data.tree.map((node) => (
                <NodeRow
                  key={node.label}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggle}
                  onPickTicket={(t) =>
                    setDrawer({ analysisId: t.analysis_id, ticketId: t.ticket_id })
                  }
                  parentPath=""
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <TicketDrawer
        analysisId={drawer?.analysisId ?? 0}
        ticketId={drawer?.ticketId ?? null}
        open={drawer !== null}
        onOpenChange={(o) => {
          if (!o) setDrawer(null);
        }}
      />
    </>
  );
}
