"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LuRefreshCcw,
  LuSearch,
  LuSparkles,
  LuCircleAlert,
  LuCheck,
  LuLoader,
  LuChevronLeft,
  LuChevronRight,
} from "react-icons/lu";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import type { TicketListItem } from "@/lib/types";

const MAX_SELECTION = 50;
const PAGE_SIZE_OPTIONS = [25, 50, 100];
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "Closed", label: "Closed" },
  { value: "Open", label: "Open" },
];

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

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [searchHits, setSearchHits] = useState<TicketListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("Closed");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [starting, startTransition] = useTransition();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listTickets({
        limit: pageSize,
        from: (page - 1) * pageSize + 1,
        status: statusFilter || undefined,
      });
      setTickets(res.tickets);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load tickets";
      setError(msg);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page, pageSize]);

  // Reset to page 1 when filters change (but not on page change itself).
  useEffect(() => {
    setPage(1);
  }, [statusFilter, pageSize]);

  // Backend-side ticket-number lookup so the user can find a ticket that
  // isn't on the current page. Triggers when the query looks like a ticket
  // number (with or without a leading "#"). Debounced to keep typing snappy.
  useEffect(() => {
    const q = search.trim().replace(/^#+/, "");
    if (!q || !/^\d+$/.test(q)) {
      setSearchHits([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const res = await api.searchTickets(q);
        setSearchHits(res.tickets);
      } catch {
        setSearchHits([]);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  const filtered = useMemo(() => {
    if (!tickets) return [];
    // "#1234" and "1234" should match the same set.
    const q = search.trim().replace(/^#+/, "").toLowerCase();
    const seen = new Set(tickets.map((t) => t.id));
    const merged = [
      ...tickets,
      ...searchHits.filter((t) => !seen.has(t.id)),
    ];
    if (!q) return merged;
    return merged.filter((t) =>
      [t.subject, t.ticket_number, t.status, t.channel]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [tickets, search, searchHits]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= MAX_SELECTION) {
          toast.warning(`Max ${MAX_SELECTION} tickets per run`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllVisible = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!checked) {
        filtered.forEach((t) => next.delete(t.id));
        return next;
      }
      for (const t of filtered) {
        if (next.size >= MAX_SELECTION) break;
        next.add(t.id);
      }
      return next;
    });
  };

  const handleStart = () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    startTransition(async () => {
      try {
        const run = await api.startAnalysis(ids);
        toast.success(`Analysis #${run.id} started`, {
          description: `${ids.length} ticket${ids.length === 1 ? "" : "s"} queued`,
        });
        router.push(`/analyses/${run.id}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to start analysis";
        toast.error("Could not start analysis", { description: msg });
      }
    });
  };

  const visibleIds = filtered.map((t) => t.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisibleSelected =
    visibleIds.some((id) => selected.has(id)) && !allVisibleSelected;

  // Zoho doesn't return a total count. Use "page looked full" as the signal
  // that there might be a next page.
  const hasMore = (tickets?.length ?? 0) >= pageSize;
  const rangeStart = tickets?.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = rangeStart + (tickets?.length ?? 0) - (tickets?.length ? 1 : 0);

  return (
    <>
      <PageHeader
        eyebrow="SELECT"
        title="Pick tickets to analyze"
        description="Select up to 50 T3 tickets. We'll fetch the full conversation, clean it, and classify each one live."
        actions={
          <Button
            onClick={() => void load()}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <LuRefreshCcw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-6 pb-28">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject, ticket #, channel…"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border p-1">
            {STATUS_OPTIONS.map((opt) => (
              <Button
                key={opt.value || "all"}
                size="xs"
                variant={statusFilter === opt.value ? "default" : "ghost"}
                onClick={() => setStatusFilter(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {filtered.length} shown · {selected.size} selected · max {MAX_SELECTION}
            </span>
            <div className="flex items-center gap-1 rounded-md border p-1">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <Button
                  key={size}
                  size="xs"
                  variant={pageSize === size ? "default" : "ghost"}
                  onClick={() => setPageSize(size)}
                >
                  {size}
                </Button>
              ))}
            </div>
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
            <ScrollArea className="h-[calc(100svh-320px)]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          allVisibleSelected
                            ? true
                            : someVisibleSelected
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={(v) => toggleAllVisible(Boolean(v))}
                        aria-label="Select all visible"
                      />
                    </TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-24">Channel</TableHead>
                    <TableHead className="w-20 text-right">Threads</TableHead>
                    <TableHead className="w-20 text-right">Comments</TableHead>
                    <TableHead className="w-28">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && !tickets ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
                          <span>No tickets match the current filters.</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearch("");
                              setStatusFilter("");
                            }}
                          >
                            Clear filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((t) => {
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
                            <Badge variant="outline" className="font-normal">
                              {t.status ?? "—"}
                            </Badge>
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
            <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
              <span>
                {tickets && tickets.length > 0
                  ? `Showing ${rangeStart}–${rangeEnd}`
                  : "No results on this page"}
              </span>
              <div className="flex items-center gap-2">
                <span>Page {page}</span>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  <LuChevronLeft />
                  Prev
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore || loading}
                >
                  Next
                  <LuChevronRight />
                </Button>
              </div>
            </div>
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
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(new Set())}
            disabled={starting}
          >
            Clear
          </Button>
          <Button size="sm" onClick={handleStart} disabled={starting}>
            {starting ? (
              <>
                <LuLoader className="animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <LuSparkles />
                Analyze {selected.size} ticket{selected.size === 1 ? "" : "s"}
                <LuCheck />
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
