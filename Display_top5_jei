// 📦 5개년 TOP 5 예시 데이터 (정확한 구 이름과 점수는 수인님이 나중에 숫자로 수정하시면 됩니다!)
const SAFETY_RANK_DATA = {
    "2026": [
        { rank: 1, name: "강남구", score: 95 },
        { rank: 2, name: "송파구", score: 88 },
        { rank: 3, name: "서초구", score: 82 },
        { rank: 4, name: "마포구", score: 75 },
        { rank: 5, name: "종로구", score: 70 }
    ],
    "2025": [
        { rank: 1, name: "마포구", score: 91 },
        { rank: 2, name: "성동구", score: 86 },
        { rank: 3, name: "강남구", score: 80 },
        { rank: 4, name: "서대문구", score: 73 },
        { rank: 5, name: "은평구", score: 65 }
    ],
    "2024": [
        { rank: 1, name: "서초구", score: 93 },
        { rank: 2, name: "송파구", score: 85 },
        { rank: 3, name: "용산구", score: 79 },
        { rank: 4, name: "광진구", score: 74 },
        { rank: 5, name: "강동구", score: 68 }
    ],
    "2023": [
        { rank: 1, name: "영등포구", score: 89 },
        { rank: 2, name: "구로구", score: 84 },
        { rank: 3, name: "동작구", score: 78 },
        { rank: 4, name: "중구", score: 71 },
        { rank: 5, name: "성북구", score: 66 }
    ],
    "2022": [
        { rank: 1, name: "노원구", score: 92 },
        { rank: 2, name: "도봉구", score: 87 },
        { rank: 3, name: "강북구", score: 81 },
        { rank: 4, name: "중랑구", score: 75 },
        { rank: 5, name: "동대문구", score: 69 }
    ]
};

// 🏆 선택된 연도의 데이터를 막대그래프로 그려주는 함수
function showTop5Chart(selectedYear) {
    const currentRankList = SAFETY_RANK_DATA[selectedYear];
    if (!currentRankList) return;

    // 1. 타이틀과 💡호버 툴팁(점수 계산식) 구조 만들기
    let chartHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0 10px 0;">
            <h3 style="margin: 0; color: var(--text-primary); font-size: 14px; font-weight: 700;">
                🛡️ ${selectedYear}년 안전 TOP 5
            </h3>
            
            <div class="suin-tooltip" style="position: relative; cursor: pointer; font-size: 11px; color: var(--text-secondary); text-decoration: underline;">
                점수 계산식 ℹ️
                <div class="suin-tooltip-text" style="
                    visibility: hidden;
                    width: 200px;
                    background-color: #2c3e50;
                    color: #fff;
                    text-align: left;
                    border-radius: 6px;
                    padding: 10px;
                    position: absolute;
                    z-index: 999;
                    bottom: 125%; /* 글자 위쪽에 배치 */
                    right: 0;
                    opacity: 0;
                    transition: opacity 0.3s;
                    font-size: 11px;
                    line-height: 1.4;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                ">
                    <strong>[종합 안전 점수 계산식]</strong><br>
                    (5대 범죄 발생률 × 0.4) + (CCTV 밀도 × 0.3) + (경찰서 접근성 × 0.3)를 합산하여 100점 만점으로 환산한 결과입니다.
                </div>
            </div>
        </div>
    `;

    // 2. 막대그래프 팩토리
    chartHTML += `<div style="display: flex; flex-direction: column; gap: 12px; background: var(--bg-tertiary); padding: 15px; border-radius: 8px; border: 1.5px solid var(--border);">`;

    currentRankList.forEach((item) => {
        chartHTML += `
            <div style="display: flex; align-items: center;">
                <div style="width: 65px; font-size: 12px; font-weight: bold; color: var(--text-primary);">
                    ${item.rank}위 ${item.name}
                </div>
                <div style="flex-grow: 1; background: rgba(0,0,0,0.05); height: 16px; border-radius: 8px; overflow: hidden; margin: 0 8px;">
                    <div style="width: ${item.score}%; background: linear-gradient(90deg, #3498db, #2ecc71); height: 100%; border-radius: 8px; transition: width 0.4s ease-in-out;"></div>
                </div>
                <div style="width: 40px; text-align: right; font-size: 12px; font-weight: bold; color: var(--text-secondary);">
                    ${item.score}점
                </div>
            </div>
        `;
    });

    chartHTML += `</div>`;
    document.getElementById("sidebar-rank").innerHTML = chartHTML;

    // 3. 💡 마우스 호버 이벤트 자바스크립트로 직접 제어하기
    const tooltipContainer = document.querySelector('.suin-tooltip');
    const tooltipText = document.querySelector('.suin-tooltip-text');
    
    if (tooltipContainer && tooltipText) {
        // 마우스 올렸을 때 보이기
        tooltipContainer.addEventListener('mouseenter', () => {
            tooltipText.style.visibility = 'visible';
            tooltipText.style.opacity = '1';
        });
        // 마우스 뗐을 때 숨기기
        tooltipContainer.addEventListener('mouseleave', () => {
            tooltipText.style.visibility = 'hidden';
            tooltipText.style.opacity = '0';
        });
    }
}

// 🔌 친구들 데이터 시스템과 연동하는 부분
waitForData(() => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        const rankBlock = document.createElement('div');
        rankBlock.id = 'sidebar-rank';
        rankBlock.className = 'control-block';
        sidebar.appendChild(rankBlock);
    }

    if (window.state && state.year) {
        showTop5Chart(state.year);
    } else {
        showTop5Chart("2026");
    }

    const slider = document.getElementById('yearSlider');
    if (slider) {
        slider.addEventListener('input', (e) => {
            showTop5Chart(e.target.value);
        });
    }
});
