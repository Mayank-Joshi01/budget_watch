"use client";

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

import { getInflationData } from "@/lib/api/inflation";
import { useLanguage } from "@/lib/i18n/provider";
import {
  CPI_BASE_YEAR,
  MONTHS,
  type InflationApiParams,
  type InflationRecord,
} from "@/lib/types/inflation";

type Variant = "All-India" | "State-wise" | "Sector-wise";
type StateOption = { name: string; code: string };
type SectorOption = { name: string; code: string };

type InflationChartProps = {
  variant: Variant;
  states?: StateOption[];
  sectors?: SectorOption[];
  params?: InflationApiParams;
};

const MONTH_ORDER = new Map<string, number>(
  MONTHS.map((month, index) => [month, index + 1])
);

function numericValue(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getMonthNumber(month: string): number {
  const numericMonth = Number(month);
  if (Number.isInteger(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
    return numericMonth;
  }

  const normalized = month.trim().toLowerCase();
  for (const [monthName, monthNumber] of MONTH_ORDER.entries()) {
    const name = monthName.toLowerCase();
    if (name === normalized || (normalized.length >= 3 && name.startsWith(normalized))) {
      return monthNumber;
    }
  }
  return 0;
}

function InflationTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: {
      month?: string;
      inflation?: number;
    };
  }>;
}) {
  const { t } = useLanguage();
  const point = payload?.[0]?.payload;

  if (!active || !point?.month || typeof point.inflation !== "number") {
    return null;
  }

  return (
    <div className="chart-tooltip inflation-chart-tooltip">
      <strong>{point.month}</strong>
      <div className="chart-tooltip-row">
        <span>{t("Inflation")}</span>
        <strong>{point.inflation.toFixed(2)}%</strong>
      </div>
    </div>
  );
}

