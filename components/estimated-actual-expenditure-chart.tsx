"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EstimatedActualObservation } from "@/lib/data/estimated-actual-expenditure";
import { useLanguage } from "@/lib/i18n/provider";
import { formatCroreCompact, formatCroreExact, formatPercent } from "@/lib/format";

type ViewMode = "estimated-actual" | "variance";

function formatVarianceAmount(amount: number) {
  if (amount > 0) return `+${formatCroreExact(amount)}`;
  if (amount < 0) return formatCroreExact(amount);
  return formatCroreExact(0);
}

function ExpenditureTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: EstimatedActualObservation }>;
}) {
  const { t } = useLanguage();
  const observation = payload?.[0]?.payload;
  if (!active || !observation) return null;

  return (
    <div className="chart-tooltip">
      <strong>{observation.financialYear}</strong>
      <div className="chart-tooltip-row">
        <span>{t("Estimated expenditure")}</span>
        <strong>{formatCroreExact(observation.estimated)}</strong>
      </div>
      <div className="chart-tooltip-row">
        <span>{t("Actual expenditure")}</span>
        <strong>
          {observation.actual === null
            ? t("Not available")
            : formatCroreExact(observation.actual)}
        </strong>
      </div>
      <div className="chart-tooltip-row">
        <span>{t("Variance")}</span>
        <strong>
          {observation.variance === null
            ? t("Not available")
            : formatVarianceAmount(observation.variance)}
        </strong>
      </div>
      <div className="chart-tooltip-row">
        <span>{t("Variance %")}</span>
        <strong>{formatPercent(observation.variancePercent)}</strong>
      </div>
    </div>
  );
}

export function EstimatedActualExpenditureChart({
  observations,
  unit,
}: {
  observations: EstimatedActualObservation[];
  unit: string;
}) {
  const { t } = useLanguage();
  const [view, setView] = useState<ViewMode>("estimated-actual");
  const isVarianceView = view === "variance";
  const unitLabel = unit.toLocaleLowerCase("en-IN").includes("crore")
    ? t("₹ crore")
    : unit
      ? t(unit)
      : "";
  const maximumExpenditure = observations.reduce(
    (maximum, observation) =>
      Math.max(maximum, observation.estimated, observation.actual ?? 0),
    0,
  );

  return (
    <section className="panel" aria-labelledby="estimated-actual-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="estimated-actual-title">
            {t("Estimated vs actual expenditure")}
          </h2>
          <p className="panel-subtitle">
            {t("Comparison of budget estimates with actual expenditure")}
            {unitLabel ? ` · ${unitLabel}` : ""}
          </p>
        </div>
        <label className="chart-view-picker estimated-actual-view-picker">
          <span>{t("VIEW")}</span>
          <select
            className="chart-view-select"
            aria-label={t("View")}
            value={view}
            onChange={(event) =>
              setView(
                event.target.value === "variance"
                  ? "variance"
                  : "estimated-actual",
              )
            }
          >
            <option value="estimated-actual">{t("Estimated vs Actual")}</option>
            <option value="variance">{t("Variance %")}</option>
          </select>
        </label>
      </div>
      <div className="chart-frame estimated-actual-chart-frame">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={observations}
            margin={{ top: 12, right: 12, bottom: 8, left: 8 }}
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
              tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
              tickFormatter={(value: number) =>
                isVarianceView ? `${value}%` : formatCroreCompact(value)
              }
              domain={
                isVarianceView
                  ? ["auto", "auto"]
                  : [0, maximumExpenditure * 1.12]
              }
              width={82}
            />
            <Tooltip
              isAnimationActive={false}
              content={<ExpenditureTooltip />}
              cursor={{ fill: "var(--surface-hover)", opacity: 0.55 }}
            />
            <Legend
              content={() => (
                <div
                  className="estimated-actual-legend"
                  aria-label={t("Chart legend")}
                >
                  {isVarianceView ? (
                    <span className="estimated-actual-legend-item">
                      <span
                        className="estimated-actual-legend-swatch"
                        style={{ backgroundColor: "var(--positive)" }}
                      />
                      {t("Variance %")}
                    </span>
                  ) : (
                    <>
                      <span className="estimated-actual-legend-item">
                        <span
                          className="estimated-actual-legend-swatch"
                          style={{ backgroundColor: "var(--chart-selected)" }}
                        />
                        {t("Estimated")}
                      </span>
                      <span className="estimated-actual-legend-item">
                        <span
                          className="estimated-actual-legend-swatch"
                          style={{ backgroundColor: "var(--accent)" }}
                        />
                        {t("Actual")}
                      </span>
                    </>
                  )}
                </div>
              )}
            />
            {isVarianceView ? (
              <Line
                dataKey="variancePercent"
                name={t("Variance %")}
                stroke="var(--positive)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "var(--positive)" }}
                activeDot={{ r: 6 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ) : (
              <>
                <Line
                  dataKey="estimated"
                  name={t("Estimated")}
                  stroke="var(--chart-selected)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--chart-selected)" }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="actual"
                  name={t("Actual")}
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--accent)" }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </>
            )}
            {isVarianceView && (
              <ReferenceLine
                y={0}
                stroke="var(--chart-axis)"
                strokeDasharray="4 4"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
