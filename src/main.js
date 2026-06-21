import './styles.css';
import { ScrollStory } from './scrollytelling.js';
import { initDuckDB, runQuery, resultsToTable, getExampleQueries } from './demos/duckdb-demo.js';
import { initPyodide, runPython, getPyodideExample } from './demos/pyodide-demo.js';

// ===== Visual Panel Content =====
const visualContent = document.getElementById('visual-content');

/**
 * Update the sticky visual panel with new HTML content.
 * Applies a fade transition.
 */
function setVisual(html) {
  visualContent.classList.remove('active');
  // Brief delay for exit animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      visualContent.innerHTML = html;
      visualContent.classList.add('active');
    });
  });
}

// ===== Scene-specific visual content =====

const sceneVisuals = {
  hero: () => {
    setVisual(`
      <div style="text-align:center; padding:40px 0;">
        <div style="font-size:4rem; margin-bottom:16px;">📊</div>
        <p style="font-family:var(--font-sans); font-size:1.1rem; color:var(--text-muted);">
          750 million people use Excel.<br />
          <strong style="color:var(--accent);">Almost none of them are agents.</strong>
        </p>
      </div>
    `);
  },

  era: () => {
    setVisual(`
      <div class="label">The agent's view of Excel</div>
      <div class="code-block bad">
        <pre><span class="syntax-cmt"># Agent trying to read an .xlsx file</span>
<span class="syntax-kw">import</span> openpyxl
wb = openpyxl.load_workbook(<span class="syntax-str">'model.xlsx'</span>)
sheet = wb[<span class="syntax-str">'Sheet1'</span>]
<span class="syntax-cmt"># Wait — which cells are headers?</span>
<span class="syntax-cmt"># Are rows 1-3 merged? Let me check...</span>
<span class="syntax-cmt"># Is column E a formula or a value?</span>
<span class="syntax-cmt"># Why does row 47 have "N/A" in a number column?</span></pre>
      </div>
      <div class="caption">Every read requires a parser, a guess, and a prayer.</div>
    `);
  },

  binary: () => {
    setVisual(`
      <div class="label">Plain text → instant access</div>
      <div class="code-block good">
        <pre><span class="syntax-cmt"># Any tool can read this:</span>
date,region,product_id,units_sold,revenue,cost
2024-01-15,North,P001,120,3600.00,1800.00
2024-01-15,South,P002,85,2975.00,1360.00</pre>
      </div>
      <div class="label" style="margin-top:18px;">Binary blob → opaque</div>
      <div class="code-block bad">
        <pre>PK!ýM^[ÿÿÿÿ...  <span class="syntax-cmt">← .xlsx is a ZIP of XML</span></pre>
      </div>
      <div class="caption">One is data. The other is a format you fight.</div>
    `);
  },

  schema: () => {
    setVisual(`
      <div class="label">Excel: hope the types are right</div>
      <div class="code-block bad">
        <pre><span class="syntax-cmt">Column C: mostly numbers, but...</span>
Row 1:  <span class="syntax-num">120</span>
Row 2:  <span class="syntax-num">85</span>
Row 3:  <span class="syntax-num">95</span>
Row 4:  <span class="syntax-num">200</span>
Row 47: N/A          <span class="syntax-cmt">← surprise!</span>
Row 48: <span class="syntax-str">"approx 50"</span>  <span class="syntax-cmt">← a string? really?</span></pre>
      </div>
      <div class="label" style="margin-top:18px;">SQL/DuckDB: schema is explicit</div>
      <div class="code-block good">
        <pre><span class="syntax-kw">CREATE TABLE</span> sales (
  date       <span class="syntax-fn">DATE</span>,
  region     <span class="syntax-fn">VARCHAR</span>,
  product_id <span class="syntax-fn">VARCHAR</span>,
  units_sold <span class="syntax-fn">INTEGER</span>,
  revenue    <span class="syntax-fn">DECIMAL</span>(10,2),
  cost       <span class="syntax-fn">DECIMAL</span>(10,2)
);</pre>
      </div>
      <div class="caption">The agent knows the contract before it reads a single row.</div>
    `);
  },

  gui: () => {
    setVisual(`
      <div class="label">What Excel stores vs. what an agent needs</div>
      <div class="code-block bad">
        <pre><span class="syntax-cmt">// An .xlsx file contains:</span>
☑ Merged cells: A1:C1
☑ Conditional formatting rules (17 of them)
☑ Freeze panes at row 3
☑ Pivot cache (3.2MB of computed values)
☑ Named range "Q1_Revenue" → =Sheet2!$F$2:$F$89
☑ ...and somewhere in here: the actual data</pre>
      </div>
      <div class="caption">Presentation and data are interleaved. The agent has to untangle them.</div>
    `);
  },

  positional: () => {
    setVisual(`
      <div class="label">Excel: coordinates break on change</div>
      <div class="code-block bad">
        <pre><span class="syntax-cmt">// Column D is "Revenue" today</span>
<span class="syntax-op">=VLOOKUP(</span>A2, Sheet2!B:D, <span class="syntax-num">3</span>, FALSE<span class="syntax-op">)</span>

<span class="syntax-cmt">// Someone inserts a column → 💥</span>
<span class="syntax-op">=VLOOKUP(</span>A2, Sheet2!B:E, <span class="syntax-num">3</span>, FALSE<span class="syntax-op">)</span>
<span class="syntax-cmt">// Now returns "Cost" instead of "Revenue" — silently wrong!</span></pre>
      </div>
      <div class="label" style="margin-top:18px;">SQL: named columns survive reordering</div>
      <div class="code-block good">
        <pre><span class="syntax-kw">SELECT</span> s.date, p.product_name, s.revenue
<span class="syntax-kw">FROM</span> sales s
<span class="syntax-kw">JOIN</span> products p <span class="syntax-kw">ON</span> s.product_id <span class="syntax-op">=</span> p.product_id
<span class="syntax-kw">WHERE</span> s.revenue <span class="syntax-op">></span> <span class="syntax-num">3000</span>;

<span class="syntax-cmt">// Add a column? Rearrange them? This query still works.</span></pre>
      </div>
      <div class="caption">Named references. The same reason we use variables, not registers.</div>
    `);
  },

  stateful: () => {
    setVisual(`
      <div class="label">Excel: hidden dependency graph</div>
      <div class="code-block bad">
        <pre>Cell D4: <span class="syntax-op">=</span>B4<span class="syntax-op">*</span>C4
Cell E4: <span class="syntax-op">=</span>D4<span class="syntax-op">*</span>VLOOKUP(A4, Rates!B:C, <span class="syntax-num">2</span>, <span class="syntax-kw">FALSE</span>)
Cell F4: <span class="syntax-op">=</span>E4<span class="syntax-op">-</span>SUMIF(Expenses!A:A, A4, Expenses!B:B)

<span class="syntax-cmt">// What depends on what? Trace precedents...</span>
<span class="syntax-cmt">// What if Expenses has a circular ref? Gotta run it.</span></pre>
      </div>
      <div class="label" style="margin-top:18px;">Code: explicit data flow</div>
      <div class="code-block good">
        <pre><span class="syntax-kw">def</span> <span class="syntax-fn">calculate_profit</span>(sales, rates, expenses):
    sales[<span class="syntax-str">'gross'</span>] <span class="syntax-op">=</span> sales.units <span class="syntax-op">*</span> sales.unit_price
    merged <span class="syntax-op">=</span> sales.merge(rates, on=<span class="syntax-str">'region'</span>)
    merged[<span class="syntax-str">'adjusted'</span>] <span class="syntax-op">=</span> merged.gross <span class="syntax-op">*</span> merged.rate
    <span class="syntax-kw">return</span> merged.groupby(<span class="syntax-str">'product'</span>).adjusted.sum()

<span class="syntax-cmt"># The agent reads top to bottom. Every step is visible.</span></pre>
      </div>
      <div class="caption">Input → transform → output. No hidden state.</div>
    `);
  },

  better: () => {
    setVisual(`
      <div class="label">The agent-optimized stack</div>
      <div class="code-block good">
        <pre><span class="syntax-cmt">┌─────────────────────────┐</span>
<span class="syntax-cmt">│  Data: CSV / Parquet    │</span>  ← Plain text, any tool can read
<span class="syntax-cmt">├─────────────────────────┤</span>
<span class="syntax-cmt">│  Transform: SQL / Python │</span>  ← Explicit, testable, composable
<span class="syntax-cmt">├─────────────────────────┤</span>
<span class="syntax-cmt">│  Present: Dashboard / NB │</span>  ← Separate rendering layer
<span class="syntax-cmt">└─────────────────────────┘</span>

<span class="syntax-cmt"># Bonus: export .xlsx as final step only</span>
df.to_excel(<span class="syntax-str">'report_for_boss.xlsx'</span>)</pre>
      </div>
      <div class="caption">Keep Excel as an output format, not a working medium.</div>
    `);
  },

  playground: () => {
    // Build the interactive SQL playground
    const examples = getExampleQueries();
    const defaultSQL = examples[0].sql;

    setVisual(`
      <div class="label">DuckDB-WASM — running in your browser</div>
      <textarea class="sql-editor" id="sql-input" spellcheck="false">${escapeHtml(defaultSQL)}</textarea>
      <button class="run-btn" id="sql-run-btn">▶ Run Query</button>
      <div id="sql-output" class="output" style="margin-top:12px;">
        <span class="loading">Initializing DuckDB...</span>
      </div>
    `);

    // Wire up after DOM update
    requestAnimationFrame(() => {
      const textarea = document.getElementById('sql-input');
      const runBtn = document.getElementById('sql-run-btn');
      const output = document.getElementById('sql-output');
      const presetSelect = document.getElementById('query-preset');

      async function executeQuery(sql) {
        output.innerHTML = '<span class="loading">Running...</span>';
        try {
          const { columns, rows } = await runQuery(sql);
          output.innerHTML = resultsToTable(columns, rows);
          output.className = 'output';
        } catch (err) {
          output.innerHTML = `<span class="error">${escapeHtml(err.message || String(err))}</span>`;
          output.className = 'output error';
        }
      }

      // Initialize DB and run default query
      initDuckDB().then(() => {
        output.innerHTML = '<span style="color:var(--green);">✓ DuckDB ready. Run a query to begin.</span>';
      }).catch(err => {
        output.innerHTML = `<span class="error">Init failed: ${escapeHtml(err.message || String(err))}</span>`;
        output.className = 'output error';
      });

      runBtn.addEventListener('click', () => executeQuery(textarea.value));

      // Ctrl+Enter / Cmd+Enter to run
      textarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          executeQuery(textarea.value);
        }
      });

      // Preset selector
      if (presetSelect) {
        presetSelect.addEventListener('change', () => {
          if (presetSelect.value) {
            textarea.value = presetSelect.value;
            executeQuery(presetSelect.value);
          }
        });
      }
    });
  },

  pyodide: () => {
    const exampleCode = getPyodideExample();

    setVisual(`
      <div class="label">Pyodide — Python 3 + pandas in your browser</div>
      <textarea class="sql-editor" id="py-input" spellcheck="false" style="min-height:200px;">${escapeHtml(exampleCode)}</textarea>
      <button class="run-btn" id="py-run-btn">▶ Run Python</button>
      <div id="py-output" class="output" style="margin-top:12px;">
        <span class="loading">Loading Python environment...</span>
      </div>
    `);

    requestAnimationFrame(() => {
      const textarea = document.getElementById('py-input');
      const runBtn = document.getElementById('py-run-btn');
      const output = document.getElementById('py-output');

      initPyodide().then(() => {
        output.innerHTML = '<span style="color:var(--green);">✓ Python + pandas ready. Run the code to begin.</span>';
      }).catch(err => {
        output.innerHTML = `<span class="error">Init failed: ${escapeHtml(err.message || String(err))}</span>`;
        output.className = 'output error';
      });

      runBtn.addEventListener('click', async () => {
        output.innerHTML = '<span class="loading">Running Python...</span>';
        output.className = 'output';
        try {
          const result = await runPython(textarea.value);
          output.innerHTML = `<pre style="white-space:pre-wrap;margin:0;">${escapeHtml(result)}</pre>`;
          output.className = 'output';
        } catch (err) {
          output.innerHTML = `<span class="error">${escapeHtml(err.message || String(err))}</span>`;
          output.className = 'output error';
        }
      });

      textarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          runBtn.click();
        }
      });
    });
  },

  conclusion: () => {
    setVisual(`
      <div style="text-align:center; padding:40px 0;">
        <div style="font-size:3rem; margin-bottom:16px;">🔄</div>
        <p style="font-family:var(--font-sans); font-size:1rem; line-height:1.7; color:var(--text-muted);">
          <strong style="color:var(--accent);">Source of truth:</strong> plain text<br />
          <strong style="color:var(--accent);">Transformations:</strong> code<br />
          <strong style="color:var(--accent);">Output:</strong> .xlsx for humans
        </p>
        <p style="margin-top:24px; font-size:0.8rem; color:var(--text-muted);">
          Built with DuckDB-WASM · Pyodide · Vite<br />
          <a href="https://github.com/riziles/why-not-excel" style="color:var(--blue);" target="_blank" rel="noopener">github.com/riziles/why-not-excel</a>
        </p>
      </div>
    `);
  },
};

