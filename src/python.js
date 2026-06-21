import './playground.css';
import { initPyodide, runPython } from './demos/pyodide-demo.js';

const pyInput = document.getElementById('py-input');
const runBtn = document.getElementById('py-run-btn');
const output = document.getElementById('py-output');
const presetButtons = document.querySelectorAll('#py-presets button[data-preset]');

// Preset Python code defined cleanly in JS — no HTML escaping nightmares
const presets = {
  'revenue-region': `import pandas as pd

sales = pd.read_csv('/data/sales.csv')
products = pd.read_csv('/data/products.csv')

# Join on named columns -- survives reordering
df = sales.merge(products, on='product_id')

# Revenue & profit by region
result = df.groupby('region').agg(
    total_revenue=('revenue', 'sum'),
    total_cost=('cost', 'sum'),
    units=('units_sold', 'sum')
).reset_index()

result['profit'] = result['total_revenue'] - result['total_cost']
result = result.sort_values('profit', ascending=False)

print(result.to_string(index=False))
print(f"\\nTotal profit: \${result['profit'].sum():,.2f}")`,

  'yoy-pivot': `import pandas as pd

sales = pd.read_csv('/data/sales.csv')
products = pd.read_csv('/data/products.csv')

df = sales.merge(products, on='product_id')

# Year-over-year comparison
df['year'] = pd.to_datetime(df['date']).dt.year
pivot = df.pivot_table(
    values='revenue',
    index='category',
    columns='year',
    aggfunc='sum'
)
print(pivot.to_string())`,

  'top-transactions': `import pandas as pd

sales = pd.read_csv('/data/sales.csv')

# Find top-performing transactions
sales['profit'] = sales['revenue'] - sales['cost']
sales['margin'] = (sales['profit'] / sales['revenue'] * 100).round(1)

top = sales.nlargest(10, 'profit')
print(top[['date', 'region', 'product_id', 'revenue', 'profit', 'margin']].to_string(index=False))`,

  'schema-explore': `import pandas as pd

sales = pd.read_csv('/data/sales.csv')

# Explore: Excel would guess types -- pandas tells you
print('Column types:')
print(sales.dtypes)
print(f'\\nShape: {sales.shape}')
print(f'\\nMissing values:\\n{sales.isnull().sum()}')
print(f'\\nNumeric summary:\\n{sales.describe()}')`,
};

pyInput.value = presets['revenue-region'];

let ready = false;

async function executePython(code) {
  output.innerHTML = '<div class="pg-loading">Running Python…</div>';
  try {
    const result = await runPython(code);
    output.innerHTML = escapeHtml(result) || '<span style="color:var(--text-muted);">(no output)</span>';
  } catch (err) {
    output.innerHTML = `<div class="pg-error">Error: ${escapeHtml(err.message || String(err))}</div>`;
  }
}

initPyodide().then(() => {
  ready = true;
  output.innerHTML = '<span style="color:var(--green);">✓ Python 3 + pandas ready. Run the code to begin.</span>';
}).catch(err => {
  output.innerHTML = `<div class="pg-error">Failed to initialize Pyodide: ${escapeHtml(err.message || String(err))}</div>`;
});

runBtn.addEventListener('click', () => {
  if (!ready) return;
  executePython(pyInput.value);
});

pyInput.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    if (ready) executePython(pyInput.value);
  }
});

presetButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.preset;
    if (presets[key]) {
      pyInput.value = presets[key];
      if (ready) executePython(presets[key]);
    }
  });
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
