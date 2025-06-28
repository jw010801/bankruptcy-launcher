const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const ProfileManager = require('./profile-manager');

/**
 * CurseForge 모드 매니저 클래스
 * 모드팩 다운로드, 설치, 업데이트 관리
 */
class ModManager {
    constructor() {
        // CurseForge API 설정
        this.curseForgeAPI = 'https://api.curseforge.com/v1';
        this.apiKey = '$2a$10$bL4bIL5pUWqfcO6E8gDOF.Ls8xZDJuKLWqUXlKzYFCBhAzYqKx0YG'; // 공개 API 키
        
        // 마인크래프트 게임 ID (CurseForge)
        this.minecraftGameId = 432;
        
        // 프로필 매니저 초기화
        this.profileManager = new ProfileManager();
        
        // 모드 저장 경로
        this.modsDir = null;
        this.minecraftDir = null;
        
        try {
            this.initializePaths();
        } catch (error) {
            console.error('ModManager 초기화 오류:', error);
            // 기본 경로 설정
            this.modsDir = path.join(__dirname, 'profiles', 'default', 'mods');
        }
    }

    /**
     * 경로 초기화
     */
    initializePaths() {
        const os = require('os');
        const platform = os.platform();
        
        if (platform === 'win32') {
            this.minecraftDir = path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft');
        } else if (platform === 'darwin') {
            this.minecraftDir = path.join(os.homedir(), 'Library', 'Application Support', 'minecraft');
        } else {
            this.minecraftDir = path.join(os.homedir(), '.minecraft');
        }
        
        // 프로필 시스템 사용 - 현재 프로필의 모드 폴더 사용
        this.modsDir = this.profileManager.getCurrentModsPath();
    }

