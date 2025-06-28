const fs = require('fs-extra');
const path = require('path');

class ProfileManager {
    constructor() {
        this.launcherDir = __dirname;
        this.profilesDir = path.join(this.launcherDir, 'profiles');
        this.profilesConfigPath = path.join(this.launcherDir, 'profiles.json');
        this.currentProfile = 'default'; // 기본값 설정
        
        // 비동기 초기화는 별도로 처리
        this.initializeProfiles().catch(error => {
            console.error('프로필 초기화 오류:', error);
        });
    }

    /**
     * 프로필 시스템 초기화
     */
    async initializeProfiles() {
        try {
            // profiles 디렉토리 생성
            await fs.ensureDir(this.profilesDir);
            
            // profiles.json 파일이 없으면 기본 설정 생성
            if (!await fs.pathExists(this.profilesConfigPath)) {
                await this.createDefaultProfile();
            }
            
            // 현재 프로필 로드
            const config = await this.loadProfilesConfig();
            this.currentProfile = config.currentProfile || 'default';
            
        } catch (error) {
            console.error('프로필 초기화 오류:', error);
        }
    }

    /**
     * 기본 프로필 생성
     */
    async createDefaultProfile() {
        const defaultProfile = {
            id: 'default',
            name: '기본 프로필',
            minecraftVersion: '1.20.1',
            forgeVersion: '47.2.0',
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        };

        const profilesConfig = {
            currentProfile: 'default',
            profiles: {
                'default': defaultProfile
            }
        };

        // profiles.json 저장
        await fs.writeJson(this.profilesConfigPath, profilesConfig, { spaces: 2 });
        
        // 기본 프로필 폴더 생성
        const profileDir = path.join(this.profilesDir, 'default');
        const modsDir = path.join(profileDir, 'mods');
        
        await fs.ensureDir(profileDir);
        await fs.ensureDir(modsDir);
        
        // 프로필별 설정 파일 생성
        await fs.writeJson(path.join(profileDir, 'config.json'), defaultProfile, { spaces: 2 });
        
        console.log('✅ 기본 프로필 생성 완료');
    }

    /**
     * 프로필 설정 로드
     */
    async loadProfilesConfig() {
        try {
            return await fs.readJson(this.profilesConfigPath);
        } catch (error) {
            console.error('프로필 설정 로드 실패:', error);
            return { currentProfile: 'default', profiles: {} };
        }
    }

    /**
     * 프로필 설정 저장
     */
    async saveProfilesConfig(config) {
        try {
            await fs.writeJson(this.profilesConfigPath, config, { spaces: 2 });
        } catch (error) {
            console.error('프로필 설정 저장 실패:', error);
        }
    }

    /**
     * 모든 프로필 목록 가져오기
     */
    async getAllProfiles() {
        try {
            const config = await this.loadProfilesConfig();
            return {
                success: true,
                profiles: Object.values(config.profiles || {}),
                currentProfile: config.currentProfile
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 특정 프로필 가져오기
     */
    async getProfile(profileId) {
        try {
            const config = await this.loadProfilesConfig();
            const profile = config.profiles[profileId];
            
            if (!profile) {
                return {
                    success: false,
                    error: '프로필을 찾을 수 없습니다'
                };
            }
            
            return {
                success: true,
                profile: profile
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 현재 프로필 가져오기
     */
    async getCurrentProfile() {
        return await this.getProfile(this.currentProfile);
    }

    /**
     * 프로필 생성
     */
    async createProfile(profileData) {
        try {
            const { id, name, minecraftVersion, forgeVersion } = profileData;
            
            if (!id || !name) {
                return {
                    success: false,
                    error: '프로필 ID와 이름은 필수입니다'
                };
            }
            
            const config = await this.loadProfilesConfig();
            
            // 중복 ID 확인
            if (config.profiles[id]) {
                return {
                    success: false,
                    error: '이미 존재하는 프로필 ID입니다'
                };
            }
            
            // 새 프로필 생성
            const newProfile = {
                id,
                name,
                minecraftVersion: minecraftVersion || '1.20.1',
                forgeVersion: forgeVersion || '47.2.0',
                createdAt: new Date().toISOString(),
                lastUsed: new Date().toISOString()
            };
            
            config.profiles[id] = newProfile;
            await this.saveProfilesConfig(config);
            
            // 프로필 디렉토리 생성
            const profileDir = path.join(this.profilesDir, id);
            const modsDir = path.join(profileDir, 'mods');
            
            await fs.ensureDir(profileDir);
            await fs.ensureDir(modsDir);
            
            // 프로필 설정 파일 생성
            await fs.writeJson(path.join(profileDir, 'config.json'), newProfile, { spaces: 2 });
            
            return {
                success: true,
                profile: newProfile
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 프로필 선택
     */
    async selectProfile(profileId) {
        try {
            const config = await this.loadProfilesConfig();
            
            if (!config.profiles[profileId]) {
                return {
                    success: false,
                    error: '존재하지 않는 프로필입니다'
                };
            }
            
            // 현재 프로필 업데이트
            config.currentProfile = profileId;
            config.profiles[profileId].lastUsed = new Date().toISOString();
            
            await this.saveProfilesConfig(config);
            this.currentProfile = profileId;
            
            return {
                success: true,
                profile: config.profiles[profileId]
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 프로필 삭제
     */
    async deleteProfile(profileId) {
        try {
            if (profileId === 'default') {
                return {
                    success: false,
                    error: '기본 프로필은 삭제할 수 없습니다'
                };
            }
            
            const config = await this.loadProfilesConfig();
            
            if (!config.profiles[profileId]) {
                return {
                    success: false,
                    error: '존재하지 않는 프로필입니다'
                };
            }
            
            // 현재 선택된 프로필이면 기본 프로필로 변경
            if (config.currentProfile === profileId) {
                config.currentProfile = 'default';
                this.currentProfile = 'default';
            }
            
            // 프로필 제거
            delete config.profiles[profileId];
            await this.saveProfilesConfig(config);
            
            // 프로필 폴더 삭제
            const profileDir = path.join(this.profilesDir, profileId);
            if (await fs.pathExists(profileDir)) {
                await fs.remove(profileDir);
            }
            
            return {
                success: true,
                message: '프로필이 삭제되었습니다'
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 현재 프로필의 모드 폴더 경로 가져오기
     */
    getCurrentModsPath() {
        // currentProfile이 null인 경우 기본값 사용
        const profileId = this.currentProfile || 'default';
        return path.join(this.profilesDir, profileId, 'mods');
    }

    /**
     * 특정 프로필의 모드 폴더 경로 가져오기
     */
    getProfileModsPath(profileId) {
        // profileId가 없는 경우 기본값 사용
        const safeProfileId = profileId || 'default';
        return path.join(this.profilesDir, safeProfileId, 'mods');
    }
}

module.exports = ProfileManager; 