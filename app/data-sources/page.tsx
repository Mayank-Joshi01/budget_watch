import { getDataStatus, getDatasetMetadata } from "@/lib/budget-data";

const officialSources = [
  {
    name: "Ministry of Statistics and Programme Implementation (MoSPI)",
    shortName: "MoSPI",
    description:
      "Official Government of India statistical data platform used for macroeconomic and socio-economic indicators.",
    website: "https://esankhyiki.mospi.gov.in/",
    datasets: [
      "GDP and national accounts",
      "State-wise GDP and related economic indicators",
      "Consumer Price Index (CPI)",
      "Inflation and item-wise price indices",
    ],
  },
  {
    name: "Periodic Labour Force Survey (PLFS)",
    shortName: "PLFS",
    description:
      "Official labour-market statistics published by MoSPI and used to analyze employment, unemployment and labour-force indicators.",
    website: "https://api.mospi.gov.in/api/plfs/",
    datasets: [
      "Employment and unemployment",
      "Labour force participation",
      "Worker population indicators",
      "Male and female employment indicators",
      "Rural and urban labour-market statistics",
    ],
  },
  {
    name: "Union Budget — Government of India",
    shortName: "India Budget",
    description:
      "Official Union Budget portal maintained by the Government of India. Used for historical Union Budget allocations and expenditure information.",
    website: "https://www.indiabudget.gov.in/previous_union_budget.php",
    datasets: [
      "Ministry-wise budget allocations",
      "Department-wise allocations",
      "Scheme and programme allocations",
      "Historical Union Budgets",
      "Government expenditure distribution",
    ],
  },
  {
    name: "Controller General of Accounts (CGA)",
    shortName: "CGA",
    description:
      "Official Government of India source for Union Government accounts, receipts, expenditure and fiscal information.",
    website: "https://cga.nic.in/",
    datasets: [
      "Government receipts",
      "Tax revenue",
      "Non-tax revenue",
      "Government expenditure",
      "Monthly accounts",
      "Fiscal and budgetary information",
    ],
  },
];

