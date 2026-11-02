"use client";

import { useState } from "react";
import type { BudgetMetric } from "@/lib/types/budget-analysis";
import { useLanguage } from "@/lib/i18n/provider";
import { formatCroreExact } from "@/lib/format";

const DEFICIT_IDS = [
  "fiscal_deficit",
  "revenue_deficit",
  "primary_deficit",
] as const;

const COLORS = ["var(--negative)", "var(--warning)", "var(--accent)"];

export function DeficitSnapshot({
  metrics,
}: {
  metrics: BudgetMetric[];
}) {
  const { t } = useLanguage();
  const deficitMetrics = DEFICIT_IDS.map((id) =>
    metrics.find((metric) => metric.id === id),
  ).filter((metric): metric is BudgetMetric => metric !== undefined);
  const [selectedId, setSelectedId] = useState(deficitMetrics[0]?.id ?? "");
  const selected =
    deficitMetrics.find((metric) => metric.id === selectedId) ??
    deficitMetrics[0];

  if (!selected) return null;

  return (
    <section className="panel deficit-snapshot" aria-labelledby="deficit-snapshot-title">
      <div className="deficit-snapshot-header">
        <div>
          <p className="eyebrow">{t("Fiscal position")}</p>
          <h2 className="panel-title" id="deficit-snapshot-title">
            {t("Government deficit snapshot")}
          </h2>
          <p className="panel-subtitle">
            {t("Budget estimates compared with actuals")}
          </p>
        </div>
        <span className="deficit-snapshot-note">{t("₹ crore")}</span>
      </div>

      <div className="deficit-snapshot-body">
        <div className="deficit-snapshot-feature">
          <span>{t(selected.name)}</span>
          <strong>{formatCroreExact(selected.actuals ?? 0)}</strong>
          <small>{t("Actuals")}</small>
          <div className="deficit-progress" aria-hidden="true">
            <span
              style={{
                width: `${Math.min(
                  Math.max(selected.actuals_percent_of_budget ?? 0, 0),
                  100,
                )}%`,
                background: COLORS[deficitMetrics.indexOf(selected) % COLORS.length],
              }}
            />
          </div>
          <p>
            {selected.actuals_percent_of_budget === null ||
            selected.actuals_percent_of_budget === undefined
              ? t("No utilization percentage available")
              : `${selected.actuals_percent_of_budget.toFixed(1)}% ${t("of budget estimate")}`}
          </p>
        </div>

        <div className="deficit-snapshot-options">
          {deficitMetrics.map((metric, index) => (
            <button
              className={`deficit-option${metric.id === selected.id ? " is-active" : ""}`}
              key={metric.id}
              aria-pressed={metric.id === selected.id}
              onPointerEnter={() => setSelectedId(metric.id)}
              onPointerMove={() => setSelectedId(metric.id)}
              onFocus={() => setSelectedId(metric.id)}
              onClick={() => setSelectedId(metric.id)}
              type="button"
            >
              <span
                className="deficit-option-dot"
                style={{ background: COLORS[index % COLORS.length] }}
              />
              <span>{t(metric.name)}</span>
              <strong>{formatCroreExact(metric.actuals ?? 0)}</strong>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
