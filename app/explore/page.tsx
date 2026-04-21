"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LuPlus, LuRefreshCcw, LuSearchX } from "react-icons/lu";

import { PageHeader } from "@/components/page-header";
import { TicketDrawer } from "@/components/analysis/ticket-drawer";
import { TicketExplorer } from "@/components/analysis/ticket-explorer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { ExploreTicket } from "@/lib/types";

export default function ExplorePage() {
  const [tickets, setTickets] = useState<ExploreTicket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState<
    { analysisId: number; ticketId: string } | null
  >(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listExploreTickets();
      setTickets(res.tickets);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Cross-run"
        title="Explore classified tickets"
        description="Every completed ticket across every analysis run. Filter by classification, then click through to the full conversation."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => void load()}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <LuRefreshCcw className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button asChild size="sm">
              <Link href="/">
                <LuPlus />
                New analysis
              </Link>
            </Button>
          </div>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-6">
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {tickets === null ? (
          <Skeleton className="h-80 w-full" />
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="grid size-10 place-items-center rounded-full bg-muted">
                <LuSearchX className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No classified tickets yet</p>
                <p className="text-sm text-muted-foreground">
                  Run an analysis to populate this explorer.
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
          <TicketExplorer
            tickets={tickets}
            onOpenTicket={(analysisId, ticketId) =>
              setDrawer({ analysisId, ticketId })
            }
          />
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
