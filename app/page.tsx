import { Suspense } from "react";
import Link from "next/link";
import { TotalBudgetTimeline } from "@/components/yearly-budget-charts";
import InflationChart from "@/components/inflation-charts";
import PLFSOverviewChart from "@/components/plfs-overview";
import { BudgetOverviewChart } from "@/components/budget-analysis-chart";
import { BudgetCategoryChart } from "@/components/budget-category-chart";
import { EstimatedActualExpenditureChart } from "@/components/estimated-actual-expenditure-chart";
import { WhereMoneyGoes } from "@/components/where-money-goes";
import { DeficitSnapshot } from "@/components/deficit-snapshot";
import GDPChart from "@/components/gdp-overview";
import {
  budgetRecords,
  getDataStatus,
  getDepartments,
  getFinancialYears,
} from "@/lib/budget-data";
import { buildYearTotals, summarizeBudget } from "@/lib/analytics/budget";
import { getBudgetCategorySummaries } from "@/lib/data/categories";
import { getEstimatedActualExpenditure } from "@/lib/data/estimated-actual-expenditure";
import { budgetAnalysisData, usableMetrics } from "@/lib/data/budget-analysis";
import { formatCroreCompact } from "@/lib/format";

type PageProps = {
  searchParams: Promise<{ year?: string; level?: string }>;
};

function DashboardSkeleton() {
  return (
    <div className="summary-grid" aria-label="Loading budget dashboard">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="summary-card skeleton" key={index} />
      ))}
    </div>
  );
}

async function DashboardData({ searchParams }: PageProps) {
  const dataStatus = getDataStatus();

  if (dataStatus.errors.length > 0 || dataStatus.isEmpty) {
    return (
      <section className="panel error-state" role="alert">
        <h2>We couldn&apos;t load the budget data.</h2>
        <p>
          Check that valid JSON files are available in the project&apos;s{" "}
          <code>data/</code> folder, then try again.
        </p>
        <Link className="secondary-button" href="/">Retry</Link>
      </section>
    );
  }

  const query = await searchParams;
  const years = getFinancialYears().map((entry) => entry.year);
  const selectedYear =
    query.year && years.includes(query.year)
      ? query.year
      : years.at(-1) ?? "";
  const entries = getDepartments(selectedYear);
  const summary = summarizeBudget(entries);
  const yearTotals = buildYearTotals(budgetRecords, years);
  const expenditure = getEstimatedActualExpenditure();
  const initialId = [...entries].sort(
    (a, b) => b.amountCrore - a.amountCrore,
  )[0]?.id ?? "";

  return (
    <>
      <section className="summary-grid" aria-label={`Budget summary for ${selectedYear}`}>
        <article className="summary-card">
          <span className="summary-label">Total budget</span>
          <strong className="summary-value">
            {formatCroreCompact(summary.total)}
          </strong>
          <span className="summary-sub">{selectedYear} · ₹ crore</span>
        </article>
        <article className="summary-card">
          <span className="summary-label">Departments</span>
          <strong className="summary-value">{summary.count.toLocaleString("en-IN")}</strong>
          <span className="summary-sub">With valid budget data</span>
        </article>
        <article className="summary-card">
          <span className="summary-label">Highest allocation</span>
          <strong className="summary-value">
            {summary.largest
              ? formatCroreCompact(summary.largest.amountCrore)
              : "—"}
          </strong>
          <span className="summary-sub">
            {summary.largest?.department ?? "No data"}
          </span>
        </article>
        <article className="summary-card">
          <span className="summary-label">Median department budget</span>
          <strong className="summary-value">
            {summary.median === null
              ? "—"
              : formatCroreCompact(summary.median)}
          </strong>
          <span className="summary-sub">Middle allocation by department</span>
        </article>
      </section>

      <DeficitSnapshot
        metrics={usableMetrics(
          budgetAnalysisData.sections.account_summary.metrics,
        )}
      />

      <div className="h-2 mt-4 mb-2" >
        <p>
          
        </p>
      </div>

      <div className="overview-analysis-row">
        <section className="panel overview-major-category-panel">
          <BudgetCategoryChart
            categories={getBudgetCategorySummaries(selectedYear)}
            selectedYear={selectedYear}
          />
        </section>
        <Link href="/gdp">
          <GDPChart />
        </Link>
      </div>

      <div className="overview-flow">
        <WhereMoneyGoes
          categories={getBudgetCategorySummaries(selectedYear)}
          selectedYear={selectedYear}
        />
        <Link href="/budget-analysis">
          <BudgetOverviewChart />
        </Link>

        <Link href="/inflation">
          <InflationChart
            variant="All-India"
            params={{
              year: "2026",
              sector_code: "3",
              state_code: "1",
              division_code: "0",
              limit: 100,
              page: 1,
            }}
          />
        </Link>
        <EstimatedActualExpenditureChart
          observations={expenditure.observations}
          unit={expenditure.unit}
        />
        <PLFSOverviewChart />
        <TotalBudgetTimeline yearTotals={yearTotals} />
      </div>
    </>
  );
}

export default function Home(props: PageProps) {
  return (
    <main className="page-shell">
      <section className="page-intro">
        <div>
          <p className="eyebrow">Public finance · India</p>
          <h1>Budget Watch</h1>
          <p className="intro-copy">
            Explore how government budgets flow from departments into schemes
            and change across financial years.
          </p>
        </div>
      </section>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData searchParams={props.searchParams} />
      </Suspense>
      <section className="data-footer-note">
        Amounts are shown in ₹ crore. Allocation changes describe budget
        movements only and do not imply performance or outcomes.
      </section>
    </main>
  );
}
