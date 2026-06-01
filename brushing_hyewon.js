/* eslint-disable no-undef */
/* global d3, SEOUL_DATA, state */

/**
 * bushing_hyewon.js
 * 부드러운 페인트브러시 방식 다중 구역 선택 및 투트랙 차트(꺾은선 + 누적 막대) 플러그인
 */

(function() {
  console.log("🚀 Bushing Plugin (Dual Chart Mode) Loading...");

  const checkInterval = setInterval(() => {
    if (typeof state !== 'undefined' && state.crimeData && document.querySelector('.map-area')) {
      clearInterval(checkInterval);
      initPlugin();
    }
  }, 300);

  // 꺾은선 그래프(자치구 구별) 색상
  const LINE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
  
  // 누적 막대 그래프(5대 범죄 유형별) 색상
  const CRIME_TYPES = ['murder', 'robbery', 'theft', 'violence', 'rape'];
  const CRIME_LABELS = { murder: '살인', robbery: '강도', theft: '절도', violence: '폭력', rape: '강간/추행' };
  const CRIME_COLORS = { murder: '#e63946', robbery: '#f97316', theft: '#eab308', violence: '#06a77d', rape: '#3b82f6' };

  let brushedGus = [];
  let isCompareMode = false;
  let isPainting = false;

  function initPlugin() {
    injectCSS();
    injectUI();
    setupPaintingEvents();

    const observer = new MutationObserver(() => {
      if (isCompareMode) {
        highlightMap(); 
        updateCharts();  
      }
    });
    observer.observe(document.getElementById('seoulMap'), { childList: true });
  }

  function injectCSS() {
    const style = document.createElement('style');
    style.innerHTML = `
      .brush-toggle-btn {
        position: absolute; top: 24px; right: 24px; z-index: 50;
        background: var(--bg-card); border: 1px solid var(--border-strong); border-radius: 8px;
        padding: 10px 16px; font-size: 13px; font-weight: 700; color: var(--text-primary);
        cursor: pointer; box-shadow: var(--shadow-sm); transition: all 0.2s;
        font-family: 'IBM Plex Sans KR', sans-serif;
      }
      .brush-toggle-btn:hover { background: var(--bg-secondary); }
      .brush-toggle-btn.active { background: var(--text-primary); color: white; border-color: var(--text-primary); }
      
      #comp-container { display: none; margin-top: 24px; animation: fadeIn 0.4s ease; padding: 24px; }
      .comp-line { fill: none; stroke-width: 3.5px; stroke-linecap: round; stroke-linejoin: round; }
      .comp-dot { stroke: var(--bg-card); stroke-width: 2px; transition: r 0.2s; cursor: pointer; }
      .comp-dot:hover { r: 6; }
      
      .compare-mode-active { user-select: none; -webkit-user-select: none; }
      .compare-mode-active .gu-path { cursor: pointer; transition: fill 0.15s ease, filter 0.15s ease; }
      
      .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 16px; }
      .sub-chart-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; }
      
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
  }

  function injectUI() {
    const mapArea = document.querySelector('.map-area');
    const btn = document.createElement('button');
    btn.id = 'toggleBrushBtn';
    btn.className = 'brush-toggle-btn';
    btn.innerHTML = '📊 Brushing on';
    btn.onclick = toggleMode;
    mapArea.appendChild(btn);

    const compDiv = document.createElement('div');
    compDiv.id = 'comp-container';
    compDiv.className = 'chart-section';
    compDiv.innerHTML = `
      <div class="chart-header" style="margin-bottom: 8px;">
        <div>
          <h2 style="font-family: 'Gowun Batang', serif; font-size: 20px; font-weight: 700; margin-bottom:4px;">다중 자치구 시각화 분석</h2>
          <div class="subtitle" id="comp-subtitle" style="font-size: 13px; color: var(--text-secondary);">선택된 구역: 없음</div>
        </div>
      </div>
      
      <div class="chart-grid">
        <div>
          <div class="sub-chart-title">📈 비율 추이 (검거율 / 범죄율)</div>
          <div id="legend-line" class="chart-legend" style="display: flex; flex-wrap: wrap; gap: 8px; height: 20px;"></div>
          <svg id="svgLine" width="100%" height="260" viewBox="0 0 400 260"></svg>
        </div>
        
        <div>
          <div class="sub-chart-title" id="title-bar">📊 5대 범죄 발생 건수</div>
          <div id="legend-bar" class="chart-legend" style="display: flex; flex-wrap: wrap; gap: 8px; height: 20px;"></div>
          <svg id="svgBar" width="100%" height="260" viewBox="0 0 400 260"></svg>
        </div>
      </div>
    `;
    mapArea.parentNode.insertBefore(compDiv, mapArea.nextSibling);
    
    // 막대 그래프 범례는 고정이므로 미리 그려둡니다.
    const legendBar = document.getElementById('legend-bar');
    legendBar.innerHTML = CRIME_TYPES.map(k => 
      `<div style="display:flex; align-items:center; gap:4px; font-size:11px; font-weight:600; color:var(--text-secondary);">
        <span style="width:10px; height:10px; border-radius:2px; background:${CRIME_COLORS[k]};"></span>${CRIME_LABELS[k]}
       </div>`
    ).join('');
  }

  function toggleMode() {
    isCompareMode = !isCompareMode;
    const btn = document.getElementById('toggleBrushBtn');
    const compContainer = document.getElementById('comp-container');
    const mapSvg = document.getElementById('seoulMap');

    if (isCompareMode) {
      btn.classList.add('active');
      btn.innerHTML = '✕ 비교 모드 끄기';
      compContainer.style.display = 'block';
      mapSvg.classList.add('compare-mode-active');
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '📊 문지르기 다중 비교 켜기';
      compContainer.style.display = 'none';
      mapSvg.classList.remove('compare-mode-active');
      brushedGus = [];
      if (typeof window.renderMainMap === 'function') {
        state.selectedGu = null; 
        window.renderMainMap();
      }
    }
  }

  function setupPaintingEvents() {
    const mapSvg = document.getElementById('seoulMap');

    mapSvg.addEventListener('click', (e) => {
      if (isCompareMode) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);

    mapSvg.addEventListener('pointerdown', (e) => {
      if (!isCompareMode) return;
      const path = e.target.closest('.gu-path');
      if (path) {
        e.preventDefault();
        isPainting = true;
        brushedGus = []; 
        const gu = getGuNameFromPath(path);
        if (gu) {
          brushedGus.push(gu);
          highlightMap();
          updateCharts();
        }
      }
    });

    mapSvg.addEventListener('pointermove', (e) => {
      if (!isCompareMode || !isPainting) return;
      const path = e.target.closest('.gu-path');
      if (path) {
        const gu = getGuNameFromPath(path);
        if (gu && !brushedGus.includes(gu)) {
          brushedGus.push(gu);
          highlightMap();
          updateCharts();
        }
      }
    });

    window.addEventListener('pointerup', () => {
      if (isPainting) isPainting = false;
    });
  }

  function getGuNameFromPath(path) {
    const paths = Array.from(document.querySelectorAll('#seoulMap .gu-path'));
    const idx = paths.indexOf(path);
    if (idx > -1 && typeof SEOUL_DATA !== 'undefined') return Object.keys(SEOUL_DATA.districts)[idx];
    return null;
  }

  function highlightMap() {
    const paths = document.querySelectorAll('#seoulMap .gu-path');
    const labels = document.querySelectorAll('#seoulMap .gu-label');
    const guNames = Object.keys(SEOUL_DATA.districts);

    if (brushedGus.length === 0) {
      paths.forEach(p => p.setAttribute('class', 'gu-path'));
      labels.forEach(l => l.setAttribute('class', 'gu-label'));
      return;
    }

    paths.forEach((path, i) => {
      const gu = guNames[i];
      path.setAttribute('class', brushedGus.includes(gu) ? 'gu-path selected' : 'gu-path dimmed');
    });
    labels.forEach((label, i) => {
      const gu = guNames[i];
      label.setAttribute('class', brushedGus.includes(gu) ? 'gu-label' : 'gu-label dim');
    });
  }

  // 💡 투트랙 차트 컨트롤러
  function updateCharts() {
    const subtitle = document.getElementById('comp-subtitle');
    d3.select('#svgLine').selectAll('*').remove();
    d3.select('#svgBar').selectAll('*').remove();

    if (brushedGus.length === 0) {
      subtitle.textContent = '지도 위를 클릭하고 부드럽게 문질러 보세요.';
      document.getElementById('legend-line').innerHTML = '';
      document.getElementById('title-bar').textContent = '📊 5대 범죄 발생 건수';
      return;
    }

    subtitle.textContent = `선택된 구역: ${brushedGus.join(', ')}`;
    
    // 두 그래프 렌더링 함수 동시 호출
    drawLineChart();
    drawStackedBarChart();
  }

  // 📈 1. 꺾은선 차트 (검거율 / 범죄율)
  function drawLineChart() {
    const svg = d3.select('#svgLine');
    const width = 400, height = 260; // 반반 레이아웃에 맞게 width 축소
    const margin = { top: 20, right: 40, bottom: 30, left: 40 }; 
    const years = ['2021', '2022', '2023', '2024'];

    const chartData = brushedGus.map((gu, i) => {
      const values = years.map(yr => {
        let ratio = 0;
        if (state.crimeData && state.crimeData[gu] && state.crimeData[gu][yr]) {
          const arrest = state.crimeData[gu][yr].arrest || 0;
          const crime = state.crimeData[gu][yr].crime || 0;
          if (crime > 0) ratio = arrest / crime;
        }
        return { year: yr, value: ratio };
      });
      return { gu, color: LINE_COLORS[i % LINE_COLORS.length], values, index: i };
    });

    const minVal = d3.min(chartData, d => d3.min(d.values, v => v.value)) || 0;
    const maxVal = d3.max(chartData, d => d3.max(d.values, v => v.value)) || 0.1;
    const yPadding = (maxVal - minVal) * 0.1 || 0.02;

    const xScale = d3.scalePoint().domain(years).range([margin.left, width - margin.right]).padding(0.2);
    const yScale = d3.scaleLinear()
      .domain([Math.max(0, minVal - yPadding), maxVal + yPadding])
      .range([height - margin.bottom, margin.top]);

    svg.selectAll('.y-grid')
      .data(yScale.ticks(5)).enter().append('line')
      .attr('x1', margin.left).attr('x2', width - margin.right)
      .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
      .attr('stroke', 'var(--border)').attr('stroke-width', 1).attr('stroke-dasharray', '4,4');

    svg.selectAll('.y-label')
      .data(yScale.ticks(5)).enter().append('text')
      .attr('x', margin.left - 8).attr('y', d => yScale(d) + 4)
      .attr('text-anchor', 'end').attr('font-size', '10px').attr('fill', 'var(--text-secondary)')
      .text(d => d.toFixed(3));

    svg.selectAll('.x-label')
      .data(years).enter().append('text')
      .attr('x', d => xScale(d)).attr('y', height - margin.bottom + 20)
      .attr('text-anchor', 'middle').attr('font-size', '11px').attr('fill', 'var(--text-primary)').attr('font-weight', '600')
      .text(d => d);

    const lineGen = d3.line().x(d => xScale(d.year)).y(d => yScale(d.value)).curve(d3.curveMonotoneX); 

    chartData.forEach(series => {
      svg.append('path').datum(series.values).attr('class', 'comp-line').attr('d', lineGen).attr('stroke', series.color);
      svg.selectAll('.cd-' + series.index).data(series.values).enter().append('circle')
        .attr('class', 'comp-dot').attr('cx', d => xScale(d.year)).attr('cy', d => yScale(d.value)).attr('r', 4.5).attr('fill', series.color)
        .append('title').text(d => `비율: ${d.value.toFixed(4)}`);
    });

    document.getElementById('legend-line').innerHTML = chartData.map(s => 
      `<div style="display:flex; align-items:center; gap:4px; font-size:11px; font-weight:600; color:var(--text-secondary);"><span style="width:10px; height:10px; border-radius:2px; background:${s.color};"></span>${s.gu}</div>`
    ).join('');
  }

  // 📊 2. 누적 막대 차트 (내림차순 정렬)
  function drawStackedBarChart() {
    const svg = d3.select('#svgBar');
    const width = 400, height = 260;
    const margin = { top: 20, right: 20, bottom: 30, left: 50 }; 
    const currentYear = state.year; // 사용자가 좌측 상단에서 선택한 연도

    document.getElementById('title-bar').textContent = `📊 5대 범죄 발생 건수 (${currentYear}년 기준)`;

    // 1) 데이터 조립
    let barData = brushedGus.map(gu => {
      let occur = {};
      if (state.crimeData && state.crimeData[gu] && state.crimeData[gu][currentYear]) {
        occur = state.crimeData[gu][currentYear].occur || {};
      }
      
      const m = occur.murder || 0;
      const rb = occur.robbery || 0;
      const t = occur.theft || 0;
      const v = occur.violence || 0;
      const rp = occur.rape || 0;
      const total = m + rb + t + v + rp;
      
      return { gu, murder: m, robbery: rb, theft: t, violence: v, rape: rp, total };
    });

    // 2) 내림차순 정렬
    barData.sort((a, b) => b.total - a.total);

    // 3) 스케일 설정
    const xScale = d3.scaleBand()
      .domain(barData.map(d => d.gu))
      .range([margin.left, width - margin.right])
      .padding(0.35); // 막대 두께 조절

    const maxTotal = d3.max(barData, d => d.total) || 10;
    const yScale = d3.scaleLinear()
      .domain([0, maxTotal * 1.1])
      .range([height - margin.bottom, margin.top]);

    // 4) 배경 Y축 그리드
    svg.selectAll('.y-grid-bar')
      .data(yScale.ticks(5)).enter().append('line')
      .attr('x1', margin.left).attr('x2', width - margin.right)
      .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
      .attr('stroke', 'var(--border)').attr('stroke-width', 1).attr('stroke-dasharray', '4,4');

    svg.selectAll('.y-label-bar')
      .data(yScale.ticks(5)).enter().append('text')
      .attr('x', margin.left - 8).attr('y', d => yScale(d) + 4)
      .attr('text-anchor', 'end').attr('font-size', '10px').attr('fill', 'var(--text-secondary)')
      .text(d => d);

    // X축 (구 이름)
    svg.append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).tickSizeOuter(0))
      .call(g => g.select(".domain").attr("stroke", "var(--border-strong)"))
      .selectAll('text')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', 'var(--text-primary)');

    // 5) D3 Stack 생성 및 렌더링
    const stack = d3.stack().keys(CRIME_TYPES);
    const stackedSeries = stack(barData);

    svg.selectAll(".crime-layer")
      .data(stackedSeries)
      .enter().append("g")
      .attr("class", "crime-layer")
      .attr("fill", d => CRIME_COLORS[d.key])
      .selectAll("rect")
      .data(d => d)
      .enter().append("rect")
      .attr("x", d => xScale(d.data.gu))
      .attr("y", d => yScale(d[1])) // 누적된 윗부분
      .attr("height", d => yScale(d[0]) - yScale(d[1])) // 막대 높이
      .attr("width", xScale.bandwidth())
      .style("transition", "all 0.3s ease")
      .append("title")
      .text(function(d) {
         const key = d3.select(this.parentNode).datum().key;
         return `${d.data.gu} [${CRIME_LABELS[key]}]: ${d[1] - d[0]}건`; // 툴팁
      });
  }

})();