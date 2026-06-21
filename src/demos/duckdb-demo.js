/**
 * DuckDB-WASM interactive demo.
 * Loads DuckDB from CDN, registers CSV data, provides query interface.
 */

import { assetPath } from '../utils.js';

const DUCKDB_CDN = 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.0';

let db = null;
let conn = null;
let initialized = false;
let initPromise = null;

/**
 * Initialize DuckDB-WASM (lazy, called on first use).
 */
export async function initDuckDB() {
  if (initialized) return { db, conn };
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Dynamically import DuckDB ESM from CDN
    const duckdb = await import(/* @vite-ignore */ `${DUCKDB_CDN}/dist/duckdb-eh.js`);

    const JSDELIVR_BUNDLES = {
      mvp: {
        mainModule: `${DUCKDB_CDN}/dist/duckdb-mvp.wasm`,
        mainWorker: `${DUCKDB_CDN}/dist/duckdb-browser-worker.js`,
      },
      eh: {
        mainModule: `${DUCKDB_CDN}/dist/duckdb-eh.wasm`,
        mainWorker: `${DUCKDB_CDN}/dist/duckdb-browser-worker.js`,
      },
    };

    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
    const worker = new Worker(bundle.mainWorker);
    const logger = new duckdb.ConsoleLogger();
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule);

    conn = await db.connect();

    // Load CSV files into tables
    await loadCSV(assetPath('/data/sales.csv'), 'sales');
    await loadCSV(assetPath('/data/products.csv'), 'products');

    initialized = true;
    return { db, conn };
  })();

  return initPromise;
}

async function loadCSV(path, tableName) {
  const resp = await fetch(path);
  const text = await resp.text();
  // DuckDB-WASM registerFileText + query approach
  await db.registerFileText(`${tableName}.csv`, text);
  await conn.query(`
    CREATE TABLE ${tableName} AS
    SELECT * FROM read_csv_auto('${tableName}.csv', header=true)
  `);
}

/**
 * Run a SQL query and return results as an array of objects.
 */
export async function runQuery(sql) {
  if (!initialized) await initDuckDB();
  const result = await conn.query(sql);
  // Convert Arrow table to array of plain objects
  const columns = result.schema.fields.map(f => f.name);
  const rows = [];
  for (let i = 0; i < result.numRows; i++) {
    const row = {};
    for (const col of columns) {
      row[col] = result.getChild(col)?.get(i);
    }
    rows.push(row);
  }
  return { columns, rows, rowCount: result.numRows };
}

/**
 * Build HTML table from query results.
 */
export function resultsToTable(columns, rows) {
  if (!columns.length) return '<p>Query returned no columns.</p>';

  let html = '<table class="results-table"><thead><tr>';
  for (const col of columns) {
    html += `<th>${escapeHtml(col)}</th>`;
  }
  html += '</tr></thead><tbody>';
  for (const row of rows) {
    html += '<tr>';
    for (const col of columns) {
      const val = row[col];
      html += `<td>${escapeHtml(formatValue(val))}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  html += `<p class="caption">${rows.length} row${rows.length !== 1 ? 's' : ''} returned</p>`;
  return html;
}

function formatValue(val) {
  if (val === null || val === undefined) return '<em>NULL</em>';
  if (typeof val === 'number') {
    // Check if it looks like a currency value
    if (val % 1 !== 0) return val.toFixed(2);
    return String(val);
  }
  return String(val);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Get example queries */
export function getExampleQueries() {
  return [
    {
      label: 'Preview sales',
      sql: 'SELECT * FROM sales LIMIT 5',
    },
    {
      label: 'Revenue by region',
      sql: `SELECT region, SUM(revenue) AS total_revenue, SUM(revenue - cost) AS profit
FROM sales
GROUP BY region
ORDER BY profit DESC`,
    },
    {
      label: 'JOIN with products',
      sql: `SELECT p.product_name, p.category, SUM(s.units_sold) AS units, SUM(s.revenue) AS revenue
FROM sales s
JOIN products p ON s.product_id = p.product_id
GROUP BY p.product_name, p.category
ORDER BY revenue DESC`,
    },
    {
      label: 'Year-over-year by category',
      sql: `SELECT strftime('%Y', date) AS year, category, SUM(revenue) AS revenue
FROM sales s
JOIN products p ON s.product_id = p.product_id
GROUP BY year, category
ORDER BY year, revenue DESC`,
    },
    {
      label: 'Monthly trend',
      sql: `SELECT strftime('%Y-%m', date) AS month, COUNT(*) AS transactions, SUM(revenue) AS total
FROM sales
GROUP BY month
ORDER BY month`,
    },
  ];
}
