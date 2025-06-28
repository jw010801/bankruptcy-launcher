/**
 * 알림 시스템 모듈
 * 사용자에게 다양한 알림을 표시합니다.
 */

(function() {
    'use strict';

    class NotificationManager {
        constructor() {
            this.notifications = [];
            this.container = null;
            this.init();
        }

        init() {
            this.createContainer();
            console.log('📢 NotificationManager 초기화 완료');
        }

        /**
         * 알림 컨테이너 생성
         */
        createContainer() {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        }

        /**
         * 알림 표시
         * @param {string} message - 메시지
         * @param {string} type - 알림 타입 (success, error, warning, info)
         * @param {number} duration - 표시 시간 (ms, 0이면 수동 닫기)
         */
        show(message, type = 'info', duration = 5000) {
            const notification = this.createNotification(message, type, duration);
            this.container.appendChild(notification);
            this.notifications.push(notification);

            // 애니메이션으로 나타내기
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);

            // 자동 제거
            if (duration > 0) {
                setTimeout(() => {
                    this.remove(notification);
                }, duration);
            }

            return notification;
        }

        /**
         * 성공 알림
         * @param {string} message - 메시지
         * @param {number} duration - 표시 시간
         */
        success(message, duration = 3000) {
            return this.show(message, 'success', duration);
        }

        /**
         * 에러 알림
         * @param {string} message - 메시지
         * @param {number} duration - 표시 시간
         */
        error(message, duration = 5000) {
            return this.show(message, 'error', duration);
        }

        /**
         * 경고 알림
         * @param {string} message - 메시지
         * @param {number} duration - 표시 시간
         */
        warning(message, duration = 4000) {
            return this.show(message, 'warning', duration);
        }

        /**
         * 정보 알림
         * @param {string} message - 메시지
         * @param {number} duration - 표시 시간
         */
        info(message, duration = 4000) {
            return this.show(message, 'info', duration);
        }

        /**
         * 알림 요소 생성
         * @param {string} message - 메시지
         * @param {string} type - 타입
         * @param {number} duration - 지속시간
         * @returns {HTMLElement} 알림 요소
         */
        createNotification(message, type, duration) {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            
            // 아이콘 선택
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };

            // 색상 선택
            const colors = {
                success: '#27ae60',
                error: '#e74c3c',
                warning: '#f39c12',
                info: '#3498db'
            };

            notification.style.cssText = `
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 12px 16px;
                border-radius: 6px;
                margin-bottom: 10px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                border-left: 4px solid ${colors[type]};
                max-width: 300px;
                word-wrap: break-word;
                pointer-events: auto;
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s ease;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
            `;

            notification.innerHTML = `
                <span style="font-size: 16px;">${icons[type]}</span>
                <div style="flex: 1; line-height: 1.4;">${message}</div>
                <span style="opacity: 0.7; font-size: 12px;">✕</span>
            `;

            // 클릭으로 닫기
            notification.addEventListener('click', () => {
                this.remove(notification);
            });

            // show 클래스 추가 시 애니메이션
            notification.addEventListener('transitionend', (e) => {
                if (e.propertyName === 'transform' && !notification.classList.contains('show')) {
                    notification.remove();
                }
            });

            return notification;
        }

        /**
         * 알림 제거
         * @param {HTMLElement} notification - 제거할 알림 요소
         */
        remove(notification) {
            if (notification && notification.parentNode) {
                notification.classList.remove('show');
                
                // 배열에서 제거
                const index = this.notifications.indexOf(notification);
                if (index > -1) {
                    this.notifications.splice(index, 1);
                }

                // DOM에서 제거는 CSS 트랜지션 후에 자동으로 처리됨
            }
        }

        /**
         * 모든 알림 제거
         */
        clear() {
            this.notifications.forEach(notification => {
                this.remove(notification);
            });
        }

        /**
         * 특정 타입의 알림만 제거
         * @param {string} type - 제거할 알림 타입
         */
        clearType(type) {
            this.notifications
                .filter(notification => notification.classList.contains(`notification-${type}`))
                .forEach(notification => this.remove(notification));
        }
    }

    // CSS 스타일 추가
    const style = document.createElement('style');
    style.textContent = `
        .notification.show {
            transform: translateX(0) !important;
            opacity: 1 !important;
        }
        
        .notification:hover {
            transform: translateX(-5px) !important;
        }
    `;
    document.head.appendChild(style);

    // 전역 알림 매니저 인스턴스
    const notificationManager = new NotificationManager();

    // 전역 객체로 노출
    window.NotificationManager = NotificationManager;
    window.notificationManager = notificationManager;

    console.log('📢 알림 모듈 로드 완료');

})(); 