export default function InflationChart({
  variant,
  states = [],
  sectors = [],
  params,
}: InflationChartProps) {
  const { t } = useLanguage();
  const [records, setRecords] = useState<InflationRecord[]>([]);
  const [selectedState, setSelectedState] = useState(states[0]?.name ?? "");
  const [selectedSector, setSelectedSector] = useState(sectors[0]?.code ?? "3");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (states.length && !states.some((state) => state.name === selectedState)) {
      setSelectedState(states[0].name);
    }
  }, [states, selectedState]);

  const selectedStateOption = useMemo(
    () => states.find((state) => state.name === selectedState),
    [states, selectedState]
  );
  const activeState = selectedStateOption?.name ?? "";

  const stateCode =
    variant === "State-wise" ? selectedStateOption?.code : params?.state_code;

  const year = params?.year;
  const monthCode = params?.month_code;
  const sectorCode = params?.sector_code;
  const divisionCode = params?.division_code;
  const groupCode = params?.group_code;
  const classCode = params?.class_code;
  const subClassCode = params?.sub_class_code;
  const itemCode = params?.item_code;
  const limit = params?.limit;
  const page = params?.page;

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const apiParams: InflationApiParams = {
          base_year: CPI_BASE_YEAR,
          year,
          month_code: monthCode,
          state_code: stateCode,
          sector_code: variant === "Sector-wise" ? selectedSector : sectorCode,
          division_code: divisionCode,
          group_code: groupCode,
          class_code: classCode,
          sub_class_code: subClassCode,
          item_code: itemCode,
          limit,
          page,
        };

        const cleanedParams = Object.fromEntries(
          Object.entries(apiParams).filter(([, value]) => value !== undefined && value !== "")
        ) as InflationApiParams;

        const response = await getInflationData(cleanedParams);
        if (!cancelled) setRecords(Array.isArray(response) ? response : []);
      } catch (cause: unknown) {
        console.error("CPI API error:", cause);
        if (!cancelled) {
          setRecords([]);
          setError("Unable to load CPI data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [
    variant,
    selectedState,
    selectedStateOption?.code,
    selectedSector,
    year,
    monthCode,
    stateCode,
    sectorCode,
    divisionCode,
    groupCode,
    classCode,
    subClassCode,
    itemCode,
    limit,
    page,
  ]);

  // const selectedRecords = useMemo(
  //   () =>
  //     records.filter((record) => {
  //       if (variant === "All-India") return record.state === "All India";
  //       if (variant === "State-wise") return record.state === activeState;
  //       return true;
  //     }),
  //   [records, variant, activeState]
  // );

  const validRecords = useMemo(
    () =>
      records.flatMap((record) => {
        const inflation = numericValue(record.inflation);
        return inflation === null ? [] : [{ record, inflation }];
      }),
    [records]
  );

  const latestYear = useMemo(
    () =>
      validRecords.reduce(
        (latest, { record }) => Math.max(latest, Number(record.year)),
        0
      ),
    [validRecords]
  );

  const chartData = useMemo(() => {
    const monthlyValues = new Map<
      string,
      { monthNumber: number; month: string; values: number[] }
    >();

    for (const { record, inflation } of validRecords) {
      if (Number(record.year) !== latestYear) continue;

      const monthNumber = getMonthNumber(String(record.month));
      if (monthNumber < 1 || monthNumber > 12) continue;

      const key = `${record.year}-${String(monthNumber).padStart(2, "0")}`;
      if (!monthlyValues.has(key)) {
        monthlyValues.set(key, {
          monthNumber,
          month: String(record.month),
          values: [],
        });
      }
      monthlyValues.get(key)!.values.push(inflation);
    }

    return [...monthlyValues.entries()]
      .map(([key, entry]) => ({
        key,
        month: entry.month,
        monthNumber: entry.monthNumber,
        inflation: entry.values.reduce((sum, value) => sum + value, 0) / entry.values.length,
      }))
      .sort((a, b) => a.monthNumber - b.monthNumber);
  }, [validRecords, latestYear]);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>

          <h2 className="panel-title">{t("CPI Inflation Trend")}</h2>
          <p className="text-sm text-muted">{t("Base Year")}: 2024</p>
        </div>

        {variant === "State-wise" && (
          <select
            value={activeState}
            onChange={(event) => setSelectedState(event.target.value)}
            className="chart-select"
          >
            {states.map((state) => (
              <option key={state.code} value={state.name}>
                {state.name}
              </option>
            ))}
          </select>
        )}

        {variant === "Sector-wise" && (
          <select
            value={selectedSector}
            onChange={(event) => setSelectedSector(event.target.value)}
            className="chart-select"
          >
            {sectors.map((sector) => (
              <option key={sector.code} value={sector.code}>
                {sector.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="chart-container">
        {loading ? (
          <p className="chart-message">{t("Loading CPI data...")}</p>
        ) : error ? (
          <p className="chart-message">{t(error)}</p>
        ) : chartData.length === 0 ? (

          <p className="chart-message">{t(`No CPI data available${variant === "State-wise" && activeState ? ` for ${activeState}` : ""}`)}</p>

        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
            >
              <CartesianGrid
                stroke="var(--chart-grid)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                axisLine={{ stroke: "var(--chart-axis)" }}
                tickLine={false}
                tick={{
                  fill: "var(--text-secondary)",
                  fontSize: 12,
                }}
                tickFormatter={(month) => String(month).slice(0, 3)}
              />
              <YAxis
                axisLine={{ stroke: "var(--chart-axis)" }}
                tickLine={false}
                tick={{
                  fill: "var(--text-secondary)",
                  fontSize: 12,
                }}
                tickFormatter={(value) => `${value}%`}
                domain={["auto", "auto"]}
              />
              <Tooltip
                content={<InflationTooltip />}
                shared={false}
                isAnimationActive={false}
                cursor={{
                  stroke: "var(--chart-axis)",
                  strokeWidth: 1,
                }}
              />
              <Line
                type="monotone"
                dataKey="inflation"
                stroke="#17634d"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
