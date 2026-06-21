import './styles.css';
import { ScrollStory } from './scrollytelling.js';

// ===== Visual Panel Content (desktop fixed panel + mobile inline) =====
const visualContent = document.getElementById('visual-content');
const mobileSceneLabel = document.getElementById('mobile-scene-label');

/**
 * Update the sticky visual panel with new HTML content (desktop).
 */
function setVisual(html) {
  visualContent.classList.remove('active');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      visualContent.innerHTML = html;
      visualContent.classList.add('active');
    });
  });
}

/**
 * Update the inline visual for a scene (mobile).
 */
function setSceneVisual(sceneName, html) {
  const sceneEl = document.getElementById(`scene-${sceneName}`);
  if (!sceneEl) return;
  const visualEl = sceneEl.querySelector('.scene-visual');
  if (visualEl) {
    visualEl.innerHTML = html;
  }
}

/**
 * Update both desktop panel and mobile inline visual for a scene.
 */
function updateVisuals(sceneName, html) {
  setVisual(html);
  setSceneVisual(sceneName, html);
}

// ===== Scene-specific visual content =====

const sceneVisuals = {
  hero: () => {
    const html = `
      <div style="text-align:center; padding:40px 0;">
        <div style="font-size:4rem; margin-bottom:16px;">📊</div>
        <p style="font-family:var(--font-sans); font-size:1.1rem; color:var(--text-muted);">
          750 million people use Excel.<br />
          <strong style="color:var(--accent);">They are probably wasting time.</strong>
        </p>
      </div>
    `;
    updateVisuals('hero', html);
  },

  era: () => {
    const html = `
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
    `;
    updateVisuals('era', html);
  },

  binary: () => {
    const html = `
      <div class="label">Binary ≠ bad. No contract = bad.</div>
      <div class="code-block good">
        <pre><span class="syntax-cmt"># Parquet: binary, but fully self-describing</span>
<span class="syntax-kw">import</span> pyarrow.parquet <span class="syntax-kw">as</span> pq
table = pq.read_table(<span class="syntax-str">'sales.parquet'</span>)
<span class="syntax-fn">print</span>(table.schema)  <span class="syntax-cmt"># columns + types, no guessing</span>

<span class="syntax-cmt"># CSV: plain text, universal</span>
<span class="syntax-kw">import</span> pandas <span class="syntax-kw">as</span> pd
df = pd.read_csv(<span class="syntax-str">'sales.csv'</span>)
<span class="syntax-cmt"># Any tool can read it. No parser fights.</span></pre>
      </div>
      <div class="label" style="margin-top:18px;">Excel: data + formatting + formulas, all interleaved</div>
      <div class="code-block bad">
        <pre><span class="syntax-cmt">&lt;!-- Inside sales.xlsx (xl/worksheets/sheet1.xml) --&gt;</span>
&lt;sheetData&gt;
  <span class="syntax-cmt">&lt;!-- Are these headers or data? --&gt;</span>
  &lt;row r="1"&gt;...&lt;c r="A1" t="s"&gt;&lt;v&gt;0&lt;/v&gt;&lt;/c&gt;...&lt;/row&gt;
  <span class="syntax-cmt">&lt;!-- Formula or value? Check &lt;f&gt; tags --&gt;</span>
  &lt;row r="2"&gt;...&lt;c r="C2"&gt;&lt;f&gt;VLOOKUP(A2,...)&lt;/f&gt;&lt;/c&gt;...&lt;/row&gt;
  <span class="syntax-cmt">&lt;!-- Merged? Check mergeCells.xml --&gt;</span>
&lt;/sheetData&gt;</pre>
      </div>
      <div class="caption">A Parquet file declares its structure. An Excel file makes you hunt for it across multiple XML files.</div>
    `;
    updateVisuals('binary', html);
  },

  schema: () => {
    const html = `
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
    `;
    updateVisuals('schema', html);
  },

  gui: () => {
    const html = `
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
    `;
    updateVisuals('gui', html);
  },

  positional: () => {
    const html = `
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
    `;
    updateVisuals('positional', html);
  },

  stateful: () => {
    const html = `
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
    `;
    updateVisuals('stateful', html);
  },

  better: () => {
    const html = `
      <div class="label">Three layers, three files, zero entanglement</div>
      <div class="code-block good">
        <ul style="list-style:none;padding:0;margin:0;font-family:var(--font-mono);font-size:0.8rem;">
          <li style="padding:10px 0;border-bottom:1px solid var(--border);">
            <strong style="color:var(--accent);">📄 Data</strong> — sales.parquet<br>
            <span style="color:var(--text-muted);font-size:0.72rem;">Values only. No logic. No formatting.</span>
          </li>
          <li style="padding:10px 0;border-bottom:1px solid var(--border);">
            <strong style="color:var(--accent);">⚙️ Logic</strong> — analysis.py<br>
            <span style="color:var(--text-muted);font-size:0.72rem;">SQL + pandas. Explicit, testable pipelines.</span>
          </li>
          <li style="padding:10px 0;">
            <strong style="color:var(--accent);">📊 Viz</strong> — dashboard.html<br>
            <span style="color:var(--text-muted);font-size:0.72rem;">Rendering only. Swap anytime.</span>
          </li>
        </ul>
        <p style="margin-top:12px;font-size:0.75rem;color:var(--text-muted);">
          An agent reads each layer independently — no untangling required.
        </p>
      </div>
      <div class="code-block good" style="margin-top:12px;">
        <pre><span class="syntax-cmt"># Bonus: export .xlsx as final step only</span>
df.to_excel(<span class="syntax-str">'report_for_boss.xlsx'</span>)</pre>
      </div>
      <div class="caption">Keep Excel as an output format, not a working medium.</div>
    `;
    updateVisuals('better', html);
  },

  'python-stack': () => {
    const html = `
      <div class="label">Composable tools, not monolithic files</div>
      <div class="code-block good">
        <ul style="list-style:none;padding:0;margin:0;font-family:var(--font-mono);font-size:0.8rem;">
          <li style="padding:8px 0;border-bottom:1px solid var(--border);">
            <span style="color:var(--accent);">①</span> <strong>NumPy</strong> — fast n-dimensional arrays
          </li>
          <li style="padding:8px 0;border-bottom:1px solid var(--border);">
            <span style="color:var(--accent);">②</span> <strong>pandas</strong> — labeled DataFrames, groupby, joins
          </li>
          <li style="padding:8px 0;border-bottom:1px solid var(--border);">
            <span style="color:var(--accent);">③</span> <strong>Arrow</strong> — zero-copy columnar format (also McKinney)
          </li>
          <li style="padding:8px 0;border-bottom:1px solid var(--border);">
            <span style="color:var(--accent);">④</span> <strong>Polars</strong> — GPU-accelerated, lazy DataFrames
          </li>
          <li style="padding:8px 0;">
            <span style="color:var(--accent);">⑤</span> <strong>DuckDB</strong> — embedded OLAP SQL engine
          </li>
        </ul>
      </div>
      <div class="code-block good" style="margin-top:12px;">
        <pre><span class="syntax-cmt"># Each step is inspectable & composable</span>
<span class="syntax-kw">import</span> pandas <span class="syntax-kw">as</span> pd
<span class="syntax-kw">import</span> duckdb

df = pd.read_csv(<span class="syntax-str">'sales.csv'</span>)      <span class="syntax-cmt"># ① pandas reads CSV</span>
result = duckdb.sql(<span class="syntax-str">"""</span>
<span class="syntax-str">  SELECT region, SUM(revenue)</span>
<span class="syntax-str">  FROM df GROUP BY region</span>
<span class="syntax-str">"""</span>).df()                        <span class="syntax-cmt"># ② DuckDB queries pandas</span>
result.to_parquet(<span class="syntax-str">'out.parquet'</span>) <span class="syntax-cmt"># ③ Arrow-backed output</span></pre>
      </div>
      <div class="caption">Wes McKinney built pandas at AQR Capital because Excel took months to do what should take hours. The tools that followed made Python the default for data work.</div>
    `;
    updateVisuals('python-stack', html);
  },

  playground: () => {
    const html = `
      <div style="text-align:center; padding:30px 0;">
        <div style="font-size:3.5rem; margin-bottom:16px;">🦆</div>
        <p style="font-family:var(--font-sans); font-size:1rem; color:var(--text-muted); margin-bottom:20px;">
          Run SQL queries against live data.<br />DuckDB-WASM — entirely in your browser.
        </p>
        <a href="./playground.html" class="run-btn" style="display:inline-block; text-decoration:none; padding:12px 32px; font-size:1rem;">
          🦆 Open SQL Playground →
        </a>
      </div>
    `;
    updateVisuals('playground', html);
  },

  pyodide: () => {
    const html = `
      <div style="text-align:center; padding:30px 0;">
        <div style="font-size:3.5rem; margin-bottom:16px;">🐍</div>
        <p style="font-family:var(--font-sans); font-size:1rem; color:var(--text-muted); margin-bottom:20px;">
          Python 3 + pandas in your browser.<br />Explicit data pipelines, zero hidden state.
        </p>
        <a href="./python.html" class="run-btn" style="display:inline-block; text-decoration:none; padding:12px 32px; font-size:1rem;">
          🐍 Open Python Playground →
        </a>
      </div>
    `;
    updateVisuals('pyodide', html);
  },

  conclusion: () => {
    const html = `
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
    `;
    updateVisuals('conclusion', html);
  },
};

