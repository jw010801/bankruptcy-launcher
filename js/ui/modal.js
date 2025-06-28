/**
 * 모달 관리 모듈
 * 다양한 모달 창을 관리합니다.
 */

(function() {
    'use strict';

    class ModalManager {
        constructor() {
            this.modals = new Map();
            this.currentModal = null;
            this.init();
        }

        init() {
            this.setupEventListeners();
            console.log('📋 ModalManager 초기화 완료');
        }

        /**
         * 이벤트 리스너 설정
         */
        setupEventListeners() {
            // ESC 키로 모달 닫기
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.currentModal) {
                    this.closeModal(this.currentModal);
                }
            });
        }

        /**
         * 모달 등록
         * @param {string} id - 모달 ID
         * @param {HTMLElement} element - 모달 요소
         */
        registerModal(id, element) {
            this.modals.set(id, element);
        }

        /**
         * 모달 열기
         * @param {string} id - 모달 ID
         */
        openModal(id) {
            try {
                const modal = this.modals.get(id) || document.getElementById(id + '-modal');
                
                if (modal) {
                    // 현재 열린 모달이 있으면 닫기
                    if (this.currentModal && this.currentModal !== id) {
                        this.closeModal(this.currentModal);
                    }
                    
                    modal.style.display = 'block';
                    this.currentModal = id;
                    
                    // 애니메이션 효과
                    setTimeout(() => {
                        modal.classList.add('show');
                    }, 10);
                    
                    console.log(`📋 모달 열기: ${id}`);
                } else {
                    console.error(`❌ 모달을 찾을 수 없음: ${id}`);
                }
            } catch (error) {
                console.error(`❌ 모달 열기 실패 (${id}):`, error);
            }
        }

        /**
         * 모달 닫기
         * @param {string} id - 모달 ID
         */
        closeModal(id) {
            try {
                const modal = this.modals.get(id) || document.getElementById(id + '-modal');
                
                if (modal) {
                    modal.classList.remove('show');
                    
                    // 애니메이션 후 숨기기
                    setTimeout(() => {
                        modal.style.display = 'none';
                    }, 300);
                    
                    if (this.currentModal === id) {
                        this.currentModal = null;
                    }
                    
                    console.log(`📋 모달 닫기: ${id}`);
                } else {
                    console.error(`❌ 모달을 찾을 수 없음: ${id}`);
                }
            } catch (error) {
                console.error(`❌ 모달 닫기 실패 (${id}):`, error);
            }
        }

        /**
         * 모든 모달 닫기
         */
        closeAllModals() {
            this.modals.forEach((modal, id) => {
                this.closeModal(id);
            });
        }

        /**
         * 현재 열린 모달 반환
         * @returns {string|null} 현재 모달 ID
         */
        getCurrentModal() {
            return this.currentModal;
        }

        /**
         * 모달이 열려있는지 확인
         * @param {string} id - 모달 ID
         * @returns {boolean} 열림 상태
         */
        isModalOpen(id) {
            return this.currentModal === id;
        }
    }

    // 전역 모달 매니저 인스턴스
    const modalManager = new ModalManager();

    // 전역 객체로 노출
    window.ModalManager = ModalManager;
    window.modalManager = modalManager;

    console.log('📋 모달 모듈 로드 완료');

})(); 