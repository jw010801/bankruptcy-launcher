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
            <div class="modal-content help-modal-content">
                <div class="modal-header">
                    <h2>❓ 도움말</h2>
                    <button class="close-button">✕</button>
                </div>
                <div class="modal-body help-modal-body">
                    <div class="help-section">
                        <h3>🚂 설국열차 서버 소개</h3>
                        <p><strong>멈추지 않는 열차에서 벌어지는 극한의 생존 게임!</strong></p>
                        <p>계급사회 시스템으로 나뉜 6개 칸에서 오직 1등만이 탈출할 수 있습니다.</p>
                        
                        <h4>🎯 최종 목표</h4>
                        <ul>
                            <li>2000만원 달성 → 기관실 입장 → 열차 탈출</li>
                            <li>파산 시 꼬리칸으로 추방되어 재시작</li>
                            <li>2주 단위 시즌제 운영</li>
                        </ul>
                    </div>

                    <div class="help-section">
                        <h3>🚃 열차 구조</h3>
                        <p><code>[꼬리칸] ←→ [화물칸] ←→ [3등칸] ←→ [2등칸] ←→ [1등칸] ←→ [기관실]</code></p>
                        
                        <h4>🔧 꼬리칸 (무료 접근)</h4>
                        <ul>
                            <li>광질 시스템: 석탄(8만/시), 보석(랜덤), 고철(2만/시)</li>
                            <li>기본 생활 시설 및 튜토리얼 구역</li>
                            <li>파산자 재시작 지점</li>
                        </ul>

                        <h4>📦 화물칸 (5만원 입장)</h4>
                        <ul>
                            <li>보석 거래소 (가격 변동 시스템)</li>
                            <li>열차 정비 미니게임 (10-30만원)</li>
                            <li>지붕 파쿠르 (위험하지만 20-100만원)</li>
                        </ul>

                        <h4>🎰 3등칸 (20만원 입장)</h4>
                        <ul>
                            <li>초급 도박: 홀짝, 슬롯머신</li>
                            <li>베팅 한도: 1-50만원</li>
                            <li>낮은 위험, 낮은 수익</li>
                        </ul>

                        <h4>🎲 2등칸 (100만원 입장)</h4>
                        <ul>
                            <li>중급 도박: 룰렛, 포커</li>
                            <li>베팅 한도: 10-500만원</li>
                            <li>중간 위험, 중간 수익</li>
                        </ul>

                        <h4>💎 1등칸 (500만원 입장)</h4>
                        <ul>
                            <li>고급 도박: 바카라, 하이롤러</li>
                            <li>베팅 한도: 100-5000만원</li>
                            <li>높은 위험, 높은 수익</li>
                        </ul>

                        <h4>🚂 기관실 (2000만원 입장)</h4>
                        <ul>
                            <li>최종 탈출구 - 게임 승리!</li>
                            <li>오직 1등만 입장 가능</li>
                        </ul>
                    </div>

                    <div class="help-section">
                        <h3>💎 핵심 시스템</h3>
                        
                        <h4>⛏️ 광질 시스템</h4>
                        <ul>
                            <li>광물 생성기 기반 무한 자원</li>
                            <li>AFK 방지 실시간 채굴</li>
                            <li>석탄(연료), 보석(거래), 고철(정비) 3종 자원</li>
                        </ul>

                        <h4>💰 보석 거래 시스템</h4>
                        <ul>
                            <li>5종 보석: 다이아몬드, 금괴, 사파이어, 에메랄드, 진주</li>
                            <li>30분마다 자동 가격 변동 (±10%~30%)</li>
                            <li>한정 재고로 희소성 확보</li>
                        </ul>

                        <h4>🎮 미니게임 시스템</h4>
                        <ul>
                            <li>열차 정비: 시간 제한 퍼즐 (10-30만원)</li>
                            <li>지붕 파쿠르: 고위험 고수익 (20-100만원)</li>
                            <li>화물 정리: 테트리스 스타일 (5-15만원)</li>
                        </ul>
                    </div>

                    <div class="help-section">
                        <h3>🎯 플레이 전략</h3>
                        
                        <h4>🔄 기본 플레이 플로우</h4>
                        <ol>
                            <li><strong>꼬리칸 시작:</strong> 튜토리얼 + 광질로 5만원 모으기</li>
                            <li><strong>화물칸 진입:</strong> 미니게임으로 20만원 달성</li>
                            <li><strong>3등칸 도박:</strong> 초급 도박으로 100만원 목표</li>
                            <li><strong>상위 칸 진출:</strong> 고위험 게임으로 2000만원 도전</li>
                            <li><strong>기관실 탈출:</strong> 게임 승리!</li>
                        </ol>

                        <h4>⚖️ 수익률 비교</h4>
                        <ul>
                            <li><strong>광질:</strong> 시간당 10만원 (안전)</li>
                            <li><strong>미니게임:</strong> 시간당 20-50만원 (중간)</li>
                            <li><strong>도박:</strong> 시간당 -100만~+500만원 (위험)</li>
                        </ul>
                    </div>

                    <div class="help-section">
                        <h3>🚀 런처 성능 최적화</h3>
                        
                        <h4>⚡ 성능 프로파일</h4>
                        <ul>
                            <li>🚀 <strong>성능 우선:</strong> 고사양 시스템 (RTX 3060+, 16GB RAM+)</li>
                            <li>⚖️ <strong>균형:</strong> 중사양 시스템 (GTX 1660+, 8GB RAM+)</li>
                            <li>🎨 <strong>화질 우선:</strong> 화질 중시 (RTX 2060+, 16GB RAM+)</li>
                            <li>🔋 <strong>배터리 절약:</strong> 노트북/저사양 시스템</li>
                        </ul>

                        <h4>🛠️ 권장 설정</h4>
                        <ul>
                            <li><strong>일반 플레이:</strong> 균형 모드 + 8GB 메모리</li>
                            <li><strong>셰이더 사용:</strong> 성능 우선 + 16GB 메모리</li>
                            <li><strong>저사양 PC:</strong> 배터리 절약 + 4GB 메모리</li>
                        </ul>
                    </div>

                    <div class="help-section">
                        <h3>❓ 문제 해결</h3>
                        
                        <h4>🔧 일반적인 문제</h4>
                        <ul>
                            <li><strong>낮은 FPS:</strong> 성능 프로파일을 "성능 우선"으로 변경</li>
                            <li><strong>메모리 부족:</strong> 메모리 할당량을 8GB 이상으로 설정</li>
                            <li><strong>셰이더 오류:</strong> GPU 최적화 체크박스 활성화</li>
                            <li><strong>런처 오류:</strong> 설정 초기화 후 재시작</li>
                        </ul>

                        <h4>🌟 최적화 팁</h4>
                        <ul>
                            <li>V-Sync 활성화 시 FPS가 모니터 주사율로 제한됨 (정상)</li>
                            <li>G1GC 최적화로 프레임 드롭 최소화</li>
                            <li>코드 캐시 512MB로 장기 플레이 성능 향상</li>
                        </ul>
                    </div>
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
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        document.body.appendChild(modal);
        
        // 닫기 버튼 이벤트 (헤더의 ✕ 버튼만)
        const closeButton = modal.querySelector('.close-button');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        }
        
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