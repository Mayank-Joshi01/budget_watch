"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getGDPData } from "@/lib/api/gdp";
import { useLanguage } from "@/lib/i18n/provider";
import type { GDPRecord } from "@/lib/types/gdp";

function parseValue(value: GDPRecord["current_price"]) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatLakhCrore(value: number) {
  return `₹${value.toFixed(0)}L Cr`;
}

function formatTooltipValue(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} lakh crore`;
}

function GDPTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: {
      year?: string;
      value?: number;
    };
  }>;
}) {
  const { t } = useLanguage();
  const point = payload?.[0]?.payload;

  if (!active || !point?.year || typeof point.value !== "number") {
    return null;
  }

  return (
    <div className="chart-tooltip gdp-overview-tooltip">
      <strong>{point.year}</strong>
      <div className="chart-tooltip-row">
        <span>{t("GDP")}</span>
        <strong>{formatTooltipValue(point.value)}</strong>
      </div>
    </div>
  );
}

export default function GDPOverviewChart() {
  const { t } = useLanguage();

  const [records, setRecords] = useState<GDPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getGDPData({
      base_year: "2022-23",
      series: "Current",
      frequency_code: "1",
      indicator_code: "5",
      account_code: "1",
    })
      .then((result) => {
        if (!cancelled) {
          setRecords(result);
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) return;

        console.error("GDP API error:", cause);
        setError("Unable to load GDP data.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * GDP API returns current_price in ₹ crore.
   *
   * 1 lakh crore = 100,000 crore
   *
   * So:
   * ₹2,80,00,000 crore
   *       ↓
   * ₹280 lakh crore
   */
  const chartData = records
    .map((record) => {
      const rawValue = parseValue(record.current_price);

      return {
        year: record.year,
        value: rawValue !== null ? rawValue / 100000 : null,
        unit: record.unit,
      };
    })
    .filter(
      (record): record is typeof record & { value: number } =>
        record.value !== null,
    )
    .sort((first, second) =>
      first.year.localeCompare(second.year),
    );

  return (
    <section className="panel gdp-overview-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">
            {t("National GDP")}
          </h2>

          <p className="panel-subtitle">
            {t("Annual GDP at current prices")}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="empty-chart">
          {t("Loading GDP data...")}
        </div>
      ) : error ? (
        <div className="empty-chart" role="alert">
          {t(error)}
        </div>
      ) : chartData.length === 0 ? (
        <div className="empty-chart">
          {t("No GDP data available.")}
        </div>
      ) : (
        <div className="chart-frame">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{
                top: 12,
                right: 18,
                left: 12,
                bottom: 8,
              }}
              barCategoryGap="28%"
            >
              <CartesianGrid
                stroke="var(--chart-grid)"
                strokeDasharray="3 5"
                vertical={false}
              />

              <XAxis
                dataKey="year"
                axisLine={{
                  stroke: "var(--chart-axis)",
                }}
                tickLine={false}
                tick={{
                  fill: "var(--text-secondary)",
                  fontSize: 14,
                }}
                dy={8}
              />

              <YAxis
                width={72}
                axisLine={{
                  stroke: "var(--chart-axis)",
                }}
                tickLine={false}
                tick={{
                  fill: "var(--text-secondary)",
                  fontSize: 13,
                }}
                tickFormatter={(value: number) =>
                  formatLakhCrore(value)
                }
                domain={[0, "dataMax + 30"]}
              />

              <Tooltip
                content={<GDPTooltip />}
                shared={false}
                isAnimationActive={false}
                cursor={{
                  fill: "var(--chart-grid)",
                  opacity: 0.18,
                }}
              />

              <Bar
                dataKey="value"
                name={t("GDP")}
                fill="var(--accent)"
                radius={[7, 7, 0, 0]}
                maxBarSize={90}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}