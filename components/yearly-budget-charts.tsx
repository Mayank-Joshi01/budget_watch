"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BudgetEntry } from "@/lib/budget-data";
import { useLanguage } from "@/lib/i18n/provider";
import {
  calculateBudgetShare,
  calculateCAGR,
  calculateShare,
  calculateYoY,
  formatCroreCompact,
  formatCroreExact,
  formatPercent,
  formatShare,
} from "@/lib/format";

type YearTotal = {
  financialYear: string;
  total: number;
  yoy: number | null;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload?: Record<string, unknown> }[];
  label?: string;
}) {
  const { t } = useLanguage();
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  const amount = typeof data.amount === "number" ? data.amount : data.total;
  const year =
    typeof data.financialYear === "string" ? data.financialYear : label;
  const yoy = typeof data.yoy === "number" ? data.yoy : null;
  const share = typeof data.share === "number" ? data.share : null;
  const absoluteChange =
    typeof data.amountChange === "number" ? data.amountChange : null;
  const percentChange =
    typeof data.percentageChange === "number" ? data.percentageChange : null;

  return (
    <div className="chart-tooltip">
      {typeof data.department === "string" && <strong>{data.department}</strong>}
      {year && <span>{year}</span>}
      {typeof amount === "number" && (
        <div className="chart-tooltip-row">
          <span>{t("Allocation")}</span>
          <strong>{formatCroreExact(amount)}</strong>
        </div>
      )}
      {share !== null && (
        <div className="chart-tooltip-row">
          <span>{t("Share of total budget")}</span>
          <strong>{formatShare(share)}</strong>
        </div>
      )}
      {yoy !== null && (
        <div className="chart-tooltip-row">
          <span>{t("YoY change")}</span>
          <strong>{formatPercent(yoy)}</strong>
        </div>
      )}
      {absoluteChange !== null && (
        <div className="chart-tooltip-row">
          <span>{t("Absolute change")}</span>
          <strong>{formatCroreExact(absoluteChange)}</strong>
        </div>
      )}
      {percentChange !== null && (
        <div className="chart-tooltip-row">
          <span>{t("Percentage change")}</span>
          <strong>{formatPercent(percentChange)}</strong>
        </div>
      )}
      {typeof data.rank === "number" && (
        <div className="chart-tooltip-row">
          <span>{t("Rank")}</span>
          <strong>#{data.rank}</strong>
        </div>
      )}
    </div>
  );
}

