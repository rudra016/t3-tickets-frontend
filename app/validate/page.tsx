"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LuRefreshCcw,
  LuSparkles,
  LuCircleAlert,
  LuCheck,
  LuLoader,
  LuShuffle,
  LuHistory,
  LuClock,
} from "react-icons/lu";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import type { AnalysisRun, TicketListItem } from "@/lib/types";

const SIZES = [10, 20, 30] as const;
type Size = (typeof SIZES)[number];

function channelClass(channel: string | null): string {
  switch ((channel ?? "").toLowerCase()) {
    case "phone":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "email":
      return "bg-purple-500/10 text-purple-700 dark:text-purple-300";
    case "servicechannel":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function ValidatePage() {
  const router = useRouter();
  const [size, setSize] = useState<Size>(10);
  const [tickets, setTickets] = useState<TicketListItem[] | null>(null);
  const [poolSize, setPoolSize] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [starting, startTransition] = useTransition();
  const [history, setHistory] = useState<AnalysisRun[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  async function loadSample(nextSize: Size) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.randomValidationTickets(nextSize);
      setTickets(res.tickets);
      setPoolSize(res.pool_size);
      // Auto-select every ticket returned — that's the point of validation.
      setSelected(new Set(res.tickets.map((t) => t.id)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load tickets";
      setError(msg);
      setTickets([]);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await api.listValidationRuns();
      setHistory(res.analyses);
    } catch {
      // History is best-effort; don't block the page on it.
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    void loadSample(size);
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSizeChange(next: Size) {
    setSize(next);
    void loadSample(next);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (!tickets) return;
    setSelected(checked ? new Set(tickets.map((t) => t.id)) : new Set());
  }

  function handleStart() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    startTransition(async () => {
      try {
        const run = await api.startValidation(ids);
        toast.success(`Validation #${run.id} started`, {
          description: `${ids.length} ticket${ids.length === 1 ? "" : "s"} queued`,
        });
        router.push(`/analyses/${run.id}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to start validation";
        toast.error("Could not start validation", { description: msg });
      }
    });
  }

  const allSelected =
    !!tickets && tickets.length > 0 && tickets.every((t) => selected.has(t.id));
  const someSelected =
    !!tickets && tickets.some((t) => selected.has(t.id)) && !allSelected;

  return (
    <>
      <PageHeader
        eyebrow="VALIDATE"
        title="Validate Tickets"
        description="Spot-check the classifier on a random sample of closed Customer Success tickets. Runs here are kept separate from the main flow so they don't clutter history or filters."
        actions={
          <Button
            onClick={() => void loadSample(size)}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <LuRefreshCcw className={loading ? "animate-spin" : ""} />
            Re-sample
          </Button>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-6 pb-28">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-xs">
            <LuShuffle className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Sample size</span>
            <div className="flex items-center gap-1">
              {SIZES.map((n) => (
                <Button
                  key={n}
                  size="xs"
                  variant={size === n ? "default" : "ghost"}
                  onClick={() => handleSizeChange(n)}
                  disabled={loading}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {tickets
              ? `Showing ${tickets.length} random ticket${tickets.length === 1 ? "" : "s"}${
                  poolSize != null ? ` from a pool of ${poolSize}` : ""
                } · ${selected.size} selected`
              : "Sampling…"}
          </div>
        </div>

        <Card className="overflow-hidden p-0">
          <CardContent className="p-0">
            {error ? (
              <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
                <LuCircleAlert className="size-4" />
                <span>{error}</span>
              </div>
            ) : null}
            <ScrollArea className="h-[calc(100svh-420px)]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          allSelected
                            ? true
                            : someSelected
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={(v) => toggleAll(Boolean(v))}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="w-24">Channel</TableHead>
                    <TableHead className="w-20 text-right">Threads</TableHead>
                    <TableHead className="w-20 text-right">Comments</TableHead>
                    <TableHead className="w-28">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && !tickets ? (
                    Array.from({ length: size }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : !tickets || tickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
                          <span>No closed tickets available to sample.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    tickets.map((t) => {
                      const checked = selected.has(t.id);
                      return (
                        <TableRow
                          key={t.id}
                          data-state={checked ? "selected" : undefined}
                          onClick={() => toggle(t.id)}
                          className="cursor-pointer"
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggle(t.id)}
                              aria-label={`Select ${t.ticket_number ?? t.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            #{t.ticket_number ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-[520px] truncate text-sm">
                            {t.subject ?? "(no subject)"}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[11px] ${channelClass(t.channel)}`}
                            >
                              {t.channel ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {t.thread_count ?? "0"}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {t.comment_count ?? "0"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatRelative(t.created_time)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <LuHistory className="size-3.5" />
                Past validations
              </div>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => void loadHistory()}
                disabled={historyLoading}
              >
                <LuRefreshCcw
                  className={`size-3 ${historyLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
            {history && history.length > 0 ? (
              <ul className="divide-y text-sm">
                {history.slice(0, 8).map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/analyses/${r.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs text-muted-foreground">
                          #{r.id}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            r.status === "completed"
                              ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                              : r.status === "failed"
                                ? "border-destructive/40 text-destructive"
                                : ""
                          }`}
                        >
                          {r.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {r.processed_tickets}/{r.total_tickets} processed
                          {r.failed_tickets
                            ? ` · ${r.failed_tickets} failed`
                            : ""}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <LuClock className="size-3" />
                        {formatRelative(r.created_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : historyLoading ? (
              <div className="p-4">
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                No validation runs yet. Start one above.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center p-4">
        <div
          className={`pointer-events-auto flex items-center gap-4 rounded-full border bg-background/95 px-5 py-2 shadow-lg backdrop-blur transition-all ${
            selected.size === 0 ? "translate-y-4 opacity-0" : "opacity-100"
          }`}
        >
          <div className="flex items-center gap-2 text-sm">
            <div className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {selected.size}
            </div>
            <span>ticket{selected.size === 1 ? "" : "s"} ready</span>
          </div>
          <Button size="sm" onClick={handleStart} disabled={starting}>
            {starting ? (
              <>
                <LuLoader className="animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <LuSparkles />
                Start validation
                <LuCheck />
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