    /**
     * CurseForge API 요청
     */
    async apiRequest(endpoint, options = {}) {
        try {
            const response = await axios({
                method: options.method || 'GET',
                url: `${this.curseForgeAPI}${endpoint}`,
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                data: options.data
            });
            
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('CurseForge API 오류:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 모드 검색
     */
    async searchMods(query, categoryId = null, gameVersion = null) {
        try {
            let endpoint = `/mods/search?gameId=${this.minecraftGameId}&searchFilter=${encodeURIComponent(query)}`;
            
            if (categoryId) {
                endpoint += `&categoryId=${categoryId}`;
            }
            
            if (gameVersion) {
                endpoint += `&gameVersion=${gameVersion}`;
            }
            
            const result = await this.apiRequest(endpoint);
            
            if (result.success) {
                return {
                    success: true,
                    mods: result.data.data || []
                };
            }
            
            return result;
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 모드팩 정보 가져오기
     */
    async getModpack(modpackId) {
        try {
            const result = await this.apiRequest(`/mods/${modpackId}`);
            
            if (result.success) {
                return {
                    success: true,
                    modpack: result.data.data
                };
            }
            
            return result;
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 모드팩 파일 목록 가져오기
     */
    async getModpackFiles(modpackId, gameVersion = null) {
        try {
            let endpoint = `/mods/${modpackId}/files`;
            
            if (gameVersion) {
                endpoint += `?gameVersion=${gameVersion}`;
            }
            
            const result = await this.apiRequest(endpoint);
            
            if (result.success) {
                return {
                    success: true,
                    files: result.data.data || []
                };
            }
            
            return result;
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 모드 파일 다운로드
     */
    async downloadMod(modId, fileId, filename) {
        try {
            // 다운로드 URL 가져오기
            const urlResult = await this.apiRequest(`/mods/${modId}/files/${fileId}/download-url`);
            
            if (!urlResult.success) {
                throw new Error('다운로드 URL 획득 실패');
            }
            
            const downloadUrl = urlResult.data.data;
            
            // 모드 디렉토리 생성
            await fs.ensureDir(this.modsDir);
            
            // 파일 다운로드
            const response = await axios({
                method: 'GET',
                url: downloadUrl,
                responseType: 'stream'
            });
            
            const filePath = path.join(this.modsDir, filename);
            const writer = fs.createWriteStream(filePath);
            
            response.data.pipe(writer);
            
            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log(`✅ 모드 다운로드 완료: ${filename}`);
                    resolve({
                        success: true,
                        filePath: filePath
                    });
                });
                
                writer.on('error', (error) => {
                    console.error(`❌ 모드 다운로드 실패: ${filename}`, error);
                    reject({
                        success: false,
                        error: error.message
                    });
                });
            });
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 서버 모드팩 설치
     */
    async installServerModpack(modpackConfig) {
        try {
            console.log('🔧 서버 모드팩 설치 시작...');
            
            const results = [];
            
            for (const mod of modpackConfig.mods) {
                console.log(`📦 모드 설치 중: ${mod.name}`);
                
                const downloadResult = await this.downloadMod(
                    mod.modId, 
                    mod.fileId, 
                    mod.filename
                );
                
                results.push({
                    mod: mod.name,
                    success: downloadResult.success,
                    error: downloadResult.error
                });
                
                // 다운로드 간격 (API 제한 방지)
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;
            
            console.log(`✅ 모드팩 설치 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
            
            return {
                success: true,
                results: results,
                summary: {
                    total: results.length,
                    success: successCount,
                    failed: failCount
                }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Forge 설치
     */
    async installForge(minecraftVersion, forgeVersion) {
        try {
            console.log(`🔨 Forge 설치 시작: MC ${minecraftVersion}, Forge ${forgeVersion}`);
            
            // Forge 다운로드 URL 구성
            const forgeUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${minecraftVersion}-${forgeVersion}/forge-${minecraftVersion}-${forgeVersion}-installer.jar`;
            
            const installerPath = path.join(this.minecraftDir, 'forge-installer.jar');
            
            // Forge 설치 프로그램 다운로드
            const response = await axios({
                method: 'GET',
                url: forgeUrl,
                responseType: 'stream'
            });
            
            const writer = fs.createWriteStream(installerPath);
            response.data.pipe(writer);
            
            return new Promise((resolve, reject) => {
                writer.on('finish', async () => {
                    try {
                        console.log('🔨 Forge 설치 프로그램 실행...');
                        
                        // Forge 설치 실행
                        const child = spawn('java', [
                            '-jar', installerPath,
                            '--installClient'
                        ], {
                            cwd: this.minecraftDir,
                            stdio: 'pipe'
                        });
                        
                        child.on('close', (code) => {
                            if (code === 0) {
                                console.log('✅ Forge 설치 완료');
                                fs.remove(installerPath); // 설치 파일 정리
                                resolve({
                                    success: true,
                                    message: 'Forge 설치 완료'
                                });
                            } else {
                                reject({
                                    success: false,
                                    error: `Forge 설치 실패 (코드: ${code})`
                                });
                            }
                        });
                        
                    } catch (error) {
                        reject({
                            success: false,
                            error: error.message
                        });
                    }
                });
                
                writer.on('error', reject);
            });
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 설치된 모드 목록 확인
     */
    async getInstalledMods() {
        try {
            if (!await fs.pathExists(this.modsDir)) {
                return {
                    success: true,
                    mods: []
                };
            }
            
            const files = await fs.readdir(this.modsDir);
            const modFiles = files.filter(file => file.endsWith('.jar'));
            
            return {
                success: true,
                mods: modFiles.map(file => ({
                    filename: file,
                    path: path.join(this.modsDir, file)
                }))
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 모드 제거
     */
    async removeMod(filename) {
        try {
            const modPath = path.join(this.modsDir, filename);
            
            if (await fs.pathExists(modPath)) {
                await fs.remove(modPath);
                console.log(`🗑️ 모드 제거 완료: ${filename}`);
                return {
                    success: true,
                    message: `모드 제거 완료: ${filename}`
                };
            } else {
                return {
                    success: false,
                    error: '모드 파일을 찾을 수 없습니다'
                };
            }
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 프로필 변경 시 모드 경로 업데이트
     */
    updateModsPath(profileId = null) {
        try {
            if (profileId) {
                this.modsDir = this.profileManager.getProfileModsPath(profileId);
            } else {
                this.modsDir = this.profileManager.getCurrentModsPath();
            }
            console.log(`📁 모드 경로 업데이트: ${this.modsDir}`);
        } catch (error) {
            console.error('모드 경로 업데이트 오류:', error);
            // 기본 경로 설정
            this.modsDir = path.join(__dirname, 'profiles', 'default', 'mods');
        }
    }

    /**
     * 프로필 매니저 가져오기
     */
    getProfileManager() {
        return this.profileManager;
    }
}

module.exports = ModManager; 