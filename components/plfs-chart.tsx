"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useLanguage } from "@/lib/i18n/provider";

import IndiaWprMap from "@/components/india-wpr-map";
import { getPLFSData } from "@/lib/api/plfs";
import type { PLFSApiParams, PLFSRecord } from "@/lib/types/plfs";
import { PLFS_INDICATORS, PLFS_YEARS } from "@/lib/types/plfs";

const STATE_CODES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
  19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 35, 36,
  37, 38,
].join(",");

const COMMON_FILTERS = {
  format: "JSON",
  frequency_code: 1,
  limit: 200,
  page: 1,
  age_code: 4,
  education_code: 0,
  religion_code: 1,
  sector_code: 3,
  weekly_status_code: 2,
  year_type_code: 1,
} as const;

type RequestState = {
  records: PLFSRecord[];
  loading: boolean;
  error: string | null;
};

function usePLFSRequest(params: PLFSApiParams): RequestState {
  const key = JSON.stringify(params);
  const [records, setRecords] = useState<PLFSRecord[]>([]);
  const [completedKey, setCompletedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const requestParams = JSON.parse(key) as PLFSApiParams;

    getPLFSData(requestParams)
      .then((result) => {
        if (cancelled) return;
        setRecords(result);
        setError(null);
        setCompletedKey(key);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        console.error("PLFS API error:", cause);
        setRecords([]);
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load PLFS data.",
        );
        setCompletedKey(key);
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return {
    records,
    loading: completedKey !== key,
    error: completedKey === key ? error : null,
  };
}

function numberValue(record: PLFSRecord) {
  const value = Number(record.value ?? record.rate);
  return Number.isFinite(value) ? value : null;
}

function recordYear(record: PLFSRecord) {
  return String(record.year ?? "");
}

function recordGender(record: PLFSRecord) {
  return String(record.gender ?? "").trim().toLowerCase();
}

function isAllIndia(record: PLFSRecord) {
  return String(record.state ?? "").trim().toLowerCase() === "all india";
}

function Message({
  request,
  empty,
}: {
  request: RequestState;
  empty: boolean;
}) {
  const { t } = useLanguage();
  if (request.loading) {
    return <div className="empty-chart">{t("Loading PLFS data...")}</div>;
  }
  if (request.error) {
    return (
      <div className="empty-chart" role="alert">
        {t(request.error)}
      </div>
    );
  }
  return empty ? (
    <div className="empty-chart">{t("No PLFS data available.")}</div>
  ) : null;
}

function PercentageAxis() {
  return (
    <YAxis
      domain={[0, "auto"]}
      tickFormatter={(value: number) => `${value}%`}
      width={52}
    />
  );
}

export default function PLFSCharts() {
  const { t } = useLanguage();
  const [stateYear, setStateYear] = useState("2023-24");

  const unemployment = usePLFSRequest({
    ...COMMON_FILTERS,
    indicator_code: PLFS_INDICATORS.unemployment,
    gender_code: 3,
    state_code: 99,
  });
  const stateEmployment = usePLFSRequest({
    ...COMMON_FILTERS,
    indicator_code: PLFS_INDICATORS.wpr,
    state_code: STATE_CODES,
    year: stateYear,
  });
  const maleLfpr = usePLFSRequest({
    ...COMMON_FILTERS,
    indicator_code: PLFS_INDICATORS.lfpr,
    gender_code: 1,
    state_code: 99,
  });
  const femaleLfpr = usePLFSRequest({
    ...COMMON_FILTERS,
    indicator_code: PLFS_INDICATORS.lfpr,
    gender_code: 2,
    state_code: 99,
  });

  const unemploymentData = useMemo(
    () =>
      unemployment.records
        .filter(
          (record) =>
            isAllIndia(record) && recordGender(record) === "person",
        )
        .map((record) => ({
          year: recordYear(record),
          value: numberValue(record),
        }))
        .filter(
          (record): record is { year: string; value: number } =>
            Boolean(record.year) && record.value !== null,
        )
        .sort((a, b) => a.year.localeCompare(b.year)),
    [unemployment.records],
  );

  const stateData = useMemo(
    () => {
      const byState = new Map<string, number>();

      for (const record of stateEmployment.records) {
        if (isAllIndia(record) || recordGender(record) !== "person") {
          continue;
        }

        const value = numberValue(record);
        if (value !== null && record.state) {
          byState.set(record.state, value);
        }
      }

      return [...byState.entries()]
        .map(([state, value]) => ({ state, value }))
        .sort((a, b) => a.state.localeCompare(b.state));
    },
    [stateEmployment.records],
  );

  const lfprData = useMemo(() => {
    const values = new Map<
      string,
      { year: string; male: number | null; female: number | null }
    >();

    for (const record of maleLfpr.records) {
      if (!isAllIndia(record)) continue;
      const value = numberValue(record);
      if (value === null) continue;
      values.set(recordYear(record), {
        year: recordYear(record),
        male: value,
        female: values.get(recordYear(record))?.female ?? null,
      });
    }
    for (const record of femaleLfpr.records) {
      if (!isAllIndia(record)) continue;
      const value = numberValue(record);
      if (value === null) continue;
      values.set(recordYear(record), {
        year: recordYear(record),
        male: values.get(recordYear(record))?.male ?? null,
        female: value,
      });
    }

    return [...values.values()]
      .filter((record) => record.male !== null || record.female !== null)
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [femaleLfpr.records, maleLfpr.records]);

  const stateRanking = stateData
    .slice()
    .sort((a, b) => b.value - a.value);
  const stateInsight = stateRanking.length
    ? `${stateYear}: ${stateRanking[0].state} leads this comparison at ${stateRanking[0].value.toFixed(1)}%; ${stateRanking.at(-1)?.state} is lowest at ${stateRanking.at(-1)?.value.toFixed(1)}%.`
    : "";
  const lfprInsight = lfprData.length
    ? `The latest available year shows a ${(
        (lfprData.at(-1)?.male ?? 0) - (lfprData.at(-1)?.female ?? 0)
      ).toFixed(1)} percentage-point male–female gap.`
    : "";

  return (
    <div className="inflation-history-charts plfs-charts">
      <section className="panel" aria-label={t("Unemployment Rate vs Years")}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title">{t("Unemployment Rate vs Years")}</h2>
            <p className="panel-subtitle">{t("Annual PLFS unemployment rate · All India")}</p>
          </div>
        </div>
        <Message request={unemployment} empty={!unemploymentData.length} />
        {!unemployment.loading && !unemployment.error && unemploymentData.length > 0 && (
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={unemploymentData} margin={{ top: 16, right: 20, bottom: 12, left: 8 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="year" />
                <PercentageAxis />
                <Tooltip
                  shared={false}
                  isAnimationActive={false}
                  formatter={(value) => [
                    `${Number(value).toFixed(2)}%`,
                    t("Unemployment Rate"),
                  ]}
                />
                <Bar dataKey="value" fill="var(--accent)" radius={[5, 5, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="panel" aria-label={t("State-wise Employment Percentage")}>
        <div className="panel-header plfs-panel-header">
          <div>
            <h2 className="panel-title">{t("State-wise Employment Percentage")}</h2>
            <p className="panel-subtitle">{t("Worker Population Ratio · Person · Rural + Urban")}</p>
          </div>
          <label className="plfs-year-control">
            <span>{t("Financial year")}</span>
            <select value={stateYear} onChange={(event) => setStateYear(event.target.value)}>
              {PLFS_YEARS.slice().reverse().map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </label>
        </div>
        <Message request={stateEmployment} empty={!stateData.length} />
        {!stateEmployment.loading && !stateEmployment.error && stateData.length > 0 && (
          <>
            <div className="plfs-map-chart">
              <IndiaWprMap data={stateData} year={stateYear} />

            </div>
            <p className="plfs-insight">{stateInsight}</p>
          </>
        )}
      </section>

      <section className="panel" aria-label={t("Labour Force Participation Rate")}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title">{t("Labour Force Participation Rate")}</h2>
            <p className="panel-subtitle">{t("Male vs Female · All India · Annual PLFS")}</p>
          </div>
        </div>
        <Message
          request={{
            loading: maleLfpr.loading || femaleLfpr.loading,
            error: maleLfpr.error ?? femaleLfpr.error,
            records: [],
          }}
          empty={!lfprData.length}
        />
        {!maleLfpr.loading && !femaleLfpr.loading && !maleLfpr.error && !femaleLfpr.error && lfprData.length > 0 && (
          <>
            <div className="chart-frame">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={lfprData} margin={{ top: 16, right: 20, bottom: 12, left: 8 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="year" />
                  <PercentageAxis />
                  <Tooltip
                    shared={false}
                    isAnimationActive={false}
                    formatter={(value, name) => [
                      `${Number(value).toFixed(2)}%`,
                      name === "male" ? t("Male") : t("Female"),
                    ]}
                  />
                  <Line dataKey="male" name="male" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
                  <Line dataKey="female" name="female" stroke="#db2777" strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="plfs-insight">{lfprInsight}</p>
          </>
        )}
      </section>
    </div>
  );
}