// ===== Wire everything up =====
const story = new ScrollStory();

// Register all scenes with their visual content
const sceneIds = [
  'scene-hero',
  'scene-era',
  'scene-binary',
  'scene-schema',
  'scene-gui',
  'scene-positional',
  'scene-stateful',
  'scene-better',
  'scene-playground',
  'scene-pyodide',
  'scene-conclusion',
];

for (const id of sceneIds) {
  const sceneName = id.replace('scene-', '');
  const visualFn = sceneVisuals[sceneName];

  story.addScene(`scene-${sceneName}`, {
    onEnter: () => {
      if (visualFn) visualFn();
    },
    onProgress: (ratio) => {
      // Could add parallax or progressive reveal here
    },
  });
}

// Build navigation dots
story.buildNav();

// Set initial visual (hero)
setVisual(`
  <div style="text-align:center; padding:40px 0;">
    <div style="font-size:4rem; margin-bottom:16px;">📊</div>
    <p style="font-family:var(--font-sans); font-size:1.1rem; color:var(--text-muted);">
      750 million people use Excel.<br />
      <strong style="color:var(--accent);">Almost none of them are agents.</strong>
    </p>
    <p style="margin-top:20px; font-size:0.75rem; color:var(--text-muted);">
      Scroll to begin →
    </p>
  </div>
`);

// Activate hero immediately
document.getElementById('scene-hero')?.classList.add('active');

// ===== Helpers =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

console.log('⬡ Why Not Excel — ready. Scroll to explore.');
