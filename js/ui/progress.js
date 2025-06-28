/**
 * 진행률 표시 모듈
 * 다운로드, 설치 등의 진행률을 표시합니다.
 */

(function() {
    'use strict';

    class ProgressManager {
        constructor() {
            this.progressBars = new Map();
            this.init();
        }

        init() {
            console.log('📊 ProgressManager 초기화 완료');
        }

        /**
         * 진행률 바 생성
         * @param {string} id - 진행률 바 ID
         * @param {HTMLElement|string} container - 컨테이너 요소 또는 셀렉터
         * @param {Object} options - 옵션
         */
        create(id, container, options = {}) {
            const containerElement = typeof container === 'string' 
                ? document.querySelector(container) 
                : container;

            if (!containerElement) {
                console.error('❌ 진행률 바 컨테이너를 찾을 수 없음:', container);
                return null;
            }

            const progressBar = this.createProgressElement(id, options);
            containerElement.appendChild(progressBar.element);
            
            this.progressBars.set(id, progressBar);
            console.log(`📊 진행률 바 생성: ${id}`);
            
            return progressBar;
        }

        /**
         * 진행률 바 요소 생성
         * @param {string} id - ID
         * @param {Object} options - 옵션
         * @returns {Object} 진행률 바 객체
         */
        createProgressElement(id, options = {}) {
            const defaultOptions = {
                showPercentage: true,
                showLabel: true,
                animated: true,
                color: '#3498db',
                height: '20px',
                borderRadius: '10px'
            };

            const config = { ...defaultOptions, ...options };

            // 메인 컨테이너
            const element = document.createElement('div');
            element.id = `progress-${id}`;
            element.className = 'progress-container';
            element.style.cssText = `
                width: 100%;
                margin: 10px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;

            // 라벨
            const label = document.createElement('div');
            label.className = 'progress-label';
            label.style.cssText = `
                margin-bottom: 5px;
                font-size: 12px;
                color: #666;
                display: ${config.showLabel ? 'block' : 'none'};
            `;
            label.textContent = config.label || '진행 중...';

            // 진행률 바 배경
            const background = document.createElement('div');
            background.className = 'progress-background';
            background.style.cssText = `
                width: 100%;
                height: ${config.height};
                background: rgba(255, 255, 255, 0.1);
                border-radius: ${config.borderRadius};
                overflow: hidden;
                position: relative;
                border: 1px solid rgba(255, 255, 255, 0.2);
            `;

            // 진행률 바
            const bar = document.createElement('div');
            bar.className = 'progress-bar';
            bar.style.cssText = `
                width: 0%;
                height: 100%;
                background: ${config.color};
                transition: width 0.3s ease;
                position: relative;
                ${config.animated ? `
                    background-image: linear-gradient(
                        45deg,
                        rgba(255, 255, 255, 0.2) 25%,
                        transparent 25%,
                        transparent 50%,
                        rgba(255, 255, 255, 0.2) 50%,
                        rgba(255, 255, 255, 0.2) 75%,
                        transparent 75%,
                        transparent
                    );
                    background-size: 20px 20px;
                    animation: progress-animation 1s linear infinite;
                ` : ''}
            `;

            // 퍼센트 텍스트
            const percentage = document.createElement('div');
            percentage.className = 'progress-percentage';
            percentage.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 11px;
                font-weight: bold;
                color: white;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
                display: ${config.showPercentage ? 'block' : 'none'};
            `;
            percentage.textContent = '0%';

            // 요소 조립
            background.appendChild(bar);
            background.appendChild(percentage);
            element.appendChild(label);
            element.appendChild(background);

            return {
                element,
                label,
                background,
                bar,
                percentage,
                config,
                value: 0
            };
        }

        /**
         * 진행률 업데이트
         * @param {string} id - 진행률 바 ID
         * @param {number} value - 진행률 (0-100)
         * @param {string} label - 라벨 텍스트 (선택사항)
         */
        update(id, value, label) {
            const progressBar = this.progressBars.get(id);
            if (!progressBar) {
                console.error('❌ 진행률 바를 찾을 수 없음:', id);
                return;
            }

            // 값 제한
            value = Math.max(0, Math.min(100, value));
            progressBar.value = value;

            // 진행률 바 업데이트
            progressBar.bar.style.width = `${value}%`;
            
            // 퍼센트 텍스트 업데이트
            if (progressBar.config.showPercentage) {
                progressBar.percentage.textContent = `${Math.round(value)}%`;
            }

            // 라벨 업데이트
            if (label && progressBar.config.showLabel) {
                progressBar.label.textContent = label;
            }

            // 완료 시 색상 변경
            if (value >= 100) {
                progressBar.bar.style.background = '#27ae60';
                if (label && progressBar.config.showLabel) {
                    progressBar.label.textContent = label || '완료!';
                }
            }
        }

        /**
         * 진행률 바 색상 변경
         * @param {string} id - 진행률 바 ID
         * @param {string} color - 새 색상
         */
        setColor(id, color) {
            const progressBar = this.progressBars.get(id);
            if (progressBar) {
                progressBar.bar.style.background = color;
                progressBar.config.color = color;
            }
        }

        /**
         * 진행률 바 제거
         * @param {string} id - 진행률 바 ID
         */
        remove(id) {
            const progressBar = this.progressBars.get(id);
            if (progressBar) {
                progressBar.element.remove();
                this.progressBars.delete(id);
                console.log(`📊 진행률 바 제거: ${id}`);
            }
        }

        /**
         * 모든 진행률 바 제거
         */
        clear() {
            this.progressBars.forEach((progressBar, id) => {
                this.remove(id);
            });
        }

        /**
         * 진행률 바 숨기기/보이기
         * @param {string} id - 진행률 바 ID
         * @param {boolean} visible - 표시 여부
         */
        setVisible(id, visible) {
            const progressBar = this.progressBars.get(id);
            if (progressBar) {
                progressBar.element.style.display = visible ? 'block' : 'none';
            }
        }

        /**
         * 진행률 바 정보 반환
         * @param {string} id - 진행률 바 ID
         * @returns {Object|null} 진행률 바 정보
         */
        get(id) {
            return this.progressBars.get(id) || null;
        }
    }

    // CSS 애니메이션 추가
    const style = document.createElement('style');
    style.textContent = `
        @keyframes progress-animation {
            0% {
                background-position: 0 0;
            }
            100% {
                background-position: 20px 0;
            }
        }
        
        .progress-container:hover .progress-bar {
            filter: brightness(1.1);
        }
    `;
    document.head.appendChild(style);

    // 전역 진행률 매니저 인스턴스
    const progressManager = new ProgressManager();

    // 전역 객체로 노출
    window.ProgressManager = ProgressManager;
    window.progressManager = progressManager;

    console.log('📊 진행률 모듈 로드 완료');

})(); 