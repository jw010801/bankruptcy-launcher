/**
 * 메인 컨트롤러 모듈
 * @description 전체 애플리케이션의 메인 로직 및 이벤트 처리
 */

class MainController {
    constructor() {
        this.authManager = null;
        this.newsManager = null;
        this.gameManager = null;
        this.settingsManager = null;
        this.audioManager = null;
        this.notificationManager = null;
        this.progressManager = null;
        
        console.log('🎮 MainController 생성됨');
    }

    async initialize() {
        try {
            console.log('🚀 MainController 초기화 시작...');
            
            // 매니저들 초기화
            await this.initializeManagers();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 초기 UI 상태 설정
            this.updateInitialUI();
            
            // 뉴스 자동 로드
            await this.loadInitialNews();
            
            // BGM 자동 재생 (설정에 따라)
            this.startBackgroundMusic();
            
            console.log('✅ MainController 초기화 완료');
            
        } catch (error) {
            console.error('❌ MainController 초기화 실패:', error);
        }
    }

    async initializeManagers() {
        // 기존 매니저 인스턴스들을 window에서 가져오기
        this.audioManager = window.audioManager;
        this.notificationManager = window.notificationManager;
        this.progressManager = window.progressManager;
        this.newsManager = window.newsManager;
        this.gameManager = window.gameManager;
        this.settingsManager = window.settingsManager;
        
        // AuthManager는 새로 생성하거나 기존 인스턴스 사용
        if (window.AuthManager) {
            this.authManager = new window.AuthManager();
            await this.authManager.initialize();
            console.log('✅ AuthManager 새 인스턴스 생성 및 초기화 완료');
            
            // window 객체에 할당 (다른 모듈에서 접근 가능하도록)
            window.authManager = this.authManager;
            
            // 자동 로그인 체크
            console.log('🔍 저장된 인증 정보 확인 중...');
            await this.authManager.checkSavedAuth();
        } else if (window.authManager) {
            console.log('🔄 기존 AuthManager 인스턴스 사용');
            this.authManager = window.authManager;
            
            // 기존 인스턴스 초기화 확인
            if (this.authManager.initialize) {
                await this.authManager.initialize();
                console.log('✅ 기존 AuthManager 초기화 완료');
            }
            
            // 자동 로그인 체크
            console.log('🔍 저장된 인증 정보 확인 중...');
            if (this.authManager.checkSavedAuth) {
                await this.authManager.checkSavedAuth();
            }
        } else {
            console.warn('⚠️ AuthManager를 찾을 수 없습니다. 인증 기능이 비활성화됩니다.');
            this.authManager = null;
        }
        
        console.log('✅ 모든 매니저 초기화 완료');
    }

    setupEventListeners() {
        // 로그인 버튼
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            loginButton.addEventListener('click', () => {
                console.log('🔐 로그인 버튼 클릭됨');
                if (this.authManager && this.authManager.login) {
                    this.authManager.login();
                } else {
                    console.error('❌ AuthManager 로그인 메소드를 찾을 수 없음');
                }
            });
        }
        
