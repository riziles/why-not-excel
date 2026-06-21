/**
 * DuckDB-WASM demo — Vite-native import approach.
 * Uses ?url imports for WASM and worker bundles as recommended by DuckDB docs.
 */
import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

import { assetPath } from '../utils.js';

const MANUAL_BUNDLES = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker,
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: eh_worker,
  },
};

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
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
    const worker = new Worker(bundle.mainWorker);
    const logger = new duckdb.ConsoleLogger();
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

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
