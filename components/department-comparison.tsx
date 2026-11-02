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
import type { BudgetEntry } from "@/lib/budget-data";
import { getDepartmentCagr } from "@/lib/analytics/budget";
import { useLanguage } from "@/lib/i18n/provider";
import {
  calculateShare,
  calculateYoY,
  formatCroreCompact,
  formatCroreExact,
  formatPercent,
  formatShare,
} from "@/lib/format";

const lineColors = ["#245c46", "#b2874e", "#647da0"];

export function DepartmentComparison({
  records,
  years,
  selectedYear,
  departments,
}: {
  records: BudgetEntry[];
  years: string[];
  selectedYear: string;
  departments: BudgetEntry[];
}) {
  const { t } = useLanguage();
  const [selectedIds, setSelectedIds] = useState(
    departments.slice(0, 2).map((entry) => entry.id),
  );
  const [searches, setSearches] = useState<string[]>([]);
  const totalByYear = useMemo(
    () =>
      new Map(
        years.map((year) => [
          year,
          records
            .filter((entry) => entry.financialYear === year)
            .reduce((sum, entry) => sum + entry.amountCrore, 0),
        ]),
      ),
    [records, years],
  );
  const selected = useMemo(
    () =>
      selectedIds.flatMap((id) => {
        const entry = departments.find((candidate) => candidate.id === id);
        return entry ? [entry] : [];
      }),
    [departments, selectedIds],
  );
  const selectedHistories = selected.map((entry) => ({
    ...entry,
    history: records.filter((record) => record.id === entry.id),
  }));
  const selectedYearTotal = totalByYear.get(selectedYear) ?? 0;
  const currentRecords = records.filter((entry) => entry.financialYear === selectedYear);
  const previousYearIndex = years.indexOf(selectedYear) - 1;
  const previousYear =
    previousYearIndex >= 0 ? years[previousYearIndex] : undefined;
  const chartData = years.map((financialYear) => {
    const row: Record<string, string | number | null> = { financialYear };
    for (const department of selectedHistories) {
      row[department.id] =
        department.history.find((entry) => entry.financialYear === financialYear)
          ?.amountCrore ?? null;
    }
    return row;
  });
  const differenceRows = years.map((financialYear) => {
    const values = selectedHistories.map((department) =>
      department.history.find((entry) => entry.financialYear === financialYear)
        ?.amountCrore ?? null,
    );
    const first = values[0];
    const second = values[1];
    return {
      financialYear,
      values,
      difference:
        first !== null && second !== null ? second - first : null,
      percentage:
        first !== null && second !== null
          ? calculateYoY(second, first)
          : null,
    };
  });

  function updateSelection(index: number, nextId: string) {
    setSelectedIds((ids) =>
      ids.map((id, currentIndex) =>
        currentIndex === index ? nextId : id,
      ),
    );
  }

  function addDepartment() {
    const next = departments.find(
      (entry) => !selectedIds.includes(entry.id),
    );
    if (next && selectedIds.length < 3) {
      setSelectedIds((ids) => [...ids, next.id]);
    }
  }

  return (
    <>
      <section className="panel" aria-label={t("Choose departments to compare")}>
        <div className="compare-controls compare-controls-multi">
          {selectedIds.map((id, index) => {
            const search = searches[index] ?? "";
            const choices = departments.filter((entry) => {
              const matches =
                entry.department.toLocaleLowerCase().includes(search.toLocaleLowerCase()) ||
                entry.ministry.toLocaleLowerCase().includes(search.toLocaleLowerCase());
              return matches || entry.id === id;
            });
            return (
              <div className="compare-select-group" key={index}>
                <label className="field-label" htmlFor={`compare-search-${index}`}>
                  {t("Search Department")} {String.fromCharCode(65 + index)}
                  <input
                    className="search-field"
                    id={`compare-search-${index}`}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSearches((previous) => {
                        const next = [...previous];
                        next[index] = value;
                        return next;
                      });
                    }}
                    placeholder={t("Type a department name")}
                    type="search"
                    value={search}
                  />
                </label>
                <label className="sr-only" htmlFor={`compare-${index}`}>
                  {t("Department")} {String.fromCharCode(65 + index)}
                </label>
                <select
                  className="select-field"
                  id={`compare-${index}`}
                  onChange={(event) => updateSelection(index, event.target.value)}
                  value={id}
                >
                  {choices.map((entry) => (
                    <option
                      disabled={selectedIds.includes(entry.id) && entry.id !== id}
                      data-i18n-skip="true"
                      key={entry.id}
                      value={entry.id}
                    >
                      {entry.department}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
          {selectedIds.length < 3 ? (
            <button className="secondary-button compare-add" onClick={addDepartment} type="button">
              + {t("Add department")}
            </button>
          ) : (
            <button className="secondary-button compare-add" onClick={() => setSelectedIds((ids) => ids.slice(0, 2))} type="button">
              {t("Remove Department C")}
            </button>
          )}
        </div>
        {selected.length >= 2 ? (
          <>
            <div className="compare-results compare-results-multi" aria-live="polite">
              {selectedHistories.map((department, index) => {
                const current = department.history.find(
                  (entry) => entry.financialYear === selectedYear,
                );
                const old = previousYear
                  ? department.history.find(
                      (entry) => entry.financialYear === previousYear,
                    )
                  : undefined;
                const cagr = getDepartmentCagr(department.history, years);
                return (
                  <article className="compare-result" key={department.id}>
                    <span className="compare-result-label">
                      {t("Department")} {String.fromCharCode(65 + index)} · <span data-i18n-skip="true">{department.department}</span>
                    </span>
                    <strong className="compare-result-value">
                      {current ? formatCroreExact(current.amountCrore) : "—"}
                    </strong>
                    <span className="summary-sub">
                      {t("YoY")} {formatPercent(current && old ? calculateYoY(current.amountCrore, old.amountCrore) : null)}
                      {" · "}CAGR {formatPercent(cagr)}
                    </span>
                    <span className="summary-sub">
                      {formatShare(calculateShare(current?.amountCrore ?? 0, selectedYearTotal))} {t("of total")}
                    </span>
                  </article>
                );
              })}
            </div>
            <div className="chart-frame">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 16, right: 24, bottom: 8, left: 18 }}>
                  <CartesianGrid stroke="#e9ece7" strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="financialYear" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value: number) => formatCroreCompact(value)} width={80} />
                  <Tooltip
                    shared={false}
                    isAnimationActive={false}
                    labelFormatter={(label) => String(label)}
                    formatter={(value) => typeof value === "number" ? formatCroreExact(value) : "—"}
                  />
                  <Legend />
                  {selectedHistories.map((department, index) => (
                    <Line
                      connectNulls={false}
                      dataKey={department.id}
                      key={department.id}
                      name={department.department}
                      stroke={lineColors[index]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">{t("Financial year")}</th>
                    {selectedHistories.map((department, index) => (
                      <th className="numeric" key={department.id} scope="col">
                        {String.fromCharCode(65 + index)} · <span data-i18n-skip="true">{department.department}</span>
                      </th>
                    ))}
                    <th className="numeric" scope="col">{t("Difference (B − A)")}</th>
                    <th className="numeric" scope="col">{t("Difference %")}</th>
                  </tr>
                </thead>
                <tbody>
                  {differenceRows.map((row) => (
                    <tr key={row.financialYear}>
                      <td>{row.financialYear}</td>
                      {row.values.map((value, index) => (
                        <td className="numeric" key={selectedHistories[index].id}>
                          {value === null ? "—" : formatCroreExact(value)}
                        </td>
                      ))}
                      <td className="numeric">
                        {row.difference === null ? "—" : formatCroreExact(row.difference)}
                      </td>
                      <td className="numeric">{formatPercent(row.percentage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="ranking-caption">
              {t("Historical difference compares Department B with A. For a third selection, values are displayed in the chart and individual summaries; no performance judgment is implied.")}
            </p>
          </>
        ) : (
          <div className="empty-state">{t("At least two departments with budget data are needed.")}</div>
        )}
      </section>
      <p className="ranking-caption">
        {t("Comparison for")} {selectedYear}. {t("Budget allocation differences are descriptive and do not imply performance or priority.")}
      </p>
      {currentRecords.length === 0 && (
        <div className="empty-state">{t("No budget data is available for")} {selectedYear}.</div>
      )}
    </>
  );
}
