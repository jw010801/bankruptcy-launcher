/**
 * 유틸리티 함수 모듈
 * 공통으로 사용되는 헬퍼 함수들을 정의합니다.
 */

(function() {
    'use strict';

    // 전역 유틸리티 객체 생성
    window.UTILS = {};

    /**
     * 지연 실행 함수
     * @param {number} ms - 지연 시간 (밀리초)
     * @returns {Promise} 지연 후 resolve되는 Promise
     */
    window.UTILS.delay = function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    };

    /**
     * 랜덤 ID 생성
     * @param {number} length - ID 길이 (기본값: 8)
     * @returns {string} 랜덤 ID
     */
    window.UTILS.generateRandomId = function(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    /**
     * 날짜 포맷팅
     * @param {Date|string} date - 포맷할 날짜
     * @param {string} format - 포맷 형식 ('YYYY-MM-DD', 'MM/DD', 'relative')
     * @returns {string} 포맷된 날짜 문자열
     */
    window.UTILS.formatDate = function(date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        
        if (format === 'relative') {
            const now = new Date();
            const diffMs = now - d;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return '오늘';
            if (diffDays === 1) return '어제';
            if (diffDays < 7) return `${diffDays}일 전`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
            return `${Math.floor(diffDays / 30)}개월 전`;
        }
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
        if (format === 'MM/DD') return `${month}/${day}`;
        
        return d.toLocaleDateString();
    };

    /**
     * 마인크래프트 사용자명 검증
     * @param {string} username - 사용자명
     * @returns {Object} 검증 결과
     */
    window.UTILS.validateMinecraftUsername = function(username) {
        if (!username || username.trim() === '') {
            return { valid: false, message: '사용자명을 입력해주세요.' };
        }
        
        if (username.length < 3 || username.length > 16) {
            return { valid: false, message: '사용자명은 3-16자 사이여야 합니다.' };
        }
        
        const pattern = /^[a-zA-Z0-9_]+$/;
        if (!pattern.test(username)) {
            return { valid: false, message: '사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다.' };
        }
        
        return { valid: true, message: '' };
    };

    /**
     * 서버 주소 검증
     * @param {string} serverAddress - 서버 주소
     * @returns {Object} 검증 결과
     */
    window.UTILS.validateServerAddress = function(serverAddress) {
        if (!serverAddress || serverAddress.trim() === '') {
            return { valid: false, message: '서버 주소를 입력해주세요.' };
        }
        
        const pattern = /^[a-zA-Z0-9.-]+(?::[0-9]+)?$/;
        if (!pattern.test(serverAddress)) {
            return { valid: false, message: '올바른 서버 주소 형식이 아닙니다.' };
        }
        
        return { valid: true, message: '' };
    };

    /**
     * 안전한 JSON 파싱
     * @param {string} jsonString - JSON 문자열
     * @param {*} defaultValue - 파싱 실패 시 기본값
     * @returns {*} 파싱된 객체 또는 기본값
     */
    window.UTILS.safeJsonParse = function(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('JSON 파싱 실패:', error);
            return defaultValue;
        }
    };

    /**
     * 안전한 JSON 문자열화
     * @param {*} obj - 문자열화할 객체
     * @param {string} defaultValue - 실패 시 기본값
     * @returns {string} JSON 문자열
     */
    window.UTILS.safeJsonStringify = function(obj, defaultValue = '{}') {
        try {
            return JSON.stringify(obj, null, 2);
        } catch (error) {
            console.warn('JSON 문자열화 실패:', error);
            return defaultValue;
        }
    };

    /**
     * 디바운스 함수
     * @param {Function} func - 실행할 함수
     * @param {number} wait - 대기 시간 (밀리초)
     * @returns {Function} 디바운스된 함수
     */
    window.UTILS.debounce = function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    /**
     * DOM 요소 안전하게 가져오기
     * @param {string} selector - CSS 선택자
     * @returns {HTMLElement|null}
     */
    window.UTILS.safeGetElement = function(selector) {
        try {
            return document.querySelector(selector);
        } catch (error) {
            console.warn('DOM 요소 선택 실패:', selector, error);
            return null;
        }
    };

    /**
     * 파일 크기 포맷팅
     * @param {number} bytes - 바이트 크기
     * @returns {string} 포맷된 파일 크기
     */
    window.UTILS.formatFileSize = function(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    console.log('🔧 유틸리티 모듈 로드 완료');

})(); 