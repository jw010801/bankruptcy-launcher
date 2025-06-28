/**
 * 레거시 렌더러 파일 (하위 호환성 유지)
 * @description 기존 코드와의 호환성을 위해 유지되는 파일
 * @deprecated 새로운 모듈 구조로 이관 중
 */

console.log('🔄 레거시 렌더러 로드됨 (하위 호환성)');

// 하위 호환성을 위한 전역 변수들
let isLoggedIn = false;
let currentUser = null;
let authData = null;

// 레거시 함수들 (새 모듈에서 처리됨)
function playSound(type) {
    if (window.audioManager) {
        audioManager.playSound(type);
    }
}

function updateProgress(percent, message) {
    if (window.progressManager) {
        progressManager.updateProgress('play', percent, message);
    }
}

function resetPlayButton() {
    const playBtn = document.getElementById('play-btn');
    const playBtnText = document.getElementById('play-btn-text');
    
    if (playBtn) {
        playBtn.disabled = false;
        playBtn.style.opacity = '1';
    }
    
    if (playBtnText) {
        playBtnText.textContent = '게임 시작';
    }
    
    if (window.progressManager) {
        progressManager.hideProgress('play');
    }
}

// DOM 로드 완료 시 실행되는 레거시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 레거시 DOM 로드 완료');
    
    // 새로운 모듈 시스템이 로드되었는지 확인
    if (window.mainController) {
        console.log('✅ 새로운 모듈 시스템 감지됨');
        return; // 새로운 시스템이 있으면 레거시 코드 실행 안함
    }
    
    console.log('⚠️ 레거시 모드로 실행됨');
    
    // 기본적인 이벤트 리스너만 설정 (백업용)
    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
        playBtn.addEventListener('click', function() {
            console.log('레거시 플레이 버튼 클릭됨');
            alert('새로운 모듈 시스템을 로드해주세요.');
        });
    }
    
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            console.log('레거시 설정 버튼 클릭됨');
            const modal = document.getElementById('settings-modal');
            if (modal) {
                modal.style.display = 'flex';
            }
        });
    }
    
    const settingsClose = document.querySelector('#settings-modal .close-button');
    if (settingsClose) {
        settingsClose.addEventListener('click', function() {
            const modal = document.getElementById('settings-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }
});

// 하위 호환성을 위한 더미 함수들
function saveSettings() {
    console.log('레거시 saveSettings 호출됨');
    if (window.mainController) {
        return mainController.saveSettings();
    }
}

function loadSettings() {
    console.log('레거시 loadSettings 호출됨');
    if (window.mainController) {
        return mainController.loadSettings();
    }
}

function checkServerStatus() {
    console.log('레거시 checkServerStatus 호출됨');
    if (window.mainController) {
        return mainController.checkServerStatus();
    }
}

function loadNews() {
    console.log('레거시 loadNews 호출됨');
    if (window.newsManager) {
        return newsManager.loadNews();
    }
}

function handleLogin() {
    console.log('레거시 handleLogin 호출됨');
    if (window.authManager) {
        return authManager.handleLogin();
    }
}

function handleLogout() {
    console.log('레거시 handleLogout 호출됨');
    if (window.authManager) {
        return authManager.handleLogout();
    }
}

function launchMinecraft() {
    console.log('레거시 launchMinecraft 호출됨');
    if (window.gameManager) {
        return gameManager.launchMinecraft();
    }
}

// 모듈 시스템 상태 확인
setTimeout(() => {
    if (window.mainController && window.audioManager && window.progressManager) {
        console.log('✅ 모든 새로운 모듈이 로드됨');
        console.log('🗑️ 레거시 코드는 백업 목적으로만 유지됨');
    } else {
        console.warn('⚠️ 일부 모듈이 로드되지 않음');
        console.log('현재 로드된 모듈들:');
        console.log('- mainController:', !!window.mainController);
        console.log('- audioManager:', !!window.audioManager);
        console.log('- progressManager:', !!window.progressManager);
        console.log('- modalManager:', !!window.modalManager);
        console.log('- notificationManager:', !!window.notificationManager);
        console.log('- authManager:', !!window.authManager);
        console.log('- newsManager:', !!window.newsManager);
        console.log('- gameManager:', !!window.gameManager);
    }
}, 1000);

console.log('�� 레거시 렌더러 로드 완료'); 