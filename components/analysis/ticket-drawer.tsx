"use client";

import { useEffect, useState } from "react";
import {
  LuListOrdered,
  LuBrain,
  LuTag,
  LuMessageSquare,
  LuMail,
  LuArrowDownLeft,
  LuArrowUpRight,
} from "react-icons/lu";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { describeOrigin, describeResolution } from "@/lib/taxonomy";
import type { TicketAnalysisDetail } from "@/lib/types";

export function TicketDrawer({
  analysisId,
  ticketId,
  open,
  onOpenChange,
}: {
  analysisId: number;
  ticketId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<TicketAnalysisDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !ticketId) return;
    let cancelled = false;
    setDetail(null);
    setError(null);
    setLoading(true);
    const fetcher =
      analysisId > 0
        ? api.getTicketAnalysis(analysisId, ticketId)
        : api.previewTicket(ticketId);
    fetcher
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [analysisId, ticketId, open]);

  const classification = detail?.classification;
  const cleaned = detail?.cleaned;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full data-[side=right]:sm:max-w-4xl p-0"
      >
        <SheetHeader className="gap-1 border-b p-5">
          <SheetTitle className="flex items-center gap-2 text-base">
            {cleaned?.ticket_number ? (
              <span className="font-mono text-xs text-muted-foreground">
                #{cleaned.ticket_number}
              </span>
            ) : null}
            <span className="truncate">
              {cleaned?.subject ?? (loading ? "Loading…" : "Ticket")}
            </span>
          </SheetTitle>
          <SheetDescription>
            {cleaned?.parsed_subject?.property_name ? (
              <>
                {cleaned.parsed_subject.property_name}
                {cleaned.parsed_subject.location_id
                  ? ` · loc ${cleaned.parsed_subject.location_id}`
                  : ""}
                {" · "}
                {cleaned.status ?? "—"}
              </>
            ) : (
              "Per-ticket analysis"
            )}
          </SheetDescription>
        </SheetHeader>

        {error ? (
          <div className="m-5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading && !detail ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : detail ? (
          <Tabs defaultValue="summary" className="h-[calc(100svh-112px)]">
            <TabsList className="mx-5 mt-3">
              <TabsTrigger value="summary">
                <LuBrain /> AI summary
              </TabsTrigger>
              <TabsTrigger value="threads">
                <LuMail /> Threads
                {cleaned?.threads?.length ? (
                  <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">
                    {cleaned.threads.length}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="conversation">
                <LuMessageSquare /> Comments
                {cleaned?.comments?.length ? (
                  <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">
                    {cleaned.comments.length}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="raw">
                <LuListOrdered /> Data
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="h-full">
              <ScrollArea className="h-[calc(100svh-180px)] pl-5 pr-7 pb-6">
                <div className="space-y-5 pt-2">
                  {classification ? (
                    <>
                      <SectionLabel
                        icon={LuTag}
                        title="Classification"
                      />
                      <div className="flex flex-wrap gap-2 text-sm">
                        <LabelWithTooltip
                          prefix="Origin"
                          value={classification.inferred_issue_origin}
                          description={describeOrigin(
                            classification.inferred_issue_origin
                          )}
                        />
                        <LabelWithTooltip
                          prefix="Resolution"
                          value={classification.inferred_issue_resolution}
                          description={describeResolution(
                            classification.inferred_issue_resolution
                          )}
                        />
                        <Badge variant="outline">
                          Confidence:{" "}
                          {typeof classification.confidence === "number"
                            ? `${Math.round(classification.confidence * 100)}%`
                            : "—"}
                        </Badge>
                        {classification.tech_visit_required ? (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-transparent">
                            Tech visit required
                          </Badge>
                        ) : null}
                      </div>

                      {classification.flags && classification.flags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {classification.flags.map((f) => (
                            <span
                              key={f}
                              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <SectionLabel title="Issue" />
                      <p className="text-sm leading-relaxed">
                        {classification.issue_summary ?? "—"}
                      </p>

                      <SectionLabel title="Troubleshooting steps" />
                      {classification.troubleshooting_steps &&
                      classification.troubleshooting_steps.length > 0 ? (
                        <ol className="space-y-1.5 text-sm">
                          {classification.troubleshooting_steps.map((s, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="mt-0.5 grid size-5 place-items-center rounded-full bg-muted text-[10px] tabular-nums text-muted-foreground">
                                {i + 1}
                              </span>
                              <span className="flex-1">{s}</span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No steps extracted.
                        </p>
                      )}

                      <SectionLabel title="Resolution" />
                      <p className="text-sm leading-relaxed">
                        {classification.resolution ?? "—"}
                      </p>

                      {classification.reasoning ? (
                        <>
                          <SectionLabel title="Model reasoning" />
                          <p className="text-xs italic leading-relaxed text-muted-foreground">
                            {classification.reasoning}
                          </p>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Not classified yet.
                    </p>
                  )}

                  {cleaned ? (
                    <>
                      <SectionLabel title="Agent labels (ground truth)" />
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <LabelRow
                          label="T3 Issue Origin"
                          value={cleaned.labels?.t3_issue_origin}
                          match={
                            classification
                              ? matchOrUndefined(
                                  cleaned.labels?.t3_issue_origin,
                                  classification.inferred_issue_origin,
                                )
                              : undefined
                          }
                        />
                        {isNewDept(cleaned.department_id) ? (
                          <LabelRow
                            label="T3 Issue Resolution"
                            value={cleaned.labels?.t3_issue_resolution}
                            match={
                              classification
                                ? matchOrUndefined(
                                    cleaned.labels?.t3_issue_resolution,
                                    classification.inferred_issue_resolution,
                                  )
                                : undefined
                            }
                          />
                        ) : (
                          <>
                            <LabelRow
                              label="T3 Issue Type"
                              value={cleaned.labels?.t3_issue_type}
                            />
                            <LabelRow
                              label="Sub-issue"
                              value={cleaned.labels?.t3_sub_issue_type}
                            />
                          </>
                        )}
                        <LabelRow
                          label="Vertical"
                          value={cleaned.labels?.vertical}
                        />
                        <LabelRow
                          label="Tech needed (agent)"
                          value={renderYesNo(cleaned.labels?.tech_needed)}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="threads">
              <ScrollArea className="h-[calc(100svh-180px)] pl-5 pr-7 pb-6">
                {cleaned?.threads?.length ? (
                  <ol className="space-y-3 pt-2">
                    {cleaned.threads.map((t) => {
                      const outbound = t.direction === "out";
                      const DirIcon = outbound ? LuArrowUpRight : LuArrowDownLeft;
                      return (
                        <li
                          key={t.id ?? t.index}
                          className={`rounded-md border p-3 text-sm ${
                            outbound
                              ? "border-sky-500/30 bg-sky-500/[0.03]"
                              : "border-emerald-500/30 bg-emerald-500/[0.03]"
                          }`}
                        >
                          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <DirIcon
                              className={`size-3.5 ${
                                outbound
                                  ? "text-sky-600 dark:text-sky-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            />
                            <Badge variant="outline" className="text-[10px]">
                              {outbound ? "Agent → Customer" : "Customer → Agent"}
                            </Badge>
                            {t.channel ? (
                              <Badge variant="outline" className="text-[10px]">
                                {t.channel}
                              </Badge>
                            ) : null}
                            {t.is_description ? (
                              <Badge variant="outline" className="text-[10px]">
                                description
                              </Badge>
                            ) : null}
                            {t.created_time ? (
                              <span>{new Date(t.created_time).toLocaleString()}</span>
                            ) : null}
                            {t.author ? <span>· {t.author}</span> : null}
                          </div>
                          {(t.from || t.to) ? (
                            <div className="mb-1.5 grid gap-0.5 text-[11px] text-muted-foreground">
                              {t.from ? (
                                <div>
                                  <span className="font-medium">From:</span>{" "}
                                  <span className="break-all">{t.from}</span>
                                </div>
                              ) : null}
                              {t.to ? (
                                <div>
                                  <span className="font-medium">To:</span>{" "}
                                  <span className="break-all">{t.to}</span>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {t.text}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="pt-4 text-sm text-muted-foreground">
                    No threads (email/chat) on this ticket.
                  </p>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="conversation">
              <ScrollArea className="h-[calc(100svh-180px)] pl-5 pr-7 pb-6">
                {cleaned?.comments?.length ? (
                  <ol className="space-y-3 pt-2">
                    {cleaned.comments.map((c) => (
                      <li key={c.index} className="rounded-md border p-3 text-sm">
                        <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          {c.commented_time ? (
                            <span>{new Date(c.commented_time).toLocaleString()}</span>
                          ) : null}
                          {c.author ? <span>· {c.author}</span> : null}
                          {c.is_public === false ? (
                            <Badge variant="outline" className="text-[10px]">internal</Badge>
                          ) : null}
                          {c.collapsed_count ? (
                            <Badge variant="outline" className="text-[10px]">
                              {c.collapsed_count} merged
                            </Badge>
                          ) : null}
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {c.text}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="pt-4 text-sm text-muted-foreground">
                    No comments on this ticket.
                  </p>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="raw">
              <ScrollArea className="h-[calc(100svh-180px)] pl-5 pr-7 pb-6">
                <pre className="mt-2 whitespace-pre-wrap break-all rounded-md bg-muted/40 p-3 text-[11px] leading-relaxed">
{JSON.stringify({ cleaned, classification }, null, 2)}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function LabelWithTooltip({
  prefix,
  value,
  description,
}: {
  prefix: string;
  value: string | null | undefined;
  description: string | undefined;
}) {
  const body = (
    <Badge variant="secondary" className="cursor-help">
      {prefix}: {value ?? "—"}
    </Badge>
  );
  if (!description) return body;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{body}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-xs">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}

function SectionLabel({
  icon: Icon,
  title,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {Icon ? <Icon className="size-3.5" /> : null}
      {title}
    </div>
  );
}

const NEW_DEPT_ID = "136328001653862461";

function isNewDept(deptId: unknown): boolean {
  return deptId == null || String(deptId) === NEW_DEPT_ID;
}

function matchOrUndefined(
  truth: unknown,
  inferred: unknown,
): boolean | undefined {
  if (truth == null || truth === "") return undefined;
  return truth === inferred;
}

function renderYesNo(value: unknown): unknown {
  if (value == null || value === "") return value;
  const s = String(value).trim().toLowerCase();
  if (["yes", "true", "1"].includes(s)) return "Yes";
  if (["no", "false", "0"].includes(s)) return "No";
  return value;
}

function LabelRow({
  label,
  value,
  match,
}: {
  label: string;
  value: unknown;
  match?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex items-center gap-1 text-sm">
        {value == null || value === "" ? (
          <span className="italic text-muted-foreground">Unset</span>
        ) : (
          <span>{String(value)}</span>
        )}
        {match === true ? (
          <span className="rounded-full bg-emerald-500/15 px-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">
            match
          </span>
        ) : match === false ? (
          <span className="rounded-full bg-amber-500/15 px-1.5 text-[10px] text-amber-700 dark:text-amber-300">
            differs
          </span>
        ) : null}
      </div>
    </div>
  );
}
