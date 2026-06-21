/**
 * Pyodide interactive demo.
 * Loads Pyodide from CDN, provides Python/pandas execution environment.
 */

import { assetPath } from '../utils.js';

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';

let pyodide = null;
let initialized = false;
let initPromise = null;

/**
 * Initialize Pyodide (lazy, called on first use).
 */
export async function initPyodide() {
  if (initialized) return pyodide;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Load Pyodide script dynamically
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PYODIDE_CDN;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
    });

    // Load pandas
    await pyodide.loadPackage('pandas');

    initialized = true;
    return pyodide;
  })();

  return initPromise;
}

/**
 * Run Python code and capture stdout + return value.
 */
export async function runPython(code) {
  if (!initialized) await initPyodide();

  // Capture stdout
  let output = '';
  pyodide.setStdout({
    batched: (text) => { output += text + '\n'; }
  });

  try {
    const result = await pyodide.runPythonAsync(code);
    if (result !== undefined && result !== null) {
      // If result is a DataFrame, render as HTML
      if (result?.__class__?.__name__ === 'DataFrame' || result?.constructor?.name === 'DataFrame') {
        try {
          // Convert to HTML table via the Python side
          const html = pyodide.runPython(`
            _tmp_result.to_html(classes='results-table', index=False)
          `);
          output += html;
        } catch {
          output += String(result);
        }
      } else if (typeof result.to_html === 'function') {
        output += result.to_html();
      } else {
        output += String(result);
      }
    }
  } catch (err) {
    output += `Error: ${err.message || err}`;
  }

  return output;
}

/**
 * Get the standard example Python code for the demo.
 */
export function getPyodideExample() {
  return `import pandas as pd
import json

# Load the same CSV files DuckDB uses
sales = pd.read_csv('${assetPath('/data/sales.csv')}')
products = pd.read_csv('${assetPath('/data/products.csv')}')

# Join — named columns, robust to reordering
df = sales.merge(products, on='product_id')

# Aggregate: revenue & profit by region
result = df.groupby('region').agg(
    total_revenue=('revenue', 'sum'),
    total_cost=('cost', 'sum'),
    units=('units_sold', 'sum')
).reset_index()

result['profit'] = result['total_revenue'] - result['total_cost']
result = result.sort_values('profit', ascending=False)

print(result.to_string(index=False))
print(f"\\nRegions: {result['region'].nunique()}")
print(f"Total profit: \u0024{result['profit'].sum():,.2f}")`;
}
