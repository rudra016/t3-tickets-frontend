"use client";

import { useMemo, useState } from "react";
import { LuSearch, LuWrench, LuFilter, LuX } from "react-icons/lu";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ExploreTicket } from "@/lib/types";

const CONF_PRESETS = [
  { label: "Any", min: 0 },
  { label: "≥ 50%", min: 0.5 },
  { label: "≥ 70%", min: 0.7 },
  { label: "≥ 85%", min: 0.85 },
];

export function TicketExplorer({
  tickets,
  onOpenTicket,
  showAnalysisColumn = true,
}: {
  tickets: ExploreTicket[];
  onOpenTicket: (analysisId: number, ticketId: string) => void;
  showAnalysisColumn?: boolean;
}) {
  const [origin, setOrigin] = useState<string | null>(null);
  const [resolution, setResolution] = useState<string | null>(null);
  const [minConf, setMinConf] = useState(0);
  const [techOnly, setTechOnly] = useState(false);
  const [search, setSearch] = useState("");

  // Filter pills are derived from values actually seen in the data so users
  // never see an option that can't match anything.
  const origins = useMemo(() => {
    const s = new Set<string>();
    tickets.forEach(
      (t) => t.inferred_issue_origin && s.add(t.inferred_issue_origin)
    );
    return Array.from(s).sort();
  }, [tickets]);
  const resolutions = useMemo(() => {
    const s = new Set<string>();
    tickets.forEach(
      (t) => t.inferred_issue_resolution && s.add(t.inferred_issue_resolution)
    );
    return Array.from(s).sort();
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (origin && t.inferred_issue_origin !== origin) return false;
      if (resolution && t.inferred_issue_resolution !== resolution) return false;
      if (minConf > 0 && (t.confidence ?? 0) < minConf) return false;
      if (techOnly && !t.tech_visit_required) return false;
      if (q) {
        const hay = [
          t.subject,
          t.ticket_number,
          t.property_name,
          t.issue_summary,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tickets, origin, resolution, minConf, techOnly, search]);

  const activeFilters =
    (origin ? 1 : 0) +
    (resolution ? 1 : 0) +
    (minConf > 0 ? 1 : 0) +
    (techOnly ? 1 : 0) +
    (search ? 1 : 0);

  const clearAll = () => {
    setOrigin(null);
    setResolution(null);
    setMinConf(0);
    setTechOnly(false);
    setSearch("");
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <LuFilter className="size-3.5 text-muted-foreground" />
              Filter
            </h3>
            <p className="text-xs text-muted-foreground">
              Narrow by classification, confidence, or free text. Click a row
              to open the full ticket.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {filtered.length} of {tickets.length}
            </span>
            {activeFilters > 0 ? (
              <Button size="xs" variant="ghost" onClick={clearAll}>
                <LuX />
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        <div className="relative max-w-md">
          <LuSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject, ticket #, property, summary…"
            className="pl-9"
          />
        </div>

        {origins.length > 0 ? (
          <FilterRow label="Origin">
            <PillButton active={origin === null} onClick={() => setOrigin(null)}>
              All
            </PillButton>
            {origins.map((o) => (
              <PillButton
                key={o}
                active={origin === o}
                onClick={() => setOrigin(origin === o ? null : o)}
              >
                {o}
              </PillButton>
            ))}
          </FilterRow>
        ) : null}

        {resolutions.length > 0 ? (
          <FilterRow label="Resolution">
            <PillButton
              active={resolution === null}
              onClick={() => setResolution(null)}
            >
              All
            </PillButton>
            {resolutions.map((r) => (
              <PillButton
                key={r}
                active={resolution === r}
                onClick={() => setResolution(resolution === r ? null : r)}
              >
                {r}
              </PillButton>
            ))}
          </FilterRow>
        ) : null}

        <FilterRow label="Confidence">
          {CONF_PRESETS.map((p) => (
            <PillButton
              key={p.label}
              active={minConf === p.min}
              onClick={() => setMinConf(p.min)}
            >
              {p.label}
            </PillButton>
          ))}
          <span className="mx-2 h-4 w-px bg-border" />
          <PillButton active={techOnly} onClick={() => setTechOnly((v) => !v)}>
            <LuWrench className="size-3" /> Tech visit only
          </PillButton>
        </FilterRow>

        {filtered.length === 0 ? (
          <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
            No tickets match these filters.
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Ticket</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="w-44">Origin</TableHead>
                  <TableHead className="w-44">Resolution</TableHead>
                  <TableHead className="w-20 text-right">Conf.</TableHead>
                  <TableHead className="w-14 text-right">Tech</TableHead>
                  {showAnalysisColumn ? (
                    <TableHead className="w-16 text-right">Run</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow
                    key={`${t.analysis_id}:${t.ticket_id}`}
                    className="cursor-pointer"
                    onClick={() => onOpenTicket(t.analysis_id, t.ticket_id)}
                  >
                    <TableCell className="font-mono text-xs">
                      #{t.ticket_number ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[380px] truncate text-sm">
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
                      {typeof t.confidence === "number"
                        ? `${Math.round(t.confidence * 100)}%`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.tech_visit_required ? (
                        <LuWrench className="ml-auto size-3.5 text-amber-600 dark:text-amber-400" />
                      ) : null}
                    </TableCell>
                    {showAnalysisColumn ? (
                      <TableCell className="text-right text-xs text-muted-foreground">
                        #{t.analysis_id}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 min-w-16 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button variant={active ? "default" : "outline"} size="xs" onClick={onClick}>
      {children}
    </Button>
  );
}
