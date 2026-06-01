/* ============================================================
 *  compare_two_jiyun.js  (jiyun)
 *  Feature: click two districts on the map to compare them side
 *  by side (mini-maps, key metrics, crime/arrest bars, 5-crime
 *  radar, filtered bars, yearly trend).
 *  Standalone add-on: load AFTER the main page with
 *      <script src="compare_two_jiyun.js"></script>
 *  Injects its own CSS/modal/button/banner; wraps base selectGu &
 *  renderMainMap. Relies on base globals: state, SEOUL_DATA,
 *  DONG_DATA, selectGu, renderMainMap, closeModal,
 *  normalizeDongName, cctvRadiusScale.
 * ========================================================== */
(function () {
  'use strict';

  function waitForData(cb) {
    if (typeof state !== 'undefined' && state.crimeData) cb();
    else setTimeout(() => waitForData(cb), 100);
  }

  function injectStyles() {
    if (document.getElementById('compareTwoJiyunStyles')) return;
    const s = document.createElement('style');
    s.id = 'compareTwoJiyunStyles';
    s.textContent = `
  /* ===== Compare Two Districts modal ===== */
  .compare-two-btn {
    width: 100%;
    padding: 12px;
    background: var(--accent-blue);
    color: white;
    border: none;
    border-radius: 10px;
    font-family: 'IBM Plex Sans KR', sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
    margin-top: 4px;
  }
  .compare-two-btn:hover { opacity: 0.85; }
  .compare-two-btn.selecting { background: var(--accent-orange); animation: pulse 1.2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }

  /* map selection banner */
  .map-select-banner {
    display: none;
    position: absolute;
    top: 16px; left: 50%; transform: translateX(-50%);
    background: var(--text-primary);
    color: white;
    padding: 8px 20px;
    border-radius: 30px;
    font-size: 13px;
    font-weight: 600;
    z-index: 5;
    white-space: nowrap;
    box-shadow: var(--shadow-md);
    pointer-events: none;
  }
  .map-select-banner.visible { display: block; }

  /* highlight for districts selected on the map */
  .gu-path.compare-selected-a {
    stroke: var(--accent-blue) !important;
    stroke-width: 5 !important;
    filter: drop-shadow(0 0 6px rgba(59,130,246,0.6));
  }
  .gu-path.compare-selected-b {
    stroke: var(--accent-orange) !important;
    stroke-width: 5 !important;
    filter: drop-shadow(0 0 6px rgba(249,115,22,0.6));
  }

  /* two-district comparison modal */
  .two-compare-overlay {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 300;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4px);
    align-items: center;
    justify-content: center;
  }
  .two-compare-overlay.visible { display: flex; }

  .two-compare-modal {
    background: var(--bg-primary);
    border-radius: 20px;
    box-shadow: var(--shadow-lg);
    width: min(96vw, 1000px);
    max-height: 92vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .two-compare-header {
    padding: 22px 28px 18px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    background: var(--bg-primary);
    z-index: 1;
  }
  .two-compare-header h2 {
    font-family: 'Gowun Batang', serif;
    font-size: 22px;
    font-weight: 700;
  }
  .two-compare-header-names {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 6px;
    font-size: 13px;
  }
  .two-compare-name {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
  }
  .two-compare-name-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .two-compare-close {
    width: 34px; height: 34px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: transparent;
    cursor: pointer;
    font-size: 16px;
    color: var(--text-secondary);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .two-compare-close:hover { background: var(--bg-tertiary); }

  .two-compare-body {
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  /* side-by-side maps */
  .two-map-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  /* stacked layout (each large) */
  .two-map-row-vertical {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .two-map-card {
    border: 1.5px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
  }
  .two-map-card.card-a { border-color: rgba(59,130,246,0.5); }
  .two-map-card.card-b { border-color: rgba(249,115,22,0.5); }
  .two-map-card-label {
    padding: 12px 16px 4px;
    font-weight: 700;
    font-size: 16px;
  }
  .two-map-card.card-a .two-map-card-label { color: var(--accent-blue); }
  .two-map-card.card-b .two-map-card-label { color: var(--accent-orange); }
  .two-map-card-sub {
    padding: 0 16px 10px;
    font-size: 12px;
    color: var(--text-tertiary);
  }
  .two-map-svg-wrap {
    padding: 0 10px 10px;
    min-height: 420px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .two-map-legend {
    display: flex;
    gap: 20px;
    margin-top: 10px;
    flex-wrap: wrap;
  }
  .two-map-legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  .two-map-legend-dot {
    width: 12px; height: 12px; border-radius: 50%;
  }
  .two-map-legend-dot.cctv { background: #a78bfa; border: 1.5px solid #7c3aed; }
  .two-map-legend-dot.police { background: #eab308; border: 1.5px solid white; }

  /* crime type filter panel */
  .crime-filter-panel {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 200px;
  }
  .crime-filter-title {
    font-weight: 700;
    font-size: 14px;
    color: var(--text-primary);
  }
  .crime-filter-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .crime-filter-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    cursor: pointer;
    color: var(--text-primary);
    user-select: none;
  }
  .crime-filter-item input[type=checkbox] {
    width: 16px; height: 16px;
    cursor: pointer;
    accent-color: var(--text-primary);
  }
  .crime-filter-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .crime-filter-hint {
    font-size: 11px;
    color: var(--text-tertiary);
    line-height: 1.5;
    border-top: 1px solid var(--border);
    padding-top: 10px;
  }

  /* stat card row */
  .two-stat-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .two-stat-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px 20px;
  }
  .two-stat-card.card-a { border-left: 4px solid var(--accent-blue); }
  .two-stat-card.card-b { border-left: 4px solid var(--accent-orange); }
  .two-stat-card h3 {
    font-family: 'Gowun Batang', serif;
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 12px;
  }
  .two-stat-card.card-a h3 { color: var(--accent-blue); }
  .two-stat-card.card-b h3 { color: var(--accent-orange); }
  .two-stat-items { display: flex; gap: 20px; flex-wrap: wrap; }
  .two-stat-item { }
  .two-stat-item-label {
    font-size: 10px;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 2px;
  }
  .two-stat-item-val {
    font-family: 'Gowun Batang', serif;
    font-size: 26px;
    font-weight: 700;
    line-height: 1;
  }
  .two-stat-item-val.crime { color: var(--accent-crime); }
  .two-stat-item-val.arrest { color: var(--accent-arrest); }

  /* comparison chart area */
  .two-chart-section h3 {
    font-family: 'Gowun Batang', serif;
    font-size: 17px;
    font-weight: 700;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }
  .two-chart-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    align-items: start;
  }

`;
    document.head.appendChild(s);
  }

  function injectHTML() {
    if (!document.getElementById('twoCompareOverlay')) {
      const wrap = document.createElement('div');
      wrap.innerHTML = `
<div class="two-compare-overlay" id="twoCompareOverlay">
  <div class="two-compare-modal">
    <div class="two-compare-header">
      <div>
        <h2>Compare Two Districts</h2>
        <div class="two-compare-header-names">
          <div class="two-compare-name">
            <div class="two-compare-name-dot" style="background:var(--accent-blue)"></div>
            <span id="twoCompareNameA">—</span>
          </div>
          <span style="color:var(--text-tertiary)">vs</span>
          <div class="two-compare-name">
            <div class="two-compare-name-dot" style="background:var(--accent-orange)"></div>
            <span id="twoCompareNameB">—</span>
          </div>
        </div>
      </div>
      <button class="two-compare-close" id="twoCompareClose">✕</button>
    </div>
    <div class="two-compare-body">

      <!-- side-by-side maps stacked vertically, each larger -->
      <div>
        <div class="two-chart-section"><h3>Neighborhood Distribution by District</h3></div>
        <div class="two-map-row-vertical">
          <div class="two-map-card card-a">
            <div class="two-map-card-label" id="twoMapLabelA">—</div>
            <div class="two-map-card-sub" id="twoMapSubA"></div>
            <div class="two-map-svg-wrap" id="twoMapSvgA"></div>
          </div>
          <div class="two-map-card card-b">
            <div class="two-map-card-label" id="twoMapLabelB">—</div>
            <div class="two-map-card-sub" id="twoMapSubB"></div>
            <div class="two-map-svg-wrap" id="twoMapSvgB"></div>
          </div>
        </div>
        <!-- map legend -->
        <div class="two-map-legend">
          <span class="two-map-legend-item"><span class="two-map-legend-dot cctv"></span>CCTV Installation Ratio (circle size)</span>
          <span class="two-map-legend-item"><span class="two-map-legend-dot police"></span>Police Station Location</span>
        </div>
      </div>

      <!-- key stat cards -->
      <div>
        <div class="two-chart-section"><h3>Key Metrics (<span id="twoCompareYear">—</span>)</h3></div>
        <div class="two-stat-row">
          <div class="two-stat-card card-a">
            <h3 id="twoStatNameA">—</h3>
            <div class="two-stat-items">
              <div class="two-stat-item">
                <div class="two-stat-item-label">Crime Rate</div>
                <div class="two-stat-item-val crime" id="twoStatCrimeA">—</div>
              </div>
              <div class="two-stat-item">
                <div class="two-stat-item-label">Arrest Rate</div>
                <div class="two-stat-item-val arrest" id="twoStatArrestA">—</div>
              </div>
              <div class="two-stat-item">
                <div class="two-stat-item-label">CCTV</div>
                <div class="two-stat-item-val" id="twoStatCctvA">—</div>
              </div>
            </div>
          </div>
          <div class="two-stat-card card-b">
            <h3 id="twoStatNameB">—</h3>
            <div class="two-stat-items">
              <div class="two-stat-item">
                <div class="two-stat-item-label">Crime Rate</div>
                <div class="two-stat-item-val crime" id="twoStatCrimeB">—</div>
              </div>
              <div class="two-stat-item">
                <div class="two-stat-item-label">Arrest Rate</div>
                <div class="two-stat-item-val arrest" id="twoStatArrestB">—</div>
              </div>
              <div class="two-stat-item">
                <div class="two-stat-item-label">CCTV</div>
                <div class="two-stat-item-val" id="twoStatCctvB">—</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- crime/arrest rate bar comparison -->
      <div class="two-chart-section">
        <h3>Crime Rate · Arrest Rate Comparison</h3>
        <div class="two-chart-row">
          <svg id="twoBarSvg" width="100%" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid meet" style="display:block"></svg>
          <svg id="twoArrestBarSvg" width="100%" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid meet" style="display:block"></svg>
        </div>
      </div>

      <!-- radar chart -->
      <div class="two-chart-section">
        <h3>Five Major Crime Types — Radar</h3>
        <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:12px;">A larger area means more incidents of that crime</div>
        <div class="two-chart-row" style="align-items:center;">
          <svg id="twoRadarSvg" width="100%" viewBox="0 0 500 420" preserveAspectRatio="xMidYMid meet" style="display:block"></svg>
          <!-- crime type filter -->
          <div class="crime-filter-panel">
            <div class="crime-filter-title">Select crime types to compare</div>
            <div class="crime-filter-list" id="crimeFilterList">
              <label class="crime-filter-item" data-key="murder">
                <input type="checkbox" checked> <span class="crime-filter-dot" style="background:#e63946"></span> Murder
              </label>
              <label class="crime-filter-item" data-key="robbery">
                <input type="checkbox" checked> <span class="crime-filter-dot" style="background:#f97316"></span> Robbery
              </label>
              <label class="crime-filter-item" data-key="theft">
                <input type="checkbox" checked> <span class="crime-filter-dot" style="background:#eab308"></span> Theft
              </label>
              <label class="crime-filter-item" data-key="violence">
                <input type="checkbox" checked> <span class="crime-filter-dot" style="background:#06a77d"></span> Violence
              </label>
              <label class="crime-filter-item" data-key="rape">
                <input type="checkbox" checked> <span class="crime-filter-dot" style="background:#3b82f6"></span> Sexual Assault
              </label>
            </div>
            <div class="crime-filter-hint">Only checked items are shown in the radar and bar charts</div>
          </div>
        </div>
      </div>

      <!-- bar with five-major-crime filter applied -->
      <div class="two-chart-section">
        <h3>Incidents by Selected Crime Type <span style="font-size:12px;font-weight:400;color:var(--text-tertiary)" id="crimeFilterBadge"></span></h3>
        <svg id="twoCrimeSvg" width="100%" viewBox="0 0 800 260" preserveAspectRatio="xMidYMid meet" style="display:block"></svg>
      </div>

      <!-- scatter plot -->
      <div class="two-chart-section">
        <h3>Positioning of Seoul's 25 Districts <span style="font-size:13px;font-weight:400;color:var(--text-tertiary)">— x: crime rate, y: arrest rate</span></h3>
        <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:12px;">See at a glance where the two districts sit among all districts</div>
        <svg id="twoScatterSvg" width="100%" viewBox="0 0 800 420" preserveAspectRatio="xMidYMid meet" style="display:block;border:1px solid var(--border);border-radius:12px;"></svg>
      </div>

      <!-- Yearly Trend -->
      <div class="two-chart-section">
        <h3>Crime Rate Trend by Year</h3>
        <svg id="twoTrendSvg" width="100%" viewBox="0 0 800 240" preserveAspectRatio="xMidYMid meet" style="display:block"></svg>
      </div>

    </div>
  </div>
</div>
`;
      document.body.appendChild(wrap.firstElementChild);
    }
    if (!document.getElementById('startCompareTwoBtn')) {
      const sb = document.querySelector('.sidebar');
      if (sb) {
        const block = document.createElement('div');
        block.className = 'control-block';
        block.innerHTML =
          '<div class="control-label"><span>Compare Two Districts</span></div>' +
          '<button class="compare-two-btn" id="startCompareTwoBtn">\u2194 Click to Compare Two</button>' +
          '<div style="font-size:11px;color:var(--text-tertiary);margin-top:6px;line-height:1.5;" id="compareTwoHint">Click two districts on the map to compare</div>';
        sb.appendChild(block);
      }
    }
    if (!document.getElementById('mapSelectBanner')) {
      const mc = document.querySelector('.map-container') || document.getElementById('mapContainer');
      if (mc) {
        const b = document.createElement('div');
        b.className = 'map-select-banner';
        b.id = 'mapSelectBanner';
        b.textContent = '\uD83D\uDDB1 Click districts to compare';
        mc.insertBefore(b, mc.firstChild);
      }
    }
  }

  // ---- compare-two logic (wraps base selectGu / renderMainMap) ----
  // Feature: click two districts to compare
  // ============================================
  const compareTwoState = { active: false, guA: null, guB: null };
  const NS2 = 'http://www.w3.org/2000/svg';

  function toggleCompareTwoMode() {
    compareTwoState.active = !compareTwoState.active;
    compareTwoState.guA = null;
    compareTwoState.guB = null;

    const btn = document.getElementById('startCompareTwoBtn');
    const hint = document.getElementById('compareTwoHint');
    const banner = document.getElementById('mapSelectBanner');

    if (compareTwoState.active) {
      btn.textContent = '✕ Cancel Compare Mode';
      btn.classList.add('selecting');
      hint.textContent = 'Click the first district on the map (0/2)';
      banner.classList.add('visible');
      banner.textContent = '🖱 Click the first district (1/2)';
      closeModal();
    } else {
      resetCompareTwoMode();
    }
  }

  function resetCompareTwoMode() {
    compareTwoState.active = false;
    compareTwoState.guA = null;
    compareTwoState.guB = null;
    const btn = document.getElementById('startCompareTwoBtn');
    btn.textContent = '↔ Click to Compare Two';
    btn.classList.remove('selecting');
    document.getElementById('compareTwoHint').textContent = 'Click two districts on the map to compare';
    document.getElementById('mapSelectBanner').classList.remove('visible');
  }

  // intercept map clicks while in compare mode
  // renderMainMap adds highlight for compare-selected districts
  const _baseRenderMainMap = renderMainMap;
  window.renderMainMap = function() {
    _baseRenderMainMap();
    if (compareTwoState.guA || compareTwoState.guB) {
      document.querySelectorAll('.gu-path').forEach(p => {
        const titleEl = p.querySelector('title');
        if (!titleEl) return;
        const gu = titleEl.textContent.split(' · ')[0];
        if (gu === compareTwoState.guA) {
          p.classList.add('compare-selected-a');
          p.classList.remove('dimmed');
        } else if (gu === compareTwoState.guB) {
          p.classList.add('compare-selected-b');
          p.classList.remove('dimmed');
        }
      });
    }
  };

  // intercept selectGu in compare mode
  const _baseSelectGu = selectGu;
  window.selectGu = function(guName) {
    if (!compareTwoState.active) {
      _baseSelectGu(guName);
      return;
    }
    if (!compareTwoState.guA) {
      compareTwoState.guA = guName;
      document.getElementById('compareTwoHint').textContent = `✔ ${guName} selected. now click the second district (1/2)`;
      document.getElementById('mapSelectBanner').textContent = '🖱 Click the second district (2/2)';
      renderMainMap();
    } else if (!compareTwoState.guB && guName !== compareTwoState.guA) {
      compareTwoState.guB = guName;
      document.getElementById('mapSelectBanner').classList.remove('visible');
      openCompareTwoModal(compareTwoState.guA, guName);
      resetCompareTwoMode();
      renderMainMap();
    }
  };

  function openCompareTwoModal(guA, guB) {
    if (!state.crimeData) return;
    const yr = state.year;
    const dA = state.crimeData[guA]?.[yr] || {};
    const dB = state.crimeData[guB]?.[yr] || {};
    const cctvA = state.cctvData?.[guA] ? Object.values(state.cctvData[guA]).reduce((s,d)=>s+d.count,0) : 0;
    const cctvB = state.cctvData?.[guB] ? Object.values(state.cctvData[guB]).reduce((s,d)=>s+d.count,0) : 0;

    // header
    document.getElementById('twoCompareNameA').textContent = guA;
    document.getElementById('twoCompareNameB').textContent = guB;
    document.getElementById('twoCompareYear').textContent = yr;

    // mini map
    renderMiniMap2('twoMapSvgA', guA, 'a');
    renderMiniMap2('twoMapSvgB', guB, 'b');
    document.getElementById('twoMapLabelA').textContent = guA;
    document.getElementById('twoMapLabelB').textContent = guB;
    document.getElementById('twoMapSubA').textContent = `Crime Rate ${dA.crime?.toFixed(1)||'—'} · Arrest Rate ${dA.arrest?.toFixed(1)||'—'}%`;
    document.getElementById('twoMapSubB').textContent = `Crime Rate ${dB.crime?.toFixed(1)||'—'} · Arrest Rate ${dB.arrest?.toFixed(1)||'—'}%`;

    // stat cards
    ['A','B'].forEach(g => {
      const gu=g==='A'?guA:guB, d=g==='A'?dA:dB, cctv=g==='A'?cctvA:cctvB;
      document.getElementById(`twoStatName${g}`).textContent = gu;
      document.getElementById(`twoStatCrime${g}`).textContent = d.crime?.toFixed(1)||'—';
      document.getElementById(`twoStatArrest${g}`).textContent = (d.arrest?.toFixed(1)||'—')+'%';
      document.getElementById(`twoStatCctv${g}`).textContent = cctv>0 ? cctv.toLocaleString()+' units' : '—';
    });

    renderTwoBarChart2(guA, guB, yr);
    renderTwoScatterChart(guA, guB, yr);
    renderTwoRadarChart(guA, guB, yr);
    renderTwoCrimeChart2(guA, guB, yr);
    renderTwoTrendChart2(guA, guB);

    // wire up filter checkbox events
    document.querySelectorAll('#crimeFilterList input[type=checkbox]').forEach(cb => {
      cb.onchange = () => {
        renderTwoRadarChart(guA, guB, state.year);
        renderTwoCrimeChart2(guA, guB, state.year);
        updateCrimeFilterBadge();
      };
    });
    updateCrimeFilterBadge();
    renderTwoCrimeChart2(guA, guB, yr);

    document.getElementById('twoCompareOverlay').classList.add('visible');
  }

  function renderMiniMap2(containerId, guName, slot) {
    const container = document.getElementById(containerId);
    const info = SEOUL_DATA.districts[guName];
    if (!container || !info) return;

    const guPath = info.d;
    const dongs = (typeof DONG_DATA !== 'undefined' && DONG_DATA[guName]) ? DONG_DATA[guName] : [];

    const nums = (guPath.match(/-?\d+\.?\d*/g)||[]).map(Number);
    const xs = nums.filter((_,i)=>i%2===0), ys = nums.filter((_,i)=>i%2===1);
    const minx=Math.min(...xs), maxx=Math.max(...xs), miny=Math.min(...ys), maxy=Math.max(...ys);
    const pad = Math.max(maxx-minx, maxy-miny)*0.07;
    const vbX=minx-pad, vbY=miny-pad, vbW=(maxx-minx)+pad*2, vbH=(maxy-miny)+pad*2;
    const scale = Math.max(vbW,vbH)/600;

    const clipId = `miniclip-${slot}-${guName.replace(/[^a-zA-Z0-9]/g,'_')}`;
    const outerStroke = slot==='a' ? '#3b82f6' : '#f97316';

    let svg = `<svg viewBox="${vbX} ${vbY} ${vbW} ${vbH}" xmlns="${NS2}" style="width:100%;height:440px;display:block" preserveAspectRatio="xMidYMid meet">`;
    svg += `<defs><clipPath id="${clipId}"><path d="${guPath}"/></clipPath></defs>`;

    // background
    svg += `<path d="${guPath}" fill="#f8fafc" stroke="${outerStroke}" stroke-width="${3.5*scale}" stroke-linejoin="round"/>`;

    // neighborhood boundaries
    svg += `<g clip-path="url(#${clipId})">`;
    dongs.forEach((dong, i) => {
      if (!dong.d) return;
      const fill = i%2===0 ? '#ffffff' : '#f1f5f9';
      svg += `<path d="${dong.d}" fill="${fill}" stroke="#cbd2d9" stroke-width="${1.2*scale}" stroke-linejoin="round"/>`;
    });
    svg += `</g>`;

    // re-emphasize district outline
    svg += `<path d="${guPath}" fill="none" stroke="${outerStroke}" stroke-width="${3.5*scale}" stroke-linejoin="round"/>`;

    // CCTV circles first (so they sit behind labels)
    if (state.cctvData && state.cctvData[guName]) {
      dongs.forEach(dong => {
        const normalizedName = normalizeDongName(dong.name);
        const cctvInfo = state.cctvData[guName][normalizedName];
        if (cctvInfo && cctvInfo.ratio > 0) {
          cctvRadiusScale.domain([0, state.cctvMaxRatio]);
          const r = cctvRadiusScale(cctvInfo.ratio) * scale * 1.3;
          svg += `<circle cx="${dong.cx}" cy="${dong.cy}" r="${r}" fill="#a78bfa" fill-opacity="0.4" stroke="#7c3aed" stroke-width="${1.5*scale}"><title>${dong.name} CCTV 비율: ${cctvInfo.ratio.toFixed(1)}</title></circle>`;
        }
      });
    }

    // neighborhood name + CCTV count labels
    dongs.forEach(dong => {
      // neighborhood name
      svg += `<text x="${dong.cx}" y="${dong.cy}" text-anchor="middle" dominant-baseline="middle" font-size="${13*scale}px" font-weight="700" fill="#1e293b" style="paint-order:stroke;stroke:rgba(255,255,255,0.95);stroke-width:${4*scale}px;">${dong.name}</text>`;

      // CCTV value
      if (state.cctvData && state.cctvData[guName]) {
        const normalizedName = normalizeDongName(dong.name);
        const cctvInfo = state.cctvData[guName][normalizedName];
        if (cctvInfo && cctvInfo.ratio > 0) {
          cctvRadiusScale.domain([0, state.cctvMaxRatio]);
          const r = cctvRadiusScale(cctvInfo.ratio) * scale * 1.3;
          svg += `<text x="${dong.cx}" y="${dong.cy + r + 14*scale}" text-anchor="middle" font-size="${11*scale}px" font-weight="700" fill="#6d28d9" font-family="'JetBrains Mono',monospace">${Math.round(cctvInfo.ratio)}</text>`;
        }
      }
    });

    // police markers (on top)
    if (state.policeData) {
      state.policeData.forEach(p => {
        if (p.address.includes(guName)) {
          const px = scaleX(p.lng);
          const py = scaleY(p.lat);
          const r = 14*scale;
          svg += `<g transform="translate(${px},${py})">
            <circle cx="0" cy="0" r="${r}" fill="#eab308" stroke="white" stroke-width="${2.5*scale}"><title>${p.name} (${p.type})</title></circle>
            <text x="0" y="${5*scale}" text-anchor="middle" font-size="${12*scale}px" font-weight="800" fill="white" font-family="'JetBrains Mono',monospace">P</text>
          </g>`;
        }
      });
    }

    svg += `</svg>`;
    container.innerHTML = svg;
  }

  function renderTwoScatterChart(guA, guB, yr) {
    const svg = document.getElementById('twoScatterSvg');
    if (!svg || !state.crimeData) return;
    svg.innerHTML = '';

    const W = 800, H = 420;
    const ml = 70, mr = 40, mt = 30, mb = 60;
    const iW = W - ml - mr, iH = H - mt - mb;

    // collect data for all 25 districts
    const allGu = Object.keys(SEOUL_DATA.districts);
    const points = allGu.map(gu => ({
      gu,
      crime: state.crimeData[gu]?.[yr]?.crime || 0,
      arrest: state.crimeData[gu]?.[yr]?.arrest || 0,
    })).filter(p => p.crime > 0);

    const crimeVals = points.map(p => p.crime);
    const arrestVals = points.map(p => p.arrest);
    const minCrime = Math.min(...crimeVals) * 0.9;
    const maxCrime = Math.max(...crimeVals) * 1.05;
    const minArrest = Math.min(...arrestVals) * 0.9;
    const maxArrest = Math.max(...arrestVals) * 1.05;

    const xP = v => ml + ((v - minCrime) / (maxCrime - minCrime)) * iW;
    const yP = v => mt + iH - ((v - minArrest) / (maxArrest - minArrest)) * iH;

    // background quadrants (low crime+high arrest = green, high crime+low arrest = red)
    const midCrime = (minCrime + maxCrime) / 2;
    const midArrest = (minArrest + maxArrest) / 2;
    const mx = xP(midCrime), my = yP(midArrest);

    const quadrants = [
      { x: ml, y: mt,  w: mx-ml,   h: my-mt,   fill: 'rgba(249,115,22,0.04)', label: 'Crime↑ Arrest↑' },
      { x: mx, y: mt,  w: W-mr-mx, h: my-mt,   fill: 'rgba(230,57,70,0.06)',  label: 'Crime↑↑ Arrest↑' },
      { x: ml, y: my,  w: mx-ml,   h: H-mb-my, fill: 'rgba(6,167,125,0.06)',  label: 'Crime↓ Arrest↓' },
      { x: mx, y: my,  w: W-mr-mx, h: H-mb-my, fill: 'rgba(249,115,22,0.04)', label: 'Crime↑ Arrest↓' },
    ];
    quadrants.forEach(q => {
      const r = document.createElementNS(NS2, 'rect');
      r.setAttribute('x', q.x); r.setAttribute('y', q.y);
      r.setAttribute('width', q.w); r.setAttribute('height', q.h);
      r.setAttribute('fill', q.fill);
      svg.appendChild(r);
    });

    // center line (average)
    const midLineX = document.createElementNS(NS2, 'line');
    midLineX.setAttribute('x1', mx); midLineX.setAttribute('x2', mx);
    midLineX.setAttribute('y1', mt); midLineX.setAttribute('y2', H - mb);
    midLineX.setAttribute('stroke', '#cbd2d9'); midLineX.setAttribute('stroke-dasharray', '5,4');
    midLineX.setAttribute('stroke-width', '1.5');
    svg.appendChild(midLineX);

    const midLineY = document.createElementNS(NS2, 'line');
    midLineY.setAttribute('x1', ml); midLineY.setAttribute('x2', W - mr);
    midLineY.setAttribute('y1', my); midLineY.setAttribute('y2', my);
    midLineY.setAttribute('stroke', '#cbd2d9'); midLineY.setAttribute('stroke-dasharray', '5,4');
    midLineY.setAttribute('stroke-width', '1.5');
    svg.appendChild(midLineY);

    // axis lines
    const axisX = document.createElementNS(NS2, 'line');
    axisX.setAttribute('x1', ml); axisX.setAttribute('x2', W - mr);
    axisX.setAttribute('y1', H - mb); axisX.setAttribute('y2', H - mb);
    axisX.setAttribute('stroke', '#94a3b8'); axisX.setAttribute('stroke-width', '1.5');
    svg.appendChild(axisX);

    const axisY = document.createElementNS(NS2, 'line');
    axisY.setAttribute('x1', ml); axisY.setAttribute('x2', ml);
    axisY.setAttribute('y1', mt); axisY.setAttribute('y2', H - mb);
    axisY.setAttribute('stroke', '#94a3b8'); axisY.setAttribute('stroke-width', '1.5');
    svg.appendChild(axisY);

    // ticks
    for (let i = 0; i <= 5; i++) {
      const xVal = minCrime + (maxCrime - minCrime) / 5 * i;
      const x = xP(xVal);
      const tick = document.createElementNS(NS2, 'line');
      tick.setAttribute('x1', x); tick.setAttribute('x2', x);
      tick.setAttribute('y1', H - mb); tick.setAttribute('y2', H - mb + 5);
      tick.setAttribute('stroke', '#94a3b8');
      svg.appendChild(tick);
      const t = document.createElementNS(NS2, 'text');
      t.setAttribute('x', x); t.setAttribute('y', H - mb + 18);
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '11');
      t.setAttribute('fill', '#64748b'); t.textContent = Math.round(xVal);
      svg.appendChild(t);
    }
    for (let i = 0; i <= 5; i++) {
      const yVal = minArrest + (maxArrest - minArrest) / 5 * i;
      const y = yP(yVal);
      const tick = document.createElementNS(NS2, 'line');
      tick.setAttribute('x1', ml - 5); tick.setAttribute('x2', ml);
      tick.setAttribute('y1', y); tick.setAttribute('y2', y);
      tick.setAttribute('stroke', '#94a3b8');
      svg.appendChild(tick);
      const t = document.createElementNS(NS2, 'text');
      t.setAttribute('x', ml - 10); t.setAttribute('y', y + 4);
      t.setAttribute('text-anchor', 'end'); t.setAttribute('font-size', '11');
      t.setAttribute('fill', '#64748b'); t.textContent = yVal.toFixed(1) + '%';
      svg.appendChild(t);
    }

    // axis label
    const xLabel = document.createElementNS(NS2, 'text');
    xLabel.setAttribute('x', ml + iW / 2); xLabel.setAttribute('y', H - 8);
    xLabel.setAttribute('text-anchor', 'middle'); xLabel.setAttribute('font-size', '13');
    xLabel.setAttribute('font-weight', '600'); xLabel.setAttribute('fill', '#475569');
    xLabel.textContent = 'Crime Rate (per 100k)';
    svg.appendChild(xLabel);

    const yLabel = document.createElementNS(NS2, 'text');
    yLabel.setAttribute('transform', `rotate(-90)`);
    yLabel.setAttribute('x', -(mt + iH / 2)); yLabel.setAttribute('y', 16);
    yLabel.setAttribute('text-anchor', 'middle'); yLabel.setAttribute('font-size', '13');
    yLabel.setAttribute('font-weight', '600'); yLabel.setAttribute('fill', '#475569');
    yLabel.textContent = 'Arrest Rate (%)';
    svg.appendChild(yLabel);

    // draw normal district points first
    points.forEach(p => {
      if (p.gu === guA || p.gu === guB) return;
      const cx = xP(p.crime), cy = yP(p.arrest);

      const c = document.createElementNS(NS2, 'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', cy);
      c.setAttribute('r', '7'); c.setAttribute('fill', '#94a3b8');
      c.setAttribute('fill-opacity', '0.55'); c.setAttribute('stroke', 'white');
      c.setAttribute('stroke-width', '1.5');
      const title = document.createElementNS(NS2, 'title');
      title.textContent = `${p.gu} — Crime Rate: ${p.crime.toFixed(1)}, Arrest Rate: ${p.arrest.toFixed(1)}%`;
      c.appendChild(title);
      svg.appendChild(c);

      // small district name
      const t = document.createElementNS(NS2, 'text');
      t.setAttribute('x', cx + 9); t.setAttribute('y', cy + 4);
      t.setAttribute('font-size', '10'); t.setAttribute('fill', '#94a3b8');
      t.textContent = p.gu.replace('구', '');
      svg.appendChild(t);
    });

    // highlight the two compared districts (drawn last, on top)
    [[guA, '#3b82f6'], [guB, '#f97316']].forEach(([gu, color]) => {
      const p = points.find(d => d.gu === gu);
      if (!p) return;
      const cx = xP(p.crime), cy = yP(p.arrest);

      // glow effect
      const glow = document.createElementNS(NS2, 'circle');
      glow.setAttribute('cx', cx); glow.setAttribute('cy', cy);
      glow.setAttribute('r', '20'); glow.setAttribute('fill', color);
      glow.setAttribute('fill-opacity', '0.15');
      svg.appendChild(glow);

      const c = document.createElementNS(NS2, 'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', cy);
      c.setAttribute('r', '12'); c.setAttribute('fill', color);
      c.setAttribute('stroke', 'white'); c.setAttribute('stroke-width', '2.5');
      const title = document.createElementNS(NS2, 'title');
      title.textContent = `${p.gu} — Crime Rate: ${p.crime.toFixed(1)}, Arrest Rate: ${p.arrest.toFixed(1)}%`;
      c.appendChild(title);
      svg.appendChild(c);

      // label box
      const labelText = `${gu} (${p.crime.toFixed(0)}, ${p.arrest.toFixed(1)}%)`;
      const lx = cx + 16, ly = cy - 10;
      const bg = document.createElementNS(NS2, 'rect');
      bg.setAttribute('x', lx - 4); bg.setAttribute('y', ly - 13);
      bg.setAttribute('width', labelText.length * 7.5); bg.setAttribute('height', 20);
      bg.setAttribute('fill', color); bg.setAttribute('rx', '5');
      bg.setAttribute('fill-opacity', '0.12');
      svg.appendChild(bg);

      const t = document.createElementNS(NS2, 'text');
      t.setAttribute('x', lx); t.setAttribute('y', ly);
      t.setAttribute('font-size', '13'); t.setAttribute('font-weight', '700');
      t.setAttribute('fill', color);
      t.textContent = labelText;
      svg.appendChild(t);
    });
  }

  // get the selected crime types
  function getSelectedCrimeTypes() {
    const selected = [];
    document.querySelectorAll('#crimeFilterList .crime-filter-item').forEach(item => {
      if (item.querySelector('input').checked) {
        selected.push(item.dataset.key);
      }
    });
    return selected.length > 0 ? selected : CRIME_TYPES;
  }

  function updateCrimeFilterBadge() {
    const sel = getSelectedCrimeTypes();
    const labels = {murder:'Murder',robbery:'Robbery',theft:'Theft',violence:'Violence',rape:'Sexual Assault'};
    const badge = document.getElementById('crimeFilterBadge');
    if (badge) badge.textContent = `(${sel.map(k=>labels[k]).join(', ')})`;
  }

  // radar chart
  function renderTwoRadarChart(guA, guB, yr) {
    const svg = document.getElementById('twoRadarSvg');
    if (!svg || !state.crimeData) return;
    svg.innerHTML = '';

    const W = 500, H = 420;
    const cx = W / 2, cy = H / 2 - 10;
    const R = 150; // max radius

    const types = getSelectedCrimeTypes();
    const labels = {murder:'Murder',robbery:'Robbery',theft:'Theft',violence:'Violence',rape:'Sexual Assault'};
    const colors = {murder:'#e63946',robbery:'#f97316',theft:'#eab308',violence:'#06a77d',rape:'#3b82f6'};

    if (types.length < 3) {
      const t = document.createElementNS(NS2, 'text');
      t.setAttribute('x', cx); t.setAttribute('y', cy);
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '14');
      t.setAttribute('fill', '#94a3b8');
      t.textContent = 'Radar chart appears when 3 or more types are selected';
      svg.appendChild(t);
      return;
    }

    const n = types.length;
    const angle = i => (Math.PI * 2 / n) * i - Math.PI / 2;

    // max value per axis
    const dA = state.crimeData[guA]?.[yr]?.occur || {};
    const dB = state.crimeData[guB]?.[yr]?.occur || {};
    const maxVal = Math.max(...types.map(k => Math.max(dA[k]||0, dB[k]||0)), 1);

    // background grid
    [0.25, 0.5, 0.75, 1].forEach(ratio => {
      const pts = types.map((_, i) => {
        const a = angle(i);
        return `${cx + R * ratio * Math.cos(a)},${cy + R * ratio * Math.sin(a)}`;
      }).join(' ');
      const poly = document.createElementNS(NS2, 'polygon');
      poly.setAttribute('points', pts);
      poly.setAttribute('fill', 'none');
      poly.setAttribute('stroke', '#e2e8f0');
      poly.setAttribute('stroke-width', '1');
      svg.appendChild(poly);

      // value labels (right axis only)
      const a0 = angle(0);
      const vt = document.createElementNS(NS2, 'text');
      vt.setAttribute('x', cx + R * ratio * Math.cos(a0) + 4);
      vt.setAttribute('y', cy + R * ratio * Math.sin(a0) - 4);
      vt.setAttribute('font-size', '10'); vt.setAttribute('fill', '#94a3b8');
      vt.textContent = Math.round(maxVal * ratio);
      svg.appendChild(vt);
    });

    // axis lines
    types.forEach((_, i) => {
      const a = angle(i);
      const line = document.createElementNS(NS2, 'line');
      line.setAttribute('x1', cx); line.setAttribute('y1', cy);
      line.setAttribute('x2', cx + R * Math.cos(a));
      line.setAttribute('y2', cy + R * Math.sin(a));
      line.setAttribute('stroke', '#e2e8f0'); line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
    });

    // draw data
    [[dA, '#3b82f6', 0.5, guA], [dB, '#f97316', 0.45, guB]].forEach(([d, color, opacity, label]) => {
      const pts = types.map((k, i) => {
        const r = ((d[k]||0) / maxVal) * R;
        const a = angle(i);
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
      }).join(' ');

      const poly = document.createElementNS(NS2, 'polygon');
      poly.setAttribute('points', pts);
      poly.setAttribute('fill', color); poly.setAttribute('fill-opacity', opacity);
      poly.setAttribute('stroke', color); poly.setAttribute('stroke-width', '2');
      svg.appendChild(poly);

      // vertex points
      types.forEach((k, i) => {
        const r = ((d[k]||0) / maxVal) * R;
        const a = angle(i);
        const c = document.createElementNS(NS2, 'circle');
        c.setAttribute('cx', cx + r * Math.cos(a));
        c.setAttribute('cy', cy + r * Math.sin(a));
        c.setAttribute('r', '4'); c.setAttribute('fill', color);
        c.setAttribute('stroke', 'white'); c.setAttribute('stroke-width', '1.5');
        const title = document.createElementNS(NS2, 'title');
        title.textContent = `${label} ${labels[k]}: ${d[k]||0} cases`;
        c.appendChild(title);
        svg.appendChild(c);
      });
    });

    // axis labels (crime type name + color)
    types.forEach((k, i) => {
      const a = angle(i);
      const lx = cx + (R + 26) * Math.cos(a);
      const ly = cy + (R + 26) * Math.sin(a);
      const t = document.createElementNS(NS2, 'text');
      t.setAttribute('x', lx); t.setAttribute('y', ly);
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'middle');
      t.setAttribute('font-size', '13'); t.setAttribute('font-weight', '700');
      t.setAttribute('fill', colors[k]);
      t.textContent = labels[k];
      svg.appendChild(t);
    });

    // legend
    [[guA,'#3b82f6'],[guB,'#f97316']].forEach(([name, color], i) => {
      const lx = cx - 80 + i * 130, ly = H - 20;
      const rc = document.createElementNS(NS2, 'circle');
      rc.setAttribute('cx', lx); rc.setAttribute('cy', ly);
      rc.setAttribute('r', '6'); rc.setAttribute('fill', color);
      rc.setAttribute('fill-opacity', '0.7');
      svg.appendChild(rc);
      const lt = document.createElementNS(NS2, 'text');
      lt.setAttribute('x', lx + 10); lt.setAttribute('y', ly + 4);
      lt.setAttribute('font-size', '13'); lt.setAttribute('font-weight', '700');
      lt.setAttribute('fill', color); lt.textContent = name;
      svg.appendChild(lt);
    });
  }

  function renderTwoBarChart2(guA, guB, yr) {
    const dA = state.crimeData[guA]?.[yr]||{};
    const dB = state.crimeData[guB]?.[yr]||{};
    const pairs = [
      [document.getElementById('twoBarSvg'), [dA.crime||0, dB.crime||0], 'Crime Rate (per 100k)'],
      [document.getElementById('twoArrestBarSvg'), [dA.arrest||0, dB.arrest||0], 'Arrest Rate (%)'],
    ];
    pairs.forEach(([svg, vals, title]) => {
      if (!svg) return;
      svg.innerHTML = '';
      const W=420, H=220, ml=20, mr=20, mt=44, mb=36, iW=W-ml-mr, iH=H-mt-mb;
      const maxV = Math.max(...vals, 1);
      const barW = iW/2 - 24;
      const colors = ['#3b82f6','#f97316'];
      const names = [guA, guB];

      const tit = document.createElementNS(NS2,'text');
      tit.setAttribute('x',W/2); tit.setAttribute('y',20);
      tit.setAttribute('text-anchor','middle'); tit.setAttribute('font-size','13');
      tit.setAttribute('font-weight','700'); tit.setAttribute('fill','#1a202c');
      tit.textContent = title; svg.appendChild(tit);

      vals.forEach((v,i) => {
        const bx = ml + i*(barW+24);
        const bh = Math.max((v/maxV)*iH, 2);
        const by = mt+iH-bh;

        const rect = document.createElementNS(NS2,'rect');
        rect.setAttribute('x',bx); rect.setAttribute('y',by);
        rect.setAttribute('width',barW); rect.setAttribute('height',bh);
        rect.setAttribute('fill',colors[i]); rect.setAttribute('rx','6');
        rect.setAttribute('fill-opacity','0.85');
        svg.appendChild(rect);

        const vt = document.createElementNS(NS2,'text');
        vt.setAttribute('x',bx+barW/2); vt.setAttribute('y',by-7);
        vt.setAttribute('text-anchor','middle'); vt.setAttribute('font-size','15');
        vt.setAttribute('font-weight','700'); vt.setAttribute('fill',colors[i]);
        vt.textContent = v.toFixed(1); svg.appendChild(vt);

        const nt = document.createElementNS(NS2,'text');
        nt.setAttribute('x',bx+barW/2); nt.setAttribute('y',mt+iH+20);
        nt.setAttribute('text-anchor','middle'); nt.setAttribute('font-size','12');
        nt.setAttribute('fill','#4a5568'); nt.setAttribute('font-weight','600');
        nt.textContent = names[i]; svg.appendChild(nt);
      });
    });
  }

  function renderTwoTrendChart2(guA, guB) {
    const svg = document.getElementById('twoTrendSvg');
    if (!svg || !state.crimeData) return;
    svg.innerHTML = '';
    const years = ['2021','2022','2023','2024'];
    const W=800, H=240, ml=56, mr=40, mt=34, mb=44, iW=W-ml-mr, iH=H-mt-mb;
    const aData = years.map(y=>state.crimeData[guA]?.[y]?.crime||0);
    const bData = years.map(y=>state.crimeData[guB]?.[y]?.crime||0);
    const allV = [...aData,...bData];
    const minV = Math.min(...allV)*0.85, maxV = Math.max(...allV)*1.1||1;
    const xP = i => ml+(iW/(years.length-1))*i;
    const yP = v => mt+iH-((v-minV)/(maxV-minV))*iH;

    // grid
    for(let i=0;i<=4;i++){
      const y=mt+(iH/4)*i;
      const gl=document.createElementNS(NS2,'line');
      gl.setAttribute('x1',ml);gl.setAttribute('x2',W-mr);
      gl.setAttribute('y1',y);gl.setAttribute('y2',y);
      gl.setAttribute('stroke','#e2e8f0');gl.setAttribute('stroke-dasharray','4,4');
      svg.appendChild(gl);
      const val=maxV-((maxV-minV)/4)*i;
      const gt=document.createElementNS(NS2,'text');
      gt.setAttribute('x',ml-6);gt.setAttribute('y',y+4);
      gt.setAttribute('text-anchor','end');gt.setAttribute('font-size','11');
      gt.setAttribute('fill','#94a3b8');gt.textContent=val.toFixed(0);
      svg.appendChild(gt);
    }
    years.forEach((yr,i)=>{
      const xt=document.createElementNS(NS2,'text');
      xt.setAttribute('x',xP(i));xt.setAttribute('y',H-mb+18);
      xt.setAttribute('text-anchor','middle');xt.setAttribute('font-size','12');
      xt.setAttribute('fill','#64748b');xt.textContent=yr;
      svg.appendChild(xt);
    });

    [[aData,'#3b82f6',guA],[bData,'#f97316',guB]].forEach(([data,color,label],gi)=>{
      let d='';
      data.forEach((v,i)=>{ d+=(i===0?'M':'L')+`${xP(i)},${yP(v)}`; });
      const path=document.createElementNS(NS2,'path');
      path.setAttribute('d',d);path.setAttribute('fill','none');
      path.setAttribute('stroke',color);path.setAttribute('stroke-width','3');
      path.setAttribute('stroke-linejoin','round');path.setAttribute('stroke-linecap','round');
      svg.appendChild(path);

      data.forEach((v,i)=>{
        const c=document.createElementNS(NS2,'circle');
        c.setAttribute('cx',xP(i));c.setAttribute('cy',yP(v));
        c.setAttribute('r','5');c.setAttribute('fill',color);
        c.setAttribute('stroke','white');c.setAttribute('stroke-width','2');
        svg.appendChild(c);
        const t=document.createElementNS(NS2,'text');
        t.setAttribute('x',xP(i));t.setAttribute('y',yP(v)+(gi===0?-12:20));
        t.setAttribute('text-anchor','middle');t.setAttribute('font-size','11');
        t.setAttribute('font-weight','700');t.setAttribute('fill',color);
        t.textContent=v.toFixed(0);svg.appendChild(t);
      });

      const lx=ml+gi*180;
      const lc=document.createElementNS(NS2,'circle');
      lc.setAttribute('cx',lx);lc.setAttribute('cy',mt-16);
      lc.setAttribute('r','5');lc.setAttribute('fill',color);
      svg.appendChild(lc);
      const lt=document.createElementNS(NS2,'text');
      lt.setAttribute('x',lx+12);lt.setAttribute('y',mt-12);
      lt.setAttribute('font-size','13');lt.setAttribute('fill','#4a5568');
      lt.setAttribute('font-weight','700');lt.textContent=label;
      svg.appendChild(lt);
    });
  }

  function renderTwoCrimeChart2(guA, guB, yr) {
    const svg = document.getElementById('twoCrimeSvg');
    if (!svg || !state.crimeData) return;
    svg.innerHTML = '';
    const W=800, H=260, ml=56, mr=20, mt=30, mb=54, iW=W-ml-mr, iH=H-mt-mb;
    const types = getSelectedCrimeTypes(); // <- filter applied
    const labels = {murder:'Murder',robbery:'Robbery',theft:'Theft',violence:'Violence',rape:'Sexual Assault'};
    const dA = state.crimeData[guA]?.[yr]?.occur||{};
    const dB = state.crimeData[guB]?.[yr]?.occur||{};
    const maxV = Math.max(...types.flatMap(k=>[dA[k]||0,dB[k]||0]), 1);
    const step = iW/types.length;
    const barW = step*0.28;

    for(let i=0;i<=4;i++){
      const y=mt+(iH/4)*i;
      const gl=document.createElementNS(NS2,'line');
      gl.setAttribute('x1',ml);gl.setAttribute('x2',W-mr);
      gl.setAttribute('y1',y);gl.setAttribute('y2',y);
      gl.setAttribute('stroke','#e2e8f0');gl.setAttribute('stroke-dasharray','3,3');
      svg.appendChild(gl);
      const val=maxV-(maxV/4)*i;
      const gt=document.createElementNS(NS2,'text');
      gt.setAttribute('x',ml-6);gt.setAttribute('y',y+4);
      gt.setAttribute('text-anchor','end');gt.setAttribute('font-size','10');
      gt.setAttribute('fill','#94a3b8');gt.textContent=Math.round(val);
      svg.appendChild(gt);
    }

    types.forEach((k,i)=>{
      const cx=ml+step*i+step/2;
      [[dA[k]||0,'#3b82f6',guA],[dB[k]||0,'#f97316',guB]].forEach(([v,color,name],j)=>{
        const bh=Math.max((v/maxV)*iH,1);
        const bx=cx+(j===0?-barW-2:2);
        const rect=document.createElementNS(NS2,'rect');
        rect.setAttribute('x',bx);rect.setAttribute('y',mt+iH-bh);
        rect.setAttribute('width',barW);rect.setAttribute('height',bh);
        rect.setAttribute('fill',color);rect.setAttribute('rx','3');
        rect.setAttribute('fill-opacity','0.85');
        const title=document.createElementNS(NS2,'title');
        title.textContent=`${name} ${labels[k]}: ${v} cases`;
        rect.appendChild(title);svg.appendChild(rect);
        if(v>0){
          const vt=document.createElementNS(NS2,'text');
          vt.setAttribute('x',bx+barW/2);vt.setAttribute('y',mt+iH-bh-4);
          vt.setAttribute('text-anchor','middle');vt.setAttribute('font-size','10');
          vt.setAttribute('font-weight','600');vt.setAttribute('fill',color);
          vt.textContent=v;svg.appendChild(vt);
        }
      });
      const xt=document.createElementNS(NS2,'text');
      xt.setAttribute('x',cx);xt.setAttribute('y',H-mb+18);
      xt.setAttribute('text-anchor','middle');xt.setAttribute('font-size','12');
      xt.setAttribute('fill','#4a5568');xt.textContent=labels[k];
      svg.appendChild(xt);
    });

    [[guA,'#3b82f6'],[guB,'#f97316']].forEach(([name,color],i)=>{
      const lx=ml+i*200;
      const lr=document.createElementNS(NS2,'rect');
      lr.setAttribute('x',lx);lr.setAttribute('y',H-mb+30);
      lr.setAttribute('width',12);lr.setAttribute('height',12);
      lr.setAttribute('fill',color);lr.setAttribute('rx','3');
      svg.appendChild(lr);
      const lt=document.createElementNS(NS2,'text');
      lt.setAttribute('x',lx+16);lt.setAttribute('y',H-mb+41);
      lt.setAttribute('font-size','13');lt.setAttribute('fill','#4a5568');
      lt.setAttribute('font-weight','700');lt.textContent=name;
      svg.appendChild(lt);
    });
  }

  function wireEvents() {
    document.getElementById('twoCompareClose').addEventListener('click', ()=>{
      document.getElementById('twoCompareOverlay').classList.remove('visible');
    });
    document.getElementById('twoCompareOverlay').addEventListener('click', e=>{
      if(e.target===document.getElementById('twoCompareOverlay'))
        document.getElementById('twoCompareOverlay').classList.remove('visible');
    });

    const startBtn = document.getElementById('startCompareTwoBtn');
    if (startBtn) startBtn.addEventListener('click', toggleCompareTwoMode);
  }

  waitForData(() => {
    injectStyles();
    injectHTML();
    wireEvents();
    if (typeof window.renderMainMap === 'function') window.renderMainMap();
  });
})();
