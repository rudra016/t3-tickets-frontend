"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  LuActivity,
  LuBadgeCheck,
  LuClock,
  LuWrench,
} from "react-icons/lu";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { minutesHuman } from "@/lib/format";
import type { DashboardResponse } from "@/lib/types";

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f43f5e",
  "#6366f1",
  "#84cc16",
  "#eab308",
  "#64748b",
  "#a855f7",
];

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-4">
        <div className="grid size-9 place-items-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="truncate text-2xl font-semibold tracking-tight">
            {value}
          </div>
          {hint ? (
            <div className="text-xs text-muted-foreground">{hint}</div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardCharts({ data }: { data: DashboardResponse | null }) {
  if (!data) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Waiting for results…
      </div>
    );
  }
  if (data.total_completed === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No classified tickets yet in this run.
      </div>
    );
  }

  const origin = data.origin_distribution.map(([name, value], i) => ({
    name,
    value,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));
  const resolution = data.resolution_distribution.map(([name, value], i) => ({
    name,
    value,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const originAgreement =
    data.label_agreement.origin_compared > 0
      ? data.label_agreement.origin_matches /
        data.label_agreement.origin_compared
      : null;
  const resolutionAgreement =
    data.label_agreement.resolution_compared > 0
      ? data.label_agreement.resolution_matches /
        data.label_agreement.resolution_compared
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          icon={LuActivity}
          label="Tickets classified"
          value={String(data.total_completed)}
        />
        <Metric
          icon={LuWrench}
          label="Tech visit rate"
          value={
            data.tech_visit_rate == null
              ? "—"
              : `${Math.round(data.tech_visit_rate * 100)}%`
          }
          hint="Requires field technician"
        />
        <Metric
          icon={LuBadgeCheck}
          label="Avg confidence"
          value={
            data.avg_confidence == null
              ? "—"
              : `${Math.round(data.avg_confidence * 100)}%`
          }
          hint="Classifier self-reported"
        />
        <Metric
          icon={LuClock}
          label="Avg resolution"
          value={minutesHuman(data.avg_resolution_minutes)}
          hint="Ticket open → closed"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Issue origins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={origin}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {origin.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--popover)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {origin.map((o) => (
                <div key={o.name} className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: o.fill }}
                  />
                  <span className="text-muted-foreground">
                    {o.name}{" "}
                    <span className="tabular-nums text-foreground">
                      {o.value}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resolutions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={resolution}
                  layout="vertical"
                  margin={{ left: 24, right: 16, top: 8, bottom: 8 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--popover)",
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                    {resolution.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI vs. agent label agreement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AgreementBar
              label="Issue origin"
              ratio={originAgreement}
              compared={data.label_agreement.origin_compared}
              matches={data.label_agreement.origin_matches}
            />
            <AgreementBar
              label="Resolution"
              ratio={resolutionAgreement}
              compared={data.label_agreement.resolution_compared}
              matches={data.label_agreement.resolution_matches}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Flags surfaced</CardTitle>
          </CardHeader>
          <CardContent>
            {data.flags.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No notable flags in this batch.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {data.flags.map(([flag, count]) => (
                  <span
                    key={flag}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs"
                  >
                    {flag}{" "}
                    <span className="tabular-nums text-muted-foreground">
                      · {count}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AgreementBar({
  label,
  ratio,
  compared,
  matches,
}: {
  label: string;
  ratio: number | null;
  compared: number;
  matches: number;
}) {
  if (ratio === null) {
    return (
      <div>
        <div className="flex justify-between text-sm">
          <span>{label}</span>
          <span className="text-muted-foreground">no labels to compare</span>
        </div>
      </div>
    );
  }
  const pct = Math.round(ratio * 100);
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {matches}/{compared} · {pct}%
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
