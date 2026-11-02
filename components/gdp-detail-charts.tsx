"use client";

import { useEffect, useMemo, useState } from "react";
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

type Price = "current_price" | "constant_price";
type Frequency = "annual" | "quarterly";

const BASE_PARAMS = {
  base_year: "2011-12",
  series: "Current",
  account_code: "1",
} as const;

function numericValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function yearStart(year: string) {
  return Number(year.slice(0, 4)) || 0;
}

function quarterOrder(quarter: string | null | undefined) {
  return Number(quarter?.replace("Q", "")) || 0;
}

function useGDPRequest(
  params: Record<string, string>,
) {
  const requestKey = JSON.stringify(params);
  const [result, setResult] = useState<GDPRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [completedKey, setCompletedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const requestParams = JSON.parse(requestKey) as Record<
      string,
      string
    >;

    getGDPData(requestParams)
      .then((records) => {
        if (cancelled) return;
        setResult(records);
        setError(null);
        setCompletedKey(requestKey);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        console.error("GDP API error:", cause);
        setResult([]);
        setError("Unable to load GDP data.");
        setCompletedKey(requestKey);
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  return {
    records: result,
    loading: completedKey !== requestKey,
    error: completedKey === requestKey ? error : null,
  };
}

function ChartMessage({
  loading,
  error,
  empty,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
}) {
  const { t } = useLanguage();
  if (loading) return <div className="empty-chart">{t("Loading GDP data...")}</div>;
  if (error) {
    return (
      <div className="empty-chart" role="alert">
        {t(error)}
      </div>
    );
  }
  if (empty) return <div className="empty-chart">{t("No GDP data available.")}</div>;
  return null;
}

function GDPBarChart({
  data,
  valueLabel,
  percentage = false,
  horizontal = false,
}: {
  data: Array<{
    label: string;
    value: number;
    state?: string;
    year?: string;
    quarter?: string | null;
    unit?: string;
  }>;
  valueLabel: string;
  percentage?: boolean;
  horizontal?: boolean;
}) {
  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={Math.max(360, data.length * 22)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 24, bottom: 8, left: 92 }}
        >
          <CartesianGrid
            stroke="var(--chart-grid)"
            strokeDasharray="3 4"
            horizontal={false}
          />
          <XAxis
            type="number"
            tickFormatter={(value: number) =>
              value.toLocaleString("en-IN")
            }
          />
          <YAxis
            dataKey="label"
            type="category"
            width={110}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            shared={false}
            isAnimationActive={false}
            formatter={(value) => [
              Number(value).toLocaleString("en-IN"),
              valueLabel,
            ]}
            labelFormatter={(_label, payload) =>
              payload?.[0]?.payload?.state ?? ""
            }
          />
          <Bar
            dataKey="value"
            fill="var(--accent)"
            radius={[0, 5, 5, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={370}>
      <BarChart
        data={data}
        margin={{ top: 16, right: 20, bottom: 36, left: 18 }}
      >
        <CartesianGrid
          stroke="var(--chart-grid)"
          strokeDasharray="3 4"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          interval="preserveStartEnd"
          tick={{ fontSize: 11 }}
          tickFormatter={(label: string) =>
            label.replace(/^20(\d\d)-(\d\d)/, "$1-$2")
          }
        />
        <YAxis
          tickFormatter={(value: number) =>
            percentage
              ? `${value}%`
              : value.toLocaleString("en-IN")
          }
        />
        <Tooltip
          shared={false}
          isAnimationActive={false}
          formatter={(value) => [
            percentage
              ? `${Number(value).toFixed(2)}%`
              : Number(value).toLocaleString("en-IN"),
            valueLabel,
          ]}
          labelFormatter={(_label, payload) => {
            const point = payload?.[0]?.payload as
              | {
                  state?: string;
                  year?: string;
                  quarter?: string | null;
                  unit?: string;
                }
              | undefined;
            if (!point) return "";
            const period = point.quarter
              ? `${point.year} ${point.quarter}`
              : point.year;
            return point.state
              ? `${point.state} · ${period} · ${point.unit ?? ""}`
              : `${period} · ${point.unit ?? ""}`;
          }}
        />
        <Bar
          dataKey="value"
          fill="var(--accent)"
          radius={[5, 5, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GDPDetailCharts() {
  const { t } = useLanguage();
  const [selectedState, setSelectedState] = useState("");
  const [selectedStateYear, setSelectedStateYear] = useState("");
  const [statePrice, setStatePrice] =
    useState<Price>("current_price");
  const [growthYear, setGrowthYear] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("annual");
  const [nationalYear, setNationalYear] = useState("");
  const [price, setPrice] = useState<Price>("current_price");

  const stateRequest = useGDPRequest({
    ...BASE_PARAMS,
    frequency_code: "1",
    indicator_code: "5",
  });
  const growthRequest = useGDPRequest({
    ...BASE_PARAMS,
    frequency_code: "2",
    indicator_code: "22",
  });
  const nationalRequest = useGDPRequest({
    base_year: frequency === "annual" ? "2022-23" : "2011-12",
    series: "Current",
    frequency_code: frequency === "annual" ? "1" : "2",
    indicator_code: "5",
  });

  const states = useMemo(
    () =>
      [...new Set(
        stateRequest.records
          .map((record) => record.state)
          .filter((state): state is string => Boolean(state)),
      )].sort(),
    [stateRequest.records],
  );
  const stateYears = useMemo(
    () =>
      [...new Set(stateRequest.records.map((record) => record.year))]
        .sort((first, second) => yearStart(first) - yearStart(second)),
    [stateRequest.records],
  );
  const growthYears = useMemo(
    () =>
      [...new Set(growthRequest.records.map((record) => record.year))]
        .sort((first, second) => yearStart(first) - yearStart(second)),
    [growthRequest.records],
  );
  const nationalYears = useMemo(
    () =>
      [...new Set(nationalRequest.records.map((record) => record.year))]
        .sort((first, second) => yearStart(first) - yearStart(second)),
    [nationalRequest.records],
  );
  const effectiveStateYear =
    selectedStateYear || stateYears.at(-1) || "";
  const effectiveGrowthYear =
    growthYear || growthYears.at(-1) || "";

  const stateChartData = useMemo(() => {
    const recordsByStateYear = new Map<string, GDPRecord>();

    stateRequest.records
      .filter(
        (record) =>
          (!effectiveStateYear || record.year === effectiveStateYear) &&
          (!selectedState || record.state === selectedState),
      )
      .forEach((record) => {
        const key = `${record.state ?? "Unknown state"}:${record.year}`;
        const existing = recordsByStateYear.get(key);

        if (!existing || numericValue(record[statePrice]) !== null) {
          recordsByStateYear.set(key, record);
        }
      });

    return [...recordsByStateYear.values()]
      .map((record) => ({
        label: record.state ?? "Unknown state",
        state: record.state ?? "Unknown state",
        year: record.year,
        value: numericValue(record[statePrice]),
        unit: record.unit,
      }))
      .filter(
        (record): record is typeof record & { value: number } =>
          record.value !== null,
      )
      .sort((first, second) => first.label.localeCompare(second.label));
  }, [
    selectedState,
    effectiveStateYear,
    statePrice,
    stateRequest.records,
  ]);

  const growthChartData = useMemo(
    () =>
      growthRequest.records
        .filter((record) => !effectiveGrowthYear || record.year === effectiveGrowthYear)
        .map((record) => ({
          label: record.quarter
            ? `${record.year} ${record.quarter}`
            : record.year,
          year: record.year,
          quarter: record.quarter,
          value: numericValue(record.constant_price) ??
            numericValue(record.current_price),
          unit: record.unit,
        }))
        .filter(
          (record): record is typeof record & { value: number } =>
            record.value !== null,
        )
        .sort(
          (first, second) =>
            yearStart(first.year) - yearStart(second.year) ||
            quarterOrder(first.quarter) - quarterOrder(second.quarter),
        ),
    [growthRequest.records, effectiveGrowthYear],
  );

  const nationalChartData = useMemo(
    () =>
      nationalRequest.records
        .filter((record) => !nationalYear || record.year === nationalYear)
        .map((record) => ({
          label: record.quarter
            ? `${record.year} ${record.quarter}`
            : record.year,
          year: record.year,
          quarter: record.quarter,
          value: numericValue(record[price]),
          unit: record.unit,
        }))
        .filter(
          (record): record is typeof record & { value: number } =>
            record.value !== null,
        )
        .sort(
          (first, second) =>
            yearStart(first.year) - yearStart(second.year) ||
            quarterOrder(first.quarter) - quarterOrder(second.quarter),
        ),
    [nationalRequest.records, nationalYear, price],
  );
  const stateInsight = stateChartData.length
    ? `${effectiveStateYear}: ${stateChartData
        .slice()
        .sort((first, second) => second.value - first.value)[0]?.state} has the highest GSDP in this comparison.`
    : "";
  const growthInsight = growthChartData.length
    ? `${effectiveGrowthYear}: quarterly growth ranges from ${Math.min(
        ...growthChartData.map((point) => point.value),
      ).toFixed(1)}% to ${Math.max(
        ...growthChartData.map((point) => point.value),
      ).toFixed(1)}%.`
    : "";

  return (
    <div className="inflation-history-charts">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">{t("State-wise GSDP")}</h2>
            <p className="panel-subtitle">
              {t("Compare states for one financial year")}
            </p>
          </div>
        </div>
        <div className="gdp-chart-filters">
          <label>
            {t("State")}
            <select
              value={selectedState}
              onChange={(event) => setSelectedState(event.target.value)}
            >
              <option value="">{t("All states")}</option>
              {states.map((state) => (
                <option data-i18n-skip="true" key={state} value={state}>{state}</option>
              ))}
            </select>
          </label>
          <label>
            {t("Financial year")}
            <select
              value={effectiveStateYear}
              onChange={(event) =>
                setSelectedStateYear(event.target.value)
              }
            >
              <option value="">{t("Latest year")}</option>
              {stateYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
          <label>
            {t("Price")}
            <select
              value={statePrice}
              onChange={(event) =>
                setStatePrice(event.target.value as Price)
              }
            >
              <option value="current_price">{t("Current Price")}</option>
              <option value="constant_price">{t("Constant Price")}</option>
            </select>
          </label>
        </div>
        <ChartMessage
          loading={stateRequest.loading}
          error={stateRequest.error}
          empty={stateChartData.length === 0}
        />
        {!stateRequest.loading &&
          !stateRequest.error &&
          stateChartData.length > 0 && (
            <GDPBarChart
              data={stateChartData}
              valueLabel={
                statePrice === "current_price"
                  ? t("Current Price")
                  : t("Constant Price")
              }
              horizontal
            />
          )}
        {stateInsight && <p className="gdp-chart-insight">{stateInsight}</p>}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">{t("GDP Growth Rate")}</h2>
            <p className="panel-subtitle">
              {t("Quarterly real GDP growth rate · recent year")}
            </p>
          </div>
        </div>
        <label>
          {t("Financial year")}
          <select
            value={effectiveGrowthYear}
            onChange={(event) => setGrowthYear(event.target.value)}
          >
            <option value="">{t("Latest year")}</option>
            {growthYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>
        <ChartMessage
          loading={growthRequest.loading}
          error={growthRequest.error}
          empty={growthChartData.length === 0}
        />
        {!growthRequest.loading &&
          !growthRequest.error &&
          growthChartData.length > 0 && (
            <GDPBarChart
              data={growthChartData}
              valueLabel={t("Growth rate")}
              percentage
            />
          )}
        {growthInsight && <p className="gdp-chart-insight">{growthInsight}</p>}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">{t("National GDP")}</h2>
            <p className="panel-subtitle">
              {t("Annual or quarterly GDP values")}
            </p>
          </div>
        </div>
        <div className="gdp-chart-filters">
          <label>
            {t("Frequency")}
            <select
              value={frequency}
              onChange={(event) =>
                setFrequency(event.target.value as Frequency)
              }
            >
              <option value="annual">{t("Annual")}</option>
              <option value="quarterly">{t("Quarterly")}</option>
            </select>
          </label>
          <label>
            {t("Financial year")}
            <select
              value={nationalYear}
              onChange={(event) => setNationalYear(event.target.value)}
            >
              <option value="">{t("All years")}</option>
              {nationalYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
          <label>
            {t("Price")}
            <select
              value={price}
              onChange={(event) =>
                setPrice(event.target.value as Price)
              }
            >
              <option value="current_price">{t("Current Price")}</option>
              <option value="constant_price">{t("Constant Price")}</option>
            </select>
          </label>
        </div>
        <ChartMessage
          loading={nationalRequest.loading}
          error={nationalRequest.error}
          empty={nationalChartData.length === 0}
        />
        {!nationalRequest.loading &&
          !nationalRequest.error &&
          nationalChartData.length > 0 && (
            <GDPBarChart
              data={nationalChartData}
              valueLabel={
                price === "current_price"
                  ? t("Current Price")
                  : t("Constant Price")
              }
            />
          )}
      </section>
    </div>
  );
}
