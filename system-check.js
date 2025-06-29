const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

class SystemChecker {
    constructor() {
        this.diagnosticResults = {
            java: { status: 'unknown', details: {} },
            minecraft: { status: 'unknown', details: {} },
            fabric: { status: 'unknown', details: {} },
            system: { status: 'unknown', details: {} },
            overall: 'unknown'
        };
    }

    /**
     * 전체 시스템 진단 실행
     */
    async runFullDiagnostic() {
        console.log('🔍 시스템 환경 진단 시작...\n');

        try {
            // 각 항목별 진단 실행
            await this.checkJavaEnvironment();
            await this.checkMinecraftEnvironment();
            await this.checkFabricEnvironment();
            await this.checkSystemRequirements();

            // 전체 상태 결정
            this.determineOverallStatus();

            // 진단 결과 리포트 생성
            const report = this.generateDiagnosticReport();
            
            console.log('\n📋 진단 완료!');
            return {
                success: true,
                results: this.diagnosticResults,
                report: report,
                needsAction: this.diagnosticResults.overall !== 'good'
            };

        } catch (error) {
            console.error('❌ 시스템 진단 중 오류:', error);
            return {
                success: false,
                error: error.message,
                results: this.diagnosticResults
            };
        }
    }

    /**
     * Java 환경 확인
     */
    async checkJavaEnvironment() {
        console.log('☕ Java 환경 확인 중...');
        
        try {
            const javaInfo = await this.detectJavaInstallations();
            
            if (javaInfo.installations.length === 0) {
                this.diagnosticResults.java = {
                    status: 'missing',
                    details: {
                        message: 'Java가 설치되지 않았습니다',
                        action: 'Java 17 이상 설치 필요',
                        downloadUrl: 'https://adoptium.net/temurin/releases/?version=17'
                    }
                };
                console.log('❌ Java 설치되지 않음');
                return;
            }

            // 최적의 Java 버전 찾기
            const bestJava = this.findBestJavaVersion(javaInfo.installations);
            
            if (bestJava.version >= 17) {
                this.diagnosticResults.java = {
                    status: 'good',
                    details: {
                        version: bestJava.version,
                        path: bestJava.path,
                        architecture: bestJava.architecture,
                        message: `Java ${bestJava.version} (${bestJava.architecture}) 설치됨`
                    }
                };
                console.log(`✅ Java ${bestJava.version} (${bestJava.architecture}) 발견`);
            } else {
                this.diagnosticResults.java = {
                    status: 'outdated',
                    details: {
                        version: bestJava.version,
                        path: bestJava.path,
                        message: `Java ${bestJava.version}은 너무 오래된 버전입니다`,
                        action: 'Java 17 이상으로 업데이트 필요',
                        downloadUrl: 'https://adoptium.net/temurin/releases/?version=17'
                    }
                };
                console.log(`⚠️ Java ${bestJava.version} - 업데이트 필요`);
            }

        } catch (error) {
            this.diagnosticResults.java = {
                status: 'error',
                details: {
                    message: 'Java 확인 중 오류 발생',
                    error: error.message
                }
            };
            console.log('❌ Java 확인 실패:', error.message);
        }
    }

    /**
     * 마인크래프트 환경 확인
     */
    async checkMinecraftEnvironment() {
        console.log('🎮 마인크래프트 환경 확인 중...');

        try {
            const mcDir = this.getMinecraftDirectory();
            
            // .minecraft 디렉토리 존재 확인
            if (!await fs.pathExists(mcDir)) {
                this.diagnosticResults.minecraft = {
                    status: 'missing',
                    details: {
                        message: '마인크래프트가 설치되지 않았습니다',
                        expectedPath: mcDir,
                        action: '공식 마인크래프트 런처로 먼저 설치해주세요',
                        downloadUrl: 'https://www.minecraft.net/download'
                    }
                };
                console.log('❌ 마인크래프트 디렉토리 없음');
                return;
            }

            // 버전 디렉토리 확인
            const versionsDir = path.join(mcDir, 'versions');
            if (!await fs.pathExists(versionsDir)) {
                this.diagnosticResults.minecraft = {
                    status: 'incomplete',
                    details: {
                        message: '마인크래프트 버전 폴더가 없습니다',
                        action: '공식 런처에서 마인크래프트를 한 번 실행해주세요'
                    }
                };
                console.log('❌ 버전 폴더 없음');
                return;
            }

            // 설치된 버전들 확인
            const versions = await fs.readdir(versionsDir);
            const hasVanilla1201 = versions.includes('1.20.1');
            const fabricVersions = versions.filter(v => v.includes('fabric-loader') && v.includes('1.20.1'));

            this.diagnosticResults.minecraft = {
                status: hasVanilla1201 ? 'good' : 'missing_version',
                details: {
                    minecraftPath: mcDir,
                    totalVersions: versions.length,
                    hasVanilla1201: hasVanilla1201,
                    fabricVersions: fabricVersions,
                    message: hasVanilla1201 ? 
                        '마인크래프트 1.20.1 설치됨' : 
                        '마인크래프트 1.20.1 버전이 필요합니다',
                    action: hasVanilla1201 ? 
                        null : 
                        '공식 런처에서 마인크래프트 1.20.1을 설치해주세요'
                }
            };

            console.log(hasVanilla1201 ? '✅ 마인크래프트 1.20.1 설치됨' : '⚠️ 마인크래프트 1.20.1 필요');

        } catch (error) {
            this.diagnosticResults.minecraft = {
                status: 'error',
                details: {
                    message: '마인크래프트 확인 중 오류 발생',
                    error: error.message
                }
            };
            console.log('❌ 마인크래프트 확인 실패:', error.message);
        }
    }

