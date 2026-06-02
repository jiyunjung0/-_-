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

  // 이전 연도 점 위치 저장 (애니메이션용)
  const _prevPositions = {};

  // enhanced scatter: same chart as the base + permanent labels + map linking
  function renderMainScatterEnhanced() {
    const svg = document.getElementById('mainScatterSvg');
    if (!svg || !state.crimeData) return;

    // 현재 점 위치 스냅샷 (애니메이션 from 값으로 사용)
    const prevSnap = Object.assign({}, _prevPositions);

    svg.innerHTML = '';

    const W = 800, H = 280;
    const ml = 44, mr = 20, mt = 20, mb = 48;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.maxHeight = '280px';
    const iW = W - ml - mr, iH = H - mt - mb;
    const allGu = Object.keys(SEOUL_DATA.districts);

    const points = allGu.map(gu => ({
      gu,
      crime: state.crimeData[gu]?.[state.year]?.crime || 0,
      arrest: state.crimeData[gu]?.[state.year]?.arrest || 0,
    })).filter(p => p.crime > 0);

    // 전체 연도 통틀어 min/max 고정 → 연도 바꿔도 축 안 변함
    const allYears = Object.keys(state.crimeData[allGu[0]] || {});
    const allCrime = allGu.flatMap(gu => allYears.map(yr => state.crimeData[gu]?.[yr]?.crime || 0)).filter(v => v > 0);
    const allArrest = allGu.flatMap(gu => allYears.map(yr => state.crimeData[gu]?.[yr]?.arrest || 0)).filter(v => v > 0);
    const minC = Math.min(...allCrime) * 0.92;
    const maxC = Math.max(...allCrime) * 1.05;
    const minA = Math.min(...allArrest) * 0.92;
    const maxA = Math.max(...allArrest) * 1.05;

    const xP = v => ml + ((v - minC) / (maxC - minC)) * iW;
    const yP = v => mt + iH - ((v - minA) / (maxA - minA)) * iH;

    // average line (현재 연도 기준)
    const avgC = points.reduce((a,b) => a + b.crime, 0) / points.length;
    const avgA = points.reduce((a,b) => a + b.arrest, 0) / points.length;

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

    // ---- collision-aware label placement (avoid overlapping district names) ----
    const _FS = 10, _R = 7, _charW = 9.6;
    const _estW = t => t.length * _charW + 4;
    const _ov = (a, b) => !(a.x2 <= b.x1 || a.x1 >= b.x2 || a.y2 <= b.y1 || a.y1 >= b.y2);
    const _inB = b => b.x1 >= ml - 2 && b.x2 <= W - mr + 2 && b.y1 >= mt - 2 && b.y2 <= H - mb + 2;
    const _box = (cand, w) => {
      const x1 = cand.anchor === 'middle' ? cand.tx - w / 2 : cand.anchor === 'start' ? cand.tx : cand.tx - w;
      return { x1, x2: x1 + w, y1: cand.ty - _FS, y2: cand.ty + 2 };
    };
    const _cands = (cx, cy) => ([
      { tx: cx,        ty: cy - _R - 7,  anchor: 'middle', leader: false }, // above
      { tx: cx,        ty: cy + _R + 13, anchor: 'middle', leader: false }, // below
      { tx: cx + _R+5, ty: cy + 3.5,     anchor: 'start',  leader: false }, // right
      { tx: cx - _R-5, ty: cy + 3.5,     anchor: 'end',    leader: false }, // left
      { tx: cx,        ty: cy - _R - 19, anchor: 'middle', leader: true  }, // far above
      { tx: cx,        ty: cy + _R + 25, anchor: 'middle', leader: true  }, // far below
      { tx: cx + _R+6, ty: cy - 11,      anchor: 'start',  leader: true  }, // up-right
      { tx: cx - _R-6, ty: cy - 11,      anchor: 'end',    leader: true  }, // up-left
      { tx: cx + _R+6, ty: cy + 18,      anchor: 'start',  leader: true  }, // down-right
      { tx: cx - _R-6, ty: cy + 18,      anchor: 'end',    leader: true  }, // down-left
    ]);
    const _placed = [];
    points.map(p => ({ p, cx: xP(p.crime), cy: yP(p.arrest) }))
          .sort((a, b) => a.cx - b.cx)
          .forEach(({ p, cx, cy }) => {
            const w = _estW(p.gu);
            let best = null, bestScore = Infinity;
            for (const cand of _cands(cx, cy)) {
              const box = _box(cand, w);
              let s = 0;
              if (!_inB(box)) s += 1000;
              for (const pb of _placed) {
                if (_ov(box, pb)) {
                  const ox = Math.min(box.x2, pb.x2) - Math.max(box.x1, pb.x1);
                  const oy = Math.min(box.y2, pb.y2) - Math.max(box.y1, pb.y1);
                  s += Math.max(0, ox) * Math.max(0, oy);
                }
              }
              if (!cand.leader) s -= 6; // prefer labels hugging the point
              if (s < bestScore) { bestScore = s; best = { cand, box }; }
              if (s <= 0) break;        // clean spot found
            }
            p._label = best.cand;
            _placed.push(best.box);
          });

    points.forEach(p => {
      const cx = xP(p.crime), cy = yP(p.arrest);

      // 이전 위치 (없으면 현재 위치 → 첫 렌더는 제자리)
      const prev = prevSnap[p.gu] || { cx, cy };
      // 다음 렌더를 위해 현재 위치 저장
      _prevPositions[p.gu] = { cx, cy };

      const dur = '0.55s';
      const ease = 'cubic-bezier(0.4,0,0.2,1)';

      // glow circle
      const glow = document.createElementNS(NS, 'circle');
      glow.setAttribute('cx', cx); glow.setAttribute('cy', cy);
      glow.setAttribute('r', '20'); glow.setAttribute('fill', '#3b82f6');
      glow.setAttribute('fill-opacity', '0');
      svg.appendChild(glow);

      // main point
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', prev.cx); c.setAttribute('cy', prev.cy);
      c.setAttribute('r', '7'); c.setAttribute('fill', '#64748b');
      c.setAttribute('fill-opacity', '0.65');
      c.setAttribute('stroke', 'white'); c.setAttribute('stroke-width', '1.5');
      c.style.cursor = 'pointer';

      // cx 이동 애니메이션
      if (prev.cx !== cx) {
        const axAnim = document.createElementNS(NS, 'animate');
        axAnim.setAttribute('attributeName', 'cx');
        axAnim.setAttribute('from', prev.cx); axAnim.setAttribute('to', cx);
        axAnim.setAttribute('dur', dur); axAnim.setAttribute('fill', 'freeze');
        axAnim.setAttribute('calcMode', 'spline');
        axAnim.setAttribute('keySplines', '0.4 0 0.2 1');
        axAnim.setAttribute('keyTimes', '0;1');
        c.appendChild(axAnim);
      } else { c.setAttribute('cx', cx); }

      // cy 이동 애니메이션
      if (prev.cy !== cy) {
        const ayAnim = document.createElementNS(NS, 'animate');
        ayAnim.setAttribute('attributeName', 'cy');
        ayAnim.setAttribute('from', prev.cy); ayAnim.setAttribute('to', cy);
        ayAnim.setAttribute('dur', dur); ayAnim.setAttribute('fill', 'freeze');
        ayAnim.setAttribute('calcMode', 'spline');
        ayAnim.setAttribute('keySplines', '0.4 0 0.2 1');
        ayAnim.setAttribute('keyTimes', '0;1');
        c.appendChild(ayAnim);
      } else { c.setAttribute('cy', cy); }

      svg.appendChild(c);

      // always-on district-name label, placed to avoid overlaps
      const lab = p._label || { tx: cx, ty: cy - 12, anchor: 'middle', leader: false };
      if (lab.leader) {
        const leaderLine = document.createElementNS(NS, 'line');
        leaderLine.setAttribute('x1', cx); leaderLine.setAttribute('y1', cy);
        leaderLine.setAttribute('x2', lab.tx); leaderLine.setAttribute('y2', lab.ty - 3);
        leaderLine.setAttribute('stroke', '#cbd2d9'); leaderLine.setAttribute('stroke-width', '0.8');
        svg.appendChild(leaderLine);
      }
      const lbl = document.createElementNS(NS, 'text');
      lbl.setAttribute('x', lab.tx);
      lbl.setAttribute('y', lab.ty);
      lbl.setAttribute('class', 'scatter-point-label');
      lbl.setAttribute('text-anchor', lab.anchor);
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
        svg.appendChild(lbl); // bring to front

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
