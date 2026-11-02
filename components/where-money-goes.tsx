"use client";

import { useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";
import type { BudgetCategorySummary } from "@/lib/data/categories";
import { useLanguage } from "@/lib/i18n/provider";
import { formatCroreExact } from "@/lib/format";

const COLORS = [
  "#2f7d62",
  "#4f8dba",
  "#d29a43",
  "#c96f7b",
  "#8b6fc2",
  "#6da66f",
  "#b5764c",
  "#6b8796",
];

function SpendingHoverCard({
  item,
}: {
  item: {
    name: string;
    rupees: number;
    total: number;
  };
}) {
  const { t } = useLanguage();

  return (
    <div className="money-goes-hover-card" role="status">
      <strong>{item.name}</strong>
      <div>
        <span>{t("Per ₹100")}</span>
        <b>₹{item.rupees.toFixed(2)}</b>
      </div>
      <small>{formatCroreExact(item.total)}</small>
    </div>
  );
}

export function WhereMoneyGoes({
  categories,
  selectedYear,
}: {
  categories: BudgetCategorySummary[];
  selectedYear: string;
}) {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    const mappedCategories = categories.filter((category) => category.total > 0);
    const total = mappedCategories.reduce(
      (sum, category) => sum + category.total,
      0,
    );

    return mappedCategories.map((category, index) => ({
      ...category,
      rupees: total > 0 ? (category.total / total) * 100 : 0,
      fill: COLORS[index % COLORS.length],
    }));
  }, [categories]);

  const activeCategoryIndex = chartData[activeIndex] ? activeIndex : 0;
  const activeItem = chartData[activeCategoryIndex];
  const hoveredItem =
    hoveredIndex !== null ? chartData[hoveredIndex] : undefined;

  if (!chartData.length) return null;

  return (
    <section className="panel money-goes-panel" aria-labelledby="money-goes-title">
      <div className="panel-header money-goes-header">
        <div>
          <p className="eyebrow">{t("Spending snapshot")}</p>
          <h2 className="panel-title" id="money-goes-title">
            {t("Where does ₹100 of government spending go?")}
          </h2>
          <p className="panel-subtitle">
            {t("Major mapped categories")} · {selectedYear}
          </p>
        </div>
        <span className="money-goes-total">₹100</span>
      </div>

      <div className="money-goes-content">
        <div className="money-goes-chart">
          {hoveredItem && <SpendingHoverCard item={hoveredItem} />}
          <ResponsiveContainer width="100%" height={270}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="rupees"
                nameKey="name"
                cy="58%"
                innerRadius={72}
                outerRadius={108}
                paddingAngle={2}
                stroke="var(--surface)"
                strokeWidth={3}
                onMouseEnter={(_, index) => {
                  setActiveIndex(index);
                  setHoveredIndex(index);
                }}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={(_, index) => setActiveIndex(index)}
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    fill={entry.fill}
                    key={entry.id}
                    opacity={index === activeCategoryIndex ? 1 : 0.78}
                    stroke={index === activeCategoryIndex ? "var(--text-primary)" : "var(--surface)"}
                    strokeWidth={index === activeCategoryIndex ? 4 : 3}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="money-goes-center" aria-hidden="true">
            <strong>₹100</strong>
            <span>{t("spending")}</span>
          </div>
        </div>

        <div className="money-goes-detail">
          <div className="money-goes-highlight">
            <span>{t("Selected category")}</span>
            <strong>{activeItem?.name}</strong>
            <b>₹{activeItem?.rupees.toFixed(2)}</b>
          </div>
          <div className="money-goes-list">
            {chartData.map((entry, index) => (
              <button
                className={`money-goes-item${index === activeCategoryIndex ? " is-active" : ""}`}
                key={entry.id}
                onClick={() => setActiveIndex(index)}
                type="button"
              >
                <span
                  className="money-goes-swatch"
                  style={{ backgroundColor: entry.fill }}
                />
                <span className="money-goes-name">{entry.name}</span>
                <strong>₹{entry.rupees.toFixed(2)}</strong>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
