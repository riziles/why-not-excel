import './playground.css';
import { initDuckDB, runQuery, resultsToTable } from './demos/duckdb-demo.js';

const sqlInput = document.getElementById('sql-input');
const runBtn = document.getElementById('sql-run-btn');
const output = document.getElementById('sql-output');
const presetButtons = document.querySelectorAll('#sql-presets button[data-preset]');

// Preset queries defined cleanly in JS — no HTML escaping issues
const presets = {
  preview: 'SELECT * FROM sales LIMIT 5',
  'revenue-region': `SELECT region, SUM(revenue) AS total_revenue, SUM(revenue - cost) AS profit
FROM sales
GROUP BY region
ORDER BY profit DESC`,
  'join-products': `SELECT p.product_name, p.category, SUM(s.units_sold) AS units, SUM(s.revenue) AS revenue
FROM sales s
JOIN products p ON s.product_id = p.product_id
GROUP BY p.product_name, p.category
ORDER BY revenue DESC`,
  'yoy-category': `SELECT strftime('%Y', date) AS year, category, SUM(revenue) AS revenue
FROM sales s
JOIN products p ON s.product_id = p.product_id
GROUP BY year, category
ORDER BY year, revenue DESC`,
  'monthly-trend': `SELECT strftime('%Y-%m', date) AS month, COUNT(*) AS transactions, SUM(revenue) AS total
FROM sales
GROUP BY month
ORDER BY month`,
};

sqlInput.value = presets['preview'];

let ready = false;

async function executeQuery(sql) {
  output.innerHTML = '<div class="pg-loading">Running query…</div>';
  try {
    const { columns, rows } = await runQuery(sql);
    output.innerHTML = resultsToTable(columns, rows);
  } catch (err) {
    output.innerHTML = `<div class="pg-error">Error: ${escapeHtml(err.message || String(err))}</div>`;
  }
}

initDuckDB().then(() => {
  ready = true;
  output.innerHTML = '<span style="color:var(--green);">✓ DuckDB ready. Run a query to begin.</span>';
}).catch(err => {
  output.innerHTML = `<div class="pg-error">Failed to initialize DuckDB: ${escapeHtml(err.message || String(err))}</div>`;
});

runBtn.addEventListener('click', () => {
  if (!ready) return;
  executeQuery(sqlInput.value);
});

sqlInput.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    if (ready) executeQuery(sqlInput.value);
  }
});

presetButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.preset;
    if (presets[key]) {
      sqlInput.value = presets[key];
      if (ready) executeQuery(presets[key]);
    }
  });
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
