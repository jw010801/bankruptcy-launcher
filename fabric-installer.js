const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');
const os = require('os');

class FabricInstaller {
    constructor() {
        this.launcherDir = __dirname;
        this.modpackConfigPath = path.join(this.launcherDir, 'modpack-config.json');
        
        // 마인크래프트 디렉토리 설정
        const platform = os.platform();
        if (platform === 'win32') {
            this.minecraftDir = path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft');
        } else if (platform === 'darwin') {
            this.minecraftDir = path.join(os.homedir(), 'Library', 'Application Support', 'minecraft');
        } else {
            this.minecraftDir = path.join(os.homedir(), '.minecraft');
        }
        
        this.modsDir = path.join(this.minecraftDir, 'mods');
        this.versionsDir = path.join(this.minecraftDir, 'versions');
        
        console.log(`📁 마인크래프트 디렉토리: ${this.minecraftDir}`);
        console.log(`📦 모드 디렉토리: ${this.modsDir}`);
    }

    /**
     * 모드팩 설정 로드
     */
    async loadModpackConfig() {
        try {
            const config = await fs.readJson(this.modpackConfigPath);
            console.log(`📋 모드팩 설정 로드: ${config.name} v${config.version}`);
            return config;
        } catch (error) {
            throw new Error(`모드팩 설정 로드 실패: ${error.message}`);
        }
    }

    /**
     * Fabric 설치 여부 확인
     */
    async isFabricInstalled(minecraftVersion, fabricVersion) {
        try {
            const fabricVersionDir = path.join(this.versionsDir, `fabric-loader-${fabricVersion}-${minecraftVersion}`);
            return await fs.pathExists(fabricVersionDir);
        } catch (error) {
            return false;
        }
    }

