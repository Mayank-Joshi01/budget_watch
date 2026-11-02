"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useLanguage } from "@/lib/i18n/provider";
import {
  budgetAnalysisData,
  monthlyBudgetData,
  usableMetrics,
} from "@/lib/data/budget-analysis";
import type { BudgetMetric } from "@/lib/types/budget-analysis";

function money(value: number | null, t: (key: string) => string) {
  return value === null
    ? t("Not available")
    : `₹${value.toLocaleString("en-IN")} crore`;
}

function BudgetOverviewTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    value?: number | string | null;
    payload?: {
      name?: string;
    };
  }>;
}) {
  const { t } = useLanguage();
  const point = payload?.[0];
  const dataKey = point?.dataKey;

  if (!active || !point?.payload?.name || dataKey === undefined) {
    return null;
  }

  const label =
    dataKey === "be" ? t("Budget Estimate") : t("Actuals");

  return (
    <div className="chart-tooltip budget-overview-tooltip">
      <strong>{point.payload.name}</strong>
      <div className="chart-tooltip-row">
        <span>{label}</span>
        <strong>
          {money(
            point.value === null || point.value === undefined
              ? null
              : Number(point.value),
            t,
          )}
        </strong>
      </div>
    </div>
  );
}

function MetricBars({
  metrics,
  percentage = false,
}: {
  metrics: BudgetMetric[];
  percentage?: boolean;
}) {
  const { t } = useLanguage();
  const data = metrics.map((metric) => ({
    name: metric.name,
    be: metric.budget_estimates,
    actuals: metric.actuals,
    utilization: metric.actuals_percent_of_budget ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={data} margin={{ bottom: 56, left: 12 }}>
        <CartesianGrid
          stroke="var(--chart-grid)"
          strokeDasharray="3 4"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          angle={-30}
          textAnchor="end"
          interval={0}
          height={90}
        />
        <YAxis
          tickFormatter={(value: number) =>
            percentage ? `${value}%` : value.toLocaleString("en-IN")
          }
        />
        <Tooltip
          shared={false}
          isAnimationActive={false}
          formatter={(value, key) => [
            percentage
              ? `${Number(value).toFixed(1)}%`
              : money(value === null ? null : Number(value), t),
              t(key === "be" ? "Budget Estimate" : "Actuals"),
          ]}
        />
        {percentage ? (
          <Bar
            dataKey="utilization"
            name={t("Actuals as % of BE")}
            fill="var(--accent)"
            radius={[5, 5, 0, 0]}
            isAnimationActive={false}
          />
        ) : (
          <>
            <Bar
              dataKey="be"
              name={t("Budget Estimate")}
              fill="var(--chart-selected)"
              radius={[5, 5, 0, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="actuals"
              name={t("Actuals")}
              fill="var(--accent)"
              radius={[5, 5, 0, 0]}
              isAnimationActive={false}
            />
          </>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">{title}</h2>
          <p className="panel-subtitle">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function BudgetOverviewChart() {
  const { t } = useLanguage();

  const metrics = usableMetrics(
    budgetAnalysisData.sections.account_summary.metrics,
  ).filter((metric) =>
    [
      "revenue_receipts",
      "tax_revenue_net",
      "revenue_expenditure",
      "capital_expenditure",
      "total_expenditure",
    ].includes(metric.id),
  );

  const chartData = metrics.map((metric) => ({
    name: metric.name,
    be: metric.budget_estimates,
    actuals: metric.actuals,
    utilization: metric.actuals_percent_of_budget,
  }));

  const totalExpenditure = metrics.find(
    (metric) => metric.id === "total_expenditure",
  );

  const revenueReceipts = metrics.find(
    (metric) => metric.id === "revenue_receipts",
  );

  const expenditure = totalExpenditure?.actuals ?? null;
  const receipts = revenueReceipts?.actuals ?? null;

  const spendingGap =
    expenditure !== null && receipts !== null
      ? expenditure - receipts
      : null;

  const utilization =
    totalExpenditure?.actuals_percent_of_budget ?? null;

  const formatAxis = (value: number) => {
    if (Math.abs(value) >= 100000) {
      return `₹${(value / 100000).toLocaleString("en-IN", {
        maximumFractionDigits: 1,
      })}L Cr`;
    }

    if (Math.abs(value) >= 1000) {
      return `₹${(value / 1000).toLocaleString("en-IN", {
        maximumFractionDigits: 1,
      })}K Cr`;
    }

    return `₹${value.toLocaleString("en-IN")}`;
  };

  return (
    <Panel
      title={t("Where Does Government Money Go?")}
      description={`${t("Government income and expenditure")} · ₹ crore`}
    >
      <div className="space-y-5 p-3 sm:p-4">

        {/* Chart legend */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {t("Compare planned spending with actual spending")}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{
                  background: "var(--chart-selected)",
                }}
              />
              {t("Budget Estimate")}
            </span>

            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{
                  background: "var(--accent)",
                }}
              />
              {t("Actuals")}
            </span>
          </div>
        </div>

        {/* Main chart */}
        <div className="w-full" style={{ height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{
                top: 8,
                right: 24,
                left: 8,
                bottom: 8,
              }}
              barCategoryGap="25%"
              barGap={4}
            >
              <CartesianGrid
                stroke="var(--chart-grid)"
                strokeDasharray="3 5"
                horizontal={false}
              />

              <XAxis
                type="number"
                tickFormatter={formatAxis}
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 11,
                  fill: "var(--text-secondary)",
                }}
              />

              <YAxis
                type="category"
                dataKey="name"
                width={155}
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 12,
                  fill: "var(--text-secondary)",
                }}
              />

              <Tooltip
                content={<BudgetOverviewTooltip />}
                shared={false}
                isAnimationActive={false}
                cursor={{
                  fill: "var(--chart-grid)",
                  opacity: 0.2,
                }}
              />

              <Bar
                dataKey="be"
                name={t("Budget Estimate")}
                fill="var(--chart-selected)"
                radius={[0, 5, 5, 0]}
                maxBarSize={18}
                isAnimationActive={false}
              />

              <Bar
                dataKey="actuals"
                name={t("Actuals")}
                fill="var(--accent)"
                radius={[0, 5, 5, 0]}
                maxBarSize={18}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Key insights */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">
              {t("Total expenditure")}
            </p>

            <p className="mt-1 text-lg font-semibold">
              {expenditure !== null
                ? formatAxis(expenditure)
                : "—"}
            </p>

            {utilization !== null && (
              <p className="mt-1 text-xs text-muted-foreground">
                {utilization.toFixed(1)}%{" "}
                {t("of budget estimate")}
              </p>
            )}
          </div>

          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">
              {t("Government receipts")}
            </p>

            <p className="mt-1 text-lg font-semibold">
              {receipts !== null
                ? formatAxis(receipts)
                : "—"}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {t("Money received by the government")}
            </p>
          </div>

          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">
              {t("Spending minus receipts")}
            </p>

            <p className="mt-1 text-lg font-semibold">
              {spendingGap !== null
                ? formatAxis(spendingGap)
                : "—"}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {t("Not the official fiscal deficit")}
            </p>
          </div>

        </div>

        {/* Simple explanation */}
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-sm text-muted-foreground">
            {t(
              "Revenue receipts are the money received by the government. Revenue expenditure pays for regular services, while capital expenditure supports infrastructure and long-term assets. Compare the estimated and actual bars to see how spending differs from the plan.",
            )}
          </p>
        </div>

      </div>
    </Panel>
  );
}

export default function BudgetAnalysisCharts() {
  const { t } = useLanguage();
  const accountMetrics = usableMetrics(
    budgetAnalysisData.sections.account_summary.metrics,
  );
  const subsidyMetrics = budgetAnalysisData.sections.major_subsidies.metrics
    .filter((metric) => metric.id !== "total_major_subsidies");
  const deficitMetrics = accountMetrics.filter((metric) =>
    ["fiscal_deficit", "revenue_deficit", "primary_deficit"].includes(
      metric.id,
    ),
  );
  const receiptMetrics = accountMetrics.filter((metric) =>
    [
      "tax_revenue_net",
      "non_tax_revenue",
      "non_debt_capital_receipts",
      "recovery_of_loans",
      "other_receipts",
    ].includes(metric.id),
  );
  const utilizationMetrics = accountMetrics.filter(
    (metric) => metric.actuals_percent_of_budget !== null &&
      metric.actuals_percent_of_budget !== undefined,
  );
  const [monthlyCategory, setMonthlyCategory] = useState(
    monthlyBudgetData.categories[0]?.id ?? "",
  );
  const [monthlyYear, setMonthlyYear] = useState(
    monthlyBudgetData.metadata.financial_years[0] ?? "",
  );
  const category = monthlyBudgetData.categories.find(
    (entry) => entry.id === monthlyCategory,
  );
  const monthlyChartData = useMemo(
    () =>
      category?.data.flatMap((entry) => {
        const value = entry.values[monthlyYear]?.monthly;
        return value === null || value === undefined
          ? []
          : [{ month: entry.month, value }];
      }) ?? [],
    [category, monthlyYear],
  );

  return (
    <div className="inflation-history-charts">
      <Panel
        title={t("Budget Estimates vs Actuals")}
        description={t("Major receipts and expenditure recorded against the plan")}
      >
        <MetricBars metrics={accountMetrics.filter((metric) =>
          [
            "revenue_receipts",
            "tax_revenue_net",
            "non_tax_revenue",
            "revenue_expenditure",
            "capital_expenditure",
            "total_expenditure",
          ].includes(metric.id),
        )} />
      </Panel>
      <Panel
        title={t("Tax Revenue Breakdown")}
        description={t("Net tax revenue is the tax category available in the source")}
      >
        <MetricBars metrics={accountMetrics.filter((metric) => metric.id === "tax_revenue_net")} />
      </Panel>
      <Panel
        title={t("Revenue Receipts Breakdown")}
        description={t("Components shown separately; total receipts are excluded")}
      >
        <MetricBars metrics={receiptMetrics} />
      </Panel>
      <Panel
        title={t("Major Subsidies")}
        description={t("Budget Estimates vs actuals · individual categories only")}
      >
        <MetricBars metrics={subsidyMetrics} />
      </Panel>
      <Panel
        title={t("Monthly Revenue and Financing Trend")}
        description={`${t("Monthly values")} · ${t(monthlyBudgetData.metadata.unit)}`}
      >
        <div className="chart-controls">
          <select
            aria-label={t("Monthly budget category")}
            value={monthlyCategory}
            onChange={(event) => setMonthlyCategory(event.target.value)}
          >
            {monthlyBudgetData.categories.map((entry) => (
              <option data-i18n-skip="true" key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </select>
          <select
            aria-label={t("Monthly financial year")}
            value={monthlyYear}
            onChange={(event) => setMonthlyYear(event.target.value)}
          >
            {monthlyBudgetData.metadata.financial_years.map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={monthlyChartData}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value: number) => value.toLocaleString("en-IN")} />
            <Tooltip
              shared={false}
              isAnimationActive={false}
              formatter={(value) => [
                money(Number(value), t),
                t("Monthly value"),
              ]}
            />
            <Line dataKey="value" name={t("Monthly value")} stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>
      <Panel
        title={t("Budget Utilization")}
        description={t("Actuals as a percentage of Budget Estimates")}
      >
        <MetricBars metrics={utilizationMetrics} percentage />
      </Panel>
      <Panel
        title={t("Deficit Analysis")}
        description={t("Reported deficit measures, without recalculating from other metrics")}
      >
        <MetricBars metrics={deficitMetrics} />
      </Panel>
    </div>
  );
}
