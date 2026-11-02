"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getPLFSData } from "@/lib/api/plfs";
import { useLanguage } from "@/lib/i18n/provider";
import type { PLFSRecord } from "@/lib/types/plfs";

function PLFSOverviewTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    value?: number | string | null;
    payload?: {
      year?: string;
    };
  }>;
}) {
  const { t } = useLanguage();
  const year = payload?.[0]?.payload?.year;

  if (!active || !year || !payload?.length) {
    return null;
  }

  return (
    <div className="chart-tooltip plfs-overview-tooltip">
      <strong>{`Financial Year: ${year}`}</strong>
      {payload.map((point) => {
        const label =
          point.dataKey === "male"
            ? t("Male")
            : point.dataKey === "female"
              ? t("Female")
              : String(point.dataKey ?? "");

        return (
          <div className="chart-tooltip-row" key={String(point.dataKey)}>
            <span>{label}</span>
            <strong>
              {point.value === null || point.value === undefined
                ? "—"
                : `${Number(point.value).toFixed(2)}%`}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

export default function PLFSOverviewChart() {
  const { t } = useLanguage();

  const [maleRecords, setMaleRecords] = useState<PLFSRecord[]>([]);
  const [femaleRecords, setFemaleRecords] = useState<PLFSRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const commonParams = {
          indicator_code: 1,
          format: "JSON" as const,
          limit: 100,
          page: 1,
          weekly_status_code: 2,
          frequency_code: 1,
          age_code: 4,
          sector_code: 3,
          social_category_code: 1,
          state_code: 99,
          education_code: 0,
          religion_code: 1,
        };

        const [male, female] = await Promise.all([
          getPLFSData({
            ...commonParams,
            gender_code: 1,
          }),
          getPLFSData({
            ...commonParams,
            gender_code: 2,
          }),
        ]);

        if (!cancelled) {
          setMaleRecords(male);
          setFemaleRecords(female);
        }
      } catch (cause: unknown) {
        if (!cancelled) {
          console.error("PLFS API error:", cause);
          setError("Unable to load PLFS data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  const data = useMemo(() => {
    const yearlyData = new Map<
      string,
      {
        year: string;
        male: number | null;
        female: number | null;
      }
    >();

    const processRecords = (
      records: PLFSRecord[],
      gender: "male" | "female",
    ) => {
      records.forEach((record) => {
        const state = String(record.state ?? "").toLowerCase();

        if (state && state !== "all india") return;

        const year = String(record.year ?? "");

        if (!year) return;

        const value = Number(record.value ?? record.rate);

        if (!Number.isFinite(value)) return;

        const existing = yearlyData.get(year) ?? {
          year,
          male: null,
          female: null,
        };

        existing[gender] = value;

        yearlyData.set(year, existing);
      });
    };

    processRecords(maleRecords, "male");
    processRecords(femaleRecords, "female");

    return Array.from(yearlyData.values()).sort((a, b) =>
      a.year.localeCompare(b.year),
    );
  }, [maleRecords, femaleRecords]);

  return (
    <Link href="/public-participation">
      <section
        className="panel"
        aria-label={t("Worker Population Ratio")}
      >
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              {t("Employment & Public Participation")}
            </h2>

            <p className="panel-subtitle">
              {t("Worker Population Ratio (WPR)")}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-chart">
            {t("Loading PLFS data...")}
          </div>
        ) : error ? (
          <div className="empty-chart" role="alert">
            {t(error)}
          </div>
        ) : data.length === 0 ? (
          <div className="empty-chart">
            {t("No PLFS data available.")}
          </div>
        ) : (
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={data}
                margin={{
                  top: 16,
                  right: 20,
                  left: 8,
                  bottom: 8,
                }}
              >
                <CartesianGrid
                  stroke="var(--chart-grid)"
                  strokeDasharray="3 4"
                  vertical={false}
                />

                <XAxis
                  dataKey="year"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />

                <YAxis
                  tickFormatter={(value: number) => `${value}%`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  width={48}
                  domain={[0, "auto"]}
                />

                <Tooltip
                  isAnimationActive={false}
                  content={<PLFSOverviewTooltip />}
                />

                <Line
                  type="monotone"
                  dataKey="male"
                  name="male"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />

                <Line
                  type="monotone"
                  dataKey="female"
                  name="female"
                  stroke="#db2777"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </Link>
  );
}