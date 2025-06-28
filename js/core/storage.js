/**
 * 로컬 저장소 관리 모듈
 * 설정, 인증 정보, 프로필 등을 관리합니다.
 */

(function() {
    'use strict';

    class StorageManager {
        constructor() {
            this.configKey = 'launcher-config';
            this.authKey = 'launcher-auth';
            this.profilesKey = 'launcher-profiles';
            
            console.log('💾 StorageManager 초기화 완료');
        }

        /**
         * 범용 데이터 저장
         * @param {string} key - 저장 키
         * @param {any} value - 저장할 값
         */
        async set(key, value) {
            try {
                const data = {
                    value: value,
                    savedAt: new Date().toISOString()
                };
                
                localStorage.setItem(`launcher-${key}`, JSON.stringify(data));
                console.log(`✅ 데이터 저장 완료: ${key}`);
                return true;
            } catch (error) {
                console.error(`❌ 데이터 저장 실패 (${key}):`, error);
                return false;
            }
        }

        /**
         * 범용 데이터 로드
         * @param {string} key - 로드할 키
         * @returns {any} 저장된 값
         */
        async get(key) {
            try {
                const dataStr = localStorage.getItem(`launcher-${key}`);
                
                if (dataStr) {
                    const data = JSON.parse(dataStr);
                    console.log(`✅ 데이터 로드 완료: ${key}`);
                    return data.value;
                } else {
                    console.log(`ℹ️ 저장된 데이터 없음: ${key}`);
                    return null;
                }
            } catch (error) {
                console.error(`❌ 데이터 로드 실패 (${key}):`, error);
                return null;
            }
        }

        /**
         * 범용 데이터 삭제
         * @param {string} key - 삭제할 키
         */
        async remove(key) {
            try {
                localStorage.removeItem(`launcher-${key}`);
                console.log(`✅ 데이터 삭제 완료: ${key}`);
                return true;
            } catch (error) {
                console.error(`❌ 데이터 삭제 실패 (${key}):`, error);
                return false;
            }
        }

        /**
         * 설정 저장
         * @param {Object} config - 설정 객체
         */
        async saveConfig(config) {
            try {
                const configData = {
                    ...config,
                    lastUpdated: new Date().toISOString()
                };
                
                localStorage.setItem(this.configKey, JSON.stringify(configData));
                console.log('✅ 설정 저장 완료:', configData);
                return true;
            } catch (error) {
                console.error('❌ 설정 저장 실패:', error);
                return false;
            }
        }

        /**
         * 설정 로드
         * @returns {Object} 설정 객체
         */
        async loadConfig() {
            try {
                const configData = localStorage.getItem(this.configKey);
                
                if (configData) {
                    const config = JSON.parse(configData);
                    console.log('✅ 설정 로드 완료:', config);
                    return config;
                } else {
                    console.log('ℹ️ 저장된 설정 없음, 기본 설정 사용');
                    return this.getDefaultConfig();
                }
            } catch (error) {
                console.error('❌ 설정 로드 실패:', error);
                return this.getDefaultConfig();
            }
        }

        /**
         * 기본 설정 반환
         * @returns {Object} 기본 설정 객체
         */
        getDefaultConfig() {
            return {
                serverIP: 'localhost:25565',
                username: '',
                memory: '2G',
                autoConnect: false,
                enableBgm: true,
                enableSfx: true,
                masterVolume: 0.7,
                bgmVolume: 0.5,
                sfxVolume: 0.8,
                authDuration: 14,
                autoUpdate: true,
                debugMode: false,
                keepLogins: true,
                launcherAction: 'close' // 게임 시작 후 런처 동작 기본값 (리소스 절약)
            };
        }

        /**
         * 인증 정보 저장
         * @param {Object} authData - 인증 데이터
         */
        async saveAuth(authData) {
            try {
                const authInfo = {
                    ...authData,
                    savedAt: new Date().toISOString()
                };
                
                localStorage.setItem(this.authKey, JSON.stringify(authInfo));
                console.log('✅ 인증 정보 저장 완료');
                return true;
            } catch (error) {
                console.error('❌ 인증 정보 저장 실패:', error);
                return false;
            }
        }

        /**
         * 인증 정보 로드
         * @returns {Object|null} 인증 데이터
         */
        async loadAuth() {
            try {
                const authData = localStorage.getItem(this.authKey);
                
                if (authData) {
                    const auth = JSON.parse(authData);
                    console.log('✅ 인증 정보 로드 완료');
                    return auth;
                } else {
                    console.log('ℹ️ 저장된 인증 정보 없음');
                    return null;
                }
            } catch (error) {
                console.error('❌ 인증 정보 로드 실패:', error);
                return null;
            }
        }

        /**
         * 인증 정보 유효성 확인
         * @param {Object} authData - 인증 데이터
         * @returns {boolean} 유효성 여부
         */
        isAuthValid(authData) {
            if (!authData || !authData.expiresAt) {
                return false;
            }
            
            const expiresAt = new Date(authData.expiresAt);
            const now = new Date();
            
            return expiresAt > now;
        }

        /**
         * 인증 정보 삭제
         */
        async clearAuth() {
            try {
                localStorage.removeItem(this.authKey);
                console.log('✅ 인증 정보 삭제 완료');
                return true;
            } catch (error) {
                console.error('❌ 인증 정보 삭제 실패:', error);
                return false;
            }
        }

        /**
         * 프로필 저장
         * @param {Array} profiles - 프로필 배열
         */
        async saveProfiles(profiles) {
            try {
                const profileData = {
                    profiles: profiles,
                    lastUpdated: new Date().toISOString()
                };
                
                localStorage.setItem(this.profilesKey, JSON.stringify(profileData));
                console.log('✅ 프로필 저장 완료');
                return true;
            } catch (error) {
                console.error('❌ 프로필 저장 실패:', error);
                return false;
            }
        }

        /**
         * 프로필 로드
         * @returns {Array} 프로필 배열
         */
        async loadProfiles() {
            try {
                const profileData = localStorage.getItem(this.profilesKey);
                
                if (profileData) {
                    const data = JSON.parse(profileData);
                    console.log('✅ 프로필 로드 완료');
                    return data.profiles || [];
                } else {
                    console.log('ℹ️ 저장된 프로필 없음');
                    return [];
                }
            } catch (error) {
                console.error('❌ 프로필 로드 실패:', error);
                return [];
            }
        }

        /**
         * 모든 데이터 삭제
         */
        async clearAll() {
            try {
                localStorage.removeItem(this.configKey);
                localStorage.removeItem(this.authKey);
                localStorage.removeItem(this.profilesKey);
                
                console.log('✅ 모든 데이터 삭제 완료');
                return true;
            } catch (error) {
                console.error('❌ 데이터 삭제 실패:', error);
                return false;
            }
        }

        /**
         * 저장소 사용량 확인
         * @returns {Object} 저장소 정보
         */
        getStorageInfo() {
            try {
                const configSize = localStorage.getItem(this.configKey)?.length || 0;
                const authSize = localStorage.getItem(this.authKey)?.length || 0;
                const profilesSize = localStorage.getItem(this.profilesKey)?.length || 0;
                
                return {
                    config: configSize,
                    auth: authSize,
                    profiles: profilesSize,
                    total: configSize + authSize + profilesSize
                };
            } catch (error) {
                console.error('❌ 저장소 정보 확인 실패:', error);
                return { config: 0, auth: 0, profiles: 0, total: 0 };
            }
        }

        /**
         * 데이터 내보내기
         * @returns {Object} 모든 데이터
         */
        async exportData() {
            try {
                const config = await this.loadConfig();
                const auth = await this.loadAuth();
                const profiles = await this.loadProfiles();
                
                return {
                    config,
                    auth,
                    profiles,
                    exportedAt: new Date().toISOString()
                };
            } catch (error) {
                console.error('❌ 데이터 내보내기 실패:', error);
                return null;
            }
        }

        /**
         * 데이터 가져오기
         * @param {Object} data - 가져올 데이터
         */
        async importData(data) {
            try {
                if (data.config) {
                    await this.saveConfig(data.config);
                }
                
                if (data.auth) {
                    await this.saveAuth(data.auth);
                }
                
                if (data.profiles) {
                    await this.saveProfiles(data.profiles);
                }
                
                console.log('✅ 데이터 가져오기 완료');
                return true;
            } catch (error) {
                console.error('❌ 데이터 가져오기 실패:', error);
                return false;
            }
        }
    }

    // 전역 저장소 매니저 인스턴스
    const storageManager = new StorageManager();

    // 전역 객체로 노출
    window.StorageManager = StorageManager;
    window.storageManager = storageManager;

    console.log('💾 저장소 모듈 로드 완료');

})(); 