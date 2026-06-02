/* ============================================================
 *  scatter_map_jiyun.js  (jiyun)
 *  Feature: scatter plot linked to choropleth map
 *   - CSS transform-based dot animation on year transition
 *   - always-on district-name label + collision avoidance
 *   - hover → map highlight  /  click → district modal
 * ========================================================== */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  function waitForData(cb) {
    if (typeof state !== 'undefined' && state.crimeData) cb();
    else setTimeout(() => waitForData(cb), 100);
  }

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

      /* dot group — moved via CSS transition */
      .scatter-dot-g {
        transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .scatter-dot-g circle.main-dot {
        transition: r 0.15s, fill 0.15s, fill-opacity 0.15s;
      }
      .scatter-point-label {
        font-size: 10px; font-weight: 500; fill: var(--text-tertiary, #8b95a1);
        text-anchor: middle; pointer-events: none;
        paint-order: stroke; stroke: var(--bg-card, #fff); stroke-width: 3px;
        stroke-linejoin: round;
        transition: fill .15s;
      }
      .scatter-point-label.active { fill: var(--accent-blue, #3b82f6); font-weight: 700; font-size: 12px; }
    `;
    document.head.appendChild(css);
  }

  function tagGuPaths() {
    const keys = Object.keys(SEOUL_DATA.districts);
    document.querySelectorAll('#seoulMap .gu-path').forEach((p, i) => {
      if (keys[i]) p.setAttribute('data-gu', keys[i]);
    });
    document.querySelectorAll('#seoulMap .gu-label').forEach(l => {
      if (l.textContent) l.setAttribute('data-gu-label', l.textContent);
    });
  }

  function highlightMapGu(guName) {
    if (typeof state !== 'undefined' && state.selectedGu) return;
    const mapSvg = document.getElementById('seoulMap');
    if (!mapSvg) return;
    mapSvg.querySelectorAll('.gu-path').forEach(p => {
      if (p.getAttribute('data-gu') === guName) { p.classList.add('scatter-hover'); mapSvg.appendChild(p); }
      else p.classList.add('scatter-dim');
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

  /* ── fixed scale across all years ── */
  function getFixedScales(allGu) {
    const allYears = Object.keys(state.crimeData[allGu[0]] || {});
    const allCrime  = allGu.flatMap(gu => allYears.map(yr => state.crimeData[gu]?.[yr]?.crime  || 0)).filter(v => v > 0);
    const allArrest = allGu.flatMap(gu => allYears.map(yr => state.crimeData[gu]?.[yr]?.arrest || 0)).filter(v => v > 0);
    return {
      minC: Math.min(...allCrime)  * 0.92, maxC: Math.max(...allCrime)  * 1.05,
      minA: Math.min(...allArrest) * 0.92, maxA: Math.max(...allArrest) * 1.05,
    };
  }

  /* ── label collision avoidance ── */
  const _FS = 10, _R = 7, _charW = 9.6;
  const _estW = t => t.length * _charW + 4;
  const _ov   = (a, b) => !(a.x2<=b.x1||a.x1>=b.x2||a.y2<=b.y1||a.y1>=b.y2);
  const _inB  = (b, ml, mr, mt, mb, W, H) =>
    b.x1>=ml-2 && b.x2<=W-mr+2 && b.y1>=mt-2 && b.y2<=H-mb+2;
  const _box  = (cand, w) => {
    const x1 = cand.anchor==='middle' ? cand.tx-w/2 : cand.anchor==='start' ? cand.tx : cand.tx-w;
    return { x1, x2:x1+w, y1:cand.ty-_FS, y2:cand.ty+2 };
  };
  const _cands = (cx, cy) => ([
    { tx:cx,        ty:cy-_R-7,  anchor:'middle', leader:false },
    { tx:cx,        ty:cy+_R+13, anchor:'middle', leader:false },
    { tx:cx+_R+5,   ty:cy+3.5,   anchor:'start',  leader:false },
    { tx:cx-_R-5,   ty:cy+3.5,   anchor:'end',    leader:false },
    { tx:cx,        ty:cy-_R-19, anchor:'middle', leader:true  },
    { tx:cx,        ty:cy+_R+25, anchor:'middle', leader:true  },
    { tx:cx+_R+6,   ty:cy-11,    anchor:'start',  leader:true  },
    { tx:cx-_R-6,   ty:cy-11,    anchor:'end',    leader:true  },
    { tx:cx+_R+6,   ty:cy+18,    anchor:'start',  leader:true  },
    { tx:cx-_R-6,   ty:cy+18,    anchor:'end',    leader:true  },
  ]);

  /* ── static layer: axes, quadrants, labels ── */
  function renderStaticLayer(svg, W, H, ml, mr, mt, mb, xP, yP, avgC, avgA, minC, maxC, minA, maxA) {
    const iW = W-ml-mr, iH = H-mt-mb;
    const mx = xP(avgC), my = yP(avgA);

    // quadrant backgrounds
    [
      {x:ml,  y:mt,  w:mx-ml,   h:my-mt,   fill:'rgba(6,167,125,0.05)'},
      {x:mx,  y:mt,  w:W-mr-mx, h:my-mt,   fill:'rgba(249,115,22,0.05)'},
      {x:ml,  y:my,  w:mx-ml,   h:H-mb-my, fill:'rgba(59,130,246,0.05)'},
      {x:mx,  y:my,  w:W-mr-mx, h:H-mb-my, fill:'rgba(230,57,70,0.05)'},
    ].forEach(q => {
      const r = document.createElementNS(NS,'rect');
      r.setAttribute('x',q.x); r.setAttribute('y',q.y);
      r.setAttribute('width',q.w); r.setAttribute('height',q.h);
      r.setAttribute('fill',q.fill); svg.appendChild(r);
    });

    // average reference lines
    [[mx,mt,mx,H-mb],[ml,my,W-mr,my]].forEach(([x1,y1,x2,y2]) => {
      const l = document.createElementNS(NS,'line');
      l.setAttribute('x1',x1); l.setAttribute('y1',y1);
      l.setAttribute('x2',x2); l.setAttribute('y2',y2);
      l.setAttribute('stroke','#cbd2d9'); l.setAttribute('stroke-dasharray','5,4');
      l.setAttribute('stroke-width','1.5'); svg.appendChild(l);
    });

    // axes
    [[ml,mt,ml,H-mb],[ml,H-mb,W-mr,H-mb]].forEach(([x1,y1,x2,y2]) => {
      const l = document.createElementNS(NS,'line');
      l.setAttribute('x1',x1); l.setAttribute('y1',y1);
      l.setAttribute('x2',x2); l.setAttribute('y2',y2);
      l.setAttribute('stroke','#94a3b8'); l.setAttribute('stroke-width','1.5'); svg.appendChild(l);
    });

    // ticks
    for(let i=0;i<=5;i++){
      const xv = minC+(maxC-minC)/5*i, x = xP(xv);
      const tl=document.createElementNS(NS,'line');
      tl.setAttribute('x1',x);tl.setAttribute('x2',x);tl.setAttribute('y1',H-mb);tl.setAttribute('y2',H-mb+5);tl.setAttribute('stroke','#94a3b8'); svg.appendChild(tl);
      const tt=document.createElementNS(NS,'text');
      tt.setAttribute('x',x);tt.setAttribute('y',H-mb+18);tt.setAttribute('text-anchor','middle');tt.setAttribute('font-size','11');tt.setAttribute('fill','#64748b');tt.textContent=Math.round(xv); svg.appendChild(tt);

      const yv = minA+(maxA-minA)/5*i, y = yP(yv);
      const yl=document.createElementNS(NS,'line');
      yl.setAttribute('x1',ml-5);yl.setAttribute('x2',ml);yl.setAttribute('y1',y);yl.setAttribute('y2',y);yl.setAttribute('stroke','#94a3b8'); svg.appendChild(yl);
      const yt=document.createElementNS(NS,'text');
      yt.setAttribute('x',ml-8);yt.setAttribute('y',y+4);yt.setAttribute('text-anchor','end');yt.setAttribute('font-size','11');yt.setAttribute('fill','#64748b');yt.textContent=yv.toFixed(1)+'%'; svg.appendChild(yt);
    }

    // axis labels
    const xl=document.createElementNS(NS,'text');
    xl.setAttribute('x',ml+iW/2);xl.setAttribute('y',H-6);xl.setAttribute('text-anchor','middle');xl.setAttribute('font-size','12');xl.setAttribute('font-weight','600');xl.setAttribute('fill','#475569');xl.textContent='Crime Rate (per 100k)'; svg.appendChild(xl);
    const yl2=document.createElementNS(NS,'text');
    yl2.setAttribute('transform','rotate(-90)');yl2.setAttribute('x',-(mt+iH/2));yl2.setAttribute('y',14);yl2.setAttribute('text-anchor','middle');yl2.setAttribute('font-size','12');yl2.setAttribute('font-weight','600');yl2.setAttribute('fill','#475569');yl2.textContent='Arrest Rate (%)'; svg.appendChild(yl2);

    // quadrant text labels
    [
      {x:ml+8,   y:mt+16,  text:'Crime↓ Arrest↑', color:'#06a77d'},
      {x:W-mr-8, y:mt+16,  text:'Crime↑ Arrest↑', color:'#f97316', anchor:'end'},
      {x:ml+8,   y:H-mb-8, text:'Crime↓ Arrest↓', color:'#3b82f6'},
      {x:W-mr-8, y:H-mb-8, text:'Crime↑ Arrest↓', color:'#e63946', anchor:'end'},
    ].forEach(q => {
      const t=document.createElementNS(NS,'text');
      t.setAttribute('x',q.x);t.setAttribute('y',q.y);t.setAttribute('font-size','11');t.setAttribute('font-weight','600');t.setAttribute('fill',q.color);t.setAttribute('opacity','0.7');
      if(q.anchor) t.setAttribute('text-anchor',q.anchor);
      t.textContent=q.text; svg.appendChild(t);
    });
  }

  /* ── dot layer — DOM created once, position updated on re-render ── */
  const _dotMap = {}; // gu → { g, circle, glow, lbl, leaderLine }

  function renderDotsLayer(svg, points, xP, yP, W, H, ml, mr, mt, mb) {
    const tooltip = document.getElementById('scatterTooltip');

    // compute collision-aware label positions
    const _placed = [];
    points.map(p => ({ p, cx: xP(p.crime), cy: yP(p.arrest) }))
          .sort((a, b) => a.cx - b.cx)
          .forEach(({ p, cx, cy }) => {
            const w = _estW(p.gu);
            let best = null, bestScore = Infinity;
            for (const cand of _cands(cx, cy)) {
              const box = _box(cand, w);
              let s = 0;
              if (!_inB(box, ml, mr, mt, mb, W, H)) s += 1000;
              for (const pb of _placed) {
                if (_ov(box, pb)) {
                  const ox = Math.min(box.x2,pb.x2)-Math.max(box.x1,pb.x1);
                  const oy = Math.min(box.y2,pb.y2)-Math.max(box.y1,pb.y1);
                  s += Math.max(0,ox)*Math.max(0,oy);
                }
              }
              if (!cand.leader) s -= 6;
              if (s < bestScore) { bestScore = s; best = { cand, box }; }
              if (s <= 0) break;
            }
            p._label = best.cand;
            _placed.push(best.box);
          });

    const seenGu = new Set();

    points.forEach(p => {
      seenGu.add(p.gu);
      const cx = xP(p.crime), cy = yP(p.arrest);
      const lab = p._label || { tx: cx, ty: cy - 12, anchor: 'middle', leader: false };

      if (_dotMap[p.gu]) {
        // existing dot: update position only — CSS transition handles animation
        const { g, circle, glow, lbl, leaderLine } = _dotMap[p.gu];

        // move via translate (transition: transform 0.55s applies)
        g.setAttribute('transform', `translate(${cx}, ${cy})`);
        glow.setAttribute('cx', 0); glow.setAttribute('cy', 0);
        circle.setAttribute('cx', 0); circle.setAttribute('cy', 0);

        // label position (kept in absolute coords)
        lbl.setAttribute('x', lab.tx);
        lbl.setAttribute('y', lab.ty);
        lbl.setAttribute('text-anchor', lab.anchor);

        if (leaderLine) {
          leaderLine.setAttribute('x1', cx); leaderLine.setAttribute('y1', cy);
          leaderLine.setAttribute('x2', lab.tx); leaderLine.setAttribute('y2', lab.ty - 3);
        }

      } else {
        // new dot: create DOM elements
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'scatter-dot-g');
        g.setAttribute('transform', `translate(${cx}, ${cy})`);

        const glow = document.createElementNS(NS, 'circle');
        glow.setAttribute('cx', 0); glow.setAttribute('cy', 0);
        glow.setAttribute('r', '20'); glow.setAttribute('fill', '#3b82f6');
        glow.setAttribute('fill-opacity', '0');
        g.appendChild(glow);

        const circle = document.createElementNS(NS, 'circle');
        circle.setAttribute('cx', 0); circle.setAttribute('cy', 0);
        circle.setAttribute('r', '7'); circle.setAttribute('fill', '#64748b');
        circle.setAttribute('fill-opacity', '0.65');
        circle.setAttribute('stroke', 'white'); circle.setAttribute('stroke-width', '1.5');
        circle.setAttribute('class', 'main-dot');
        circle.style.cursor = 'pointer';
        g.appendChild(circle);
        svg.appendChild(g);

        // leader line when label is far from point
        let leaderLine = null;
        if (lab.leader) {
          leaderLine = document.createElementNS(NS, 'line');
          leaderLine.setAttribute('x1', cx); leaderLine.setAttribute('y1', cy);
          leaderLine.setAttribute('x2', lab.tx); leaderLine.setAttribute('y2', lab.ty - 3);
          leaderLine.setAttribute('stroke', '#cbd2d9'); leaderLine.setAttribute('stroke-width', '0.8');
          svg.appendChild(leaderLine);
        }

        // label
        const lbl = document.createElementNS(NS, 'text');
        lbl.setAttribute('x', lab.tx); lbl.setAttribute('y', lab.ty);
        lbl.setAttribute('class', 'scatter-point-label');
        lbl.setAttribute('text-anchor', lab.anchor);
        lbl.textContent = p.gu;
        svg.appendChild(lbl);

        // hover events
        circle.addEventListener('mouseenter', function () {
          // enlarge & highlight this dot
          circle.setAttribute('r', '11');
          circle.setAttribute('fill', '#3b82f6');
          circle.setAttribute('fill-opacity', '1');
          glow.setAttribute('r', '22');
          glow.setAttribute('fill-opacity', '0.18');
          lbl.classList.add('active');
          // bring this group to front
          svg.appendChild(g);
          svg.appendChild(lbl);

          // dim all other dots
          Object.entries(_dotMap).forEach(([gu, d]) => {
            if (gu !== p.gu) {
              d.g.style.opacity = '0.2';
              d.lbl.style.opacity = '0.15';
            }
          });

          highlightMapGu(p.gu);
          if (tooltip) {
            tooltip.style.display = 'block';
            tooltip.innerHTML = `
              <span style="font-size:14px;font-weight:700">${p.gu}</span><br>
              <span style="color:#fca5a5">Crime Rate ${p.crime.toFixed(1)}</span>
              &nbsp;<span style="opacity:0.4">|</span>&nbsp;
              <span style="color:#6ee7b7">Arrest Rate ${p.arrest.toFixed(1)}%</span>`;
          }
        });

        circle.addEventListener('mouseleave', function () {
          circle.setAttribute('r', '7');
          circle.setAttribute('fill', '#64748b');
          circle.setAttribute('fill-opacity', '0.65');
          glow.setAttribute('r', '20');
          glow.setAttribute('fill-opacity', '0');
          lbl.classList.remove('active');

          // restore all dots
          Object.values(_dotMap).forEach(d => {
            d.g.style.opacity = '';
            d.lbl.style.opacity = '';
          });

          clearMapHighlight();
          if (tooltip) tooltip.style.display = 'none';
        });

        circle.addEventListener('mousemove', function (e) {
          if (!tooltip) return;
          const rect = svg.closest('div').getBoundingClientRect();
          tooltip.style.left = (e.clientX - rect.left + 14) + 'px';
          tooltip.style.top  = (e.clientY - rect.top  - 40) + 'px';
        });

        circle.addEventListener('click', () => selectGu(p.gu));

        _dotMap[p.gu] = { g, circle, glow, lbl, leaderLine };
      }
    });

    // remove dots for districts no longer in data
    Object.keys(_dotMap).forEach(gu => {
      if (!seenGu.has(gu)) {
        const { g, lbl, leaderLine } = _dotMap[gu];
        g.remove(); lbl.remove(); if (leaderLine) leaderLine.remove();
        delete _dotMap[gu];
      }
    });
  }

  /* ── main render function ── */
  let _staticRendered = false;
  let _lastScaleKey = '';

  function renderMainScatterEnhanced() {
    const svg = document.getElementById('mainScatterSvg');
    if (!svg || !state.crimeData) return;

    const W = 800, H = 280;
    const ml = 44, mr = 20, mt = 20, mb = 48;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.maxHeight = '280px';
    const iW = W-ml-mr, iH = H-mt-mb;
    const allGu = Object.keys(SEOUL_DATA.districts);

    const { minC, maxC, minA, maxA } = getFixedScales(allGu);
    const xP = v => ml + ((v-minC)/(maxC-minC))*iW;
    const yP = v => mt + iH - ((v-minA)/(maxA-minA))*iH;

    const points = allGu.map(gu => ({
      gu,
      crime:  state.crimeData[gu]?.[state.year]?.crime  || 0,
      arrest: state.crimeData[gu]?.[state.year]?.arrest || 0,
    })).filter(p => p.crime > 0);

    const avgC = points.reduce((a,b)=>a+b.crime, 0)  / points.length;
    const avgA = points.reduce((a,b)=>a+b.arrest, 0) / points.length;

    // skip static layer redraw if scale unchanged
    const scaleKey = `${minC}${maxC}${minA}${maxA}${avgC.toFixed(1)}${avgA.toFixed(1)}`;
    if (!_staticRendered || scaleKey !== _lastScaleKey) {
      // clear static elements and redraw
      [...svg.querySelectorAll(':not(.scatter-dot-g):not(.scatter-point-label):not(.scatter-dot-g *)')].forEach(el => el.remove());
      renderStaticLayer(svg, W, H, ml, mr, mt, mb, xP, yP, avgC, avgA, minC, maxC, minA, maxA);
      _staticRendered = true;
      _lastScaleKey = scaleKey;
    }

    // update dot layer (CSS transition handles animation)
    renderDotsLayer(svg, points, xP, yP, W, H, ml, mr, mt, mb);
  }

  // ---- bootstrap ----
  waitForData(() => {
    injectStyles();

    if (!window._jiyunMapWrapped && typeof window.renderMainMap === 'function') {
      const origMap = window.renderMainMap;
      window.renderMainMap = function () { origMap.apply(this, arguments); tagGuPaths(); };
      window._jiyunMapWrapped = true;
    }

    window.renderMainScatter = renderMainScatterEnhanced;

    if (typeof window.renderMainMap === 'function') window.renderMainMap();
    renderMainScatterEnhanced();
  });
})();
