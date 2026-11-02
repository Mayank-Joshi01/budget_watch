"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BudgetEntry, SchemeBudgetEntry } from "@/lib/budget-data";
import { getSchemeCagr } from "@/lib/analytics/budget";
import { useLanguage } from "@/lib/i18n/provider";
import {
  calculateShare,
  calculateYoY,
  formatCroreCompact,
  formatCroreExact,
  formatPercent,
  formatShare,
} from "@/lib/format";

const colors = ["var(--chart-positive)", "var(--chart-selected)", "var(--chart-neutral)"];
type ViewMode = "allocation" | "department-share" | "total-share";

export function SchemeComparison({
  schemes,
  records,
  departmentRecords,
  years,
  selectedYear,
}: {
  schemes: SchemeBudgetEntry[];
  records: SchemeBudgetEntry[];
  departmentRecords: BudgetEntry[];
  years: string[];
  selectedYear: string;
}) {
  const options = useMemo(
    () => [...new Map(records.map((entry) => [entry.id, entry])).values()]
      .sort((a, b) => a.scheme.localeCompare(b.scheme)),
    [records],
  );
  const { t } = useLanguage();
  const [selectedIds, setSelectedIds] = useState(
    [...new Set(schemes.slice(0, 2).map((entry) => entry.id))],
  );
  const [searches, setSearches] = useState<string[]>([]);
  const [mode, setMode] = useState<ViewMode>("allocation");
  const selected = selectedIds.flatMap((id) => {
    const option = options.find((entry) => entry.id === id);
    return option ? [option] : [];
  });
  const currentDepartmentTotals = new Map(
    departmentRecords.map((entry) => [`${entry.id}:${entry.financialYear}`, entry.amountCrore]),
  );
  const totalByYear = new Map<string, number>();
  const departmentYearSeen = new Set<string>();
  for (const entry of departmentRecords) {
    const key = `${entry.id}:${entry.financialYear}`;
    if (
      !departmentYearSeen.has(key) &&
      Number.isFinite(entry.amountCrore) &&
      entry.amountCrore >= 0
    ) {
      departmentYearSeen.add(key);
      totalByYear.set(entry.financialYear, (totalByYear.get(entry.financialYear) ?? 0) + entry.amountCrore);
    }
  }
  const histories = selected.map((option) => ({
    ...option,
    history: records.filter((entry) => entry.id === option.id),
  }));
  const chartData = years.map((financialYear) => {
    const row: Record<string, string | number | null> = { financialYear };
    for (const scheme of histories) {
      const current = scheme.history.find((entry) => entry.financialYear === financialYear);
      const amount = current?.amountCrore ?? null;
      const departmentTotal = current
        ? currentDepartmentTotals.get(`${current.departmentId}:${financialYear}`) ?? null
        : null;
      const total = totalByYear.get(financialYear) ?? null;
      row[scheme.id] = mode === "allocation"
        ? amount
        : amount === null
          ? null
          : mode === "department-share"
            ? departmentTotal === null ? null : calculateShare(amount, departmentTotal)
            : total === null ? null : calculateShare(amount, total);
    }
    return row;
  });
  const yearIndex = years.indexOf(selectedYear);
  const previousYear = yearIndex > 0 ? years[yearIndex - 1] : undefined;
  const currentEntries = schemes;
  const selectedCurrentTotal = currentEntries.reduce(
    (total, entry) =>
      Number.isFinite(entry.amountCrore) && entry.amountCrore >= 0
        ? total + entry.amountCrore
        : total,
    0,
  );

  function updateSelection(index: number, id: string) {
    setSelectedIds((ids) => ids.map((current, position) => position === index ? id : current));
  }

  return (
    <section className="panel" aria-label={t("Choose schemes to compare")}>
      <div className="compare-controls compare-controls-multi">
        {selectedIds.map((id, index) => {
          const search = searches[index] ?? "";
          const choices = options.filter((entry) =>
            `${entry.scheme} ${entry.department}`
              .toLocaleLowerCase("en-IN")
              .includes(search.toLocaleLowerCase("en-IN")) ||
            entry.id === id,
          );
          return (
            <div className="compare-select-group" key={index}>
              <label className="field-label" htmlFor={`scheme-compare-search-${index}`}>
                {t("Search scheme")} {String.fromCharCode(65 + index)}
                <input
                  className="search-field"
                  id={`scheme-compare-search-${index}`}
                  onChange={(event) => {
                    const next = [...searches];
                    next[index] = event.target.value;
                    setSearches(next);
                  }}
                  placeholder={t("Type scheme or department")}
                  type="search"
                  value={search}
                />
              </label>
              <label className="sr-only" htmlFor={`scheme-compare-${index}`}>{t("Scheme")} {String.fromCharCode(65 + index)}</label>
              <select
                className="select-field"
                id={`scheme-compare-${index}`}
                onChange={(event) => updateSelection(index, event.target.value)}
                value={id}
              >
                {choices.map((entry) => (
                  <option data-i18n-skip="true" disabled={selectedIds.includes(entry.id) && entry.id !== id} key={entry.id} value={entry.id}>
                    {entry.scheme} · {entry.department}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
        {selectedIds.length < 3 ? (
          <button
            className="secondary-button compare-add"
            onClick={() => {
              const next = options.find((entry) => !selectedIds.includes(entry.id));
              if (next) setSelectedIds((ids) => [...ids, next.id]);
            }}
            type="button"
          >
            + {t("Add scheme")}
          </button>
        ) : (
          <button className="secondary-button compare-add" onClick={() => setSelectedIds((ids) => ids.slice(0, 2))} type="button">
            {t("Remove Scheme C")}
          </button>
        )}
      </div>
      {selected.length >= 2 ? (
        <>
          <div className="compare-results compare-results-multi">
            {histories.map((scheme, index) => {
              const current = scheme.history.find((entry) => entry.financialYear === selectedYear);
              const previous = previousYear
                ? scheme.history.find((entry) => entry.financialYear === previousYear)
                : undefined;
              const departmentTotal = current
                ? currentDepartmentTotals.get(`${current.departmentId}:${selectedYear}`) ?? null
                : null;
              return (
                <article className="compare-result" key={scheme.id}>
                  <span className="compare-result-label">{t("Scheme")} {String.fromCharCode(65 + index)} · <span data-i18n-skip="true">{scheme.scheme}</span></span>
                  <strong className="compare-result-value">{current ? formatCroreExact(current.amountCrore) : "—"}</strong>
                  <span className="summary-sub" data-i18n-skip="true">{scheme.department}</span>
                  <span className="summary-sub">
                    {t("YoY")} {formatPercent(current && previous ? calculateYoY(current.amountCrore, previous.amountCrore) : null)}
                    {" · "}{t("CAGR")} {formatPercent(getSchemeCagr(scheme.history, years))}
                  </span>
                  <span className="summary-sub">
                    {formatShare(current && departmentTotal !== null ? calculateShare(current.amountCrore, departmentTotal) : null)} {t("of department")}
                    {" · "}{formatShare(current ? calculateShare(current.amountCrore, totalByYear.get(selectedYear) ?? 0) : null)} {t("of total")}
                  </span>
                </article>
              );
            })}
          </div>
          <div className="compare-view-picker">
            <label className="chart-view-picker">
              <span>{t("View")}</span>
              <select aria-label={t("Scheme comparison view")} className="chart-view-select" onChange={(event) => {
                const next = event.target.value;
                if (next === "allocation" || next === "department-share" || next === "total-share") setMode(next);
              }} value={mode}>
                <option value="allocation">{t("Budget allocation")}</option>
                <option value="department-share">{t("Share of department budget")}</option>
                <option value="total-share">{t("Share of total budget")}</option>
              </select>
            </label>
          </div>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 16, right: 24, bottom: 8, left: 18 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="financialYear" axisLine={false} tickLine={false} tick={{ fill: "var(--chart-axis)" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--chart-axis)" }} tickFormatter={mode === "allocation" ? (value: number) => formatCroreCompact(value) : (value: number) => `${Number(value.toFixed(2))}%`} width={80} />
                <Tooltip
                  shared={false}
                  isAnimationActive={false}
                  formatter={(value) =>
                    typeof value === "number"
                      ? mode === "allocation"
                        ? formatCroreExact(value)
                        : formatShare(value)
                      : "—"
                  }
                />
                <Legend />
                {histories.map((scheme, index) => (
                  <Line connectNulls={false} dataKey={scheme.id} key={scheme.id} name={scheme.scheme} stroke={colors[index]} strokeWidth={2} dot={{ r: 2 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">{t("Financial year")}</th>
                  {histories.slice(0, 2).map((scheme, index) => <th className="numeric" key={scheme.id} scope="col">{String.fromCharCode(65 + index)} · <span data-i18n-skip="true">{scheme.scheme}</span></th>)}
                  <th className="numeric" scope="col">{t("Difference (B − A)")}</th>
                </tr>
              </thead>
              <tbody>
                {years.map((financialYear) => {
                  const first = histories[0]?.history.find((entry) => entry.financialYear === financialYear)?.amountCrore;
                  const second = histories[1]?.history.find((entry) => entry.financialYear === financialYear)?.amountCrore;
                  return (
                    <tr key={financialYear}>
                      <td>{financialYear}</td>
                      {histories.slice(0, 2).map((scheme) => {
                        const amount = scheme.history.find((entry) => entry.financialYear === financialYear)?.amountCrore;
                        return <td className="numeric" key={scheme.id}>{amount === undefined ? "—" : formatCroreExact(amount)}</td>;
                      })}
                      <td className="numeric">{first === undefined || second === undefined ? "—" : formatCroreExact(second - first)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="empty-state">{t("At least two schemes with source data are needed for comparison.")}</div>
      )}
      <p className="ranking-caption">{t("Selected-year scheme allocation total:")} {formatCroreExact(selectedCurrentTotal)}. {t("This scheme-level sum is distinct from government-wide department totals.")}</p>
    </section>
  );
}
