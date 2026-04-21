"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  LuActivity,
  LuArrowLeft,
  LuChartPie,
  LuCircleAlert,
  LuCircleCheck,
  LuClock,
  LuList,
  LuRadio,
  LuSparkles,
} from "react-icons/lu";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardCharts } from "@/components/analysis/dashboard-charts";
import { LiveFeed } from "@/components/analysis/live-feed";
import { PipelineStages } from "@/components/analysis/pipeline-stages";
import { TicketDrawer } from "@/components/analysis/ticket-drawer";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { subscribeAnalysis } from "@/lib/sse";
import type {
  AnalysisDetail,
  AnalysisEvent,
  DashboardResponse,
  TicketAnalysisSummary,
  TicketStage,
} from "@/lib/types";

export default function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const analysisId = Number(id);
  const [detail, setDetail] = useState<AnalysisDetail | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drawerTicket, setDrawerTicket] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRunning =
    detail?.run.status === "running" || detail?.run.status === "pending";
  // Terminal = positively confirmed done/failed. Using this instead of
  // !isRunning prevents tearing down the poller before the first load
  // resolves (while detail is still null, isRunning would be false).
  const isTerminal =
    detail?.run.status === "completed" || detail?.run.status === "failed";

  const loadRef = useRef<() => Promise<void>>(async () => {});

  // Poll /api/analyses/:id + dashboard. Keeps running until we've seen a
  // terminal status at least once.
  useEffect(() => {
    if (!Number.isFinite(analysisId)) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [d, dash] = await Promise.all([
          api.getAnalysis(analysisId),
          api.getDashboard(analysisId).catch(() => null),
        ]);
        if (cancelled) return;
        setDetail(d);
        setDashboard(dash);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      }
    };
    loadRef.current = load;
    void load();
    pollIntervalRef.current = setInterval(() => {
      void load();
    }, 2500);
    return () => {
      cancelled = true;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [analysisId]);

  // Subscribe to SSE. Backend buffers replay, so events still populate if we
  // connect mid-run. On `analysis.completed` force one final refetch so we
  // don't wait up to 2.5s for the poll to catch up.
  useEffect(() => {
    if (!Number.isFinite(analysisId)) return;
    const close = subscribeAnalysis(
      analysisId,
      (evt) => {
        setEvents((prev) => [...prev, evt]);
        if (evt.type === "analysis.completed" || evt.type === "analysis.failed") {
          void loadRef.current();
        }
      },
      () => {
        // Browser auto-reconnects on error; no-op here.
      }
    );
    return () => close();
  }, [analysisId]);

  // Once we've positively seen a terminal status, stop polling.
  useEffect(() => {
    if (isTerminal && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, [isTerminal]);

  const pct = detail?.run.total_tickets
    ? Math.round(
        (detail.run.processed_tickets / detail.run.total_tickets) * 100
      )
    : 0;

  const ticketMap = useMemo(() => {
    const m = new Map<string, TicketAnalysisSummary>();
    detail?.tickets.forEach((t) => m.set(t.ticket_id, t));
    return m;
  }, [detail]);

  if (error && !detail) {
    return (
      <>
        <PageHeader
          eyebrow="Analysis"
          title="Not found"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/analyses">
                <LuArrowLeft /> Back
              </Link>
            </Button>
          }
        />
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="max-w-md">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <LuCircleAlert className="size-6 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={`Analysis #${analysisId}`}
        title={
          detail?.run.status === "running"
            ? "Classifying tickets…"
            : detail?.run.status === "completed"
              ? "Analysis complete"
              : detail?.run.status === "failed"
                ? "Analysis failed"
                : "Queued"
        }
        description={
          detail
            ? `${detail.run.processed_tickets}/${detail.run.total_tickets} processed · started ${formatRelative(detail.run.started_at)}`
            : "Loading run…"
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/analyses">
              <LuArrowLeft /> All analyses
            </Link>
          </Button>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-6">
        <Card>
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
            <StatusBadge status={detail?.run.status ?? "pending"} />
            <div className="flex-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>
                  {detail?.run.processed_tickets ?? 0}/
                  {detail?.run.total_tickets ?? 0} · {pct}%
                </span>
              </div>
              <Progress value={pct} className="mt-1.5 h-1.5" />
            </div>
            <div className="flex gap-4 text-sm">
              <MiniStat
                icon={LuSparkles}
                label="Completed"
                value={
                  detail?.tickets.filter((t) => t.status === "completed").length ??
                  0
                }
              />
              <MiniStat
                icon={LuCircleAlert}
                label="Failed"
                value={detail?.run.failed_tickets ?? 0}
              />
              <MiniStat
                icon={LuClock}
                label="Queued"
                value={
                  detail?.tickets.filter(
                    (t) => t.status === "pending" || t.status === "fetching" ||
                           t.status === "cleaning" || t.status === "classifying"
                  ).length ?? 0
                }
              />
            </div>
          </CardContent>
        </Card>

        <Tabs
          defaultValue={isRunning ? "live" : "dashboard"}
          className="flex flex-1 flex-col"
        >
          <TabsList>
            <TabsTrigger value="live">
              <LuRadio /> Live
              {isRunning ? (
                <span className="ml-1 size-1.5 animate-pulse rounded-full bg-red-500" />
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="dashboard">
              <LuChartPie /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="tickets">
              <LuList /> Tickets
              {detail?.tickets.length ? (
                <Badge variant="secondary" className="ml-1 font-mono text-[10px]">
                  {detail.tickets.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="flex-1">
            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <Card className="overflow-hidden p-0">
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100svh-340px)]">
                    <ul className="divide-y">
                      {detail?.tickets.map((t) => (
                        <li
                          key={t.ticket_id}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm"
                        >
                          <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                            #{t.ticket_number ?? "—"}
                          </span>
                          <span className="flex-1 min-w-0 truncate">
                            {t.subject ?? "(waiting for fetch)"}
                          </span>
                          <PipelineStages
                            stage={t.stage as TicketStage | null}
                            failed={t.status === "failed"}
                          />
                          {t.status === "completed" && t.inferred_issue_origin ? (
                            <Badge
                              variant="outline"
                              className="ml-2 cursor-pointer font-normal"
                              onClick={() => setDrawerTicket(t.ticket_id)}
                            >
                              {t.inferred_issue_origin}
                            </Badge>
                          ) : null}
                        </li>
                      ))}
                      {!detail ? (
                        <li className="p-4">
                          <Skeleton className="h-6 w-full" />
                        </li>
                      ) : null}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="overflow-hidden p-0">
                <CardContent className="p-3">
                  <h3 className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <LuActivity className="size-3" /> Event feed
                  </h3>
                  <LiveFeed events={events} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="dashboard">
            <DashboardCharts data={dashboard} />
          </TabsContent>

          <TabsContent value="tickets">
            <Card className="overflow-hidden p-0">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="w-44">Inferred origin</TableHead>
                      <TableHead className="w-44">Inferred resolution</TableHead>
                      <TableHead className="w-24 text-right">Conf.</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detail?.tickets ?? []).map((t) => {
                      const conf = t.confidence;
                      const confPct =
                        typeof conf === "number"
                          ? Math.round(conf * 100)
                          : null;
                      return (
                        <TableRow
                          key={t.ticket_id}
                          className="cursor-pointer"
                          onClick={() => setDrawerTicket(t.ticket_id)}
                        >
                          <TableCell className="font-mono text-xs">
                            #{t.ticket_number ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-[420px] truncate text-sm">
                            <div className="truncate">{t.subject ?? "—"}</div>
                            {t.property_name ? (
                              <div className="truncate text-xs text-muted-foreground">
                                {t.property_name}
                                {t.location_id ? ` · ${t.location_id}` : ""}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {t.inferred_issue_origin ? (
                              <Badge variant="secondary" className="font-normal">
                                {t.inferred_issue_origin}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {t.inferred_issue_resolution ? (
                              <Badge variant="outline" className="font-normal">
                                {t.inferred_issue_resolution}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {confPct != null ? `${confPct}%` : "—"}
                          </TableCell>
                          <TableCell>
                            <TicketStatusBadge status={t.status} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!detail ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <TicketDrawer
        analysisId={analysisId}
        ticketId={drawerTicket}
        open={drawerTicket !== null}
        onOpenChange={(o) => {
          if (!o) setDrawerTicket(null);
        }}
      />
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { tone: string; icon: React.ComponentType<{ className?: string }>; label: string }
  > = {
    pending: { tone: "bg-muted text-muted-foreground", icon: LuClock, label: "Queued" },
    running: {
      tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
      icon: LuActivity,
      label: "Running",
    },
    completed: {
      tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      icon: LuCircleCheck,
      label: "Completed",
    },
    failed: {
      tone: "bg-destructive/15 text-destructive",
      icon: LuCircleAlert,
      label: "Failed",
    },
  };
  const meta = map[status] ?? map.pending;
  const Icon = meta.icon;
  return (
    <Badge className={`${meta.tone} border-transparent`}>
      <Icon
        className={`size-3 ${status === "running" ? "animate-pulse" : ""}`}
      />
      {meta.label}
    </Badge>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border px-2.5 py-1">
      <Icon className="size-3.5 text-muted-foreground" />
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function TicketStatusBadge({ status }: { status: string }) {
  const tone =
    status === "completed"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : status === "failed"
        ? "bg-destructive/15 text-destructive"
        : status === "pending"
          ? "bg-muted text-muted-foreground"
          : "bg-blue-500/15 text-blue-700 dark:text-blue-300";
  return (
    <Badge className={`${tone} border-transparent font-normal`}>
      {status}
    </Badge>
  );
}
