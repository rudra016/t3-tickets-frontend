"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LuActivity,
  LuCircleCheck,
  LuCircleAlert,
  LuClock,
  LuArrowRight,
  LuPlus,
} from "react-icons/lu";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import type { AnalysisRun } from "@/lib/types";

const STATUS_META: Record<
  AnalysisRun["status"],
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  pending: { label: "Queued", icon: LuClock, tone: "bg-muted text-muted-foreground" },
  running: {
    label: "Running",
    icon: LuActivity,
    tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  completed: {
    label: "Completed",
    icon: LuCircleCheck,
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  failed: {
    label: "Failed",
    icon: LuCircleAlert,
    tone: "bg-destructive/15 text-destructive",
  },
};

export default function AnalysesPage() {
  const [runs, setRuns] = useState<AnalysisRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.listAnalyses();
        if (!cancelled) setRuns(res.analyses);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      }
    };
    void load();
    const interval = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="History"
        title="Analyses"
        description="Every batch of tickets you've sent through the classifier."
        actions={
          <Button asChild size="sm">
            <Link href="/">
              <LuPlus />
              New analysis
            </Link>
          </Button>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-6">
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {runs === null ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="grid size-10 place-items-center rounded-full bg-muted">
                <LuActivity className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No analyses yet</p>
                <p className="text-sm text-muted-foreground">
                  Pick some tickets to kick off your first run.
                </p>
              </div>
              <Button asChild>
                <Link href="/">
                  <LuPlus />
                  Start an analysis
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {runs.map((run) => {
              const meta = STATUS_META[run.status];
              const Icon = meta.icon;
              const pct = run.total_tickets
                ? Math.round(
                    (run.processed_tickets / run.total_tickets) * 100
                  )
                : 0;
              return (
                <Link
                  key={run.id}
                  href={`/analyses/${run.id}`}
                  className="group"
                >
                  <Card className="relative h-full transition-colors hover:border-primary/40">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          Run #{run.id}
                        </CardTitle>
                        <Badge className={`${meta.tone} border-transparent`}>
                          <Icon
                            className={`size-3 ${run.status === "running" ? "animate-pulse" : ""}`}
                          />
                          {meta.label}
                        </Badge>
                      </div>
                      <CardDescription>
                        {formatRelative(run.created_at)} ·{" "}
                        {run.total_tickets} ticket
                        {run.total_tickets === 1 ? "" : "s"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>
                            {run.processed_tickets}/{run.total_tickets} · {pct}%
                          </span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                      {run.failed_tickets > 0 ? (
                        <div className="text-xs text-destructive">
                          {run.failed_tickets} failed
                        </div>
                      ) : null}
                      <div className="flex items-center justify-end text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        Open <LuArrowRight className="ml-1 size-3" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
