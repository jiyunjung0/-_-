/* eslint-disable no-undef */
/* global d3, SEOUL_DATA, state */

/**
 * bushing_hyewon.js
 * 부드러운 페인트브러시 방식 다중 구역 선택 및 투트랙 차트 플러그인
 * (지윤님의 compare_two_jiyun.js 와 완벽 호환되도록 클릭 이벤트 스마트 래핑)
 */

(function() {
  console.log("🚀 Bushing Plugin (Compatibility Mode) Loading...");

  const checkInterval = setInterval(() => {
    if (typeof state !== 'undefined' && state.crimeData && document.querySelector('.map-area')) {
      clearInterval(checkInterval);
      initPlugin();
    }
  }, 300);

  const LINE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
  const CRIME_TYPES = ['murder', 'robbery', 'theft', 'violence', 'rape'];
  const CRIME_LABELS = { murder: '살인', robbery: '강도', theft: '절도', violence: '폭력', rape: '강간/추행' };
  const CRIME_COLORS = { murder: '#e63946', robbery: '#f97316', theft: '#eab308', violence: '#06a77d', rape: '#3b82f6' };

  let brushedGus = [];
  let isPainting = false;

  // 지윤님의 '비교 모드'가 활성화되어 있는지 확인하는 함수
  function isJiyunMode() {
    const btn = document.getElementById('startCompareTwoBtn');
    return btn && btn.classList.contains('selecting');
  }

  function initPlugin() {
    // 💡 핵심: 기존 모달 띄우기 함수(selectGu)를 스마트하게 가로채기(Wrapping)
    const _originalSelectGu = window.selectGu;
    window.selectGu = function(guName) {
      if (isJiyunMode()) {
        // 지윤님 모드가 켜져 있다면, 지윤님 코드가 작동할 수 있도록 원본 함수 정상 호출
        if (typeof _originalSelectGu === 'function') {
          _originalSelectGu(guName);
        }
      } else {
        // 평소 상태라면 기본 팝업(모달)을 무시 (우리가 만든 하단 브러싱 차트로 대체되므로)
        return;
      }
    };

    injectCSS();
    injectUI();
    setupPaintingEvents();

    updateCharts(); // 초기 스위칭 상태 세팅

    const observer = new MutationObserver(() => {
      // 지윤님 모드가 아닐 때만 우리의 맵 하이라이트 효과 적용
      if (!isJiyunMode()) {
        highlightMap(); 
        updateCharts();  
      }
    });
    observer.observe(document.getElementById('seoulMap'), { childList: true });
  }

  function injectCSS() {
    const style = document.createElement('style');
    style.innerHTML = `
      #comp-container { margin-top: 24px; animation: fadeIn 0.4s ease; padding: 24px; display: none; }
      .comp-line { fill: none; stroke-width: 3.5px; stroke-linecap: round; stroke-linejoin: round; }
      .comp-dot { stroke: var(--bg-card); stroke-width: 2px; transition: r 0.2s; cursor: pointer; }
      .comp-dot:hover { r: 6; }
      
      #seoulMap { user-select: none; -webkit-user-select: none; touch-action: none; }
      #seoulMap .gu-path { cursor: pointer; transition: fill 0.15s ease, filter 0.15s ease; }
      
      .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 16px; }
      .sub-chart-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; }
      
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
  }

  function injectUI() {
    const mapArea = document.querySelector('.map-area');

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
    
    const legendBar = document.getElementById('legend-bar');
    legendBar.innerHTML = CRIME_TYPES.map(k => 
      `<div style="display:flex; align-items:center; gap:4px; font-size:11px; font-weight:600; color:var(--text-secondary);">
        <span style="width:10px; height:10px; border-radius:2px; background:${CRIME_COLORS[k]};"></span>${CRIME_LABELS[k]}
       </div>`
    ).join('');
  }

  function setupPaintingEvents() {
    const mapSvg = document.getElementById('seoulMap');

    // 💡 마우스 누를 때 (단일 클릭도 포함)
    mapSvg.addEventListener('pointerdown', (e) => {
      // 지윤님 모드가 켜져있다면 브러싱 작동 금지 (클릭 이벤트가 지윤님 모달로 넘어가게 둠)
      if (isJiyunMode()) return; 

      const path = e.target.closest('.gu-path');
      if (path) {
        e.preventDefault();
        isPainting = true;
        brushedGus = []; 
        const gu = getGuNameFromPath(path);
        if (gu) {
          brushedGus.push(gu); // 단일 클릭 시 배열에 1개만 할당
          highlightMap();
          updateCharts();
        }
      } else {
        // 지도 여백 클릭 시 차트 원상복구
        brushedGus = [];
        highlightMap();
        updateCharts();
      }
    });

    // 💡 마우스 움직일 때 (다중 선택 브러싱)
    mapSvg.addEventListener('pointermove', (e) => {
      if (!isPainting || isJiyunMode()) return;
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

  function updateCharts() {
    const compContainer = document.getElementById('comp-container');
    const originalChart = document.getElementById('chartTitle')?.closest('.chart-section'); 
    const subtitle = document.getElementById('comp-subtitle');
    
    d3.select('#svgLine').selectAll('*').remove();
    d3.select('#svgBar').selectAll('*').remove();

    if (brushedGus.length === 0) {
      compContainer.style.display = 'none'; 
      if (originalChart) originalChart.style.display = 'block'; 
      return;
    }

    if (originalChart) originalChart.style.display = 'none'; 
    compContainer.style.display = 'block'; 

    subtitle.textContent = `선택된 구역: ${brushedGus.join(', ')}`;
    
    drawLineChart();
    drawStackedBarChart();
  }

  function drawLineChart() {
    const svg = d3.select('#svgLine');
    const width = 400, height = 260; 
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

  function drawStackedBarChart() {
    const svg = d3.select('#svgBar');
    const width = 400, height = 260;
    const margin = { top: 20, right: 20, bottom: 30, left: 50 }; 
    const years = ['2021', '2022', '2023', '2024']; // 👈 4개 연도 배열 추가

    // 👈 제목 변경
    document.getElementById('title-bar').textContent = `📊 5대 범죄 발생 건수 (2021~2024년 합산)`;

    // 👈 4년 치 데이터를 돌면서 모두 누적(+), 합산하도록 로직 변경
    let barData = brushedGus.map(gu => {
      let m = 0, rb = 0, t = 0, v = 0, rp = 0;
      
      years.forEach(yr => {
        if (state.crimeData && state.crimeData[gu] && state.crimeData[gu][yr]) {
          const occur = state.crimeData[gu][yr].occur || {};
          m += occur.murder || 0;
          rb += occur.robbery || 0;
          t += occur.theft || 0;
          v += occur.violence || 0;
          rp += occur.rape || 0;
        }
      });
      
      const total = m + rb + t + v + rp;
      return { gu, murder: m, robbery: rb, theft: t, violence: v, rape: rp, total };
    });

    barData.sort((a, b) => b.total - a.total);

    const xScale = d3.scaleBand().domain(barData.map(d => d.gu)).range([margin.left, width - margin.right]).padding(0.35); 
    const maxTotal = d3.max(barData, d => d.total) || 10;
    const yScale = d3.scaleLinear().domain([0, maxTotal * 1.1]).range([height - margin.bottom, margin.top]);

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

    svg.append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).tickSizeOuter(0))
      .call(g => g.select(".domain").attr("stroke", "var(--border-strong)"))
      .selectAll('text').attr('font-size', '11px').attr('font-weight', '600').attr('fill', 'var(--text-primary)');

    const stack = d3.stack().keys(CRIME_TYPES);
    const stackedSeries = stack(barData);

    svg.selectAll(".crime-layer")
      .data(stackedSeries).enter().append("g")
      .attr("class", "crime-layer").attr("fill", d => CRIME_COLORS[d.key])
      .selectAll("rect").data(d => d).enter().append("rect")
      .attr("x", d => xScale(d.data.gu))
      .attr("y", d => yScale(d[1])) 
      .attr("height", d => yScale(d[0]) - yScale(d[1])) 
      .attr("width", xScale.bandwidth())
      .style("transition", "all 0.3s ease")
      .append("title")
      .text(function(d) {
         const key = d3.select(this.parentNode).datum().key;
         return `${d.data.gu} [${CRIME_LABELS[key]}]: ${d[1] - d[0]}건`; 
      });
  }

})();