    /**
     * Fabric 설치
     */
    async installFabric(minecraftVersion, fabricVersion) {
        try {
            console.log(`🧵 Fabric 설치 시작: MC ${minecraftVersion}, Fabric ${fabricVersion}`);
            
            // Fabric 설치 프로그램 다운로드
            const fabricInstallerUrl = 'https://maven.fabricmc.net/net/fabricmc/fabric-installer/0.11.2/fabric-installer-0.11.2.jar';
            const installerPath = path.join(this.launcherDir, 'fabric-installer.jar');
            
            console.log('📥 Fabric 설치 프로그램 다운로드 중...');
            const response = await axios({
                method: 'GET',
                url: fabricInstallerUrl,
                responseType: 'stream'
            });
            
            const writer = fs.createWriteStream(installerPath);
            response.data.pipe(writer);
            
            return new Promise((resolve, reject) => {
                writer.on('finish', async () => {
                    try {
                        console.log('🔧 Fabric 설치 실행 중...');
                        
                        // Fabric 설치 실행
                        const child = spawn('java', [
                            '-jar', installerPath,
                            'client',
                            '-mcversion', minecraftVersion,
                            '-loader', fabricVersion,
                            '-dir', this.minecraftDir
                        ], {
                            stdio: 'pipe'
                        });
                        
                        let output = '';
                        child.stdout.on('data', (data) => {
                            output += data.toString();
                        });
                        
                        child.stderr.on('data', (data) => {
                            output += data.toString();
                        });
                        
                        child.on('close', async (code) => {
                            // 설치 파일 정리
                            try {
                                await fs.remove(installerPath);
                            } catch (e) {
                                console.warn('설치 파일 정리 실패:', e.message);
                            }
                            
                            if (code === 0) {
                                console.log('✅ Fabric 설치 완료');
                                resolve({
                                    success: true,
                                    message: 'Fabric 설치 완료'
                                });
                            } else {
                                console.error('❌ Fabric 설치 실패:', output);
                                reject({
                                    success: false,
                                    error: `Fabric 설치 실패 (코드: ${code})\n${output}`
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
     * 모드 다운로드
     */
    async downloadMod(mod) {
        try {
            console.log(`📦 모드 다운로드 중: ${mod.name}`);
            
            const modPath = path.join(this.modsDir, mod.fileName);
            
            // 이미 존재하는 경우 스킵
            if (await fs.pathExists(modPath)) {
                console.log(`⏭️ 모드 이미 존재: ${mod.name}`);
                return {
                    success: true,
                    message: `모드 이미 존재: ${mod.name}`,
                    skipped: true
                };
            }
            
            // 모드 디렉토리 생성
            await fs.ensureDir(this.modsDir);
            
            // 모드 다운로드
            const response = await axios({
                method: 'GET',
                url: mod.downloadUrl,
                responseType: 'stream',
                timeout: 30000 // 30초 타임아웃
            });
            
            const writer = fs.createWriteStream(modPath);
            response.data.pipe(writer);
            
            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log(`✅ 모드 다운로드 완료: ${mod.name}`);
                    resolve({
                        success: true,
                        message: `모드 다운로드 완료: ${mod.name}`,
                        filePath: modPath
                    });
                });
                
                writer.on('error', (error) => {
                    console.error(`❌ 모드 다운로드 실패: ${mod.name}`, error);
                    reject({
                        success: false,
                        error: `모드 다운로드 실패: ${mod.name} - ${error.message}`
                    });
                });
            });
            
        } catch (error) {
            return {
                success: false,
                error: `모드 다운로드 실패: ${mod.name} - ${error.message}`
            };
        }
    }

    /**
     * 전체 모드팩 설치
     */
    async installModpack(progressCallback = null) {
        try {
            const config = await this.loadModpackConfig();
            const results = {
                fabricInstalled: false,
                modsInstalled: [],
                errors: []
            };
            
            // 진행률 콜백 호출
            if (progressCallback) {
                progressCallback({
                    stage: 'fabric',
                    message: 'Fabric 설치 확인 중...',
                    progress: 10
                });
            }
            
            // 1. Fabric 설치 확인 및 설치
            const fabricInstalled = await this.isFabricInstalled(config.minecraftVersion, config.fabricVersion);
            
            if (!fabricInstalled) {
                if (progressCallback) {
                    progressCallback({
                        stage: 'fabric',
                        message: 'Fabric 설치 중...',
                        progress: 20
                    });
                }
                
                const fabricResult = await this.installFabric(config.minecraftVersion, config.fabricVersion);
                if (!fabricResult.success) {
                    throw new Error(fabricResult.error);
                }
                results.fabricInstalled = true;
            } else {
                console.log('✅ Fabric 이미 설치됨');
                results.fabricInstalled = true;
            }
            
            // 2. 모드 설치
            if (progressCallback) {
                progressCallback({
                    stage: 'mods',
                    message: '모드 다운로드 시작...',
                    progress: 30
                });
            }
            
            const totalMods = config.mods.length;
            let installedCount = 0;
            
            for (const mod of config.mods) {
                try {
                    if (progressCallback) {
                        progressCallback({
                            stage: 'mods',
                            message: `${mod.name} 다운로드 중...`,
                            progress: 30 + (installedCount / totalMods) * 60
                        });
                    }
                    
                    const modResult = await this.downloadMod(mod);
                    results.modsInstalled.push({
                        name: mod.name,
                        success: modResult.success,
                        skipped: modResult.skipped || false,
                        message: modResult.message
                    });
                    
                    installedCount++;
                    
                    // 다운로드 간격 (서버 부하 방지)
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    console.error(`모드 설치 오류: ${mod.name}`, error);
                    results.errors.push(`${mod.name}: ${error.message}`);
                }
            }
            
            if (progressCallback) {
                progressCallback({
                    stage: 'complete',
                    message: '모드팩 설치 완료!',
                    progress: 100
                });
            }
            
            // 결과 요약
            const successCount = results.modsInstalled.filter(m => m.success).length;
            const skippedCount = results.modsInstalled.filter(m => m.skipped).length;
            const failedCount = results.modsInstalled.length - successCount;
            
            console.log(`📊 모드팩 설치 완료:`);
            console.log(`   ✅ 성공: ${successCount}개`);
            console.log(`   ⏭️ 스킵: ${skippedCount}개`);
            console.log(`   ❌ 실패: ${failedCount}개`);
            
            return {
                success: true,
                results: results,
                summary: {
                    total: totalMods,
                    success: successCount,
                    skipped: skippedCount,
                    failed: failedCount
                },
                config: config
            };
            
        } catch (error) {
            console.error('❌ 모드팩 설치 실패:', error);
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
     * 모드팩 정보 가져오기
     */
    async getModpackInfo() {
        try {
            const config = await this.loadModpackConfig();
            const installedMods = await this.getInstalledMods();
            const fabricInstalled = await this.isFabricInstalled(config.minecraftVersion, config.fabricVersion);
            
            return {
                success: true,
                config: config,
                fabricInstalled: fabricInstalled,
                installedModsCount: installedMods.success ? installedMods.mods.length : 0,
                totalModsCount: config.mods.length
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = FabricInstaller; 