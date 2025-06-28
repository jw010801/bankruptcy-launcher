/**
 * 상수 정의 모듈
 * 애플리케이션에서 사용하는 모든 상수들을 정의합니다.
 */

// 전역 상수 객체 생성
window.CONSTANTS = {};

// 기본 설정값
window.CONSTANTS.DEFAULT_SETTINGS = {
    serverIP: 'localhost:25565',
    username: 'Player',
    memory: '2G',
    autoConnect: false,
    enableBgm: true,
    authDuration: 14 // 기본값: 2주
};

// 인증 관련 상수
window.CONSTANTS.AUTH_CONSTANTS = {
    MAX_AGE_DAYS: {
        MIN: 1,
        MAX: 30,
        DEFAULT: 14
    },
    MICROSOFT_CLIENT_ID: '54fd49e4-2103-4044-9603-2b028c814ec3',
    REDIRECT_URI: 'http://localhost:53682'
};

// 파일 경로
window.CONSTANTS.FILE_PATHS = {
    CONFIG: 'config.json',
    AUTH: 'auth.json',
    NEWS: 'news.json',
    MODPACK_CONFIG: 'modpack-config.json',
    PROFILES: 'profiles.json'
};

// 뉴스 관련 상수
window.CONSTANTS.NEWS_CONSTANTS = {
    MAX_DISPLAY_COUNT: 10,
    TIMEOUT_MS: 5000,
    JSDELIVR_URL: 'https://cdn.jsdelivr.net/gh/jw010801/bankruptcy-news@main/news.json',
    GITHUB_RAW_URL: 'https://raw.githubusercontent.com/jw010801/bankruptcy-news/main/news.json'
};

// 뉴스 아이콘 매핑
window.CONSTANTS.NEWS_ICONS = {
    event: '🎉',
    update: '🆕',
    maintenance: '🔧',
    announcement: '📢',
    warning: '⚠️',
    info: 'ℹ️',
    default: '📰'
};

// 메모리 옵션
window.CONSTANTS.MEMORY_OPTIONS = [
    { value: '1G', label: '1GB' },
    { value: '2G', label: '2GB' },
    { value: '4G', label: '4GB' },
    { value: '8G', label: '8GB' }
];

// 인증 유지 기간 옵션
window.CONSTANTS.AUTH_DURATION_OPTIONS = [
    { value: 1, label: '1일' },
    { value: 3, label: '3일' },
    { value: 7, label: '1주일' },
    { value: 14, label: '2주일' },
    { value: 30, label: '1개월' }
];

// UI 관련 상수
window.CONSTANTS.UI_CONSTANTS = {
    MODAL_ANIMATION_DURATION: 200,
    PROGRESS_UPDATE_INTERVAL: 100,
    SERVER_STATUS_CHECK_INTERVAL: 30000, // 30초
    NEWS_REFRESH_INTERVAL: 300000 // 5분
};

// 오디오 관련 상수
window.CONSTANTS.AUDIO_CONSTANTS = {
    VOLUMES: {
        CLICK: 0.5,
        SUCCESS: 0.3,
        PURCHASE: 0.5,
        BGM: 0.3
    },
    BGM_START_DELAY: 1000
};

// 에러 메시지
window.CONSTANTS.ERROR_MESSAGES = {
    SETTINGS_NOT_FOUND: '설정 요소를 찾을 수 없습니다. 페이지를 새로고침해주세요.',
    SETTINGS_SAVE_FAILED: '설정 저장에 실패했습니다',
    AUTH_FAILED: 'Microsoft 인증에 실패했습니다',
    LOGIN_REQUIRED: '먼저 로그인해주세요!',
    SERVER_STATUS_FAILED: '서버 상태 확인에 실패했습니다',
    NEWS_LOAD_FAILED: '뉴스 로드에 실패했습니다'
};

// 성공 메시지
window.CONSTANTS.SUCCESS_MESSAGES = {
    SETTINGS_SAVED: '설정이 저장되었습니다',
    LOGIN_SUCCESS: '로그인이 완료되었습니다',
    LOGOUT_SUCCESS: '로그아웃이 완료되었습니다',
    MOD_INSTALLED: '모드가 설치되었습니다',
    MOD_REMOVED: '모드가 제거되었습니다'
};

// DOM 선택자
window.CONSTANTS.SELECTORS = {
    // 메인 버튼들
    LOGIN_BTN: '#login-btn',
    LOGOUT_BTN: '#logout-btn',
    PLAY_BTN: '#play-btn',
    SETTINGS_BTN: '#settings-btn',
    HELP_BTN: '#help-btn',
    REFRESH_NEWS_BTN: '#refresh-news',
    MODS_BTN: '#mods-btn',
    
    // 설정 관련
    SERVER_IP_INPUT: '#server-ip',
    USERNAME_INPUT: '#username',
    MEMORY_SELECT: '#memory-allocation',
    AUTO_CONNECT_CHECK: '#auto-connect',
    ENABLE_BGM_CHECK: '#enable-bgm',
    AUTH_DURATION_SELECT: '#auth-duration',
    
    // 모달 관련
    SETTINGS_MODAL: '#settings-modal',
    SETTINGS_CLOSE: '#settings-close',
    SETTINGS_SAVE: '#settings-save',
    
    // 로그인 관련
    LOGIN_SECTION: '#login-section',
    USER_INFO: '#user-info',
    CURRENT_USERNAME: '#current-username',
    DEVICE_CODE_INFO: '#device-code-info',
    VERIFICATION_LINK: '#verification-link',
    USER_CODE: '#user-code',
    
    // 플레이 관련
    PLAY_BTN_TEXT: '#play-btn-text',
    PLAY_PROGRESS: '#play-progress',
    PLAY_PROGRESS_FILL: '#play-progress-fill',
    PLAY_PROGRESS_TEXT: '#play-progress-text',
    
    // 서버 상태
    SERVER_STATUS: '#server-status',
    SERVER_PLAYERS: '#server-players',
    
    // 창 컨트롤
    MINIMIZE_BTN: '#minimize-btn',
    CLOSE_BTN: '#close-btn'
};

console.log('📋 상수 모듈 로드 완료');

// 브라우저 호환성을 위한 CommonJS 내보내기도 지원
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.CONSTANTS;
} 