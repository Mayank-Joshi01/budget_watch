"use client";

import { useMemo, useState, type KeyboardEvent } from "react";

import indiaStatesMap from "@/data/india-states-map.json";
import { useLanguage } from "@/lib/i18n/provider";

const WPR_COLORS = ["#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8", "#1e3a8a"];
const NO_DATA_COLOR = "#aab4c0";

type StateValue = {
  state: string;
  value: number;
};

function normalizeStateName(state: string) {
  const normalized = state
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (
    normalized === "nct of delhi" ||
    normalized === "national capital territory of delhi"
  ) {
    return "delhi";
  }
  if (normalized === "orissa") return "odisha";
  if (normalized === "uttaranchal") return "uttarakhand";

  return normalized;
}

function getColorIndex(value: number, min: number, max: number) {
  if (max <= min) return 2;
  return Math.min(
    WPR_COLORS.length - 1,
    Math.floor(((value - min) / (max - min)) * WPR_COLORS.length),
  );
}

export default function IndiaWprMap({
  data,
  year,
}: {
  data: StateValue[];
  year: string;
}) {
  const { t } = useLanguage();
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const valuesByState = useMemo(
    () =>
      new Map(
        data.map(({ state, value }) => [normalizeStateName(state), value]),
      ),
    [data],
  );
  const values = data.map(({ value }) => value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const regions = indiaStatesMap.features.map((feature) => ({
    ...feature,
    displayName: feature.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""),
    value: valuesByState.get(normalizeStateName(feature.name)),
  }));
  const activeRegion = regions.find(
    (region) => region.name === (hoveredState ?? selectedState),
  );

  function selectRegion(name: string) {
    setSelectedState(name);
    setHoveredState(name);
  }

  function handleKeyDown(event: KeyboardEvent<SVGPathElement>, name: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectRegion(name);
    }
  }

  return (
    <div className="plfs-map-layout">
      <div className="plfs-map-canvas">
        <svg
          className="plfs-map-svg"
          viewBox={indiaStatesMap.viewBox.join(" ")}
          role="group"
          aria-labelledby="india-wpr-map-title"
          aria-describedby="india-wpr-map-description"
        >
          <title id="india-wpr-map-title">
            {t("India state worker population ratio map")}
          </title>
          <desc id="india-wpr-map-description">
            {t("Select a state on the map to see its WPR.")}
          </desc>
          {regions.map((region) => {
            const color =
              region.value === undefined
                ? NO_DATA_COLOR
                : WPR_COLORS[getColorIndex(region.value, min, max)];

            return (
              <path
                key={region.name}
                className={`plfs-map-state${selectedState === region.name ? " plfs-map-state--selected" : ""}`}
                d={region.paths.join("")}
                fill={color}
                role="button"
                tabIndex={0}
                aria-pressed={selectedState === region.name}
                aria-label={`${t(region.displayName)}: ${
                  region.value === undefined
                    ? t("No data")
                    : `${region.value.toFixed(2)}% ${t("Worker Population Ratio (WPR)")}`
                }`}
                onPointerEnter={() => setHoveredState(region.name)}
                onPointerLeave={() => setHoveredState(null)}
                onFocus={() => setHoveredState(region.name)}
                onBlur={() => setHoveredState(null)}
                onClick={() => selectRegion(region.name)}
                onKeyDown={(event) => handleKeyDown(event, region.name)}
              />
            );
          })}
        </svg>
        <p className="plfs-map-attribution">
          {t("Map boundaries")}:{" "}
          <a href="https://www.geoboundaries.org/" target="_blank" rel="noreferrer">
            geoBoundaries
          </a>
          , DataMeet India / Election Commission of India, CC BY 2.5 IN.
        </p>
      </div>

      <aside className="plfs-map-summary">
        <div className="plfs-map-detail" aria-live="polite">
          <p className="plfs-map-label">{t("Financial year")}</p>
          <p className="plfs-map-year">{year}</p>
          {activeRegion ? (
            <>
              <h3 className="plfs-map-state-name">
                {t(activeRegion.displayName)}
              </h3>
              {activeRegion.value === undefined ? (
                <p className="plfs-map-no-data">{t("No data")}</p>
              ) : (
                <>
                  <p className="plfs-map-value">
                    {activeRegion.value.toFixed(2)}%
                  </p>
                  <p className="plfs-map-label">
                    {t("Worker Population Ratio (WPR)")}
                  </p>
                </>
              )}
            </>
          ) : (
            <p className="plfs-map-prompt">
              {t("Select a state on the map to see its WPR.")}
            </p>
          )}
        </div>

        <div className="plfs-map-legend">
          <h3>{t("Worker Population Ratio (WPR)")}</h3>
          <ul>
            {WPR_COLORS.map((color, index) => {
              const lower = min + ((max - min) * index) / WPR_COLORS.length;
              const upper =
                min + ((max - min) * (index + 1)) / WPR_COLORS.length;

              return (
                <li key={color}>
                  <span
                    className="plfs-map-swatch"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span>
                    {lower.toFixed(1)}–{upper.toFixed(1)}%
                  </span>
                </li>
              );
            })}
            <li>
              <span
                className="plfs-map-swatch plfs-map-swatch--no-data"
                aria-hidden="true"
              />
              <span>{t("No data")}</span>
            </li>
          </ul>
          <p className="plfs-map-coverage">
            {data.length} / {regions.length} {t("regions have data")}
          </p>
        </div>
      </aside>
    </div>
  );
}