export function TotalBudgetTimeline({
  yearTotals,
}: {
  yearTotals: YearTotal[];
}) {
  const { t } = useLanguage();
  return (
    <section className="panel" aria-labelledby="total-timeline-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="total-timeline-title">
            {t("Total budget across years")}
          </h2>
          <p className="panel-subtitle">{t("Sum of department totals · ₹ crore")}</p>
        </div>
      </div>
      {yearTotals.length > 0 ? (
        <div className="chart-frame">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={yearTotals} margin={{ top: 16, right: 20, bottom: 8, left: 18 }}>
              <CartesianGrid stroke="#e9ece7" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="financialYear" axisLine={false} tickLine={false} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => formatCroreCompact(value)}
                width={80}
              />
              <Tooltip
                shared={false}
                isAnimationActive={false}
                content={<ChartTooltip />}
              />
              <Line
                dataKey="total"
                name={t("Total allocation")}
                stroke="#245c46"
                strokeWidth={2.5}
                dot={{ fill: "#245c46", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-chart">{t("No yearly totals are available.")}</div>
      )}
      <div className="table-wrap">
        <table className="data-table compact-table">
          <thead>
            <tr>
              <th scope="col">{t("Financial year")}</th>
              <th className="numeric" scope="col">{t("Total")}</th>
              <th className="numeric" scope="col">{t("Change vs prior year")}</th>
            </tr>
          </thead>
          <tbody>
            {yearTotals.map((year) => (
              <tr key={year.financialYear}>
                <td>{year.financialYear}</td>
                <td className="numeric">{formatCroreExact(year.total)}</td>
                <td className="numeric">{formatPercent(year.yoy)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type DepartmentChartMode = "allocation" | "share";

type DepartmentHistoryPoint = {
  financialYear: string;
  department: string;
  departmentAllocation: number | null;
  totalBudget: number;
  sharePercentage: number | null;
  previousAllocation: number | null;
  yoyChange: number | null;
};

function buildDepartmentHistory(
  entries: BudgetEntry[],
  departmentId: string,
  financialYears: string[],
  yearTotals: YearTotal[],
): DepartmentHistoryPoint[] {
  const departmentEntries = new Map<string, BudgetEntry>();
  for (const entry of entries) {
    if (entry.id === departmentId && !departmentEntries.has(entry.financialYear)) {
      departmentEntries.set(entry.financialYear, entry);
    }
  }
  const totalsByYear = new Map(
    yearTotals.map(({ financialYear, total }) => [financialYear, total]),
  );

  return financialYears.map((financialYear, index) => {
    const currentEntry = departmentEntries.get(financialYear);
    const previousYear = index > 0 ? financialYears[index - 1] : null;
    const previousEntry = previousYear
      ? departmentEntries.get(previousYear)
      : undefined;
    const departmentAllocation =
      currentEntry && Number.isFinite(currentEntry.amountCrore)
        ? currentEntry.amountCrore
        : null;
    const previousAllocation =
      previousEntry && Number.isFinite(previousEntry.amountCrore)
        ? previousEntry.amountCrore
        : null;
    const yoyChange =
      departmentAllocation !== null && previousAllocation !== null
        ? calculateYoY(departmentAllocation, previousAllocation)
        : null;
    const totalBudget = totalsByYear.get(financialYear) ?? 0;

    return {
      financialYear,
      department: currentEntry?.department ?? "",
      departmentAllocation,
      totalBudget,
      sharePercentage:
        departmentAllocation === null
          ? null
          : calculateBudgetShare(departmentAllocation, totalBudget),
      previousAllocation,
      yoyChange,
    };
  });
}

function getShareDomain(values: number[]) {
  if (values.length === 0) return [-1, 1] as [number, number];
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = maximum - minimum;
  const padding = Math.max(span * 0.2, Math.abs(minimum) * 0.03, 0.25);
  return [Math.max(0, minimum - padding), maximum + padding] as [number, number];
}

function formatShareAxis(value: number) {
  return `${Number(value.toFixed(2))}%`;
}

function DepartmentHistoryTooltip({
  active,
  payload,
  label,
  mode,
}: {
  active?: boolean;
  payload?: { payload?: Record<string, unknown> }[];
  label?: string;
  mode: DepartmentChartMode;
}) {
  const { t } = useLanguage();
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  const department = typeof data.department === "string" ? data.department : "";
  const financialYear =
    typeof data.financialYear === "string" ? data.financialYear : label;

  if (mode === "share") {
    const allocation =
      typeof data.departmentAllocation === "number"
        ? data.departmentAllocation
        : null;
    const totalBudget =
      typeof data.totalBudget === "number" ? data.totalBudget : null;
    const sharePercentage =
      typeof data.sharePercentage === "number"
        ? data.sharePercentage
        : null;
    return (
      <div className="chart-tooltip">
        {department && <strong>{department}</strong>}
        {financialYear && <span>{financialYear}</span>}
        <div className="chart-tooltip-row">
          <span>{t("Department allocation")}</span>
          <strong>{allocation === null ? "—" : formatCroreExact(allocation)}</strong>
        </div>
        <div className="chart-tooltip-row">
          <span>{t("Total budget")}</span>
          <strong>{totalBudget === null ? "—" : formatCroreExact(totalBudget)}</strong>
        </div>
        <div className="chart-tooltip-row">
          <span>{t("Share of total budget")}</span>
          <strong>{formatShare(sharePercentage)}</strong>
        </div>
      </div>
    );
  }

  const allocation =
    typeof data.departmentAllocation === "number"
      ? data.departmentAllocation
      : null;
  const share =
    typeof data.sharePercentage === "number" ? data.sharePercentage : null;
  const percentageChange =
    typeof data.yoyChange === "number" ? data.yoyChange : null;

  return (
    <div className="chart-tooltip">
      {department && <strong>{department}</strong>}
      {financialYear && <span>{financialYear}</span>}
      <div className="chart-tooltip-row">
        <span>{t("Allocation")}</span>
        <strong>{allocation === null ? "—" : formatCroreExact(allocation)}</strong>
      </div>
      <div className="chart-tooltip-row">
        <span>{t("Share of total budget")}</span>
        <strong>{formatShare(share)}</strong>
      </div>
      <div className="chart-tooltip-row">
        <span>{t("YoY change")}</span>
        <strong>{formatPercent(percentageChange)}</strong>
      </div>
    </div>
  );
}

export function DepartmentHistoryChart({
  entries,
  initialId,
  financialYears,
  yearTotals,
  selectedYear,
  enableViewSelector = false,
  locked = false,
}: {
  entries: BudgetEntry[];
  initialId: string;
  financialYears: string[];
  yearTotals: YearTotal[];
  selectedYear?: string;
  enableViewSelector?: boolean;
  locked?: boolean;
}) {
  const { t } = useLanguage();
  const [departmentId, setDepartmentId] = useState(initialId);
  const [mode, setMode] = useState<DepartmentChartMode>("allocation");
  const history = useMemo(
    () => buildDepartmentHistory(entries, departmentId, financialYears, yearTotals),
    [departmentId, entries, financialYears, yearTotals],
  );
  const available = history.filter(
    (point): point is DepartmentHistoryPoint & { departmentAllocation: number } =>
      point.departmentAllocation !== null,
  );
  const shareAvailable = history.filter(
    (point): point is DepartmentHistoryPoint & {
      departmentAllocation: number;
      sharePercentage: number;
    } =>
      point.departmentAllocation !== null && point.sharePercentage !== null,
  );
  const first = available[0];
  const last = available.at(-1);
  const yearsApart =
    first && last
      ? financialYears.indexOf(last.financialYear) -
        financialYears.indexOf(first.financialYear)
      : 0;
  const cagr =
    first && last && yearsApart > 0
      ? calculateCAGR(
          first.departmentAllocation,
          last.departmentAllocation,
          yearsApart,
        )
      : null;
  const firstShare = shareAvailable[0];
  const lastShare = shareAvailable.at(-1);
  const shareMovement =
    firstShare && lastShare
      ? lastShare.sharePercentage - firstShare.sharePercentage
      : null;
  const shareDomain = getShareDomain(
    shareAvailable.map((point) => point.sharePercentage),
  );

  return (
    <section className="panel" aria-labelledby="department-trend-title">
      <div className="panel-header department-analysis-header">
        <div>
          <h2 className="panel-title" id="department-trend-title">
            {mode === "allocation"
              ? t("Department budget over time")
              : t("Share of total budget over time")}
          </h2>
          <p className="panel-subtitle">
            {mode === "allocation"
              ? t("Available financial years · ₹ crore")
              : t("Percentage of each financial year's total allocation assigned to this department")}
          </p>
        </div>
        {enableViewSelector && (
          <label className="chart-view-picker">
            <span>{t("View")}</span>
            <select
              aria-label={t("Chart view")}
              className="chart-view-select"
              onChange={(event) => {
                const nextMode = event.target.value;
                if (nextMode === "allocation" || nextMode === "share") {
                  setMode(nextMode);
                }
              }}
              value={mode}
            >
              <option value="allocation">{t("Budget allocation")}</option>
              <option value="share">{t("Share of total budget")}</option>
            </select>
          </label>
        )}
      </div>
      {!locked && (
        <div className="trend-controls">
          <label className="field-label" htmlFor="trend-department">
            {t("Department")}
            <select
              className="select-field"
              id="trend-department"
              onChange={(event) => setDepartmentId(event.target.value)}
              value={departmentId}
            >
              {[...new Map(entries.map((entry) => [entry.id, entry])).values()]
                .sort((a, b) => a.department.localeCompare(b.department))
                .map((entry) => (
                  <option data-i18n-skip="true" key={entry.id} value={entry.id}>{entry.department}</option>
                ))}
            </select>
          </label>
        </div>
      )}
      {available.length > 0 ? (
        <>
          <div className="chart-frame department-analysis-chart-frame">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={history}
                margin={{ top: 16, right: 18, bottom: 8, left: 18 }}
              >
                <CartesianGrid
                  stroke="var(--chart-grid)"
                  strokeDasharray="3 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="financialYear"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--chart-axis)" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--chart-axis)" }}
                  domain={mode === "share" ? shareDomain : undefined}
                  tickFormatter={
                    mode === "allocation"
                      ? (value: number) => formatCroreCompact(value)
                      : formatShareAxis
                  }
                  width={mode === "allocation" ? 80 : 56}
                />
                <Tooltip
                  shared={false}
                  isAnimationActive={false}
                  cursor={false}
                  content={<DepartmentHistoryTooltip mode={mode} />}
                />
                <Line
                  connectNulls={false}
                  dataKey={
                    mode === "allocation"
                      ? "departmentAllocation"
                      : "sharePercentage"
                  }
                  name={
                    mode === "allocation"
                      ? t("Department allocation")
                      : t("Share of total budget")
                  }
                  stroke="var(--chart-positive)"
                  strokeWidth={2.5}
                  dot={{ fill: "var(--chart-positive)", r: 3 }}
                  activeDot={{ r: 5 }}
                />
                {selectedYear &&
                  history.some(
                    (point) =>
                      point.financialYear === selectedYear &&
                      (mode === "allocation"
                        ? point.departmentAllocation !== null
                        : point.sharePercentage !== null),
                  ) && (
                    <ReferenceDot
                      x={selectedYear}
                      y={
                        mode === "allocation"
                          ? history.find(
                              (point) => point.financialYear === selectedYear,
                            )?.departmentAllocation ?? 0
                          : history.find(
                              (point) => point.financialYear === selectedYear,
                            )?.sharePercentage ?? 0
                      }
                      r={6}
                      fill="var(--chart-positive)"
                      stroke="var(--surface)"
                      strokeWidth={2}
                      pointerEvents="none"
                    />
                  )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="trend-metrics">
            {mode === "allocation" ? (
              <>
                <div>
                  <span>{t("First available allocation")}</span>
                  <strong>{first ? `${first.financialYear} · ${formatCroreExact(first.departmentAllocation)}` : "—"}</strong>
                </div>
                <div>
                  <span>{t("Latest available allocation")}</span>
                  <strong>{last ? `${last.financialYear} · ${formatCroreExact(last.departmentAllocation)}` : "—"}</strong>
                </div>
                <div>
                  <span>{t("Annualized change")}</span>
                  <strong>{formatPercent(cagr)}</strong>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span>{t("First available share")}</span>
                  <strong>
                    {firstShare
                      ? `${firstShare.financialYear} · ${formatShare(firstShare.sharePercentage)}`
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span>{t("Latest available share")}</span>
                  <strong>
                    {lastShare
                      ? `${lastShare.financialYear} · ${formatShare(lastShare.sharePercentage)}`
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span>{t("Share movement")}</span>
                  <strong>
                    {shareMovement === null || !Number.isFinite(shareMovement)
                      ? "—"
                      : `${shareMovement > 0 ? "+" : ""}${shareMovement.toFixed(2)} pp`}
                  </strong>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="empty-chart" role="status">
          <strong>{t("Historical data is not available for this department.")}</strong>
          {t("No records match the selected department across the available years.")}
        </div>
      )}
    </section>
  );
}

export function BudgetChangeChart({
  currentEntries,
  previousEntries,
  year,
}: {
  currentEntries: BudgetEntry[];
  previousEntries: BudgetEntry[];
  year: string;
}) {
  const { t } = useLanguage();
  const [direction, setDirection] = useState<"increase" | "decrease">("increase");
  const [metric, setMetric] = useState<"amount" | "percentage">("amount");
  const previous = new Map(previousEntries.map((entry) => [entry.id, entry]));
  const currentTotal = currentEntries.reduce((sum, entry) => sum + entry.amountCrore, 0);
  const data = currentEntries.flatMap((entry) => {
    const old = previous.get(entry.id);
    if (!old) return [];
    const amountChange = entry.amountCrore - old.amountCrore;
    const percentageChange = calculateYoY(entry.amountCrore, old.amountCrore);
    return [{
      ...entry,
      financialYear: year,
      amount: entry.amountCrore,
      amountChange,
      percentageChange,
      share: calculateShare(entry.amountCrore, currentTotal) ?? 0,
    }];
  });
  const filtered = data
    .filter((entry) =>
      metric === "percentage" && entry.percentageChange === null
        ? false
        : direction === "increase"
        ? entry.amountChange > 0
        : entry.amountChange < 0,
    )
    .sort((a, b) => {
      const aValue = metric === "amount" ? Math.abs(a.amountChange) : Math.abs(a.percentageChange ?? 0);
      const bValue = metric === "amount" ? Math.abs(b.amountChange) : Math.abs(b.percentageChange ?? 0);
      return bValue - aValue;
    })
    .slice(0, 10);

  return (
    <section className="panel" aria-labelledby="change-chart-title">
      <div className="panel-header chart-heading">
        <div>
          <h2 className="panel-title" id="change-chart-title">{t("Largest budget changes")}</h2>
          <p className="panel-subtitle">
            {year} {t("compared with the previous available year")}
          </p>
        </div>
        <div className="chart-control-groups">
          <div className="chart-controls" role="group" aria-label={t("Change direction")}>
            {(["increase", "decrease"] as const).map((value) => (
              <button
                aria-pressed={direction === value}
                key={value}
                onClick={() => setDirection(value)}
                type="button"
              >
                {t(value === "increase" ? "Increase" : "Decrease")}
              </button>
            ))}
          </div>
          <div className="chart-controls" role="group" aria-label={t("Change measurement")}>
            <button aria-pressed={metric === "amount"} onClick={() => setMetric("amount")} type="button">{t("₹ crore")}</button>
            <button aria-pressed={metric === "percentage"} onClick={() => setMetric("percentage")} type="button">%</button>
          </div>
        </div>
      </div>
      {filtered.length > 0 ? (
        <div className="change-chart">
          <ResponsiveContainer width="100%" height={Math.max(260, filtered.length * 30)}>
            <BarChart
              data={filtered}
              layout="vertical"
              margin={{ top: 8, right: 22, bottom: 8, left: 5 }}
            >
              <CartesianGrid stroke="#edf0eb" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="department"
                width={190}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#45504a", fontSize: 10 }}
              />
              <Tooltip
                shared={false}
                isAnimationActive={false}
                content={<ChartTooltip />}
              />
              <Bar
                dataKey={metric === "amount" ? "amountChange" : "percentageChange"}
                name={t(metric === "amount" ? "Absolute change" : "Percentage change")}
                fill="#4a8062"
                radius={[0, 3, 3, 0]}
              >
                <LabelList
                  dataKey={metric === "amount" ? "amountChange" : "percentageChange"}
                  position="right"
                  formatter={(value) =>
                    value == null
                      ? "—"
                      : metric === "amount"
                        ? formatCroreCompact(Number(value))
                        : formatPercent(Number(value))
                  }
                  style={{ fill: "#53615a", fontSize: 10 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-chart" role="status">
          <strong>{t("No matched year-over-year changes are available.")}</strong>
          {t("Department changes require records in both the selected and previous year, with a non-zero previous allocation.")}
        </div>
      )}
    </section>
  );
}

export function BudgetDistributionHistogram({
  entries,
}: {
  entries: BudgetEntry[];
}) {
  const { t } = useLanguage();
  const bins = [
    { name: t("Below ₹0 Cr"), min: Number.NEGATIVE_INFINITY, max: 0 },
    { name: t("₹0–1,000 Cr"), min: 0, max: 1_000 },
    { name: t("₹1,000–5,000 Cr"), min: 1_000, max: 5_000 },
    { name: t("₹5,000–10,000 Cr"), min: 5_000, max: 10_000 },
    { name: t("₹10,000–50,000 Cr"), min: 10_000, max: 50_000 },
    { name: t("₹50,000 Cr+"), min: 50_000, max: Number.POSITIVE_INFINITY },
  ];
  const data = bins.map((bin) => ({
    ...bin,
    count: entries.filter(
      (entry) =>
        entry.amountCrore >= bin.min && entry.amountCrore < bin.max,
    ).length,
  }));

  return (
    <section className="panel" aria-labelledby="histogram-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="histogram-title">{t("Budget size distribution")}</h2>
          <p className="panel-subtitle">{t("Number of departments by allocation range")}</p>
        </div>
      </div>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 18, bottom: 18, left: 0 }}>
            <CartesianGrid stroke="#e9ece7" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{ fontSize: 9 }} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip shared={false} isAnimationActive={false} />
            <Bar dataKey="count" name={t("Departments")} fill="#6e937b" radius={[3, 3, 0, 0]}>
              <LabelList dataKey="count" position="top" style={{ fill: "#45504a", fontSize: 10 }} />
              {data.map((entry) => <Cell key={entry.name} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function DepartmentHeatmap({
  records,
  years,
}: {
  records: BudgetEntry[];
  years: string[];
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [metric, setMetric] = useState<"amount" | "percentage">("amount");
  const [topN, setTopN] = useState(20);
  const [sortDescending, setSortDescending] = useState(true);

  const allDepartments = useMemo(
    () => [...new Map(records.map((record) => [record.id, record])).values()],
    [records],
  );
  const amountMap = useMemo(
    () => new Map(records.map((record) => [`${record.id}|${record.financialYear}`, record.amountCrore])),
    [records],
  );
  const visible = allDepartments
    .filter((entry) => entry.department.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) =>
      (sortDescending ? -1 : 1) * (a.amountCrore - b.amountCrore),
    )
    .slice(0, topN);
  const values = records.map((entry) => entry.amountCrore);
  const maxAmount = Math.max(...values, 1);
  const maxPercentage = 100;

  function valueFor(id: string, yearIndex: number) {
    const year = years[yearIndex];
    const amount = amountMap.get(`${id}|${year}`);
    if (amount === undefined) return null;
    if (metric === "amount") return amount;
    if (yearIndex === 0) return null;
    const previous = amountMap.get(`${id}|${years[yearIndex - 1]}`);
    return previous === undefined ? null : calculateYoY(amount, previous);
  }

  function cellStyle(value: number | null) {
    if (value === null) return { backgroundColor: "var(--surface-muted)", color: "var(--text-muted)" };
    const max = metric === "amount" ? maxAmount : maxPercentage;
    const magnitude = Math.min(Math.abs(value) / max, 1);
    if (metric === "percentage" && value < 0) {
      return {
        backgroundColor: `rgba(174, 123, 92, ${0.12 + magnitude * 0.6})`,
        color: "var(--text-primary)",
      };
    }
    return {
      backgroundColor: `rgba(63, 117, 81, ${0.1 + magnitude * 0.65})`,
      color: "var(--text-primary)",
    };
  }

  return (
    <section className="panel table-panel" aria-labelledby="heatmap-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="heatmap-title">{t("Department budget heatmap")}</h2>
          <p className="panel-subtitle">{t("Rows are ranked by the latest available allocation")}</p>
        </div>
        <div className="chart-controls" role="group" aria-label={t("Heatmap measure")}>
          <button aria-pressed={metric === "amount"} onClick={() => setMetric("amount")} type="button">{t("Budget")}</button>
          <button aria-pressed={metric === "percentage"} onClick={() => setMetric("percentage")} type="button">YoY %</button>
        </div>
      </div>
      <div className="heatmap-tools">
        <label className="sr-only" htmlFor="heatmap-search">{t("Search departments")}</label>
        <input
          className="search-field"
          id="heatmap-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("Search departments")}
          type="search"
          value={query}
        />
        <button
          className="secondary-button"
          onClick={() => setSortDescending((value) => !value)}
          type="button"
        >
          {t("Sort")} {sortDescending ? "↓" : "↑"}
        </button>
        <label className="field-label heatmap-top" htmlFor="heatmap-top">
          {t("Show")}
          <select
            className="select-field"
            id="heatmap-top"
            onChange={(event) => setTopN(Number(event.target.value))}
            value={topN}
          >
            <option value={20}>{t("Top 20")}</option>
            <option value={50}>{t("Top 50")}</option>
            <option value={allDepartments.length}>{t("All")}</option>
          </select>
        </label>
      </div>
      <div className="heatmap-wrap" role="region" aria-label={t("Department budget heatmap region")} tabIndex={0}>
        <table className="heatmap-table">
          <thead>
            <tr>
              <th scope="col">{t("Department")}</th>
              {years.map((year) => <th className="numeric" key={year} scope="col">{year}</th>)}
            </tr>
          </thead>
          <tbody>
            {visible.map((entry) => (
              <tr key={entry.id}>
                <th scope="row">
                  <Link data-i18n-skip="true" href={`/departments/${entry.id}`} title={entry.department}>
                    {entry.department}
                  </Link>
                </th>
                {years.map((year, index) => {
                  const value = valueFor(entry.id, index);
                  return (
                    <td key={year} style={cellStyle(value)} title={value === null ? t("No previous-year comparison") : metric === "amount" ? formatCroreExact(value) : formatPercent(value)}>
                      {value === null ? "—" : metric === "amount" ? formatCroreCompact(value) : formatPercent(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="empty-state" role="status">
            <strong>{t("No departments match your search.")}</strong>
            {t("Try a different department name.")}
          </div>
        )}
      </div>
    </section>
  );
}

export function DepartmentIndexedGrowthChart({
  rows,
}: {
  rows: {
    year: string;
    departmentIndex: number;
    overallIndex: number;
  }[];
}) {
  const { t } = useLanguage();
  return (
    <section className="panel" aria-labelledby="indexed-growth-chart-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="indexed-growth-chart-title">
            {t("Indexed growth")}
          </h2>
          <p className="panel-subtitle">
            {t("First common year = 100 · index values, not ₹ crore")}
          </p>
        </div>
      </div>
      {rows.length > 1 ? (
        <div className="chart-frame">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 16, right: 20, bottom: 8, left: 18 }}>
              <CartesianGrid stroke="#e9ece7" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="year" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} width={50} />
              <Tooltip shared={false} isAnimationActive={false} />
              <Legend />
              <Line
                dataKey="departmentIndex"
                name={t("Department")}
                stroke="#245c46"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                dataKey="overallIndex"
                name={t("Overall budget")}
                stroke="#b2874e"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-chart">
          {t("Indexed growth requires two or more common financial years.")}
        </div>
      )}
    </section>
  );
}