        // 로그아웃 버튼
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                console.log('🚪 로그아웃 버튼 클릭됨');
                if (this.authManager && this.authManager.logout) {
                    this.authManager.logout();
                } else {
                    console.error('❌ AuthManager 로그아웃 메소드를 찾을 수 없음');
                }
            });
        }
        
        // 플레이 버튼
        const playButton = document.getElementById('play-button');
        if (playButton) {
            playButton.addEventListener('click', () => {
                console.log('🎮 플레이 버튼 클릭됨');
                this.handlePlayButtonClick();
            });
        }
        
        // 설정 버튼
        const settingsButton = document.getElementById('settings-btn');
        if (settingsButton) {
            settingsButton.addEventListener('click', () => {
                console.log('⚙️ 설정 버튼 클릭됨');
                if (window.audioManager) {
                    window.audioManager.playSound('click');
                }
                if (window.modalManager) {
                    window.modalManager.openModal('settings');
                } else {
                    console.error('❌ ModalManager를 찾을 수 없음');
                }
            });
        }
        
        // 도움말 버튼
        const helpButton = document.getElementById('help-btn');
        if (helpButton) {
            helpButton.addEventListener('click', () => {
                console.log('❓ 도움말 버튼 클릭됨');
                if (window.audioManager) {
                    window.audioManager.playSound('click');
                }
                this.showHelpModal();
            });
        }
        
        // 뉴스 새로고침 버튼
        const refreshNewsButton = document.getElementById('refresh-news');
        if (refreshNewsButton) {
            refreshNewsButton.addEventListener('click', () => {
                console.log('🔄 뉴스 새로고침 버튼 클릭됨');
                if (window.audioManager) {
                    window.audioManager.playSound('click');
                }
                if (this.newsManager && this.newsManager.loadNews) {
                    this.newsManager.loadNews();
                } else {
                    console.error('❌ NewsManager 또는 loadNews 메소드를 찾을 수 없음');
                }
            });
        }
        
        // 타이틀바 버튼들 (창 닫기/최소화)
        const minimizeBtn = document.getElementById('minimize-btn');
        const closeBtn = document.getElementById('close-btn');
        
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                if (window.electronAPI && window.electronAPI.invoke) {
                    window.electronAPI.invoke('window-minimize');
                } else {
                    console.warn('⚠️ electronAPI를 찾을 수 없습니다');
                }
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (window.electronAPI && window.electronAPI.invoke) {
                    window.electronAPI.invoke('window-close');
                } else {
                    console.warn('⚠️ electronAPI를 찾을 수 없습니다');
                }
            });
        }
        
        console.log('✅ 이벤트 리스너 설정 완료');
    }

    async handlePlayButtonClick() {
        try {
            // 로그인 상태 확인
            let isLoggedIn = false;
            if (this.authManager) {
                if (this.authManager.isLoggedIn) {
                    isLoggedIn = this.authManager.isLoggedIn();
                } else if (this.authManager.isAuthenticated) {
                    isLoggedIn = this.authManager.isAuthenticated;
                }
            }
            
            if (!isLoggedIn) {
                if (this.notificationManager) {
                    this.notificationManager.show('먼저 로그인해주세요!', 'warning');
                } else {
                    alert('먼저 로그인해주세요!');
                }
                return;
            }
            
            console.log('🎮 게임 시작 중...');
            
            // 효과음 재생
            if (window.audioManager) {
                window.audioManager.playSound('click');
            }
            
            // 게임 시작
            if (this.gameManager && this.gameManager.launchMinecraft) {
                await this.gameManager.launchMinecraft();
            } else {
                console.error('❌ GameManager 또는 launchMinecraft 메소드를 찾을 수 없음');
                if (this.notificationManager) {
                    this.notificationManager.show('게임 매니저를 찾을 수 없습니다', 'error');
                } else {
                    alert('게임 매니저를 찾을 수 없습니다');
                }
            }
            
        } catch (error) {
            console.error('❌ 게임 시작 실패:', error);
            if (this.notificationManager) {
                this.notificationManager.show('게임 시작 실패: ' + error.message, 'error');
            } else {
                alert('게임 시작 실패: ' + error.message);
            }
        }
    }

    showHelpModal() {
        // 도움말 모달 표시
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>❓ 도움말</h2>
                    <button class="close-button">✕</button>
                </div>
                <div class="modal-body">
                    <div class="help-section">
                        <h3>🎮 게임 방법</h3>
                        <ul>
                            <li>모든 플레이어는 10,000 코인으로 시작합니다</li>
                            <li>카지노, 경매, 주식, 부동산을 통해 부를 증식하세요</li>
                            <li>파산하면 게임에서 탈락됩니다</li>
                            <li>1-2주 시즌제로 운영됩니다</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h3>🎰 카지노</h3>
                        <ul>
                            <li>블랙잭, 룰렛, 슬롯머신 등을 즐기세요</li>
                            <li>운이 좋으면 큰 돈을 벌 수 있습니다</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h3>💰 경매</h3>
                        <ul>
                            <li>희귀 아이템을 경매로 획득하세요</li>
                            <li>아이템을 다시 판매하여 수익을 얻을 수 있습니다</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h3>📈 주식 & 부동산</h3>
                        <ul>
                            <li>안정적인 투자로 꾸준한 수익을 얻으세요</li>
                            <li>시장 상황을 파악하여 투자하세요</li>
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="close-button">닫기</button>
                </div>
            </div>
        `;
        
        // 모달 스타일
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        document.body.appendChild(modal);
        
        // 닫기 버튼 이벤트
        const closeButtons = modal.querySelectorAll('.close-button');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });
        
        // 모달 배경 클릭시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    updateInitialUI() {
        // 초기 UI 상태 설정
        console.log('🔄 초기 UI 상태 설정');
    }

    async loadInitialNews() {
        try {
            console.log('📰 뉴스 자동 로드 시작...');
            if (this.newsManager && this.newsManager.loadNews) {
                await this.newsManager.loadNews();
                console.log('✅ 뉴스 로드 완료');
            } else {
                console.warn('⚠️ NewsManager 또는 loadNews 메소드를 찾을 수 없음');
            }
        } catch (error) {
            console.error('❌ 뉴스 로드 실패:', error);
        }
    }

    startBackgroundMusic() {
        try {
            if (this.audioManager && this.audioManager.playBGM) {
                // 설정에서 BGM 활성화 상태 확인
                let bgmEnabled = true; // 기본값
                
                try {
                    if (window.storageManager && window.storageManager.loadConfig) {
                        const settings = window.storageManager.loadConfig();
                        bgmEnabled = settings ? settings.enableBgm !== false : true;
                    }
                } catch (configError) {
                    console.warn('⚠️ 설정 로드 실패, 기본값 사용:', configError);
                }
                
                if (bgmEnabled) {
                    console.log('🎵 BGM 자동 재생 시작...');
                    setTimeout(() => {
                        try {
                            this.audioManager.playBGM();
                            console.log('✅ BGM 재생 성공');
                        } catch (playError) {
                            console.warn('⚠️ BGM 재생 실패:', playError);
                        }
                    }, 1500); // 1.5초 후 BGM 재생
                } else {
                    console.log('🔇 BGM이 설정에서 비활성화됨');
                }
            } else {
                console.warn('⚠️ AudioManager 또는 playBGM 메소드를 찾을 수 없음');
            }
        } catch (error) {
            console.error('❌ BGM 재생 실패:', error);
        }
    }
}

// DOM 로드 완료 후 초기화 (지연 실행)
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM 로드 완료');
    
    // 모든 모듈이 로드될 때까지 잠시 대기
    setTimeout(async () => {
        try {
            // MainController 초기화
            const mainController = new MainController();
            await mainController.initialize();
            
            // 전역 접근을 위해 window에 할당
            window.mainController = mainController;
            
            console.log('✅ MainController 전역 등록 완료');
        } catch (error) {
            console.error('❌ MainController 초기화 중 오류:', error);
        }
    }, 1000); // 1초 지연으로 증가
});



// 전역으로 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MainController;
} else {
    window.MainController = MainController;
} 