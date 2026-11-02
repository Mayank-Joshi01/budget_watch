"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BudgetEntry, SchemeBudgetEntry } from "@/lib/budget-data";
import { useLanguage } from "@/lib/i18n/provider";
import {
  calculateShare,
  formatCroreCompact,
  formatCroreExact,
  formatShare,
} from "@/lib/format";

type SchemeChartMode = "allocation" | "department-share" | "total-share";

type Point = {
  financialYear: string;
  scheme: string;
  department: string;
  allocation: number | null;
  departmentAllocation: number | null;
  totalBudget: number | null;
  departmentShare: number | null;
  totalShare: number | null;
};

function SchemeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload?: Point }[];
  label?: string;
}) {
  const { t } = useLanguage();
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="chart-tooltip">
      <strong data-i18n-skip="true">{point.scheme}</strong>
      <span data-i18n-skip="true">{point.department}</span>
      <span>{label ?? point.financialYear}</span>
      <div className="chart-tooltip-row">
        <span>{t("Allocation")}</span>
        <strong>{point.allocation === null ? "—" : formatCroreExact(point.allocation)}</strong>
      </div>
      <div className="chart-tooltip-row">
        <span>{t("Department allocation")}</span>
        <strong>{point.departmentAllocation === null ? "—" : formatCroreExact(point.departmentAllocation)}</strong>
      </div>
      <div className="chart-tooltip-row">
        <span>{t("Share of department")}</span>
        <strong>{formatShare(point.departmentShare)}</strong>
      </div>
      <div className="chart-tooltip-row">
        <span>{t("Total government budget")}</span>
        <strong>{point.totalBudget === null ? "—" : formatCroreExact(point.totalBudget)}</strong>
      </div>
      <div className="chart-tooltip-row">
        <span>{t("Share of total budget")}</span>
        <strong>{formatShare(point.totalShare)}</strong>
      </div>
    </div>
  );
}

export function SchemeBudgetAnalysis({
  history,
  years,
  selectedYear,
  departmentHistory,
  yearTotals,
  showDepartmentShare = true,
  selectedYearSummary,
}: {
  history: SchemeBudgetEntry[];
  years: string[];
  selectedYear: string;
  departmentHistory: BudgetEntry[];
  yearTotals: { financialYear: string; total: number }[];
  showDepartmentShare?: boolean;
  selectedYearSummary?: {
    schemeName: string;
    departmentName: string;
    allocation: number | null;
    shareOfTotal: number | null;
  };
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<SchemeChartMode>("allocation");
  const points = useMemo(() => {
    const schemeByYear = new Map(
      history.map((entry) => [entry.financialYear, entry]),
    );
    const departmentByYear = new Map(
      departmentHistory.map((entry) => [entry.financialYear, entry]),
    );
    const totalByYear = new Map(
      yearTotals.map((entry) => [entry.financialYear, entry.total]),
    );
    return years.flatMap((financialYear) => {
      const scheme = schemeByYear.get(financialYear);
      if (!scheme) return [];
      const departmentAllocation =
        departmentByYear.get(financialYear)?.amountCrore ?? null;
      const totalBudget = totalByYear.get(financialYear) ?? null;
      const allocation = scheme.amountCrore;
      return [{
        financialYear,
        scheme: scheme.scheme,
        department: scheme.department,
        allocation,
        departmentAllocation,
        totalBudget,
        departmentShare:
          allocation === null || departmentAllocation === null
            ? null
            : calculateShare(allocation, departmentAllocation),
        totalShare:
          allocation === null || totalBudget === null
            ? null
            : calculateShare(allocation, totalBudget),
      }];
    });
  }, [departmentHistory, history, yearTotals, years]);
  const selectedPoint = points.find((point) => point.financialYear === selectedYear);
  const valueKey =
    mode === "allocation"
      ? "allocation"
      : mode === "department-share"
        ? "departmentShare"
        : "totalShare";
  const chartValues = points.flatMap((point) => {
    const value = point[valueKey];
    return value === null ? [] : [value];
  });
  const min = chartValues.length ? Math.min(...chartValues) : 0;
  const max = chartValues.length ? Math.max(...chartValues) : 1;
  const pad = Math.max((max - min) * 0.15, Math.abs(max) * 0.03, 0.1);
  const currentValue = selectedPoint?.[valueKey] ?? null;

  return (
    <section className="panel" aria-labelledby="scheme-analysis-title">
      <div className="panel-header department-analysis-header">
        <div>
          <h2 className="panel-title" id="scheme-analysis-title">{t("Scheme budget over time")}</h2>
          <p className="panel-subtitle">{t("Unavailable years remain blank rather than being treated as zero.")}</p>
        </div>
        <label className="chart-view-picker">
          <span>{t("View")}</span>
          <select
            aria-label={t("Scheme chart view")}
            className="chart-view-select"
            onChange={(event) => {
              const next = event.target.value;
              if (next === "allocation" || next === "department-share" || next === "total-share") {
                if (!showDepartmentShare && next === "department-share") return;
                setMode(next);
              }
            }}
            value={mode}
          >
            <option value="allocation">{t("Budget allocation")}</option>
            {showDepartmentShare && (
              <option value="department-share">{t("Share of department budget")}</option>
            )}
            <option value="total-share">{t("Share of total budget")}</option>
          </select>
        </label>
      </div>
      {selectedYearSummary && (
        <div className="scheme-selected-summary">
          <div className="scheme-selected-identity">
            <strong data-i18n-skip="true">{selectedYearSummary.schemeName}</strong>
            <span data-i18n-skip="true">{selectedYearSummary.departmentName}</span>
          </div>
          <div className="scheme-selected-metrics">
            <div>
              <span>{t("Allocation ·")} {selectedYear}</span>
              <strong>
                {selectedYearSummary.allocation === null
                  ? "—"
                  : formatCroreExact(selectedYearSummary.allocation)}
              </strong>
            </div>
            <div>
              <span>{t("Share of total budget")}</span>
              <strong>{formatShare(selectedYearSummary.shareOfTotal)}</strong>
            </div>
          </div>
        </div>
      )}
      {history.length > 0 ? (
        <div className="chart-frame department-analysis-chart-frame">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 16, right: 18, bottom: 8, left: 18 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="financialYear" axisLine={false} tickLine={false} tick={{ fill: "var(--chart-axis)" }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--chart-axis)" }}
                domain={mode === "allocation" ? ["auto", "auto"] : [Math.min(0, min - pad), max + pad]}
                tickFormatter={mode === "allocation" ? (value: number) => formatCroreCompact(value) : (value: number) => `${Number(value.toFixed(2))}%`}
                width={mode === "allocation" ? 80 : 60}
              />
              <Tooltip
                shared={false}
                isAnimationActive={false}
                content={<SchemeTooltip />}
              />
              <Line
                connectNulls={false}
                dataKey={valueKey}
                name={t(mode === "allocation" ? "Allocation" : mode === "department-share" ? "Share of department" : "Share of total budget")}
                stroke="var(--chart-positive)"
                strokeWidth={2.5}
                dot={{ fill: "var(--chart-positive)", r: 3 }}
                activeDot={{ r: 5 }}
              />
              {currentValue !== null && (
                <ReferenceDot
                  x={selectedYear}
                  y={currentValue}
                  r={5}
                  fill="var(--chart-selected)"
                  stroke="var(--surface)"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-chart">{t("No historical scheme allocation is available.")}</div>
      )}
    </section>
  );
}
