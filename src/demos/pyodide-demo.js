/**
 * Pyodide interactive demo.
 * Loads Pyodide from CDN, provides Python/pandas execution environment.
 * CSV files are fetched and written into Pyodide's virtual filesystem at init time.
 */

import { assetPath } from '../utils.js';

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';

let pyodide = null;
let initialized = false;
let initPromise = null;

/**
 * Initialize Pyodide (lazy, called on first use).
 * Loads pandas and writes CSV data into the virtual filesystem.
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

    // Fetch CSV files and write them into Pyodide's virtual filesystem
    const [salesText, productsText] = await Promise.all([
      fetch(assetPath('/data/sales.csv')).then(r => r.text()),
      fetch(assetPath('/data/products.csv')).then(r => r.text()),
    ]);

    // Use Python's IO to write files (avoids Emscripten FS encoding issues)
    pyodide.runPython(`
import io
with open('/data/sales.csv', 'w') as f:
    f.write(${JSON.stringify(salesText)})
with open('/data/products.csv', 'w') as f:
    f.write(${JSON.stringify(productsText)})
    `);

    initialized = true;
    return pyodide;
  })();

  return initPromise;
}

/**
 * Run Python code and capture stdout + return value.
 * CSV files are already in Pyodide's virtual FS at /data/sales.csv and /data/products.csv.
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
