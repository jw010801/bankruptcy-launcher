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
            this.masterVolumeSlider = document.getElementById('master-volume');
            this.bgmVolumeSlider = document.getElementById('bgm-volume');
            this.sfxVolumeSlider = document.getElementById('sfx-volume');
            this.enableBgmCheck = document.getElementById('enable-bgm');
            this.enableSfxCheck = document.getElementById('enable-sfx');
            this.autoUpdateCheck = document.getElementById('auto-update');
            this.debugModeCheck = document.getElementById('debug-mode');
            this.keepLoginsCheck = document.getElementById('keep-logins');
            this.authDurationSelect = document.getElementById('auth-duration');
            
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
                if (window.storageManager) {
                    this.currentSettings = await window.storageManager.loadConfig();
                } else {
                    // 기본 설정
                    this.currentSettings = this.getDefaultSettings();
                }
                
                console.log('📋 설정 로드 완료:', this.currentSettings);
                
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
                memory: '2G',
                autoConnect: false,
                enableBgm: true,
                authDuration: 14,
                masterVolume: 0.7,
                bgmVolume: 0.5,
                sfxVolume: 0.8,
                enableSfx: true,
                autoUpdate: true,
                debugMode: false,
                keepLogins: true
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
                if (this.memorySelect) this.memorySelect.value = this.currentSettings.memory || '2G';
                if (this.autoConnectCheck) this.autoConnectCheck.checked = this.currentSettings.autoConnect || false;
                
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
                    memory: this.memorySelect?.value || '2G',
                    autoConnect: this.autoConnectCheck?.checked || false,
                    enableBgm: this.enableBgmCheck?.checked !== false,
                    authDuration: parseInt(this.authDurationSelect?.value) || 14,
                    masterVolume: (this.masterVolumeSlider?.value || 70) / 100,
                    bgmVolume: (this.bgmVolumeSlider?.value || 50) / 100,
                    sfxVolume: (this.sfxVolumeSlider?.value || 80) / 100,
                    enableSfx: this.enableSfxCheck?.checked !== false,
                    autoUpdate: this.autoUpdateCheck?.checked !== false,
                    debugMode: this.debugModeCheck?.checked || false,
                    keepLogins: this.keepLoginsCheck?.checked !== false
                };
                
                // 설정 저장
                if (window.storageManager) {
                    await window.storageManager.saveConfig(newSettings);
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