    /**
     * Fabric 환경 확인
     */
    async checkFabricEnvironment() {
        console.log('🧵 Fabric 환경 확인 중...');

        try {
            const mcDir = this.getMinecraftDirectory();
            const versionsDir = path.join(mcDir, 'versions');

            if (!await fs.pathExists(versionsDir)) {
                this.diagnosticResults.fabric = {
                    status: 'missing',
                    details: {
                        message: 'Fabric을 설치할 수 없습니다 (마인크래프트 없음)',
                        action: '먼저 마인크래프트를 설치해주세요'
                    }
                };
                return;
            }

            const versions = await fs.readdir(versionsDir);
            const fabricVersions = versions.filter(v => v.includes('fabric-loader') && v.includes('1.20.1'));

            if (fabricVersions.length === 0) {
                this.diagnosticResults.fabric = {
                    status: 'missing',
                    details: {
                        message: 'Fabric이 설치되지 않았습니다',
                        action: '자동 설치 가능',
                        canAutoInstall: true,
                        recommendedVersion: 'fabric-loader-0.16.7-1.20.1'
                    }
                };
                console.log('❌ Fabric 설치되지 않음 - 자동 설치 가능');
            } else {
                const latestFabric = fabricVersions.sort((a, b) => b.localeCompare(a))[0];
                this.diagnosticResults.fabric = {
                    status: 'good',
                    details: {
                        installedVersion: latestFabric,
                        totalFabricVersions: fabricVersions.length,
                        message: `Fabric ${latestFabric} 설치됨`
                    }
                };
                console.log(`✅ Fabric ${latestFabric} 설치됨`);
            }

            // 모드 폴더 확인
            const modsDir = path.join(mcDir, 'mods');
            if (await fs.pathExists(modsDir)) {
                const modFiles = await fs.readdir(modsDir);
                const jarMods = modFiles.filter(f => f.endsWith('.jar'));
                this.diagnosticResults.fabric.details.modsCount = jarMods.length;
                console.log(`📦 설치된 모드: ${jarMods.length}개`);
            }

        } catch (error) {
            this.diagnosticResults.fabric = {
                status: 'error',
                details: {
                    message: 'Fabric 확인 중 오류 발생',
                    error: error.message
                }
            };
            console.log('❌ Fabric 확인 실패:', error.message);
        }
    }

    /**
     * 시스템 요구사항 확인
     */
    async checkSystemRequirements() {
        console.log('💻 시스템 요구사항 확인 중...');

        try {
            const systemInfo = {
                platform: os.platform(),
                arch: os.arch(),
                totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024), // GB
                freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024), // GB
                nodeVersion: process.version,
                userInfo: os.userInfo()
            };

            // 메모리 체크 (최소 4GB 권장)
            const memoryStatus = systemInfo.totalMemory >= 4 ? 'good' : 'low';
            
            // 권한 체크
            let permissionStatus = 'good';
            try {
                const mcDir = this.getMinecraftDirectory();
                await fs.ensureDir(path.join(mcDir, 'test-permission'));
                await fs.remove(path.join(mcDir, 'test-permission'));
            } catch (e) {
                permissionStatus = 'limited';
            }

            this.diagnosticResults.system = {
                status: (memoryStatus === 'good' && permissionStatus === 'good') ? 'good' : 'warning',
                details: {
                    ...systemInfo,
                    memoryStatus: memoryStatus,
                    permissions: permissionStatus,
                    message: `시스템: ${systemInfo.platform} ${systemInfo.arch}, RAM: ${systemInfo.totalMemory}GB`,
                    warnings: []
                }
            };

