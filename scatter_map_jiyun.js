/* ============================================================
 *  scatter_map_jiyun.js  (jiyun)
 *  Feature: link the scatter plot to the choropleth map.
 *   - always-on district-name label above every scatter point
 *   - hovering a point highlights the matching district on the map
 *  Standalone add-on: load AFTER the main page with
 *      <script src="scatter_map_jiyun.js"></script>
 *  Relies on globals from the base app: state, SEOUL_DATA, selectGu,
 *  renderMainMap, renderMainScatter. Touches no other source files.
 * ========================================================== */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  // wait until the base app has finished loading CSV data
  function waitForData(cb) {
    if (typeof state !== 'undefined' && state.crimeData) cb();
    else setTimeout(() => waitForData(cb), 100);
  }

  // inject this feature's CSS once (no edits to the shared stylesheet)
  function injectStyles() {
    if (document.getElementById('scatterMapJiyunStyles')) return;
    const css = document.createElement('style');
    css.id = 'scatterMapJiyunStyles';
    css.textContent = `
      .gu-path.scatter-hover {
        stroke: var(--accent-blue, #3b82f6) !important;
        stroke-width: 5 !important;
        filter: drop-shadow(0 4px 10px rgba(59,130,246,0.45)) brightness(1.02);
      }
      .gu-path.scatter-dim { opacity: 0.28; }
      .gu-label.scatter-hover-label { fill: var(--accent-blue, #3b82f6); font-weight: 700; }
      .scatter-point-label {
        font-size: 10px; font-weight: 500; fill: var(--text-tertiary, #8b95a1);
        text-anchor: middle; pointer-events: none;
        paint-order: stroke; stroke: var(--bg-card, #fff); stroke-width: 3px;
        stroke-linejoin: round; transition: fill .15s;
      }
      .scatter-point-label.active { fill: var(--accent-blue, #3b82f6); font-weight: 700; font-size: 12px; }
    `;
    document.head.appendChild(css);
  }

  // tag the map paths/labels with their district name so the scatter can find them
  function tagGuPaths() {
    const keys = Object.keys(SEOUL_DATA.districts);
    const paths = document.querySelectorAll('#seoulMap .gu-path');
    paths.forEach((p, i) => { if (keys[i]) p.setAttribute('data-gu', keys[i]); });
    const labels = document.querySelectorAll('#seoulMap .gu-label');
    labels.forEach(l => { if (l.textContent) l.setAttribute('data-gu-label', l.textContent); });
  }

  // Scatter hover -> highlight the matching district on the map above
  function highlightMapGu(guName) {
    if (typeof state !== 'undefined' && state.selectedGu) return; // skip while a modal is open
    const mapSvg = document.getElementById('seoulMap');
    if (!mapSvg) return;
    mapSvg.querySelectorAll('.gu-path').forEach(p => {
      if (p.getAttribute('data-gu') === guName) {
        p.classList.add('scatter-hover');
        mapSvg.appendChild(p); // bring to front
      } else {
        p.classList.add('scatter-dim');
      }
    });
    const lab = mapSvg.querySelector(`[data-gu-label="${guName}"]`);
    if (lab) { lab.classList.add('scatter-hover-label'); mapSvg.appendChild(lab); }
  }

  function clearMapHighlight() {
    const mapSvg = document.getElementById('seoulMap');
    if (!mapSvg) return;
    mapSvg.querySelectorAll('.gu-path').forEach(p => p.classList.remove('scatter-hover', 'scatter-dim'));
    mapSvg.querySelectorAll('.gu-label').forEach(l => l.classList.remove('scatter-hover-label'));
  }

  // enhanced scatter: same chart as the base + permanent labels + map linking
  function renderMainScatterEnhanced() {
    const svg = document.getElementById('mainScatterSvg');
    if (!svg || !state.crimeData) return;
    svg.innerHTML = '';

    const W = 800, H = 280;
    const ml = 64, mr = 30, mt = 20, mb = 48;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.maxHeight = '280px';
    const iW = W - ml - mr, iH = H - mt - mb;
    const allGu = Object.keys(SEOUL_DATA.districts);

    const points = allGu.map(gu => ({
      gu,
      crime: state.crimeData[gu]?.[state.year]?.crime || 0,
      arrest: state.crimeData[gu]?.[state.year]?.arrest || 0,
    })).filter(p => p.crime > 0);

    const crimeVals = points.map(p => p.crime);
    const arrestVals = points.map(p => p.arrest);
    const minC = Math.min(...crimeVals) * 0.92;
    const maxC = Math.max(...crimeVals) * 1.05;
    const minA = Math.min(...arrestVals) * 0.92;
    const maxA = Math.max(...arrestVals) * 1.05;

    const xP = v => ml + ((v - minC) / (maxC - minC)) * iW;
    const yP = v => mt + iH - ((v - minA) / (maxA - minA)) * iH;

    // average line
    const avgC = crimeVals.reduce((a,b)=>a+b,0)/crimeVals.length;
    const avgA = arrestVals.reduce((a,b)=>a+b,0)/arrestVals.length;

    // quadrant background
    const mx = xP(avgC), my = yP(avgA);
    [
      {x:ml,   y:mt,  w:mx-ml,    h:my-mt,    fill:'rgba(6,167,125,0.05)'},   // Crime↓ Arrest↑ - safe
      {x:mx,   y:mt,  w:W-mr-mx,  h:my-mt,    fill:'rgba(249,115,22,0.05)'},  // Crime↑ Arrest↑
      {x:ml,   y:my,  w:mx-ml,    h:H-mb-my,  fill:'rgba(59,130,246,0.05)'},  // Crime↓ Arrest↓
      {x:mx,   y:my,  w:W-mr-mx,  h:H-mb-my,  fill:'rgba(230,57,70,0.05)'},   // Crime↑ Arrest↓ - risky
    ].forEach(q => {
      const r = document.createElementNS(NS,'rect');
      r.setAttribute('x',q.x); r.setAttribute('y',q.y);
      r.setAttribute('width',q.w); r.setAttribute('height',q.h);
      r.setAttribute('fill',q.fill);
      svg.appendChild(r);
    });

    // quadrant labels
    [
      {x:ml+8,      y:mt+16,    text:'Crime↓ Arrest↑', color:'#06a77d'},
      {x:W-mr-8,    y:mt+16,    text:'Crime↑ Arrest↑', color:'#f97316', anchor:'end'},
      {x:ml+8,      y:H-mb-8,   text:'Crime↓ Arrest↓', color:'#3b82f6'},
      {x:W-mr-8,    y:H-mb-8,   text:'Crime↑ Arrest↓', color:'#e63946', anchor:'end'},
    ].forEach(q => {
      const t = document.createElementNS(NS,'text');
      t.setAttribute('x',q.x); t.setAttribute('y',q.y);
      t.setAttribute('font-size','11'); t.setAttribute('font-weight','600');
      t.setAttribute('fill',q.color); t.setAttribute('opacity','0.7');
      if(q.anchor) t.setAttribute('text-anchor',q.anchor);
      t.textContent = q.text;
      svg.appendChild(t);
    });

    // average reference lines
    [[mx,mt,mx,H-mb],[ml,my,W-mr,my]].forEach(([x1,y1,x2,y2]) => {
      const l = document.createElementNS(NS,'line');
      l.setAttribute('x1',x1); l.setAttribute('y1',y1);
      l.setAttribute('x2',x2); l.setAttribute('y2',y2);
      l.setAttribute('stroke','#cbd2d9'); l.setAttribute('stroke-dasharray','5,4');
      l.setAttribute('stroke-width','1.5');
      svg.appendChild(l);
    });

    // axis lines
    [[ml,mt,ml,H-mb],[ml,H-mb,W-mr,H-mb]].forEach(([x1,y1,x2,y2]) => {
      const l = document.createElementNS(NS,'line');
      l.setAttribute('x1',x1); l.setAttribute('y1',y1);
      l.setAttribute('x2',x2); l.setAttribute('y2',y2);
      l.setAttribute('stroke','#94a3b8'); l.setAttribute('stroke-width','1.5');
      svg.appendChild(l);
    });

    // ticks
    for(let i=0;i<=5;i++){
      const xv = minC + (maxC-minC)/5*i;
      const x = xP(xv);
      const tl = document.createElementNS(NS,'line');
      tl.setAttribute('x1',x); tl.setAttribute('x2',x);
      tl.setAttribute('y1',H-mb); tl.setAttribute('y2',H-mb+5);
      tl.setAttribute('stroke','#94a3b8');
      svg.appendChild(tl);
      const tt = document.createElementNS(NS,'text');
      tt.setAttribute('x',x); tt.setAttribute('y',H-mb+18);
      tt.setAttribute('text-anchor','middle'); tt.setAttribute('font-size','11');
      tt.setAttribute('fill','#64748b'); tt.textContent = Math.round(xv);
      svg.appendChild(tt);

      const yv = minA + (maxA-minA)/5*i;
      const y = yP(yv);
      const yl = document.createElementNS(NS,'line');
      yl.setAttribute('x1',ml-5); yl.setAttribute('x2',ml);
      yl.setAttribute('y1',y); yl.setAttribute('y2',y);
      yl.setAttribute('stroke','#94a3b8');
      svg.appendChild(yl);
      const yt = document.createElementNS(NS,'text');
      yt.setAttribute('x',ml-8); yt.setAttribute('y',y+4);
      yt.setAttribute('text-anchor','end'); yt.setAttribute('font-size','11');
      yt.setAttribute('fill','#64748b'); yt.textContent = yv.toFixed(1)+'%';
      svg.appendChild(yt);
    }

    // axis label
    const xl = document.createElementNS(NS,'text');
    xl.setAttribute('x',ml+iW/2); xl.setAttribute('y',H-6);
    xl.setAttribute('text-anchor','middle'); xl.setAttribute('font-size','12');
    xl.setAttribute('font-weight','600'); xl.setAttribute('fill','#475569');
    xl.textContent = 'Crime Rate (per 100k)';
    svg.appendChild(xl);

    const yl2 = document.createElementNS(NS,'text');
    yl2.setAttribute('transform','rotate(-90)');
    yl2.setAttribute('x',-(mt+iH/2)); yl2.setAttribute('y',14);
    yl2.setAttribute('text-anchor','middle'); yl2.setAttribute('font-size','12');
    yl2.setAttribute('font-weight','600'); yl2.setAttribute('fill','#475569');
    yl2.textContent = 'Arrest Rate (%)';
    svg.appendChild(yl2);

    // points + hover events
    const tooltip = document.getElementById('scatterTooltip');

    points.forEach(p => {
      const cx = xP(p.crime), cy = yP(p.arrest);

      // glow circle
      const glow = document.createElementNS(NS, 'circle');
      glow.setAttribute('cx', cx); glow.setAttribute('cy', cy);
      glow.setAttribute('r', '20'); glow.setAttribute('fill', '#3b82f6');
      glow.setAttribute('fill-opacity', '0');
      svg.appendChild(glow);

      // main point
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', cy);
      c.setAttribute('r', '7'); c.setAttribute('fill', '#64748b');
      c.setAttribute('fill-opacity', '0.65');
      c.setAttribute('stroke', 'white'); c.setAttribute('stroke-width', '1.5');
      c.style.cursor = 'pointer';
      svg.appendChild(c);

      // always-on district-name label above point
      const lbl = document.createElementNS(NS, 'text');
      lbl.setAttribute('x', cx);
      lbl.setAttribute('y', cy - 12);
      lbl.setAttribute('class', 'scatter-point-label');
      lbl.textContent = p.gu;
      svg.appendChild(lbl);

      c.addEventListener('mouseenter', function() {
        // emphasize point
        this.setAttribute('r', '10');
        this.setAttribute('fill', '#3b82f6');
        this.setAttribute('fill-opacity', '1');
        glow.setAttribute('fill-opacity', '0.15');

        // emphasize the name label above the point
        lbl.classList.add('active');

        // highlight the matching district on the map above
        highlightMapGu(p.gu);

        // floating tooltip (crime/arrest values)
        tooltip.style.display = 'block';
        tooltip.innerHTML = `
          <span style="font-size:14px;font-weight:700">${p.gu}</span><br>
          <span style="color:#fca5a5">Crime Rate ${p.crime.toFixed(1)}</span>
          &nbsp;<span style="opacity:0.4">|</span>&nbsp;
          <span style="color:#6ee7b7">Arrest Rate ${p.arrest.toFixed(1)}%</span>`;
      });

      c.addEventListener('mouseleave', function() {
        this.setAttribute('r', '7');
        this.setAttribute('fill', '#64748b');
        this.setAttribute('fill-opacity', '0.65');
        glow.setAttribute('fill-opacity', '0');
        lbl.classList.remove('active');
        clearMapHighlight();
        tooltip.style.display = 'none';
      });

      // update tooltip position on mouse move
      c.addEventListener('mousemove', function(e) {
        const rect = svg.closest('div').getBoundingClientRect();
        tooltip.style.left = (e.clientX - rect.left + 14) + 'px';
        tooltip.style.top  = (e.clientY - rect.top - 40) + 'px';
      });

      // open the district modal on click
      c.addEventListener('click', () => selectGu(p.gu));
    });
  }

  // ---- bootstrap ----
  waitForData(() => {
    injectStyles();

    // wrap the base renderMainMap so paths keep their data-gu tags after every redraw
    if (!window._jiyunMapWrapped && typeof window.renderMainMap === 'function') {
      const origMap = window.renderMainMap;
      window.renderMainMap = function () { origMap.apply(this, arguments); tagGuPaths(); };
      window._jiyunMapWrapped = true;
    }

    // replace the scatter renderer with the linked version
    window.renderMainScatter = renderMainScatterEnhanced;

    // redraw once with the new behaviour
    if (typeof window.renderMainMap === 'function') window.renderMainMap();
    renderMainScatterEnhanced();
  });
})();
