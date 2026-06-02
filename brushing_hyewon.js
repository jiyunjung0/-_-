/* eslint-disable no-undef */
/* global d3, SEOUL_DATA, state */

/**
 * bushing_hyewon.js
 * 부드러운 페인트브러시 방식 다중 구역 선택 플러그인
 * (0개 선택: 25개 구 듀얼 랭킹 차트 / 1개 선택: 원그래프 / 2개 이상 선택: 댄싱 막대그래프)
 */

(function() {
  console.log("🚀 Bushing Plugin (Perfect Error-Free Mode) Loading...");

  const checkInterval = setInterval(() => {
    if (typeof state !== 'undefined' && state.crimeData && document.querySelector('.map-area')) {
      clearInterval(checkInterval);
      initPlugin();
    }
  }, 300);

  const LINE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
  const CRIME_TYPES = ['murder', 'robbery', 'theft', 'violence', 'rape'];
  const CRIME_LABELS = { murder: 'Murder', robbery: 'Robbery', theft: 'Theft', violence: 'Violence', rape: 'Rape' };
  const CRIME_COLORS = { murder: '#e63946', robbery: '#f97316', theft: '#eab308', violence: '#06a77d', rape: '#3b82f6' };

  let brushedGus = [];
  let isPainting = false;
  let isDragged = false; 
  let currentSortKey = 'total'; 

  function isJiyunMode() {
    const btn = document.getElementById('startCompareTwoBtn');
    return btn && btn.classList.contains('selecting');
  }

  function initPlugin() {
    const _originalSelectGu = window.selectGu;
    window.selectGu = function(guName) {
      if (isDragged) return; 
      if (isJiyunMode()) {
        if (typeof _originalSelectGu === 'function') _originalSelectGu(guName);
      } else {
        brushedGus = [guName];
        highlightMap();
        updateCharts();
      }
    };

    injectCSS();
    injectUI();
    setupPaintingEvents();

    updateCharts(); 

    const observer = new MutationObserver(() => {
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
      #comp-container { margin-top: 24px; animation: fadeIn 0.4s ease; padding: 24px; display: block; }
      .comp-line { fill: none; stroke-width: 3.5px; stroke-linecap: round; stroke-linejoin: round; }
      .comp-dot { stroke: var(--bg-card); stroke-width: 2px; transition: r 0.2s; cursor: pointer; }
      .comp-dot:hover { r: 6; }
      
      #seoulMap { user-select: none; -webkit-user-select: none; touch-action: none; }
      #seoulMap .gu-path { cursor: pointer; transition: fill 0.15s ease, filter 0.15s ease; }
      
      .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 16px; }
      .sub-chart-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; }
      
      .legend-btn { cursor: pointer; transition: opacity 0.2s, transform 0.1s; display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: var(--text-secondary); padding: 4px 6px; border-radius: 4px; }
      .legend-btn:hover { opacity: 1 !important; transform: translateY(-1px); background: var(--bg-tertiary); }
      .legend-btn.active { opacity: 1; background: var(--bg-tertiary); color: var(--text-primary); }
      
      /* 날아오는 애니메이션 방지 */
      #svgBar .tick, #svgBar rect, #svgAll .tick, #svgAll rect { transition: none !important; }
      
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
          <h2 id="comp-title" style="font-family: 'Gowun Batang', serif; font-size: 20px; font-weight: 700; margin-bottom:4px;">Safety Ranking Across Seoul’s 25 Districts</h2>
          <div class="subtitle" id="comp-subtitle" style="font-size: 13px; color: var(--text-secondary);">Selected Districts: 없음</div>
        </div>
      </div>
      
      <!-- 0개 선택 시: 25개 구 전체 랭킹 막대그래프 -->
      <div id="all-districts-wrapper">
         <svg id="svgAll" width="100%" height="280" viewBox="0 0 800 280"></svg>
      </div>
      
      <!-- 1개 이상 선택 시: 다중 비교 차트 그리드 -->
      <div class="chart-grid" id="comp-grid" style="display: none;">
        <div>
          <div class="sub-chart-title">📈 Trends in Rates (Arrest Rate / Crime Rate)</div>
          <div id="legend-line" class="chart-legend" style="display: flex; flex-wrap: wrap; gap: 8px; height: 26px;"></div>
          <svg id="svgLine" width="100%" height="260" viewBox="0 0 400 260"></svg>
        </div>
        
        <div>
          <div class="sub-chart-title" id="title-bar">📊 5대 범죄 발생 현황</div>
          <div id="bar-hint" style="font-size:11px; color:var(--text-primary); margin-bottom:4px; height: 16px;"></div>
          <div id="legend-bar" class="chart-legend" style="display: flex; flex-wrap: wrap; gap: 4px; height: 26px;"></div>
          <svg id="svgBar" width="100%" height="260" viewBox="0 0 400 260"></svg>
        </div>
      </div>
    `;
    mapArea.parentNode.insertBefore(compDiv, mapArea.nextSibling);
  }

  function setupPaintingEvents() {
    const mapSvg = document.getElementById('seoulMap');

    mapSvg.addEventListener('pointerdown', (e) => {
      if (isJiyunMode()) return; 
      const path = e.target.closest('.gu-path');
      if (path) {
        e.preventDefault();
        isPainting = true;
        isDragged = false; 
        brushedGus = [getGuNameFromPath(path)]; 
        highlightMap();
        updateCharts();
      } else {
        brushedGus = [];
        highlightMap();
        updateCharts();
      }
    });

    mapSvg.addEventListener('pointermove', (e) => {
      if (!isPainting || isJiyunMode()) return;
      isDragged = true; 
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
      isPainting = false;
      setTimeout(() => { isDragged = false; }, 50);
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
    const originalChart = document.getElementById('chartTitle')?.closest('.chart-section'); 
    
    if (originalChart) originalChart.style.display = 'none'; 
    
    const compGrid = document.getElementById('comp-grid');
    const allWrapper = document.getElementById('all-districts-wrapper');
    const compTitle = document.getElementById('comp-title');
    const subtitle = document.getElementById('comp-subtitle');
    
    if (brushedGus.length === 0) {
      compGrid.style.display = 'none';
      allWrapper.style.display = 'block';
      drawAllDistrictsChart();
      return;
    }

    compGrid.style.display = 'grid';
    allWrapper.style.display = 'none';
    
    compTitle.textContent = 'Multi-District Visual Analysis';
    subtitle.textContent = `Selected Districts: ${brushedGus.join(', ')}`;
    
    d3.select('#svgLine').selectAll('*').remove();
    drawLineChart();
    
    if (brushedGus.length === 1) {
      drawPieChart();
    } else {
      drawStackedBarChart();
    }
  }

  // 📊 0개 선택 시: 25개 구 범죄율/검거율 듀얼 랭킹 차트
  function drawAllDistrictsChart() {
    const svg = d3.select('#svgAll');
    const width = 800, height = 280;
    const margin = { top: 30, right: 40, bottom: 50, left: 40 }; 
    const year = state.year;
    
    // 💡 사이드바에서 선택한 현재 지표 확인 (안전한 예외처리)
    const activeMetric = (state.metric === 'arrest' || state.indicator === 'arrest') ? 'arrest' : 'crime';

    const compTitle = document.getElementById('comp-title');
    const subtitle = document.getElementById('comp-subtitle');
    compTitle.textContent = `Safety Ranking Across Seoul’s 25 Districts`;
    subtitle.textContent = `(${year}) ${activeMetric === 'crime' ? '🟥 Crime Rate' : '🟩 Arrest Rate'} sorted in descending order.`;

    const allGus = Object.keys(SEOUL_DATA.districts);
    let barData = allGus.map(gu => {
      const crimeVal = state.crimeData[gu]?.[year]?.crime || 0;
      const arrestVal = state.crimeData[gu]?.[year]?.arrest || 0;
      return { gu, crime: crimeVal, arrest: arrestVal };
    });
    
    barData.sort((a, b) => b[activeMetric] - a[activeMetric]);

    if (svg.select('.y-axis-left').empty()) {
      svg.append('g').attr('class', 'y-axis-left').attr('transform', `translate(${margin.left}, 0)`);
      svg.append('g').attr('class', 'y-axis-right').attr('transform', `translate(${width - margin.right}, 0)`);
      svg.append('g').attr('class', 'x-axis').attr('transform', `translate(0, ${height - margin.bottom})`);
      svg.append('g').attr('class', 'bars-container');
    }

    const xScale0 = d3.scaleBand().domain(barData.map(d => d.gu)).range([margin.left, width - margin.right]).padding(0.25);
    const xScale1 = d3.scaleBand().domain(['crime', 'arrest']).range([0, xScale0.bandwidth()]).padding(0.05);

    const maxCrime = d3.max(barData, d => d.crime) || 10;
    const maxArrest = d3.max(barData, d => d.arrest) || 100;

    const yScaleCrime = d3.scaleLinear().domain([0, maxCrime * 1.1]).range([height - margin.bottom, margin.top]);
    const yScaleArrest = d3.scaleLinear().domain([0, Math.max(100, maxArrest * 1.1)]).range([height - margin.bottom, margin.top]);

    const t = svg.transition().duration(600).ease(d3.easeCubicOut);

    // 💡 왼쪽 Y축 (에러 방지: 도메인 즉시 삭제, 얌전한 렌더링)
    const yAxisLeft = d3.axisLeft(yScaleCrime).ticks(5).tickSize(-(width - margin.left - margin.right));
    const leftG = svg.select('.y-axis-left');
    leftG.transition(t).call(yAxisLeft);
    leftG.select(".domain").remove();
    leftG.selectAll(".tick line").attr("stroke", "var(--border)").attr("stroke-dasharray", "4,4");
    leftG.selectAll(".tick text").attr("fill", "#e63946").attr("font-size", "10px").attr("font-weight", "600");

    if(leftG.select('.left-label').empty()){
        leftG.append('text').attr('class','left-label')
         .attr('x', 0).attr('y', margin.top - 10)
         .attr('fill', '#e63946').attr('font-size', '10px').attr('font-weight', '700')
         .attr('text-anchor', 'middle')
         .text('Crime Rate(%)');
    }

    // 💡 오른쪽 Y축 (에러 방지: append는 원본 G에 직접 수행)
    const yAxisRight = d3.axisRight(yScaleArrest).ticks(5).tickSize(0);
    const rightG = svg.select('.y-axis-right');
    rightG.transition(t).call(yAxisRight);
    rightG.select(".domain").remove();
    rightG.selectAll(".tick text").attr("fill", "#06a77d").attr("font-size", "10px").attr("font-weight", "600").attr("dx", "4px");
    
    // 에러 발생의 원흉 해결! (transition 객체가 아닌 rightG 본체에 append)
    if(rightG.select('.right-label').empty()){
        rightG.append('text').attr('class','right-label')
         .attr('x', 0).attr('y', margin.top - 10)
         .attr('fill', '#06a77d').attr('font-size', '10px').attr('font-weight', '700')
         .attr('text-anchor', 'middle')
         .text('Arrest Rate(%)');
    }

    // 💡 X축 (얌전한 렌더링)
    const xAxisG = svg.select('.x-axis');
    xAxisG.transition(t).call(d3.axisBottom(xScale0).tickSizeOuter(0));
    xAxisG.select(".domain").remove();
    xAxisG.selectAll('text')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', 'var(--text-primary)')
      .attr('transform', 'rotate(-30)')
      .attr('text-anchor', 'end')
      .attr('dx', '-0.2em')
      .attr('dy', '0.5em');

    const groups = svg.select('.bars-container').selectAll('.gu-group').data(barData, d => d.gu);

    const groupsEnter = groups.enter().append('g')
      .attr('class', 'gu-group')
      .attr('transform', d => `translate(${xScale0(d.gu)},0)`);

    const allGroups = groupsEnter.merge(groups);
    allGroups.transition(t).attr('transform', d => `translate(${xScale0(d.gu)},0)`);

    // 1️⃣ 빨간 막대 (범죄율)
    allGroups.selectAll('.bar-crime')
      .data(d => [d])
      .join(
        enter => enter.append('rect')
          .attr('class', 'bar-crime')
          .attr('x', xScale1('crime'))
          .attr('y', d => yScaleCrime(d.crime)) 
          .attr('width', xScale1.bandwidth())
          .attr('height', d => Math.max(0, yScaleCrime(0) - yScaleCrime(d.crime)))
          .attr('fill', '#e63946')
          .attr('rx', 2)
          .attr('stroke', 'none')
          .style('outline', 'none')
          .style('opacity', 0),
        update => update,
        exit => exit.remove()
      )
      .transition(t)
      .style('opacity', activeMetric === 'crime' ? 1 : 0.3) 
      .attr('x', xScale1('crime'))
      .attr('y', d => yScaleCrime(d.crime))
      .attr('width', xScale1.bandwidth())
      .attr('height', d => Math.max(0, yScaleCrime(0) - yScaleCrime(d.crime)));

    // 2️⃣ 초록 막대 (검거율)
    allGroups.selectAll('.bar-arrest')
      .data(d => [d])
      .join(
        enter => enter.append('rect')
          .attr('class', 'bar-arrest')
          .attr('x', xScale1('arrest'))
          .attr('y', d => yScaleArrest(d.arrest)) 
          .attr('width', xScale1.bandwidth())
          .attr('height', d => Math.max(0, yScaleArrest(0) - yScaleArrest(d.arrest)))
          .attr('fill', '#06a77d')
          .attr('rx', 2)
          .attr('stroke', 'none')
          .style('outline', 'none')
          .style('opacity', 0),
        update => update,
        exit => exit.remove()
      )
      .transition(t)
      .style('opacity', activeMetric === 'arrest' ? 1 : 0.3) 
      .attr('x', xScale1('arrest'))
      .attr('y', d => yScaleArrest(d.arrest))
      .attr('width', xScale1.bandwidth())
      .attr('height', d => Math.max(0, yScaleArrest(0) - yScaleArrest(d.arrest)));

    allGroups.selectAll('rect').selectAll('title').remove();
    allGroups.selectAll('.bar-crime').append('title').text(d => `${d.gu} Crime Rate: ${d.crime.toFixed(1)}`);
    allGroups.selectAll('.bar-arrest').append('title').text(d => `${d.gu} Arrest Rate: ${d.arrest.toFixed(1)}%`);
  }

  // 📈 좌측 (1개 이상 선택): 꺾은선 차트 
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
    const yScale = d3.scaleLinear().domain([Math.max(0, minVal - yPadding), maxVal + yPadding]).range([height - margin.bottom, margin.top]);

    svg.selectAll('.y-grid').data(yScale.ticks(5)).enter().append('line')
      .attr('x1', margin.left).attr('x2', width - margin.right)
      .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
      .attr('stroke', 'var(--border)').attr('stroke-width', 1).attr('stroke-dasharray', '4,4');

    svg.selectAll('.y-label').data(yScale.ticks(5)).enter().append('text')
      .attr('x', margin.left - 8).attr('y', d => yScale(d) + 4)
      .attr('text-anchor', 'end').attr('font-size', '10px').attr('fill', 'var(--text-secondary)')
      .text(d => d.toFixed(3));

    svg.selectAll('.x-label').data(years).enter().append('text')
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

  // 📊 우측 (1개 선택 시): 원그래프
  function drawPieChart() {
    const svg = d3.select('#svgBar');
    svg.selectAll('*').remove();
    
    const width = 400, height = 260;
    const radius = Math.min(width, height) / 2 - 20;
    const gu = brushedGus[0];
    const years = ['2021', '2022', '2023', '2024'];

    document.getElementById('title-bar').innerHTML = `📊 Five Major Crime Composition in ${gu} (2021–2024 Total)`;
    document.getElementById('bar-hint').textContent = ''; 

    document.getElementById('legend-bar').innerHTML = CRIME_TYPES.map(k => 
      `<div style="display:flex; align-items:center; gap:4px; font-size:11px; font-weight:600; color:var(--text-secondary); padding:4px 6px;">
        <span style="width:10px; height:10px; border-radius:2px; background:${CRIME_COLORS[k]};"></span>${CRIME_LABELS[k]}
       </div>`
    ).join('');

    let m = 0, rb = 0, t = 0, v = 0, rp = 0;
    years.forEach(yr => {
      if (state.crimeData && state.crimeData[gu] && state.crimeData[gu][yr]) {
        const occur = state.crimeData[gu][yr].occur || {};
        m += occur.murder || 0; rb += occur.robbery || 0; t += occur.theft || 0; v += occur.violence || 0; rp += occur.rape || 0;
      }
    });
    const total = m + rb + t + v + rp;

    const pieData = [
      { key: 'murder', value: m }, { key: 'robbery', value: rb }, { key: 'theft', value: t }, { key: 'violence', value: v }, { key: 'rape', value: rp }
    ].filter(d => d.value > 0);

    const pie = d3.pie().value(d => d.value).sort((a, b) => b.value - a.value); 
    const data_ready = pie(pieData);

    const arcGenerator = d3.arc().innerRadius(0).outerRadius(radius);
    const arcLabel = d3.arc().innerRadius(radius * 0.6).outerRadius(radius * 0.6);

    const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);

    const slices = g.selectAll('path')
      .data(data_ready).join('path')
      .attr('fill', d => CRIME_COLORS[d.data.key])
      .attr('stroke', 'white')
      .style('stroke-width', '2px')
      .style('cursor', 'pointer')
      .style('outline', 'none'); // 포커스 테두리 방지
      
    slices.append('title')
      .text(d => `${CRIME_LABELS[d.data.key]}: ${d.data.value}건 (${(d.data.value / total * 100).toFixed(1)}%)`);

    slices.transition().duration(800)
      .attrTween("d", function(d) {
          const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
          return function(t) { return arcGenerator(i(t)); };
      });

    g.selectAll('text')
      .data(data_ready).join('text')
      .transition().delay(800).duration(400) 
      .text(d => {
        const pct = (d.data.value / total * 100);
        return pct > 5 ? `${CRIME_LABELS[d.data.key]} ${pct.toFixed(1)}%` : '';
      })
      .attr('transform', d => `translate(${arcLabel.centroid(d)})`)
      .style('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '700')
      .style('fill', 'white')
      .style('text-shadow', '0px 1px 3px rgba(0,0,0,0.5)');
  }

  // 📊 우측 (2개 이상 선택): Baseline Shift 댄싱 막대그래프
  function drawStackedBarChart() {
    const svg = d3.select('#svgBar');
    
    if (svg.select('.layers-container').empty()) svg.selectAll('*').remove();

    const width = 400, height = 260;
    const margin = { top: 20, right: 20, bottom: 30, left: 50 }; 
    const years = ['2021', '2022', '2023', '2024']; 

    const sortLabel = currentSortKey === 'total' ? 'Total' : CRIME_LABELS[currentSortKey];
    document.getElementById('title-bar').innerHTML = `📊 Cumulative Incidents of Five Major Crimes<br>(2021–2024, sorted by ${sortLabel})`;
    document.getElementById('bar-hint').textContent = '💡 Click the legend or chart segments below to sort districts by the selected crime type.';

    let barData = brushedGus.map(gu => {
      let m = 0, rb = 0, t = 0, v = 0, rp = 0;
      years.forEach(yr => {
        if (state.crimeData && state.crimeData[gu] && state.crimeData[gu][yr]) {
          const occur = state.crimeData[gu][yr].occur || {};
          m += occur.murder || 0; rb += occur.robbery || 0; t += occur.theft || 0; v += occur.violence || 0; rp += occur.rape || 0;
        }
      });
      const total = m + rb + t + v + rp;
      return { gu, murder: m, robbery: rb, theft: t, violence: v, rape: rp, total };
    });

    barData.sort((a, b) => b[currentSortKey] - a[currentSortKey]);

    if (svg.select('.y-axis').empty()) {
      svg.append('g').attr('class', 'y-axis').attr('transform', `translate(${margin.left}, 0)`);
      svg.append('g').attr('class', 'x-axis').attr('transform', `translate(0, ${height - margin.bottom})`);
      svg.append('line').attr('class', 'zero-line'); 
      svg.append('g').attr('class', 'layers-container');
    }

    const xScale = d3.scaleBand().domain(barData.map(d => d.gu)).range([margin.left, width - margin.right]).padding(0.35); 
    
    function getOffset(d, key) {
      if (key === 'total') return 0;
      let offset = 0;
      for (let k of CRIME_TYPES) {
        if (k === key) break;
        offset += d[k] || 0;
      }
      return offset; 
    }

    const minVal = d3.min(barData, d => 0 - getOffset(d, currentSortKey));
    const maxVal = d3.max(barData, d => d.total - getOffset(d, currentSortKey));
    
    const yScale = d3.scaleLinear()
      .domain([minVal > 0 ? 0 : minVal * 1.1, maxVal * 1.1])
      .range([height - margin.bottom, margin.top]);

    const t = svg.transition().duration(600).ease(d3.easeCubicOut);

    // 💡 Y축 (테두리 삭제 완벽 처리)
    const yAxisG = svg.select('.y-axis');
    yAxisG.transition(t).call(d3.axisLeft(yScale).ticks(5).tickSize(-(width - margin.left - margin.right)));
    yAxisG.select(".domain").remove();
    yAxisG.selectAll(".tick line").attr("stroke", "var(--border)").attr("stroke-dasharray", "4,4");
    yAxisG.selectAll(".tick text").attr("fill", "var(--text-secondary)").attr("x", -8).attr("font-size", "10px");

    // 💡 X축 (글자 날아오지 않게 처리)
    const xAxisG = svg.select('.x-axis');
    xAxisG.transition(t).call(d3.axisBottom(xScale).tickSizeOuter(0));
    xAxisG.select(".domain").remove();
    xAxisG.selectAll('text').attr('font-size', '11px').attr('font-weight', '600').attr('fill', 'var(--text-primary)');

    svg.select('.zero-line').transition(t)
      .attr('x1', margin.left).attr('x2', width - margin.right)
      .attr('y1', yScale(0)).attr('y2', yScale(0))
      .attr('stroke', 'var(--text-primary)').attr('stroke-width', 2);

    const stack = d3.stack().keys(CRIME_TYPES);
    const stackedSeries = stack(barData);

    const layers = svg.select('.layers-container').selectAll('.crime-layer')
      .data(stackedSeries, d => d.key)
      .join('g').attr('class', 'crime-layer').attr('fill', d => CRIME_COLORS[d.key]);

    const rects = layers.selectAll('rect')
      .data(d => d, d => d.data.gu)
      .join(
        enter => enter.append('rect')
          .attr('x', d => xScale(d.data.gu))
          .attr('y', d => yScale(d[1] - getOffset(d.data, currentSortKey)))
          .attr('width', xScale.bandwidth())
          .attr('height', d => Math.max(0, yScale(d[0]) - yScale(d[1])))
          .attr('stroke', 'none')
          .style('outline', 'none')
          .style("cursor", "pointer")
          .style('opacity', 0)
      )
      .on('click', function() {
        const clickedKey = d3.select(this.parentNode).datum().key;
        danceToBaseline(clickedKey);
      });

    rects.transition(t)
      .style('opacity', 1)
      .attr('x', d => xScale(d.data.gu))
      .attr('y', d => yScale(d[1] - getOffset(d.data, currentSortKey)))
      .attr('width', xScale.bandwidth())
      .attr('height', d => Math.max(0, yScale(d[0]) - yScale(d[1])));

    rects.selectAll('title').remove();
    rects.append('title').text(function(d) {
      const key = d3.select(this.parentNode).datum().key;
      return `${d.data.gu} [${CRIME_LABELS[key]}]: ${d[1] - d[0]}건`; 
    });

    const legendBar = document.getElementById('legend-bar');
    let legendHTML = `<div class="legend-btn" data-key="total"><span style="width:10px; height:10px; border-radius:2px; background:var(--text-primary);"></span>Total</div>`;
    legendHTML += CRIME_TYPES.map(k => 
      `<div class="legend-btn" data-key="${k}">
        <span style="width:10px; height:10px; border-radius:2px; background:${CRIME_COLORS[k]};"></span>${CRIME_LABELS[k]}
       </div>`
    ).join('');
    legendBar.innerHTML = legendHTML;

    d3.selectAll('.legend-btn').style('opacity', function() {
      return d3.select(this).attr('data-key') === currentSortKey ? 1 : 0.4;
    }).classed('active', function() {
      return d3.select(this).attr('data-key') === currentSortKey;
    });

    function danceToBaseline(crimeKey) {
      currentSortKey = crimeKey; 
      drawStackedBarChart();     
    }

    d3.selectAll('.legend-btn').on('click', function() {
      danceToBaseline(d3.select(this).attr('data-key'));
    });
  }

})();