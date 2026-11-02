"use client";

import Link from "next/link";
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
import type {
  BudgetCategory,
  BudgetCategorySummary,
} from "@/lib/data/categories";
import { useLanguage } from "@/lib/i18n/provider";
import { formatCroreCompact, formatCroreExact, formatPercent, formatShare } from "@/lib/format";

type CategoryDetailViewProps = {
  category: BudgetCategory;
  summary: BudgetCategorySummary | null;
  history: Array<{
    financialYear: string;
    total: number;
    departmentCount: number;
    shareOfTotal: number | null;
  }>;
  breakdown: Array<{
    departmentId: string;
    department: string;
    ministry: string;
    amountCrore: number;
    shareOfCategory: number | null;
    shareOfTotal: number | null;
  }>;
  year: string;
  previousYear: string;
  yoy: number | null;
  absoluteChange: number | null;
};

export function CategoryDetailView({
  category,
  summary,
  history,
  breakdown,
  year,
  previousYear,
  yoy,
  absoluteChange,
}: CategoryDetailViewProps) {
  const { t } = useLanguage();
  const historyChartData = history.map((entry) => ({
    ...entry,
    previous:
      history.findIndex((candidate) => candidate.financialYear === entry.financialYear) > 0
        ? history[history.findIndex((candidate) => candidate.financialYear === entry.financialYear) - 1]?.total ?? null
        : null,
  }));

  const departmentChartData = breakdown.map((entry) => ({
    ...entry,
    label:
      entry.department.length > 24 ? `${entry.department.slice(0, 24)}…` : entry.department,
  }));

  return (
    <main className="page-shell">
      <div className="department-header">
        <div className="department-header-title">
          <p className="eyebrow">{t("Category")}</p>
          <h1 data-i18n-skip="true">{category.name}</h1>
        </div>
        <div className="department-header-actions">
          <Link className="text-link" href={`/?year=${encodeURIComponent(year)}`}>
            {t("Back to overview")}
          </Link>
        </div>
      </div>

      <section className="detail-summary-strip" aria-label={t("Category summary")}>
        <div className="detail-metric">
          <span className="detail-metric-label">{t("Allocation")}</span>
          <strong className="detail-metric-value">
            {summary ? formatCroreExact(summary.total) : "—"}
          </strong>
          <small className="detail-metric-note">{year}</small>
        </div>
        <div className="detail-metric">
          <span className="detail-metric-label">{t("Share of total budget")}</span>
          <strong className="detail-metric-value">{formatShare(summary?.shareOfTotal ?? null)}</strong>
          <small className="detail-metric-note">{t("Selected year")}</small>
        </div>
        <div className="detail-metric">
          <span className="detail-metric-label">{t("YoY change")}</span>
          <strong className="detail-metric-value">{formatPercent(yoy)}</strong>
          <small className="detail-metric-note">vs {previousYear || "prior year"}</small>
        </div>
        <div className="detail-metric">
          <span className="detail-metric-label">{t("Departments mapped")}</span>
          <strong className="detail-metric-value">{summary?.departmentCount ?? 0}</strong>
          <small className="detail-metric-note">{year}</small>
        </div>
      </section>

      <div className="detail-main department-analysis-flow">
        <section className="panel" aria-labelledby="category-history-chart-title">
          <div className="panel-header">
            <div>
              <h2 className="panel-title" id="category-history-chart-title">
                {t("Category budget over time")}
              </h2>
              <p className="panel-subtitle">{t("Aggregate allocation across all mapped departments")}</p>
            </div>
          </div>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={historyChartData} margin={{ top: 12, right: 12, bottom: 8, left: 8 }}>
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
                  formatter={(value) => {
                    const numeric = Array.isArray(value)
                      ? Number(value[0] ?? 0)
                      : Number(value ?? 0);
                    return [formatCroreCompact(numeric), t("Allocation")];
                  }}
                  labelFormatter={(label) => `${category.name} · ${label}`}
                />
                <Line
                  dataKey="total"
                  name={category.name}
                  stroke="#245c46"
                  strokeWidth={2.5}
                  dot={{ fill: "#245c46", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel" aria-labelledby="department-allocation-chart-title">
          <div className="panel-header">
            <div>
              <h2 className="panel-title" id="department-allocation-chart-title">
                {t("Departments in")} <span data-i18n-skip="true">{category.name}</span>
              </h2>
              <p className="panel-subtitle">{t("Allocation by department")} · {year}</p>
            </div>
          </div>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={Math.max(260, breakdown.length * 28)}>
              <BarChart
                layout="vertical"
                data={departmentChartData}
                margin={{ top: 8, right: 18, left: 8, bottom: 8 }}
              >
                <CartesianGrid stroke="#e9ece7" strokeDasharray="3 4" horizontal={false} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) => formatCroreCompact(value)}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  width={140}
                />
                <Tooltip
                  shared={false}
                  isAnimationActive={false}
                  formatter={(value) => {
                    const numeric = Array.isArray(value)
                      ? Number(value[0] ?? 0)
                      : Number(value ?? 0);
                    return [formatCroreCompact(numeric), t("Allocation")];
                  }}
                  labelFormatter={(label) => String(label)}
                />
                <Bar dataKey="amountCrore" fill="#2f6f59" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="panel" aria-labelledby="category-breakdown-title">
        <div className="panel-header">
          <div>
            <h2 className="panel-title" id="category-breakdown-title">
              {t("Department breakdown")}
            </h2>
            <p className="panel-subtitle">{t("Actual department totals within this category")}</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t("Department")}</th>
                <th scope="col">{t("Ministry")}</th>
                <th className="numeric" scope="col">{t("Allocation")}</th>
                <th className="numeric" scope="col">{t("Share of category")}</th>
                <th className="numeric" scope="col">{t("Share of total")}</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.departmentId}>
                  <td>
                    <Link className="text-link" href={`/departments/${row.departmentId}?year=${encodeURIComponent(year)}`}>
                      {row.department}
                    </Link>
                  </td>
                  <td>{row.ministry}</td>
                  <td className="numeric">{formatCroreCompact(row.amountCrore)}</td>
                  <td className="numeric">{formatShare(row.shareOfCategory)}</td>
                  <td className="numeric">{formatShare(row.shareOfTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" aria-labelledby="category-history-title">
        <div className="panel-header">
          <div>
            <h2 className="panel-title" id="category-history-title">
              {t("Category trend")}
            </h2>
            <p className="panel-subtitle">{t("Allocation across years")}</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t("Financial year")}</th>
                <th className="numeric" scope="col">{t("Allocation")}</th>
                <th className="numeric" scope="col">{t("Share of total")}</th>
                <th className="numeric" scope="col">{t("Change")}</th>
                <th className="numeric" scope="col">{t("YoY %")}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => {
                const previousIndex = history.findIndex((candidate) => candidate.financialYear === entry.financialYear);
                const previous = previousIndex > 0 ? history[previousIndex - 1] : null;
                const delta = previous && previous.total !== 0 ? entry.total - previous.total : null;
                const yoyValue = previous && previous.total !== 0 ? ((entry.total - previous.total) / previous.total) * 100 : null;
                return (
                  <tr key={entry.financialYear}>
                    <td>{entry.financialYear}</td>
                    <td className="numeric">{formatCroreCompact(entry.total)}</td>
                    <td className="numeric">{formatShare(entry.shareOfTotal)}</td>
                    <td className="numeric">{delta === null ? "—" : formatCroreCompact(delta)}</td>
                    <td className="numeric">{formatPercent(yoyValue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" aria-labelledby="category-mapping-title">
        <div className="panel-header">
          <div>
            <h2 className="panel-title" id="category-mapping-title">
              {t("Mapped departments")}
            </h2>
            <p className="panel-subtitle">{t("Canonical department names included in this category")}</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table compact-table">
            <thead>
              <tr>
                <th scope="col">{t("Department")}</th>
                <th scope="col">{t("Ministry")}</th>
              </tr>
            </thead>
            <tbody>
              {category.departments.map((entry) => (
                <tr key={`${entry.ministry}:${entry.department}`}>
                  <td data-i18n-skip="true">{entry.displayName}</td>
                  <td data-i18n-skip="true">{entry.ministry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
