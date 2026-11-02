"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BudgetCategorySummary } from "@/lib/data/categories";
import { useLanguage } from "@/lib/i18n/provider";
import { formatCroreCompact, formatCroreExact, formatShare } from "@/lib/format";

type BudgetCategoryChartProps = {
  categories: BudgetCategorySummary[];
  selectedYear: string;
};

const BAR_COLORS = [
  "#245c46",
  "#2f6f59",
  "#4f8a6e",
  "#7ea96b",
  "#a7c67c",
  "#d5e39f",
  "#f0d7a8",
  "#d7b99d",
  "#c18d7a",
  "#9d6f63",
];

function wrapCategoryLabel(label: string) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) return [words.join(" "), ""];

  const midpoint = Math.max(2, Math.ceil(words.length / 2));
  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
}

function CategoryYAxisTick({ x, y, payload }: { x?: number; y?: number; payload?: { value?: string | number } }) {
  const value = String(payload?.value ?? "");
  const [first, second] = wrapCategoryLabel(value);

  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text data-i18n-skip="true" fill="var(--text-secondary)" fontSize={13} fontWeight={500} textAnchor="end">
        {first && <tspan x={-10} dy={0}>{first}</tspan>}
        {second && <tspan x={-10} dy="1.35em">{second}</tspan>}
      </text>
    </g>
  );
}

function CategoryTooltip({
  active,
  payload,
  selectedYear,
  viewMode,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, unknown> }>;
  selectedYear: string;
  viewMode: "allocation" | "share";
}) {
  const { t } = useLanguage();
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload as
    | (BudgetCategorySummary & { fill: string; href: string })
    | undefined;
  if (!item) return null;

  const amount = viewMode === "share" ? item.shareOfTotal ?? 0 : item.total;

  return (
    <div className="chart-tooltip compact-category-tooltip">
      <strong data-i18n-skip="true">{item.name}</strong>
      <span>{selectedYear}</span>
      <div className="chart-tooltip-row">
        <span>{t(viewMode === "share" ? "Share of total budget" : "Allocation")}</span>
        <strong>{viewMode === "share" ? formatShare(amount) : formatCroreExact(amount)}</strong>
      </div>
      <div className="chart-tooltip-row">
        <span>{t(viewMode === "share" ? "Allocation" : "Share of total budget")}</span>
        <strong>{viewMode === "share" ? formatCroreExact(item.total) : formatShare(item.shareOfTotal)}</strong>
      </div>
      <div className="chart-tooltip-row">
        <span>{t("Departments")}</span>
        <strong>{item.departmentCount}</strong>
      </div>
    </div>
  );
}

export function BudgetCategoryChart({
  categories,
  selectedYear,
}: BudgetCategoryChartProps) {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<"allocation" | "share">("allocation");

  const chartData = categories.map((category, index) => ({
    ...category,
    fill: BAR_COLORS[index % BAR_COLORS.length],
    href: `/categories/${category.slug}?year=${encodeURIComponent(selectedYear)}`,
    value: viewMode === "share" ? Number(category.shareOfTotal ?? 0) : Number(category.total ?? 0),
  }));
  const maxValue = Math.max(...chartData.map((entry) => entry.value), 0);
  const chartHeight = Math.max(360, chartData.length * 38 + 36);

  return (
    <div aria-labelledby="category-budget-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="category-budget-title">
            {t("Budget allocation by major category")}
          </h2>
          <p className="panel-subtitle">
            {t("Major government spending categories")} · {selectedYear}
          </p>
        </div>

        <label className="chart-view-picker">
          <span>{t("Display")}</span>
          <select
            aria-label={t("Category chart display mode")}
            className="chart-view-select"
            value={viewMode}
            onChange={(event) => {
              const next = event.target.value;
              if (next === "share" || next === "allocation") {
                setViewMode(next);
              }
            }}
          >
            <option value="allocation">{t("Allocation")}</option>
            <option value="share">{t("Share of total budget")}</option>
          </select>
        </label>
      </div>

      {chartData.length > 0 ? (
        <div className="chart-frame category-chart-frame">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 16, right: 72, bottom: 18, left: 8 }}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" horizontal={false} />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                tickFormatter={(value: number) =>
                  viewMode === "share"
                    ? `${Number(value).toFixed(0)}%`
                    : formatCroreCompact(value)
                }
                domain={viewMode === "share" ? [0, Math.max(100, maxValue * 1.2)] : [0, maxValue * 1.12]}
                interval={0}
                allowDataOverflow
              />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                width={176}
                interval={0}
                tick={<CategoryYAxisTick />}
              />
              <Tooltip
                shared={false}
                isAnimationActive={false}
                cursor={{ fill: "var(--surface-muted)" }}
                content={<CategoryTooltip selectedYear={selectedYear} viewMode={viewMode} />}
                offset={14}
              />
              <Bar
                dataKey="value"
                barSize={28}
                isAnimationActive={false}
                radius={[0, 6, 6, 0]}
                fill="#245c46"
                label={({ x, y, width, value }) => {
                  const numericX = Number(x ?? 0);
                  const numericY = Number(y ?? 0);
                  const numericWidth = Number(width ?? 0);
                  const numericValue = Number(value ?? 0);
                  if (!numericWidth || numericValue <= 0) {
                    return null;
                  }

                  const labelText =
                    viewMode === "share"
                      ? `${numericValue.toFixed(1)}%`
                      : formatCroreCompact(numericValue);

                  return (
                    <text
                      x={numericX + numericWidth + 10}
                      y={numericY + 18}
                      fill="var(--text-primary)"
                      fontSize={11}
                      fontWeight={600}
                    >
                      {labelText}
                    </text>
                  );
                }}
              >
                {chartData.map((entry) => (
                  <Cell
                    cursor="pointer"
                    fill={entry.fill}
                    key={entry.id}
                    onClick={() => {
                      window.location.assign(entry.href);
                    }}
                    style={{ transition: "opacity 0.2s ease" }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">{t("No category data is available.")}</div>
      )}
    </div>
  );
}
