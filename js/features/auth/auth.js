/**
 * 인증 관리 모듈
 * Microsoft 인증, 로그인/로그아웃 등을 관리합니다.
 */

// 전역 모듈 의존성 (다른 모듈들이 먼저 로드되어야 함)

(function() {
    'use strict';

    class AuthManager {
        constructor() {
            this.isAuthenticated = false;
            this.authData = null;
            this.authInProgress = false;
            
            console.log('🔐 AuthManager 초기화 완료');
        }

        async initialize() {
            console.log('🔐 AuthManager 초기화 중...');
            
            // 저장된 인증 정보 확인 (자동 로그인)
            await this.checkSavedAuth();
            
            // UI 업데이트
            this.updateUI();
            
            console.log('✅ AuthManager 초기화 완료');
        }

        async checkSavedAuth() {
            try {
                const savedAuth = await window.storageManager.get('authData');
                
                if (savedAuth && savedAuth.username) {
                    console.log('💾 저장된 인증 정보 발견:', savedAuth.username);
                    
                    // 설정에서 로그인 유지 기간 가져오기 (기본값: 14일)
                    const settings = await window.storageManager.get('settings') || {};
                    const authDuration = settings.authDuration || 14; // 일 단위
                    
                    // 설정된 기간만큼 유효성 확인
                    const validDays = authDuration * 24 * 60 * 60 * 1000; // 밀리초로 변환
                    const validUntil = Date.now() - validDays;
                    
                    if (savedAuth.loginTime && savedAuth.loginTime > validUntil) {
                        this.authData = savedAuth;
                        this.isAuthenticated = true;
                        console.log(`✅ 저장된 인증 정보 사용 (${authDuration}일 유효):`, this.authData.username);
                        
                        // UI 업데이트 추가
                        this.updateUI();
                        
                        // 성공 알림
                        if (window.notificationManager) {
                            window.notificationManager.show(`${this.authData.username}님 자동 로그인 완료`, 'success');
                        }
                    } else {
                        console.log(`⏰ 저장된 인증 정보가 만료됨 (${authDuration}일 초과)`);
                        await this.clearAuthData();
                    }
                }
            } catch (error) {
                console.error('❌ 저장된 인증 정보 확인 실패:', error);
            }
        }

        async saveAuthData() {
            try {
                await window.storageManager.set('authData', this.authData);
                console.log('💾 인증 정보 저장 완료');
            } catch (error) {
                console.error('❌ 인증 정보 저장 실패:', error);
            }
        }

        async clearAuthData() {
            try {
                await window.storageManager.remove('authData');
                this.authData = null;
                this.isAuthenticated = false;
                console.log('🗑️ 인증 정보 삭제 완료');
            } catch (error) {
                console.error('❌ 인증 정보 삭제 실패:', error);
            }
        }

        async login() {
            if (this.authInProgress) {
                console.log('⏳ 이미 인증 진행 중...');
                return;
            }

            try {
                console.log('🔐 Microsoft 로그인 시작...');
                this.authInProgress = true;
                this.updateLoginButton('로그인 중...', true);
                
                // 로그인 모달을 통해 인증 진행
                const result = await this.promptUsername();
                
                if (!result) {
                    throw new Error('로그인이 취소되었습니다');
                }
                
                // Microsoft 인증 결과 처리
                const authData = {
                    username: result.authData.username,
                    uuid: result.authData.uuid,
                    accessToken: result.authData.accessToken,
                    authType: 'microsoft',
                    loginTime: Date.now(),
                    playerProfile: result.authData.playerProfile
                };
                
                this.authData = authData;
                this.isAuthenticated = true;
                
                // 인증 정보 저장 (로그인 유지)
                await this.saveAuthData();
                
                // UI 업데이트
                this.updateUI();
                
                // 성공 알림
                if (window.notificationManager) {
                    window.notificationManager.show(`${authData.username}님 환영합니다!`, 'success');
                }
                
                console.log('✅ Microsoft 로그인 성공:', authData.username);
                
            } catch (error) {
                console.error('❌ 로그인 실패:', error);
                
                // 에러 알림
                if (window.notificationManager) {
                    window.notificationManager.show('로그인 실패: ' + error.message, 'error');
                }
            } finally {
                this.authInProgress = false;
                this.updateLoginButton('Microsoft 로그인', false);
            }
        }

        async promptUsername() {
            return new Promise((resolve) => {
                // 간단한 Microsoft 로그인 모달 생성
                const modal = document.createElement('div');
                modal.className = 'auth-modal';
                modal.innerHTML = `
                    <div class="auth-modal-content">
                        <div class="auth-modal-header">
                            <h3>🔐 마인크래프트 로그인</h3>
                            <button class="close-auth-modal">×</button>
                        </div>
                        <div class="auth-modal-body">
                            <div class="login-method">
                                <div class="method-info">
                                    <div class="method-icon">🔐</div>
                                    <div class="method-details">
                                        <div class="method-title">Microsoft 계정 로그인</div>
                                        <div class="method-description">정품 마인크래프트 계정으로 로그인합니다</div>
                                    </div>
                                </div>
                                
                                <div class="login-info">
                                    <div class="info-item">
                                        <span class="info-icon">✅</span>
                                        <span>완전한 정품 인증</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-icon">🔒</span>
                                        <span>안전한 OAuth2 인증</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-icon">🎮</span>
                                        <span>모든 서버 접속 가능</span>
                                    </div>
                                </div>
                                
                                <!-- Microsoft 로그인 섹션 -->
                                <div id="microsoft-login-section" class="login-section">
                                    <div class="login-actions">
                                        <button id="start-microsoft-login" class="primary-login-btn">
                                            🚀 Microsoft 로그인 시작
                                        </button>
                                        <button id="cancel-login" class="cancel-login-btn">
                                            취소
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // 이벤트 리스너 설정
                this.setupAuthModalEvents(modal, resolve);
                
                // 모달 표시
                setTimeout(() => modal.classList.add('show'), 10);
            });
        }

        setupAuthModalEvents(modal, resolve) {
            let isResolved = false;
            
            // Device Code 이벤트 리스너 설정
            const deviceCodeHandler = (deviceCodeInfo) => {
                console.log('📱 Device Code 수신:', deviceCodeInfo);
                if (deviceCodeInfo && deviceCodeInfo.userCode) {
                    this.showDeviceCodeUI(deviceCodeInfo);
                } else {
                    console.error('❌ Device Code 정보가 유효하지 않음:', deviceCodeInfo);
                }
            };
            
            // 이벤트 리스너 등록
            if (window.electronAPI && window.electronAPI.on) {
                window.electronAPI.on('device-code-received', deviceCodeHandler);
            }
            
            // 정리 함수
            const cleanup = () => {
                // Device Code 이벤트 리스너 제거
                if (window.electronAPI && window.electronAPI.removeAllListeners) {
                    window.electronAPI.removeAllListeners('device-code-received');
                }
                
                if (modal && modal.parentNode) {
                    modal.classList.remove('show');
                    setTimeout(() => {
                        if (modal.parentNode) {
                            modal.parentNode.removeChild(modal);
                        }
                    }, 300);
                }
            };
            
            // Microsoft 로그인 버튼
            const microsoftBtn = modal.querySelector('#start-microsoft-login');
            if (microsoftBtn) {
                microsoftBtn.addEventListener('click', async () => {
                    if (isResolved) return;
                    
                    try {
                        microsoftBtn.textContent = '🔄 인증 중...';
                        microsoftBtn.disabled = true;
                        
                        const result = await this.authenticateWithMicrosoft();
                        
                        if (result && !isResolved) {
                            isResolved = true;
                            cleanup();
                            resolve({
                                authType: 'microsoft',
                                authData: result
                            });
                        }
                    } catch (error) {
                        console.error('❌ Microsoft 인증 오류:', error);
                        microsoftBtn.textContent = '🚀 Microsoft 로그인 시작';
                        microsoftBtn.disabled = false;
                        
                        // 에러 표시
                        this.showAuthError(modal, error.message);
                    }
                });
            }
            
            // 취소 버튼
            const cancelBtn = modal.querySelector('#cancel-login');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    if (!isResolved) {
                        isResolved = true;
                        cleanup();
                        resolve(null);
                    }
                });
            }
            
            // 닫기 버튼
            const closeBtn = modal.querySelector('.close-auth-modal');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    if (!isResolved) {
                        isResolved = true;
                        cleanup();
                        resolve(null);
                    }
                });
            }
            
            // 모달 외부 클릭
            modal.addEventListener('click', (e) => {
                if (e.target === modal && !isResolved) {
                    isResolved = true;
                    cleanup();
                    resolve(null);
                }
            });
            
            // ESC 키
            const handleEscape = (e) => {
                if (e.key === 'Escape' && !isResolved) {
                    isResolved = true;
                    cleanup();
                    resolve(null);
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        }

        showAuthError(modal, errorMessage) {
            // 기존 에러 메시지 제거
            const existingError = modal.querySelector('.auth-error');
            if (existingError) {
                existingError.remove();
            }
            
            // 새 에러 메시지 생성
            const errorDiv = document.createElement('div');
            errorDiv.className = 'auth-error';
            errorDiv.innerHTML = `
                <div class="error-icon">❌</div>
                <div class="error-message">${errorMessage}</div>
                <div class="error-suggestion">
                    브라우저에서 인증을 완료했는지 확인하고 다시 시도해주세요.
                </div>
            `;
            
            // Microsoft 섹션에 추가
            const microsoftSection = modal.querySelector('#microsoft-login-section');
            if (microsoftSection) {
                microsoftSection.appendChild(errorDiv);
                
                // 3초 후 자동 제거
                setTimeout(() => {
                    if (errorDiv.parentNode) {
                        errorDiv.remove();
                    }
                }, 5000);
            }
        }

        async authenticateWithMicrosoft() {
            try {
                console.log('🔐 Microsoft 인증 시작...');
                
                // IPC를 통해 메인 프로세스의 Microsoft 인증 호출
                if (window.electronAPI && window.electronAPI.invoke) {
                    const result = await window.electronAPI.invoke('microsoft-login');
                    
                    if (result.success) {
                        console.log('✅ Microsoft OAuth2 인증 성공');
                        this.hideDeviceCodeUI();
                        return {
                            accessToken: result.authData.data.accessToken,
                            username: result.authData.data.profile.name,
                            uuid: result.authData.data.profile.id,
                            playerProfile: {
                                name: result.authData.data.profile.name,
                                uuid: result.authData.data.profile.id,
                                avatarUrl: `https://crafatar.com/avatars/${result.authData.data.profile.id}?size=64&overlay`,
                                skinUrl: result.authData.data.profile.skins?.[0]?.url || `https://crafatar.com/skins/${result.authData.data.profile.id}`
                            }
                        };
                    } else {
                        this.hideDeviceCodeUI();
                        throw new Error(result.error || '인증에 실패했습니다');
                    }
                } else {
                    // Electron API가 없는 경우 기존 방식 시도
                    const existingAuth = await this.tryGetExistingAuth();
                    
                    if (existingAuth) {
                        return existingAuth;
                    } else {
                        throw new Error('Microsoft 인증을 완료할 수 없습니다. Electron API가 필요합니다.');
                    }
                }
                
            } catch (error) {
                console.error('❌ Microsoft 인증 실패:', error);
                this.hideDeviceCodeUI();
                throw error;
            }
        }

        showDeviceCodeUI(deviceCodeInfo) {
            console.log('🎨 Device Code UI 표시:', deviceCodeInfo);
            
            // Device Code 정보 유효성 검사
            if (!deviceCodeInfo || !deviceCodeInfo.userCode || !deviceCodeInfo.verificationUri) {
                console.error('❌ Device Code 정보가 유효하지 않음:', deviceCodeInfo);
                return;
            }
            
            // 기존 Device Code UI 제거
            this.hideDeviceCodeUI();
            
            // Microsoft 로그인 섹션 찾기
            const microsoftSection = document.querySelector('#microsoft-login-section');
            if (!microsoftSection) {
                console.error('❌ Microsoft 로그인 섹션을 찾을 수 없음');
                return;
            }
            
            // Device Code UI 생성
            const deviceCodeDiv = document.createElement('div');
            deviceCodeDiv.id = 'device-code-ui';
            deviceCodeDiv.className = 'device-code-container';
            deviceCodeDiv.innerHTML = `
                <div class="device-code-header">
                    <h4>🔐 Microsoft 인증</h4>
                    <p>브라우저에서 Microsoft 계정으로 로그인하세요</p>
                </div>
                
                <div class="device-code-info">
                    <div class="code-display">
                        <label>인증 코드:</label>
                        <div class="code-value" id="device-code-value">${deviceCodeInfo.userCode}</div>
                        <button class="copy-code-btn" onclick="navigator.clipboard.writeText('${deviceCodeInfo.userCode}')">📋 복사</button>
                    </div>
                    
                    <div class="verification-url">
                        <label>인증 URL:</label>
                        <div class="url-value">
                            <a href="${deviceCodeInfo.verificationUri}" target="_blank">${deviceCodeInfo.verificationUri}</a>
                        </div>
                    </div>
                    
                    ${deviceCodeInfo.verificationUriComplete ? `
                        <div class="quick-link">
                            <button class="auth-quick-btn" onclick="window.open('${deviceCodeInfo.verificationUriComplete}', '_blank')">
                                🚀 빠른 인증 (브라우저 열기)
                            </button>
                        </div>
                    ` : ''}
                </div>
                
                <div class="device-code-instructions">
                    <h5>📋 인증 방법:</h5>
                    <ol>
                        <li>위의 "빠른 인증" 버튼을 클릭하거나 URL을 브라우저에서 열어주세요</li>
                        <li>Microsoft 계정으로 로그인하세요</li>
                        <li>인증 코드 <strong>${deviceCodeInfo.userCode}</strong>를 입력하세요</li>
                        <li>인증이 완료되면 자동으로 로그인됩니다</li>
                    </ol>
                </div>
                
                <div class="device-code-status">
                    <div class="loading-spinner"></div>
                    <span>인증 대기 중... (브라우저에서 인증을 완료해주세요)</span>
                </div>
            `;
            
            // Microsoft 섹션에 추가
            microsoftSection.appendChild(deviceCodeDiv);
            
            // 자동으로 브라우저 열기 (verificationUriComplete가 있는 경우)
            if (deviceCodeInfo.verificationUriComplete) {
                setTimeout(() => {
                    console.log('🌐 자동으로 브라우저 열기:', deviceCodeInfo.verificationUriComplete);
                    window.open(deviceCodeInfo.verificationUriComplete, '_blank');
                }, 1000);
            }
        }

        hideDeviceCodeUI() {
            const deviceCodeUI = document.querySelector('#device-code-ui');
            if (deviceCodeUI) {
                deviceCodeUI.remove();
                console.log('🗑️ Device Code UI 제거됨');
            }
        }

        async tryGetExistingAuth() {
            try {
                // Windows의 기존 마인크래프트 런처 토큰 경로들
                const possiblePaths = [
                    '%APPDATA%/.minecraft/launcher_profiles.json',
                    '%APPDATA%/.minecraft/launcher_accounts.json'
                ];
                
                // Node.js 환경에서만 파일 시스템 접근 가능
                if (window.require) {
                    const fs = window.require('fs');
                    const path = window.require('path');
                    const os = window.require('os');
                    
                    for (const profilePath of possiblePaths) {
                        try {
                            const fullPath = profilePath.replace('%APPDATA%', path.join(os.homedir(), 'AppData', 'Roaming'));
                            
                            if (fs.existsSync(fullPath)) {
                                const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                                
                                // 유효한 계정 정보 찾기
                                if (data.accounts) {
                                    const accounts = Object.values(data.accounts);
                                    const validAccount = accounts.find(acc => 
                                        acc.accessToken && 
                                        acc.username && 
                                        acc.profile
                                    );
                                    
                                    if (validAccount) {
                                        console.log('✅ 기존 인증 정보 발견');
                                        return {
                                            accessToken: validAccount.accessToken,
                                            username: validAccount.username,
                                            uuid: validAccount.profile.id,
                                            playerProfile: {
                                                name: validAccount.username,
                                                uuid: validAccount.profile.id,
                                                avatarUrl: `https://crafatar.com/avatars/${validAccount.profile.id}?size=64&overlay`
                                            }
                                        };
                                    }
                                }
                            }
                        } catch (fileError) {
                            console.warn('파일 읽기 실패:', fileError);
                        }
                    }
                }
                
                return null;
            } catch (error) {
                console.error('기존 인증 정보 조회 실패:', error);
                return null;
            }
        }

        validateUsername(username) {
            // 마인크래프트 사용자명 규칙: 3-16자, 영문/숫자/언더스코어만
            const regex = /^[a-zA-Z0-9_]{3,16}$/;
            return regex.test(username);
        }

        async logout() {
            try {
                console.log('🚪 로그아웃 중...');
                
                await this.clearAuthData();
                this.updateUI();
                
                console.log('✅ 로그아웃 완료');
                
                if (window.notificationManager) {
                    window.notificationManager.show('로그아웃되었습니다', 'info');
                }
            } catch (error) {
                console.error('❌ 로그아웃 실패:', error);
            }
        }

        updateUI() {
            const loginSection = document.getElementById('login-section');
            const userSection = document.getElementById('user-section');
            const playButton = document.getElementById('play-button');
            
            if (this.isAuthenticated && this.authData) {
                // 로그인 상태
                if (loginSection) loginSection.style.display = 'none';
                if (userSection) {
                    userSection.style.display = 'block';
                    const usernameSpan = userSection.querySelector('.username');
                    const userAvatar = userSection.querySelector('.user-avatar img');
                    
                    if (usernameSpan) {
                        usernameSpan.textContent = this.authData.username;
                    }
                    
                    // 실제 플레이어 스킨 표시
                    if (userAvatar && this.authData.playerProfile && this.authData.playerProfile.avatarUrl) {
                        userAvatar.src = this.authData.playerProfile.avatarUrl;
                        userAvatar.alt = `${this.authData.username}의 아바타`;
                        console.log('✅ 플레이어 스킨 표시:', this.authData.playerProfile.avatarUrl);
                    }
                }
                if (playButton) {
                    playButton.disabled = false;
                    playButton.textContent = '게임 시작';
                }
            } else {
                // 로그아웃 상태
                if (loginSection) loginSection.style.display = 'block';
                if (userSection) userSection.style.display = 'none';
                if (playButton) {
                    playButton.disabled = true;
                    playButton.textContent = '로그인 필요';
                }
            }
        }

        updateLoginButton(text, disabled) {
            const loginButton = document.getElementById('login-button');
            if (loginButton) {
                loginButton.textContent = text;
                loginButton.disabled = disabled;
            }
        }

        getAuthData() {
            return this.authData;
        }

        isLoggedIn() {
            return this.isAuthenticated;
        }
    }

    // AuthManager 클래스를 전역으로 노출
    window.AuthManager = AuthManager;
    
    // 전역 인스턴스 생성
    window.authManager = new AuthManager();

    console.log('🔐 인증 모듈 로드 완료');

})(); 