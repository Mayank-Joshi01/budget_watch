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
import type { InflationRecord } from "@/lib/types/inflation";
import type { InflationApiParams } from "@/lib/types/inflation";
import cpiMetadata from "@/data/cpi_metadata.json";

type Metric = "index" | "inflation";
const ALL = "";

type CpiItem = {
  name: string;
  code: number;
};

type CpiSubClass = CpiItem & {
  items: CpiItem[];
};

type CpiClass = CpiItem & {
  subClasses: CpiSubClass[];
};

type CpiGroup = CpiItem & {
  classes: CpiClass[];
};

type CpiDivision = CpiItem & {
  groups: CpiGroup[];
};

const divisions = cpiMetadata.division as CpiDivision[];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toNumber(
  value: string | number | null | undefined
): number | null {
  if (value == null || value === "") return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getMonthNumber(month: string): number {
  const numericMonth = Number(month);

  if (
    Number.isInteger(numericMonth) &&
    numericMonth >= 1 &&
    numericMonth <= 12
  ) {
    return numericMonth;
  }

  const monthIndex = MONTHS.findIndex(
    (name) => name.toLowerCase() === month.toLowerCase()
  );

  return monthIndex >= 0 ? monthIndex + 1 : 0;
}

function monthLabel(year: string, month: string): string {
  const monthNumber = getMonthNumber(month);

  if (monthNumber >= 1 && monthNumber <= 12) {
    return `${MONTHS[monthNumber - 1].slice(0, 3)} ${year}`;
  }

  return `${month} ${year}`;
}

function getByCode<T extends CpiItem>(
  items: T[],
  code: string
): T | undefined {
  return items.find((entry) => String(entry.code) === code);
}

export default function CpiHierarchyChart() {

  const [divisionCode, setDivisionCode] = useState(ALL);
  const [groupCode, setGroupCode] = useState(ALL);
  const [classCode, setClassCode] = useState(ALL);
  const [subClassCode, setSubClassCode] = useState(ALL);
  const [itemCode, setItemCode] = useState(ALL);
  const { t } = useLanguage();
  const [records, setRecords] = useState<InflationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metric, setMetric] = useState<Metric>("index");

  // Resolve selected hierarchy entries from the by24 metadata.
  const selectedDivision = useMemo(
    () => getByCode(divisions, divisionCode),
    [divisionCode]
  );

  const groups = selectedDivision?.groups ?? [];

  const selectedGroup = useMemo(
    () => getByCode(groups, groupCode),
    [groups, groupCode]
  );

  const classes = selectedGroup?.classes ?? [];

  const selectedClass = useMemo(
    () => getByCode(classes, classCode),
    [classes, classCode]
  );

  const subClasses = selectedClass?.subClasses ?? [];

  const selectedSubClass = useMemo(
    () => getByCode(subClasses, subClassCode),
    [subClasses, subClassCode]
  );

  const items = selectedSubClass?.items ?? [];

  // Fetch CPI data when the selected hierarchy changes.
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const params: InflationApiParams = {
          base_year: "2024",
          limit: 100,
          year: "2026",
          state_code: "1",
          sector_code: "3",
          page: 1,
        };

        if (divisionCode) {
          params.division_code = divisionCode;
        }

        if (groupCode) {
          params.group_code = groupCode;
        }

        if (classCode) {
          params.class_code = classCode;
        }

        if (subClassCode) {
          params.sub_class_code = subClassCode;
        }

        if (itemCode) {
          params.item_code = itemCode;
        }

        const response = await getInflationData(params);

        if (!cancelled) {
          // The helper normally returns an array directly.
          // This also supports a response shaped like { data: [...] }.
          const responseData = response as
            | InflationRecord[]
            | { data?: InflationRecord[] }
            | null
            | undefined;

          const resultRecords = Array.isArray(responseData)
            ? responseData
            : responseData?.data ?? [];

          setRecords(resultRecords);
        }
      } catch (err) {
        console.error("Unable to load CPI data:", err);

        if (!cancelled) {
          setRecords([]);
          setError("Unable to load CPI data. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [
    divisionCode,
    groupCode,
    classCode,
    subClassCode,
    itemCode,
  ]);

  // Filter to one consistent scope and group the remaining records by month.
  const chartData = useMemo(() => {
    const grouped = new Map<
      string,
      {
        year: string;
        monthNumber: number;
        values: number[];
      }
    >();

    for (const record of records) {
      // Avoid mixing data from individual states or Rural/Urban sectors.
      if (record.state !== "All India") continue;
      if (record.sector !== "Combined") continue;

      const value = toNumber(record[metric]);

      if (value === null) continue;

      const year = String(record.year);
      const month = String(record.month);
      const monthNumber = getMonthNumber(month);

      if (monthNumber < 1 || monthNumber > 12) continue;

      const key = `${year}-${String(monthNumber).padStart(2, "0")}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          year,
          monthNumber,
          values: [],
        });
      }

      grouped.get(key)!.values.push(value);
    }

    return [...grouped.entries()]
      .map(([key, entry]) => ({
        key,
        month: monthLabel(
          entry.year,
          String(entry.monthNumber)
        ),
        value:
          entry.values.reduce((sum, current) => sum + current, 0) /
          entry.values.length,
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [records, metric]);

  const selectClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100";

  const labelClass =
    "mb-1 block text-sm font-medium text-gray-600";

  function resetFromDivision(code: string) {
    setDivisionCode(code);
    setGroupCode(ALL);
    setClassCode(ALL);
    setSubClassCode(ALL);
    setItemCode(ALL);
  }

  function resetFromGroup(code: string) {
    setGroupCode(code);
    setClassCode(ALL);
    setSubClassCode(ALL);
    setItemCode(ALL);
  }

  function resetFromClass(code: string) {
    setClassCode(code);
    setSubClassCode(ALL);
    setItemCode(ALL);
  }

  function resetFromSubClass(code: string) {
    setSubClassCode(code);
    setItemCode(ALL);
  }
  
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
        {t("Loading CPI data...")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {t(error)}
      </div>
    );
  }

  return (
    <section className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <header className="mb-5">
        <h2 className="text-xl font-semibold text-gray-900">
          {t("CPI Explorer")}
        </h2>

        <p className="mt-1 text-sm text-gray-500">

          {t("Explore consumer price data by category and view its monthly trend.")}

        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMetric("index")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            metric === "index"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {t("CPI Index")}
        </button>

        <button
          type="button"
          onClick={() => setMetric("inflation")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            metric === "inflation"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {t("Inflation Rate")}
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={labelClass}>{t("Division")}</label>

          <select
            className={selectClass}
            value={divisionCode}
            onChange={(e) => resetFromDivision(e.target.value)}
          >

            <option value={ALL}>{t("Select division")}</option>

            {divisions.map((option) => (
              <option
                key={option.code}
                value={String(option.code)}
              >
                {option.code} — {option.name}

              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>{t("Group")}</label>

          <select
            className={selectClass}
            value={groupCode}
            disabled={!divisionCode || groups.length === 0}
            onChange={(e) => resetFromGroup(e.target.value)}
          >
            <option value={ALL}>{t("Select group")}</option>

            {groups.map((option) => (
              <option
                key={option.code}
                value={String(option.code)}
              >
                {option.code} — {option.name}

              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>{t("Class")}</label>

          <select
            className={selectClass}
            value={classCode}
            disabled={!groupCode || classes.length === 0}
            onChange={(e) => resetFromClass(e.target.value)}
          >
            <option value={ALL}>{t("Select class")}</option>

            {classes.map((option) => (
              <option
                key={option.code}
                value={String(option.code)}
              >
                {option.code} — {option.name}

              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>{t("Sub class")}</label>

          <select
            className={selectClass}
            value={subClassCode}
            disabled={!classCode || subClasses.length === 0}
            onChange={(e) => resetFromSubClass(e.target.value)}
          >
            <option value={ALL}>{t("Select sub class")}</option>

            {subClasses.map((option) => (
              <option
                key={option.code}
                value={String(option.code)}
              >
                {option.code} — {option.name}

              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>{t("Item")}</label>

          <select
            className={selectClass}
            value={itemCode}
            disabled={!subClassCode || items.length === 0}
            onChange={(e) => setItemCode(e.target.value)}
          >
            <option value={ALL}>{t("Select item")}</option>

            {items.map((option) => (
              <option
                key={option.code}
                value={String(option.code)}
              >
                {option.code} — {option.name}

              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-3">
        <h3 className="text-base font-semibold text-gray-800">
          {metric === "index"
            ? t("CPI Index Trend")
            : t("Inflation Rate Trend")}
        </h3>

        <p className="mt-1 text-xs text-gray-500">

          {records.length}  {t("matching records")}

        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : loading ? (
        <div className="flex h-72 items-center justify-center rounded-xl bg-gray-50 text-sm text-gray-500">

          {t("Loading CPI data...")}
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-72 items-center justify-center rounded-xl bg-gray-50 text-sm text-gray-500">
          {t("No chart data found for this selection.")}

        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 10,
                right: 16,
                left: 0,
                bottom: 4,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                minTickGap={20}
              />

              <YAxis
                tick={{ fontSize: 12 }}
                domain={["auto", "auto"]}
              />

              <Tooltip
                shared={false}
                isAnimationActive={false}
                formatter={(value) => [
                  Number(value).toFixed(2),
                  metric === "index"
                    ? t("CPI Index")
                    : t("Inflation Rate"),
                ]}
              />

              <Line
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}