// ===== Scene names for mobile label =====
const sceneLabels = {
  hero: 'Why Not Excel?',
  era: 'The Agent Era',
  binary: 'No Structural Contract',
  schema: 'Schema by Accident',
  gui: 'GUI-First Design',
  positional: 'Positional Fragility',
  stateful: 'Stateful Computation',
  better: 'The Better Way',
  'python-stack': 'The Python Data Stack',
  playground: 'DuckDB Playground',
  pyodide: 'Python Playground',
  conclusion: 'Conclusion',
};

// ===== Wire everything up =====
const story = new ScrollStory();

const sceneIds = [
  'scene-hero', 'scene-era', 'scene-binary', 'scene-schema',
  'scene-gui', 'scene-positional', 'scene-stateful', 'scene-better',
  'scene-python-stack', 'scene-playground', 'scene-pyodide', 'scene-conclusion',
];

for (const id of sceneIds) {
  const sceneName = id.replace('scene-', '');
  const visualFn = sceneVisuals[sceneName];

  story.addScene(id, {
    onEnter: () => {
      if (visualFn) visualFn();
      // Update mobile scene label
      if (mobileSceneLabel && sceneLabels[sceneName]) {
        mobileSceneLabel.textContent = sceneLabels[sceneName];
        mobileSceneLabel.classList.add('visible');
      }
    },
    onExit: () => {
      // Hide mobile label after a short delay
      if (mobileSceneLabel) {
        mobileSceneLabel.classList.remove('visible');
      }
    },
  });
}

// Build navigation dots
story.buildNav();

// Set initial visuals
sceneVisuals.hero();

// Activate hero immediately
document.getElementById('scene-hero')?.classList.add('active');

console.log('⬡ Why Not Excel — ready. Scroll to explore.');