            if (memoryStatus === 'low') {
                this.diagnosticResults.system.details.warnings.push('메모리가 부족할 수 있습니다 (4GB 이상 권장)');
            }
            if (permissionStatus === 'limited') {
                this.diagnosticResults.system.details.warnings.push('마인크래프트 폴더 접근 권한이 제한될 수 있습니다');
            }

            console.log(`✅ 시스템: ${systemInfo.platform} ${systemInfo.arch}, RAM: ${systemInfo.totalMemory}GB`);

        } catch (error) {
            this.diagnosticResults.system = {
                status: 'error',
                details: {
                    message: '시스템 확인 중 오류 발생',
                    error: error.message
                }
            };
            console.log('❌ 시스템 확인 실패:', error.message);
        }
    }

    /**
     * Java 설치 감지 (향상된 버전)
     */
    async detectJavaInstallations() {
        const installations = [];
        const platform = os.platform();

        if (platform === 'win32') {
            // Windows Java 경로들
            const searchPaths = [
                'C:\\Program Files\\Java',
                'C:\\Program Files (x86)\\Java',
                'C:\\Program Files\\Eclipse Adoptium',
                'C:\\Program Files (x86)\\Eclipse Adoptium',
                'C:\\Program Files\\Microsoft\\jdk-17*',
                'C:\\Program Files\\Microsoft\\jdk-21*'
            ];

            for (const searchPath of searchPaths) {
                try {
                    if (searchPath.includes('*')) {
                        // 와일드카드 패턴 처리
                        const basePath = searchPath.replace('\\jdk-*', '');
                        if (await fs.pathExists(basePath)) {
                            const dirs = await fs.readdir(basePath);
                            for (const dir of dirs) {
                                if (dir.startsWith('jdk-')) {
                                    const javaPath = path.join(basePath, dir, 'bin', 'java.exe');
                                    if (await fs.pathExists(javaPath)) {
                                        const version = await this.getJavaVersion(javaPath);
                                        if (version) {
                                            installations.push({
                                                path: javaPath,
                                                version: version,
                                                architecture: await this.getJavaArchitecture(javaPath)
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        if (await fs.pathExists(searchPath)) {
                            const javaFolders = await fs.readdir(searchPath);
                            for (const folder of javaFolders) {
                                const javaPath = path.join(searchPath, folder, 'bin', 'java.exe');
                                if (await fs.pathExists(javaPath)) {
                                    const version = await this.getJavaVersion(javaPath);
                                    if (version) {
                                        installations.push({
                                            path: javaPath,
                                            version: version,
                                            architecture: await this.getJavaArchitecture(javaPath)
                                        });
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    // 경로 접근 실패는 무시
                }
            }

            // 환경변수 JAVA_HOME 확인
            if (process.env.JAVA_HOME) {
                const javaPath = path.join(process.env.JAVA_HOME, 'bin', 'java.exe');
                if (await fs.pathExists(javaPath)) {
                    const version = await this.getJavaVersion(javaPath);
                    if (version) {
                        installations.push({
                            path: javaPath,
                            version: version,
                            architecture: await this.getJavaArchitecture(javaPath),
                            source: 'JAVA_HOME'
                        });
                    }
                }
            }

            // 시스템 PATH에서 java 확인
            try {
                const version = await this.getJavaVersion('java');
                if (version) {
                    installations.push({
                        path: 'java',
                        version: version,
                        architecture: await this.getJavaArchitecture('java'),
                        source: 'PATH'
                    });
                }
            } catch (e) {
                // PATH에 java가 없으면 무시
            }
        }

        // 중복 제거
        const uniqueInstallations = installations.filter((installation, index, self) => 
            index === self.findIndex(i => i.path === installation.path)
        );

        return {
            installations: uniqueInstallations,
            count: uniqueInstallations.length
        };
    }

    /**
     * Java 버전 확인
     */
    async getJavaVersion(javaPath) {
        return new Promise((resolve) => {
            const child = spawn(javaPath, ['-version'], { stdio: 'pipe' });
            let output = '';
            
            child.stderr.on('data', (data) => {
                output += data.toString();
            });
            
            child.on('close', (code) => {
                if (code === 0) {
                    const match = output.match(/version "(.+?)"/);
                    if (match) {
                        const versionString = match[1];
                        // "1.8.0_291" -> 8, "17.0.1" -> 17
                        const majorVersion = versionString.startsWith('1.') ? 
                            parseInt(versionString.split('.')[1]) : 
                            parseInt(versionString.split('.')[0]);
                        resolve(majorVersion);
                    } else {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });
            
            child.on('error', () => {
                resolve(null);
            });
            
            // 5초 타임아웃
            setTimeout(() => {
                child.kill();
                resolve(null);
            }, 5000);
        });
    }

    /**
     * Java 아키텍처 확인
     */
    async getJavaArchitecture(javaPath) {
        return new Promise((resolve) => {
            const child = spawn(javaPath, ['-version'], { stdio: 'pipe' });
            let output = '';
            
            child.stderr.on('data', (data) => {
                output += data.toString();
            });
            
            child.on('close', (code) => {
                if (code === 0) {
                    if (output.includes('64-Bit')) {
                        resolve('64-bit');
                    } else if (output.includes('32-Bit') || output.includes('x86')) {
                        resolve('32-bit');
                    } else {
                        resolve('unknown');
                    }
                } else {
                    resolve('unknown');
                }
            });
            
            child.on('error', () => {
                resolve('unknown');
            });
            
            setTimeout(() => {
                child.kill();
                resolve('unknown');
            }, 5000);
        });
    }

    /**
     * 최적의 Java 버전 선택
     */
    findBestJavaVersion(installations) {
        if (installations.length === 0) return null;

        // 우선순위: 64비트 > 높은 버전 > JAVA_HOME/PATH
        const sorted = installations.sort((a, b) => {
            // 64비트 우선
            if (a.architecture === '64-bit' && b.architecture !== '64-bit') return -1;
            if (b.architecture === '64-bit' && a.architecture !== '64-bit') return 1;
            
            // 버전 높은 것 우선 (하지만 너무 높지 않게 - 21 이하)
            const aVersion = Math.min(a.version, 21);
            const bVersion = Math.min(b.version, 21);
            if (aVersion !== bVersion) return bVersion - aVersion;
            
            // 환경변수 설정된 것 우선
            if (a.source && !b.source) return -1;
            if (b.source && !a.source) return 1;
            
            return 0;
        });

        return sorted[0];
    }

    /**
     * 마인크래프트 디렉토리 경로
     */
    getMinecraftDirectory() {
        const platform = os.platform();
        if (platform === 'win32') {
            return path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft');
        } else if (platform === 'darwin') {
            return path.join(os.homedir(), 'Library', 'Application Support', 'minecraft');
        } else {
            return path.join(os.homedir(), '.minecraft');
        }
    }

    /**
     * 전체 상태 결정
     */
    determineOverallStatus() {
        const statuses = [
            this.diagnosticResults.java.status,
            this.diagnosticResults.minecraft.status,
            this.diagnosticResults.fabric.status,
            this.diagnosticResults.system.status
        ];

        if (statuses.includes('error') || statuses.includes('missing')) {
            this.diagnosticResults.overall = 'critical';
        } else if (statuses.includes('outdated') || statuses.includes('warning') || statuses.includes('incomplete')) {
            this.diagnosticResults.overall = 'warning';
        } else if (statuses.every(s => s === 'good')) {
            this.diagnosticResults.overall = 'good';
        } else {
            this.diagnosticResults.overall = 'warning';
        }
    }

    /**
     * 진단 리포트 생성
     */
    generateDiagnosticReport() {
        const report = {
            summary: this.getOverallSummary(),
            issues: [],
            recommendations: [],
            readyToPlay: this.diagnosticResults.overall === 'good'
        };

        // 각 항목별 문제점과 해결방안 추가
        Object.entries(this.diagnosticResults).forEach(([key, result]) => {
            if (key === 'overall') return;
            
            if (result.status !== 'good') {
                report.issues.push({
                    category: key,
                    status: result.status,
                    message: result.details.message,
                    action: result.details.action
                });
                
                if (result.details.action) {
                    report.recommendations.push({
                        category: key,
                        action: result.details.action,
                        downloadUrl: result.details.downloadUrl,
                        canAutoFix: result.details.canAutoInstall || false
                    });
                }
            }
        });

        return report;
    }

    /**
     * 전체 요약 메시지
     */
    getOverallSummary() {
        switch (this.diagnosticResults.overall) {
            case 'good':
                return '✅ 모든 환경이 정상입니다. 게임을 시작할 수 있습니다!';
            case 'warning':
                return '⚠️ 일부 설정이 필요합니다. 아래 권장사항을 확인해주세요.';
            case 'critical':
                return '❌ 필수 구성요소가 누락되었습니다. 설치가 필요합니다.';
            default:
                return '❓ 환경 상태를 확인할 수 없습니다.';
        }
    }
}

module.exports = SystemChecker; 