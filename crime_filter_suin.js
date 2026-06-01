// 데이터 로드 완료 후 실행되도록 대기
function waitForData(callback) {
  if (state.crimeData) {
    callback();
  } else {
    setTimeout(() => waitForData(callback), 100);
  }
}

// 범죄 유형 필터 상태
const crimeFilterState = {
  selectedType: null // null이면 전체(기존 방식), 아니면 'murder','robbery','theft','violence','rape'
};

const CRIME_LABEL = {
  murder: '살인',
  robbery: '강도',
  theft: '절도',
  violence: '폭력',
  rape: '강간·추행'
};

// 사이드바에 범죄 유형 필터 UI 추가
function injectCrimeFilterUI() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const block = document.createElement('div');
  block.className = 'control-block';
  block.innerHTML = `
    <div class="control-label">범죄 유형 필터</div>
    <div id="crimeTypeFilter" style="display:flex; flex-direction:column; gap:8px;">
      <button class="crime-filter-btn active" data-type="all"
        style="padding:8px 12px; border-radius:8px; border:1.5px solid var(--border);
        background:var(--bg-tertiary); color:var(--text-primary); cursor:pointer; font-size:13px; text-align:left;">
        전체
      </button>
      ${Object.entries(CRIME_LABEL).map(([key, label]) => `
        <button class="crime-filter-btn" data-type="${key}"
          style="padding:8px 12px; border-radius:8px; border:1.5px solid var(--border);
          background:var(--bg-tertiary); color:var(--text-primary); cursor:pointer; font-size:13px; text-align:left;">
          ${label}
        </button>
      `).join('')}
    </div>
  `;
  sidebar.appendChild(block);

  // 버튼 클릭 이벤트
  block.querySelectorAll('.crime-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      block.querySelectorAll('.crime-filter-btn').forEach(b => {
        b.style.background = 'var(--bg-tertiary)';
        b.style.borderColor = 'var(--border)';
        b.style.fontWeight = '400';
      });
      btn.style.background = 'var(--accent-crime-light)';
      btn.style.borderColor = 'var(--accent-crime)';
      btn.style.fontWeight = '700';

      const type = btn.dataset.type;
      crimeFilterState.selectedType = type === 'all' ? null : type;
      renderMainMapWithFilter();
    });
  });
}

// 선택된 범죄 유형 기준으로 색 계산
function getColorByType(guName) {
  const year = state.year;
  const crimeData = state.crimeData;

  if (!crimeData || !crimeData[guName] || !crimeData[guName][year]) {
    return 'rgba(230, 57, 70, 0.15)';
  }

  if (!crimeFilterState.selectedType) {
    // 전체: 기존 방식 그대로
    const val = state.metric === 'crime'
      ? crimeData[guName][year].crime
      : crimeData[guName][year].arrest;
    return getColor(val, state.metric);
  }

  // 특정 범죄 유형 선택 시: 해당 유형 발생건수로 색 계산
  const occur = crimeData[guName][year].occur;
  const allValues = Object.keys(state.crimeData)
    .filter(g => state.crimeData[g][year])
    .map(g => state.crimeData[g][year].occur[crimeFilterState.selectedType] || 0);

  const max = Math.max(...allValues);
  const val = occur[crimeFilterState.selectedType] || 0;
  const intensity = max > 0 ? val / max : 0;

  return `rgba(230, 57, 70, ${0.1 + intensity * 0.9})`;
}

// 필터 적용된 메인맵 렌더링 (기존 renderMainMap 확장)
function renderMainMapWithFilter() {
  const mapSvg = document.getElementById('seoulMap');
  if (!mapSvg) return;

  const vb = SEOUL_DATA.viewBox;
  mapSvg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  mapSvg.innerHTML = '';

  Object.entries(SEOUL_DATA.districts).forEach(([guName, info]) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', info.d);
    path.setAttribute('fill', getColorByType(guName));
    path.setAttribute('stroke', '#ffffff');
    path.setAttribute('stroke-width', '2.5');

    let cls = 'gu-path';
    if (state.selectedGu === guName) cls += ' selected';
    else if (state.selectedGu) cls += ' dimmed';
    path.setAttribute('class', cls);

    path.addEventListener('click', (e) => {
      e.stopPropagation();
      selectGu(guName);
    });

    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    const typeLabel = crimeFilterState.selectedType ? CRIME_LABEL[crimeFilterState.selectedType] : (state.metric === 'crime' ? '범죄율' : '검거율');
    title.textContent = `${guName} · ${typeLabel}`;
    path.appendChild(title);
    mapSvg.appendChild(path);

    // 구 라벨
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', info.label_x);
    text.setAttribute('y', info.label_y);
    text.setAttribute('class', state.selectedGu && state.selectedGu !== guName ? 'gu-label dim' : 'gu-label');
    text.textContent = guName;
    mapSvg.appendChild(text);
  });
}

// 기존 renderMainMap을 필터 버전으로 교체
function overrideRenderMainMap() {
  window._originalRenderMainMap = renderMainMap;
  window.renderMainMap = renderMainMapWithFilter;
}

// 초기화
waitForData(() => {
  injectCrimeFilterUI();
  overrideRenderMainMap();
  renderMainMapWithFilter();
});