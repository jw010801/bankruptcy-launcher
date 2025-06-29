/**
 * 설정 관리 모듈
 * 런처 설정 UI 및 저장/로드 기능을 관리합니다.
 */

(function() {
    'use strict';

    class SettingsManager {
        constructor() {
            this.modal = null;
            this.settingsBtn = null;
            this.settingsCloseBtn = null;
            this.settingsForm = null;
            this.currentSettings = {};
            this.init();
        }

        async init() {
            try {
                // DOM 요소 초기화
                this.initDomElements();
                
                // 이벤트 리스너 설정
                this.setupEventListeners();
                
                // 설정 로드
                await this.loadSettings();
                
                console.log('⚙️ SettingsManager 초기화 완료');
            } catch (error) {
                console.error('❌ SettingsManager 초기화 실패:', error);
            }
        }

        /**
         * DOM 요소 초기화
         */
        initDomElements() {
            this.modal = document.getElementById('settings-modal');
            this.settingsBtn = document.getElementById('settings-btn');
            this.settingsCloseBtn = document.getElementById('settings-close');
            this.settingsSaveBtn = document.getElementById('settings-save');
            
            // 설정 입력 요소들
            this.serverIpInput = document.getElementById('server-ip');
            this.usernameInput = document.getElementById('username');
            this.memorySelect = document.getElementById('memory-allocation');
            this.autoConnectCheck = document.getElementById('auto-connect');
            this.launcherActionSelect = document.getElementById('launcher-action');
            this.masterVolumeSlider = document.getElementById('master-volume');
            this.bgmVolumeSlider = document.getElementById('bgm-volume');
            this.sfxVolumeSlider = document.getElementById('sfx-volume');
            this.enableBgmCheck = document.getElementById('enable-bgm');
            this.enableSfxCheck = document.getElementById('enable-sfx');
            this.autoUpdateCheck = document.getElementById('auto-update');
            this.debugModeCheck = document.getElementById('debug-mode');
            this.keepLoginsCheck = document.getElementById('keep-logins');
            this.authDurationSelect = document.getElementById('auth-duration');
            
            // 새로 추가된 성능 설정 요소들
            this.performanceProfileSelect = document.getElementById('performance-profile');
            this.gpuOptimizationCheck = document.getElementById('gpu-optimization');
            
            // 볼륨 표시 요소들
            this.masterVolumeValue = document.getElementById('master-volume-value');
            this.bgmVolumeValue = document.getElementById('bgm-volume-value');
            this.sfxVolumeValue = document.getElementById('sfx-volume-value');
        }

        /**
         * 이벤트 리스너 설정
         */
        setupEventListeners() {
            // 설정 버튼 클릭
            if (this.settingsBtn) {
                this.settingsBtn.addEventListener('click', () => this.openSettings());
            }
            
            // 설정 닫기 버튼
            if (this.settingsCloseBtn) {
                this.settingsCloseBtn.addEventListener('click', () => this.closeSettings());
            }
            
            // 설정 저장 버튼
            if (this.settingsSaveBtn) {
                this.settingsSaveBtn.addEventListener('click', () => this.saveSettings());
            }
            
            // 모달 배경 클릭 시 닫기
            if (this.modal) {
                this.modal.addEventListener('click', (e) => {
                    if (e.target === this.modal) {
                        this.closeSettings();
                    }
                });
            }
            
            // ESC 키로 닫기
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modal && this.modal.style.display === 'block') {
                    this.closeSettings();
                }
            });
            
            // 볼륨 슬라이더 변경 이벤트
            if (this.masterVolumeSlider) {
                this.masterVolumeSlider.addEventListener('input', (e) => {
                    this.updateVolumeDisplay('master', e.target.value);
                    this.applyVolumeSettings();
                });
            }
            
            if (this.bgmVolumeSlider) {
                this.bgmVolumeSlider.addEventListener('input', (e) => {
                    this.updateVolumeDisplay('bgm', e.target.value);
                    this.applyVolumeSettings();
                });
            }
            
            if (this.sfxVolumeSlider) {
                this.sfxVolumeSlider.addEventListener('input', (e) => {
                    this.updateVolumeDisplay('sfx', e.target.value);
                    this.applyVolumeSettings();
                });
            }
            
            // 오디오 체크박스 변경 이벤트
            if (this.enableBgmCheck) {
                this.enableBgmCheck.addEventListener('change', () => {
                    this.applyBgmSettings();
                });
            }
            
            if (this.enableSfxCheck) {
                this.enableSfxCheck.addEventListener('change', () => {
                    this.applyVolumeSettings();
                });
            }
            
            // 설정 폼 제출
            if (this.settingsForm) {
                this.settingsForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveSettings();
                });
            }
        }

        /**
         * 설정 모달 열기
         */
        async openSettings() {
            try {
                console.log('⚙️ 설정 모달 열기...');
                if (window.audioManager) window.audioManager.playSound('click');
                
                // 현재 설정을 폼에 로드
                await this.loadSettingsToForm();
                
                // 모달 표시
                if (this.modal) {
                    this.modal.style.display = 'block';
                    
                    // 애니메이션 효과
                    setTimeout(() => {
                        this.modal.classList.add('show');
                    }, 10);
                }
                
            } catch (error) {
                console.error('❌ 설정 모달 열기 실패:', error);
                if (window.notificationManager) {
                    window.notificationManager.error('설정을 열 수 없습니다: ' + error.message);
                }
            }
        }

        /**
         * 설정 모달 닫기
         */
        closeSettings() {
            try {
                console.log('⚙️ 설정 모달 닫기...');
                if (window.audioManager) window.audioManager.playSound('click');
                
                if (this.modal) {
                    this.modal.classList.remove('show');
                    
                    // 애니메이션 후 숨기기
                    setTimeout(() => {
                        this.modal.style.display = 'none';
                    }, 300);
                }
                
            } catch (error) {
                console.error('❌ 설정 모달 닫기 실패:', error);
            }
        }

        /**
         * 설정 로드
         */
        async loadSettings() {
            try {
                let settings = null;
                
                // 1. config.json에서 로드 시도 (우선순위)
                try {
                    if (window.electronAPI) {
                        settings = await window.electronAPI.invoke('load-settings');
                        console.log('📋 config.json에서 설정 로드:', settings);
                    }
                } catch (error) {
                    console.warn('⚠️ config.json 로드 실패:', error);
                }
                
                // 2. config.json 실패 시 localStorage 사용
                if (!settings && window.storageManager) {
                    try {
                        settings = await window.storageManager.loadConfig();
                        console.log('📋 localStorage에서 설정 로드:', settings);
                    } catch (error) {
                        console.warn('⚠️ localStorage 로드 실패:', error);
                    }
                }
                
                // 3. 모든 방법 실패 시 기본 설정
                if (!settings) {
                    settings = this.getDefaultSettings();
                    console.log('📋 기본 설정 사용:', settings);
                }
                
                this.currentSettings = settings;
                console.log('📋 최종 로드된 설정:', this.currentSettings);
                
            } catch (error) {
                console.error('❌ 설정 로드 실패:', error);
                this.currentSettings = this.getDefaultSettings();
            }
        }

        /**
         * 기본 설정 반환
         */
        getDefaultSettings() {
            return {
                serverIP: 'localhost:25565',
                username: '',
                memory: '4G', // 기본 메모리를 4GB로 변경
                autoConnect: false,
                launcherAction: 'minimize', // 게임 시작 후 런처 동작 (minimize/keep/close)
                enableBgm: true,
                authDuration: 14,
                masterVolume: 0.7,
                bgmVolume: 0.5,
                sfxVolume: 0.8,
                enableSfx: true,
                autoUpdate: true,
                debugMode: false,
                keepLogins: true,
                // 새로 추가된 성능 설정들
                performanceProfile: 'balanced',
                gpuOptimization: true
            };
        }

        /**
         * 설정을 폼에 로드
         */
        async loadSettingsToForm() {
            try {
                // 게임 설정
                if (this.serverIpInput) this.serverIpInput.value = this.currentSettings.serverIP || 'localhost:25565';
                if (this.usernameInput) this.usernameInput.value = this.currentSettings.username || '';
                if (this.memorySelect) {
                    this.memorySelect.value = this.currentSettings.memory || '4G';
                    console.log('🧠 설정 폼에 메모리 로드:', {
                        currentSetting: this.currentSettings.memory,
                        setValue: this.memorySelect.value,
                        element: !!this.memorySelect
                    });
                }
                if (this.autoConnectCheck) this.autoConnectCheck.checked = this.currentSettings.autoConnect || false;
                if (this.launcherActionSelect) this.launcherActionSelect.value = this.currentSettings.launcherAction || 'minimize';
                
                // 성능 설정
                if (this.performanceProfileSelect) this.performanceProfileSelect.value = this.currentSettings.performanceProfile || 'balanced';
                if (this.gpuOptimizationCheck) this.gpuOptimizationCheck.checked = this.currentSettings.gpuOptimization !== false;
                
                // 오디오 설정
                if (this.masterVolumeSlider) {
                    this.masterVolumeSlider.value = (this.currentSettings.masterVolume || 0.7) * 100;
                    this.updateVolumeDisplay('master', this.masterVolumeSlider.value);
                }
                
                if (this.bgmVolumeSlider) {
                    this.bgmVolumeSlider.value = (this.currentSettings.bgmVolume || 0.5) * 100;
                    this.updateVolumeDisplay('bgm', this.bgmVolumeSlider.value);
                }
                
                if (this.sfxVolumeSlider) {
                    this.sfxVolumeSlider.value = (this.currentSettings.sfxVolume || 0.8) * 100;
                    this.updateVolumeDisplay('sfx', this.sfxVolumeSlider.value);
                }
                
                if (this.enableBgmCheck) this.enableBgmCheck.checked = this.currentSettings.enableBgm !== false;
                if (this.enableSfxCheck) this.enableSfxCheck.checked = this.currentSettings.enableSfx !== false;
                
                // 일반 설정
                if (this.autoUpdateCheck) this.autoUpdateCheck.checked = this.currentSettings.autoUpdate !== false;
                if (this.debugModeCheck) this.debugModeCheck.checked = this.currentSettings.debugMode || false;
                if (this.keepLoginsCheck) this.keepLoginsCheck.checked = this.currentSettings.keepLogins !== false;
                if (this.authDurationSelect) this.authDurationSelect.value = this.currentSettings.authDuration || 14;
                
                console.log('📋 설정 폼 로드 완료');
                
            } catch (error) {
                console.error('❌ 설정 폼 로드 실패:', error);
            }
        }

        /**
         * 설정 저장
         */
        async saveSettings() {
            try {
                console.log('💾 설정 저장 시작...');
                
                // 폼에서 설정값 수집
                const newSettings = {
                    serverIP: this.serverIpInput?.value || 'localhost:25565',
                    username: this.usernameInput?.value || '',
                    memory: this.memorySelect?.value || '4G',
                    autoConnect: this.autoConnectCheck?.checked || false,
                    launcherAction: this.launcherActionSelect?.value || 'minimize',
                    enableBgm: this.enableBgmCheck?.checked !== false,
                    authDuration: parseInt(this.authDurationSelect?.value) || 14,
                    masterVolume: (this.masterVolumeSlider?.value || 70) / 100,
                    bgmVolume: (this.bgmVolumeSlider?.value || 50) / 100,
                    sfxVolume: (this.sfxVolumeSlider?.value || 80) / 100,
                    enableSfx: this.enableSfxCheck?.checked !== false,
                    autoUpdate: this.autoUpdateCheck?.checked !== false,
                    debugMode: this.debugModeCheck?.checked || false,
                    keepLogins: this.keepLoginsCheck?.checked !== false,
                    // 새로 추가된 성능 설정들
                    performanceProfile: this.performanceProfileSelect?.value || 'balanced',
                    gpuOptimization: this.gpuOptimizationCheck?.checked !== false
                };
                
                console.log('💾 저장할 설정:', newSettings);
                console.log('🧠 메모리 설정 확인:', {
                    element: !!this.memorySelect,
                    value: this.memorySelect?.value,
                    savedValue: newSettings.memory
                });
                
                // 설정 저장 - config.json과 localStorage 둘 다 업데이트
                let saveSuccess = false;
                
                // 1. config.json에 저장 (우선순위)
                try {
                    if (window.electronAPI) {
                        const result = await window.electronAPI.invoke('save-settings', newSettings);
                        if (result.success) {
                            console.log('✅ config.json 저장 성공');
                            saveSuccess = true;
                        } else {
                            console.error('❌ config.json 저장 실패:', result.error);
                        }
                    }
                } catch (error) {
                    console.error('❌ config.json 저장 오류:', error);
                }
                
                // 2. localStorage에도 백업 저장
                try {
                    if (window.storageManager) {
                        await window.storageManager.saveConfig(newSettings);
                        console.log('✅ localStorage 백업 저장 성공');
                        if (!saveSuccess) saveSuccess = true; // config.json 실패 시 fallback
                    }
                } catch (error) {
                    console.error('❌ localStorage 저장 오류:', error);
                }
                
                if (!saveSuccess) {
                    throw new Error('모든 저장 방법이 실패했습니다');
                }
                
                // 현재 설정 업데이트
                this.currentSettings = newSettings;
                
                // 오디오 설정 즉시 적용
                this.applyVolumeSettings();
                
                // 성공 메시지
                if (window.notificationManager) {
                    window.notificationManager.success('설정이 저장되었습니다');
                }
                
                if (window.audioManager) {
                    window.audioManager.playSound('success');
                }
                
                // 모달 닫기
                this.closeSettings();
                
                console.log('✅ 설정 저장 완료:', newSettings);
                
            } catch (error) {
                console.error('❌ 설정 저장 실패:', error);
                
                if (window.notificationManager) {
                    window.notificationManager.error('설정 저장에 실패했습니다: ' + error.message);
                }
            }
        }

        /**
         * 볼륨 표시 업데이트
         */
        updateVolumeDisplay(type, value) {
            const displayValue = Math.round(value);
            
            switch (type) {
                case 'master':
                    if (this.masterVolumeValue) this.masterVolumeValue.textContent = displayValue + '%';
                    break;
                case 'bgm':
                    if (this.bgmVolumeValue) this.bgmVolumeValue.textContent = displayValue + '%';
                    break;
                case 'sfx':
                    if (this.sfxVolumeValue) this.sfxVolumeValue.textContent = displayValue + '%';
                    break;
            }
        }

        /**
         * 볼륨 설정 즉시 적용
         */
        applyVolumeSettings() {
            try {
                if (!window.audioManager) return;
                
                const masterVolume = (this.masterVolumeSlider?.value || 70) / 100;
                const bgmVolume = (this.bgmVolumeSlider?.value || 50) / 100;
                const sfxVolume = (this.sfxVolumeSlider?.value || 80) / 100;
                const enableBgm = this.enableBgmCheck?.checked !== false;
                const enableSfx = this.enableSfxCheck?.checked !== false;
                
                // 오디오 매니저에 볼륨 설정 적용
                window.audioManager.setMasterVolume(masterVolume);
                window.audioManager.setBgmVolume(enableBgm ? bgmVolume : 0);
                window.audioManager.setSfxVolume(enableSfx ? sfxVolume : 0);
                
            } catch (error) {
                console.error('❌ 볼륨 설정 적용 실패:', error);
            }
        }

        /**
         * 현재 설정 반환
         */
        getCurrentSettings() {
            return { ...this.currentSettings };
        }

        /**
         * 설정 초기화
         */
        async resetSettings() {
            try {
                console.log('🔄 설정 초기화...');
                
                this.currentSettings = this.getDefaultSettings();
                
                if (window.storageManager) {
                    await window.storageManager.saveConfig(this.currentSettings);
                }
                
                await this.loadSettingsToForm();
                this.applyVolumeSettings();
                
                if (window.notificationManager) {
                    window.notificationManager.success('설정이 초기화되었습니다');
                }
                
                console.log('✅ 설정 초기화 완료');
                
            } catch (error) {
                console.error('❌ 설정 초기화 실패:', error);
                
                if (window.notificationManager) {
                    window.notificationManager.error('설정 초기화에 실패했습니다: ' + error.message);
                }
            }
        }

        /**
         * BGM 체크박스 변경 이벤트
         */
        applyBgmSettings() {
            try {
                if (!window.audioManager) return;
                
                const bgmVolume = (this.bgmVolumeSlider?.value || 50) / 100;
                const enableBgm = this.enableBgmCheck?.checked !== false;
                
                // 오디오 매니저에 BGM 설정 적용
                window.audioManager.setBgmVolume(enableBgm ? bgmVolume : 0);
                
            } catch (error) {
                console.error('❌ BGM 설정 적용 실패:', error);
            }
        }
    }

    // 전역 설정 매니저 인스턴스
    const settingsManager = new SettingsManager();

    // 전역 객체로 노출
    window.SettingsManager = SettingsManager;
    window.settingsManager = settingsManager;

    console.log('⚙️ 설정 모듈 로드 완료');

})(); 