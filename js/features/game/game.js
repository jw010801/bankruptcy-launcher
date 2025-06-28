/**
 * 게임 실행 관리 모듈
 * 마인크래프트 실행 및 설치 기능을 관리합니다.
 */

(function() {
    'use strict';

    class GameManager {
        constructor() {
            this.isLaunching = false;
            this.ipcRenderer = null;
            this.init();
        }

        async init() {
            try {
                // Electron IPC 초기화 (contextBridge 방식)
                if (typeof window !== 'undefined' && window.electronAPI) {
                    this.ipcRenderer = window.electronAPI;
                    console.log('✅ IPC 통신 설정됨 (contextBridge)');
                } else {
                    console.log('⚠️ Electron API 없음 - 시뮬레이션 모드로 실행');
                }
                
                console.log('🎮 GameManager 초기화 완료');
            } catch (error) {
                console.error('❌ GameManager 초기화 실패:', error);
            }
        }

        /**
         * 마인크래프트 실행
         */
        async launchMinecraft() {
            if (this.isLaunching) {
                console.log('⚠️ 이미 게임 실행 중...');
                return;
            }

            try {
                this.isLaunching = true;
                console.log('🚀 마인크래프트 실행 시작...');

                // 로그인 상태 확인
                if (!window.authManager || !window.authManager.isLoggedIn()) {
                    if (window.notificationManager) {
                        window.notificationManager.warning('먼저 로그인해주세요!');
                    }
                    return;
                }

                // 프로그래스 바 표시
                if (window.progressManager) {
                    window.progressManager.showProgress('play');
                    window.progressManager.updateProgress('play', 0, '게임 실행 준비 중...');
                }

                // 플레이 버튼 비활성화
                const playBtn = document.getElementById('play-btn');
                if (playBtn) {
                    playBtn.disabled = true;
                    playBtn.style.opacity = '0.6';
                }

                // 설치 상태 확인
                if (window.progressManager) {
                    window.progressManager.updateProgress('play', 20, '설치 상태 확인 중...');
                }

                const installStatus = await this.checkInstallStatus();
                
                // 자동 설치/업데이트
                if (!installStatus.minecraft) {
                    if (window.progressManager) {
                        window.progressManager.updateProgress('play', 40, '마인크래프트 설치 중...');
                    }
                    await this.installMinecraft();
                }

                if (!installStatus.forge) {
                    if (window.progressManager) {
                        window.progressManager.updateProgress('play', 60, 'Forge 설치 중...');
                    }
                    await this.installForge();
                }

                // 게임 실행
                if (window.progressManager) {
                    window.progressManager.updateProgress('play', 80, '게임 실행 중...');
                }

                const authData = window.authManager.getAuthData();
                const launchResult = await this.launchGame(authData);

                if (launchResult.success) {
                    if (window.progressManager) {
                        window.progressManager.updateProgress('play', 100, '게임 실행 완료!');
                    }
                    
                    // 상세한 실행 정보 표시
                    const message = launchResult.message || '마인크래프트가 실행되었습니다!';
                    if (window.notificationManager) {
                        window.notificationManager.success(message);
                    }
                    
                    if (window.audioManager) {
                        window.audioManager.playSound('success');
                    }
                    
                    console.log('✅ 마인크래프트 실행 완료');
                    
                    // 백엔드 디버그 정보 표시
                    if (launchResult.debug) {
                        console.log('🔍 실행 방법:', launchResult.debug.method);
                        console.log('🔍 런처 경로:', launchResult.debug.launcherPath);
                        console.log('🔍 프로세스 시작됨:', launchResult.debug.processStarted);
                    }
                    
                    // 게임 실행 후 런처 동작 처리
                    await this.handlePostLaunch();
                    
                } else {
                    throw new Error(launchResult.error || '게임 실행 실패');
                }

            } catch (error) {
                console.error('❌ 마인크래프트 실행 실패:', error);
                
                if (window.notificationManager) {
                    window.notificationManager.error('게임 실행에 실패했습니다: ' + error.message);
                }
                
                if (window.progressManager) {
                    window.progressManager.hideProgress('play');
                }
            } finally {
                this.isLaunching = false;
                
                // 플레이 버튼 활성화
                const playBtn = document.getElementById('play-btn');
                if (playBtn) {
                    playBtn.disabled = false;
                    playBtn.style.opacity = '1';
                }
            }
        }

        /**
         * 게임 실행 후 런처 동작 처리 (단순화)
         */
        async handlePostLaunch() {
            try {
                console.log('🎮 게임 실행 후 처리 시작...');
                
                // 1. 브금 정지
                console.log('🔇 브금 정지');
                if (window.audioManager) {
                    window.audioManager.pauseBGM();
                }
                
                // 2. 진행률 바 숨기기 (약간의 딜레이)
                setTimeout(() => {
                    if (window.progressManager) {
                        window.progressManager.hideProgress('play');
                    }
                }, 2000);
                
                // 3. 설정에 따른 런처 동작
                const settings = window.storageManager ? 
                    await window.storageManager.loadConfig() : 
                    { launcherAction: 'close' };
                
                const launcherAction = settings.launcherAction || 'close';
                
                // 3초 후 설정된 동작 수행 (사용자가 메시지를 볼 시간 제공)
                setTimeout(async () => {
                    try {
                        switch (launcherAction) {
                            case 'minimize':
                                console.log('🪟 게임 시작 후 런처 최소화');
                                if (this.ipcRenderer) {
                                    await this.ipcRenderer.invoke('window-minimize');
                                    console.log('✅ 런처 최소화 완료');
                                }
                                break;
                                
                            case 'close':
                                console.log('🚪 게임 시작 후 런처 종료 (리소스 완전 해방)');
                                
                                // 종료 전 사용자에게 안내
                                if (window.notificationManager) {
                                    window.notificationManager.success('🔋 런처가 종료됩니다 - 리소스 절약 모드');
                                }
                                
                                // 1초 후 종료 (안내 메시지를 볼 시간 제공)
                                setTimeout(async () => {
                                    if (this.ipcRenderer) {
                                        await this.ipcRenderer.invoke('window-close');
                                        console.log('✅ 런처 종료 완료 - 메모리 0MB, CPU 0%');
                                    }
                                }, 1000);
                                return;
                                
                            case 'keep':
                            default:
                                console.log('🪟 런처 유지 (설정에 따라)');
                                break;
                        }
                        
                    } catch (error) {
                        console.warn(`⚠️ 런처 동작 실패 (${launcherAction}):`, error);
                    }
                }, 3000);
                
                console.log('✅ 게임 실행 후 처리 완료');
                
            } catch (error) {
                console.error('❌ 게임 실행 후 처리 오류:', error);
            }
        }



        /**
         * 설치 상태 확인
         */
        async checkInstallStatus() {
            try {
                if (this.ipcRenderer) {
                    const result = await this.ipcRenderer.invoke('check-install-status');
                    return result;
                } else {
                    // 기본값 반환 (개발 모드)
                    return {
                        minecraft: true,
                        forge: true,
                        mods: []
                    };
                }
            } catch (error) {
                console.error('설치 상태 확인 실패:', error);
                return {
                    minecraft: false,
                    forge: false,
                    mods: []
                };
            }
        }

        /**
         * 마인크래프트 설치
         */
        async installMinecraft() {
            try {
                if (this.ipcRenderer) {
                    const result = await this.ipcRenderer.invoke('install-minecraft');
                    if (!result.success) {
                        throw new Error(result.error);
                    }
                } else {
                    // 개발 모드에서는 시뮬레이션
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                console.log('✅ 마인크래프트 설치 완료');
            } catch (error) {
                console.error('❌ 마인크래프트 설치 실패:', error);
                throw error;
            }
        }

        /**
         * Forge 설치
         */
        async installForge() {
            try {
                if (this.ipcRenderer) {
                    const result = await this.ipcRenderer.invoke('install-forge');
                    if (!result.success) {
                        throw new Error(result.error);
                    }
                } else {
                    // 개발 모드에서는 시뮬레이션
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                console.log('✅ Forge 설치 완료');
            } catch (error) {
                console.error('❌ Forge 설치 실패:', error);
                throw error;
            }
        }

        /**
         * 게임 실행
         */
        async launchGame(authData) {
            try {
                console.log('🔍 IPC 상태 확인:', !!this.ipcRenderer);
                console.log('🔍 AuthData:', authData ? 'OK' : 'NULL');
                
                if (this.ipcRenderer) {
                    console.log('🚀 IPC로 launch-minecraft 호출...');
                    
                    const launchData = {
                        authData: authData,
                        serverIP: this.getServerIP(),
                        memory: this.getMemoryAllocation(),
                        autoConnect: this.getAutoConnect()
                    };
                    
                    console.log('📋 Launch 데이터:', launchData);
                    
                    const result = await this.ipcRenderer.invoke('launch-minecraft', launchData);
                    
                    console.log('📥 IPC 응답:', result);
                    return result;
                } else {
                    console.log('⚠️ IPC 없음 - 시뮬레이션 실행');
                    // 개발 모드에서는 시뮬레이션
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return { 
                        success: true, 
                        message: '시뮬레이션 모드 - 실제 마인크래프트를 수동으로 실행하세요.',
                        debug: { method: 'simulation' }
                    };
                }
            } catch (error) {
                console.error('❌ 게임 실행 실패:', error);
                return { success: false, error: error.message };
            }
        }

        /**
         * 서버 IP 가져오기
         */
        getServerIP() {
            const serverIpInput = document.getElementById('server-ip');
            return serverIpInput ? serverIpInput.value || 'localhost:25565' : 'localhost:25565';
        }

        /**
         * 메모리 할당량 가져오기
         */
        getMemoryAllocation() {
            const memorySelect = document.getElementById('memory-allocation');
            return memorySelect ? memorySelect.value || '2G' : '2G';
        }

        /**
         * 자동 접속 설정 가져오기
         */
        getAutoConnect() {
            const autoConnectCheck = document.getElementById('auto-connect');
            return autoConnectCheck ? autoConnectCheck.checked : false;
        }

        /**
         * 현재 실행 상태 반환
         */
        isGameLaunching() {
            return this.isLaunching;
        }
    }

    // 전역 게임 매니저 인스턴스
    const gameManager = new GameManager();

    // 전역 객체로 노출
    window.GameManager = GameManager;
    window.gameManager = gameManager;

    console.log('🎮 게임 모듈 로드 완료');

})(); 