export default function DataSourcesPage() {
  const datasets = getDatasetMetadata();
  const status = getDataStatus();

  return (
    <main className="page-shell data-sources-page">
      {/* Header */}
      <section className="page-intro">
        <div>
          <p className="eyebrow">Data, methodology & provenance</p>

          <h1>Official data sources</h1>

          <p className="intro-copy">
            Budget Watch uses publicly available data published by official
            Government of India institutions. We collect, normalize and
            present this information in a more accessible form for analysis
            and comparison.
          </p>
        </div>
      </section>

      {/* Trust banner */}
      <section className="panel">
        <div className="data-trust-header">
          <div>
            <p className="eyebrow">Data provenance</p>

            <h2>
              Built from official Government of India data
            </h2>

            <p>
              The primary sources used by Budget Watch are government
              ministries, departments and official statistical portals.
              Local JSON files used by the application are processed
              representations of these datasets and are not treated as
              independent sources.
            </p>
          </div>

          <div className="trust-badge">
            <span className="trust-badge-dot" />
            Official sources
          </div>
        </div>
      </section>

      {/* Official Sources */}
      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">Primary sources</p>

          <h2>Government data portals</h2>

          <p>
            These are the original public sources from which the platform
            obtains its data.
          </p>
        </div>

        <div className="source-grid">
          {officialSources.map((source) => (
            <article className="source-card" key={source.shortName}>
              <div className="source-card-top">
                <div>
                  <span className="source-label">
                    Official Government Source
                  </span>

                  <h3>{source.name}</h3>
                </div>

                <span className="source-acronym">
                  {source.shortName}
                </span>
              </div>

              <p>{source.description}</p>

              <div className="source-data">
                <strong>Data used for</strong>

                <ul>
                  {source.datasets.map((dataset) => (
                    <li key={dataset}>{dataset}</li>
                  ))}
                </ul>
              </div>

              <a
                href={source.website}
                target="_blank"
                rel="noopener noreferrer"
                className="source-link"
              >
                Visit official source
                <span aria-hidden="true">↗</span>
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* How data is used */}
      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">Data pipeline</p>

          <h2>How Budget Watch uses these sources</h2>

          <p>
            Budget Watch does not consider its local processed files to be
            the original source of information. They are an application
            layer used to make official datasets easier to query and
            visualize.
          </p>
        </div>

        <div className="pipeline-grid">
          <div className="pipeline-step">
            <span className="pipeline-number">01</span>

            <h3>Official publication</h3>

            <p>
              Government departments publish statistics, budgets, accounts
              and economic indicators through their official portals and
              APIs.
            </p>
          </div>

          <div className="pipeline-step">
            <span className="pipeline-number">02</span>

            <h3>Data collection</h3>

            <p>
              Relevant datasets are collected from official APIs,
              government portals and published budget/account documents.
            </p>
          </div>

          <div className="pipeline-step">
            <span className="pipeline-number">03</span>

            <h3>Normalization</h3>

            <p>
              Data is cleaned and structured so that different years,
              departments and indicators can be compared consistently.
            </p>
          </div>

          <div className="pipeline-step">
            <span className="pipeline-number">04</span>

            <h3>Analysis & visualization</h3>

            <p>
              The processed data powers charts, comparisons, trends and
              interactive analysis throughout Budget Watch.
            </p>
          </div>
        </div>
      </section>

      {/* Dataset mapping */}
      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">Source mapping</p>

          <h2>What data comes from where?</h2>

          <p>
            Each major section of Budget Watch is linked to the government
            source responsible for publishing the underlying information.
          </p>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Data area</th>
                <th scope="col">Primary source</th>
                <th scope="col">Information used</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>
                  <strong>Employment & unemployment</strong>
                </td>

                <td>
                  Ministry of Statistics & Programme Implementation
                  <br />
                  <span className="muted">PLFS</span>
                </td>

                <td>
                  Employment, unemployment, labour-force participation,
                  worker indicators and male/female employment statistics.
                </td>
              </tr>

              <tr>
                <td>
                  <strong>GDP & economic growth</strong>
                </td>

                <td>
                  Ministry of Statistics & Programme Implementation
                  <br />
                  <span className="muted">MoSPI / e-Sankhyiki</span>
                </td>

                <td>
                  GDP, national accounts, economic growth and state-wise
                  economic indicators.
                </td>
              </tr>

              <tr>
                <td>
                  <strong>Inflation & prices</strong>
                </td>

                <td>
                  Ministry of Statistics & Programme Implementation
                  <br />
                  <span className="muted">CPI</span>
                </td>

                <td>
                  CPI, inflation rates and price movements across
                  consumption categories and items.
                </td>
              </tr>

              <tr>
                <td>
                  <strong>Union Budget</strong>
                </td>

                <td>
                  Government of India
                  <br />
                  <span className="muted">India Budget</span>
                </td>

                <td>
                  Historical Union Budgets, ministry allocations,
                  department allocations and scheme-level expenditure.
                </td>
              </tr>

              <tr>
                <td>
                  <strong>Government revenue & accounts</strong>
                </td>

                <td>
                  Controller General of Accounts
                  <br />
                  <span className="muted">CGA</span>
                </td>

                <td>
                  Tax revenue, non-tax revenue, government receipts,
                  expenditure and monthly government accounts.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      {/* Transparency */}
      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">Transparency</p>

          <h2>About data reliability</h2>
        </div>

        <div className="transparency-grid">
          <div>
            <h3>Primary sources</h3>

            <p>
              Data is sourced from official Government of India ministries,
              departments and public statistical portals wherever
              available.
            </p>
          </div>

          <div>
            <h3>Processing</h3>

            <p>
              Some datasets are transformed into a structured format to
              support faster queries, filtering and visualization.
            </p>
          </div>

          <div>
            <h3>Interpretation</h3>

            <p>
              Budget Watch does not alter the underlying meaning of the
              published government statistics. Derived metrics are clearly
              calculated from the source observations.
            </p>
          </div>

          <div>
            <h3>Limitations</h3>

            <p>
              Government datasets can be revised over time. Historical
              values, definitions and classifications may therefore differ
              between releases.
            </p>
          </div>
        </div>
      </section>

      {/* Source links */}
      <section className="panel source-directory">
        <div className="section-heading">
          <p className="eyebrow">Verify the data</p>

          <h2>Official source directory</h2>

          <p>
            Users can independently verify the underlying information
            through the original government portals.
          </p>
        </div>

        <div className="source-links">
          {officialSources.map((source) => (
            <a
              key={source.shortName}
              href={source.website}
              target="_blank"
              rel="noopener noreferrer"
              className="source-link-row"
            >
              <div>
                <strong>{source.name}</strong>
                <span>{source.website}</span>
              </div>

              <span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      </section>

      {/* Footer note */}
      <section className="data-provenance-footer">
        <p>
          <strong>Budget Watch</strong> is an independent data
          visualization and analysis project. It is not an official
          Government of India website and is not affiliated with the
          ministries, departments or agencies listed above.
        </p>

        <p>
          Government of India sources remain the authoritative references
          for the original statistics, budgets and accounts.
        </p>
      </section>
    </main>
  );
}
