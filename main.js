const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const os = require('os');
const MinecraftAuth = require('./minecraft-auth');
const ModManager = require('./mod-manager');
const FabricInstaller = require('./fabric-installer');

// Minecraft Launcher Core 라이브러리 import (Context7 방식)
const { launch, Version, diagnose } = require('@xmcl/core');
const { installJreFromMojang } = require('@xmcl/installer');

let mainWindow;
let minecraftAuth;
let modManager;
let fabricInstaller;

// Windows 한글 인코딩 설정 (Electron 환경)
if (process.platform === 'win32') {
    try {
        // Windows 콘솔 코드페이지를 UTF-8으로 설정
        const { spawn } = require('child_process');
        spawn('chcp', ['65001'], { stdio: 'ignore' }).on('close', () => {
            console.log('✅ Windows UTF-8 인코딩 설정 완료');
        });
    } catch (e) {
        console.warn('⚠️ 인코딩 설정 실패:', e.message);
    }
}

// 안전한 로그 함수
function safeLog(message) {
    try {
        console.log(message);
    } catch (e) {
        // 로그 실패 시 무시
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        resizable: false,
        maximizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        show: false,
        titleBarStyle: 'hidden',
        frame: false
    });

    mainWindow.loadFile('index.html');
    
    // 윈도우가 준비되면 표시
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // 개발 모드에서는 DevTools 자동 열기
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools();
        }
    });

    // 윈도우 닫기 이벤트
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    try {
        createWindow();
        minecraftAuth = new MinecraftAuth();
        modManager = new ModManager();
        fabricInstaller = new FabricInstaller();
        safeLog('Launcher initialized successfully');
    } catch (error) {
        safeLog('Initialization error: ' + error.message);
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// 창 컨트롤 IPC 핸들러 (window-close는 아래에서 정의됨)

ipcMain.handle('window-minimize', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});



// 윈도우 종료
ipcMain.handle('window-close', () => {
    if (mainWindow) {
        mainWindow.close();
        return { success: true, message: '윈도우 종료됨' };
    }
    return { success: false, error: '윈도우가 없습니다' };
});



// 외부 URL 열기
ipcMain.on('open-external-url', (event, url) => {
    shell.openExternal(url);
});

// Microsoft 인증 관련 IPC 핸들러
ipcMain.handle('microsoft-login', async (event) => {
    try {
        console.log('🔐 Microsoft 로그인 요청 수신');
        console.log('📋 minecraftAuth 인스턴스 상태:', !!minecraftAuth);
        
        if (!minecraftAuth) {
            console.error('❌ MinecraftAuth 인스턴스가 없습니다');
            return {
                success: false,
                error: 'MinecraftAuth 인스턴스가 초기화되지 않았습니다'
            };
        }
        
        // Device Code 콜백 설정 (UI에 실시간 전달)
        minecraftAuth.onDeviceCodeReceived = (deviceCodeInfo) => {
            console.log('📱 Device Code 정보를 렌더러로 전송:', deviceCodeInfo.userCode);
            event.sender.send('device-code-received', deviceCodeInfo);
        };
        
        console.log('🚀 Microsoft 인증 시작...');
        const authData = await minecraftAuth.authenticate();
        console.log('📋 인증 결과:', authData ? '성공' : '실패');
        
        if (authData && authData.success) {
            console.log('✅ Microsoft 인증 성공:', authData.data?.profile?.name || '알 수 없음');
            return {
                success: true,
                authData: authData
            };
        } else {
            console.log('❌ Microsoft 인증 실패:', authData?.error || '알 수 없는 오류');
            return {
                success: false,
                error: authData?.error || '인증에 실패했습니다'
            };
        }
    } catch (error) {
        console.error('❌ Microsoft 인증 오류:', error);
        console.error('❌ 에러 스택:', error.stack);
        return {
            success: false,
            error: error.message
        };
    }
});

ipcMain.handle('microsoft-logout', async () => {
    try {
        console.log('🚪 Microsoft 로그아웃 요청 수신');
        await minecraftAuth.logout();
        
        return {
            success: true
        };
    } catch (error) {
        console.error('❌ Microsoft 로그아웃 오류:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

ipcMain.handle('load-saved-auth', async () => {
    try {
        const authData = await minecraftAuth.loadSavedAuth();
        
        if (authData && minecraftAuth.isAuthValid(authData)) {
            return {
                success: true,
                authData: authData
            };
        } else {
            return {
                success: false,
                error: '저장된 인증 정보가 없거나 만료되었습니다'
            };
        }
    } catch (error) {
        console.error('❌ 저장된 인증 정보 로드 오류:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// 마인크래프트 실행 관련 IPC 핸들러 (minecraft-launcher-core-node 사용)
ipcMain.handle('launch-minecraft', async (event, launchData) => {
    try {
        console.log('🚀 마인크래프트 실행 요청:', launchData);
        
        // 마인크래프트 경로 (Context7 방식: 문자열로 직접 사용)
        const gamePath = getMinecraftDir();
        console.log('📍 마인크래프트 디렉토리:', gamePath);
        
        // Java 경로 자동 감지
        const javaPath = await findBestJavaPath();
        console.log('☕ Java 경로:', javaPath);
        
        // 버전 확인 (기본값: 1.20.1)
        const version = launchData.version || '1.20.1';
        console.log('🎮 실행할 버전:', version);
        
        try {
            // 버전 정보 파싱 (Context7 방식: 경로를 문자열로 전달)
            const resolvedVersion = await Version.parse(gamePath, version);
            console.log('✅ 버전 정보 파싱 성공:', resolvedVersion.id);
            
            // 필수 파일 진단 (Context7 방식)
            const issues = await diagnose(resolvedVersion.id, gamePath);
            if (issues.issues && issues.issues.length > 0) {
                console.warn('⚠️ 마인크래프트 파일 문제 발견:', issues.issues.length, '개');
                for (const issue of issues.issues) {
                    console.warn(`  - ${issue.role}: ${issue.file || 'Unknown'}`);
                }
            }
            
            // 사용자 인증 정보 가져오기
            const authData = launchData.authData || await getAuthData();
            
            // 마인크래프트 실행 (Context7 방식: 단순화된 옵션)
            console.log('🚀 마인크래프트 실행 중...');
            const process = await launch({
                gamePath: gamePath,
                javaPath: javaPath,
                version: resolvedVersion.id,
                gameProfile: authData.profile || {
                    name: authData.username || 'Player',
                    id: authData.uuid || '00000000-0000-0000-0000-000000000000'
                },
                accessToken: authData.accessToken || '',
                server: launchData.autoConnect && launchData.serverIP ? {
                    ip: launchData.serverIP.split(':')[0],
                    port: parseInt(launchData.serverIP.split(':')[1] || '25565')
                } : undefined,
                extraExecOption: {
                    detached: true
                },
                extraJVMArgs: [
                    '-Xms1G',
                    '-Xmx2G'
                ]
            });
            
            console.log('✅ 마인크래프트 실행 성공! PID:', process.pid);
            
            // 프로세스 분리 (런처와 독립적으로 실행)
            process.unref();
            
            return {
                success: true,
                message: `마인크래프트가 성공적으로 실행되었습니다! ${launchData.autoConnect ? `서버 ${launchData.serverIP}에 자동 접속합니다.` : ''}`,
                debug: {
                    method: 'minecraft-launcher-core',
                    version: resolvedVersion.id,
                    javaPath,
                    minecraftPath: gamePath,
                    processId: process.pid,
                    authUser: authData.username || 'Player'
                }
            };
            
        } catch (versionError) {
            console.error('❌ 버전 파싱 실패:', versionError.message);
            
            // 마인크래프트가 설치되지 않은 경우 안내
            if (versionError.message.includes('not found') || versionError.message.includes('ENOENT')) {
                return {
                    success: false,
                    error: `마인크래프트 ${version} 버전이 설치되지 않았습니다. 공식 런처에서 먼저 해당 버전을 설치해주세요.`,
                    debug: {
                        method: 'minecraft-launcher-core',
                        error: 'Version not installed',
                        version,
                        minecraftPath: gamePath
                    }
                };
            }
            
            throw versionError;
        }
        
    } catch (error) {
        console.error('❌ 마인크래프트 실행 오류:', error);
        return {
            success: false,
            error: `마인크래프트 실행 실패: ${error.message}`,
            debug: {
                method: 'minecraft-launcher-core',
                error: error.message,
                stack: error.stack
            }
        };
    }
});

// 최적의 Java 경로 찾기 (시스템 아키텍처 고려)
async function findBestJavaPath() {
    const platform = os.platform();
    const arch = os.arch(); // 'x64', 'x32', 'arm64' 등
    
    if (platform === 'win32') {
        console.log(`🔍 시스템 아키텍처 감지: ${arch}`);
        
        // 64비트 시스템인지 확인
        const is64Bit = arch === 'x64' || process.env.PROCESSOR_ARCHITEW6432 || 
                       process.env.PROCESSOR_ARCHITECTURE === 'AMD64';
        
        console.log(`💻 64비트 시스템: ${is64Bit ? '예' : '아니오'}`);
        
        let candidates = [];
        
        if (is64Bit) {
            // 64비트 시스템: 64비트 Java 우선, 32비트 Java는 폴백
            candidates = [
                // 64비트 Java (우선순위)
                "C:\\Program Files\\Java\\jdk-21\\bin\\java.exe",
                "C:\\Program Files\\Java\\jdk-17\\bin\\java.exe", 
                "C:\\Program Files\\Java\\jdk-11\\bin\\java.exe",
                "C:\\Program Files\\Java\\jre-8\\bin\\java.exe",
                "C:\\Program Files\\Java\\jdk1.8.0_*\\bin\\java.exe", // 와일드카드 패턴
                
                // 32비트 Java (폴백)
                "C:\\Program Files (x86)\\Java\\jdk-21\\bin\\java.exe",
                "C:\\Program Files (x86)\\Java\\jdk-17\\bin\\java.exe",
                "C:\\Program Files (x86)\\Java\\jdk-11\\bin\\java.exe",
                "C:\\Program Files (x86)\\Java\\jre-8\\bin\\java.exe",
                "C:\\Program Files (x86)\\Java\\jdk1.8.0_*\\bin\\java.exe",
                
                // 환경 변수
                path.join(process.env.JAVA_HOME || '', 'bin', 'java.exe'),
                
                // 시스템 PATH
                'java'
            ];
        } else {
            // 32비트 시스템: 32비트 Java만 사용
            candidates = [
                "C:\\Program Files\\Java\\jdk-21\\bin\\java.exe",
                "C:\\Program Files\\Java\\jdk-17\\bin\\java.exe", 
                "C:\\Program Files\\Java\\jdk-11\\bin\\java.exe",
                "C:\\Program Files\\Java\\jre-8\\bin\\java.exe",
                path.join(process.env.JAVA_HOME || '', 'bin', 'java.exe'),
                'java'
            ];
        }
        
        // 와일드카드 패턴 확장
        const expandedCandidates = [];
        for (const candidate of candidates) {
            if (candidate.includes('*')) {
                try {
                    const basePath = candidate.replace(/\\[^\\]*\*[^\\]*$/, '');
                    const files = await fs.readdir(basePath);
                    for (const file of files) {
                        if (file.startsWith('jdk1.8.0_')) {
                            expandedCandidates.push(path.join(basePath, file, 'bin', 'java.exe'));
                        }
                    }
                } catch (e) {
                    // 디렉토리가 없으면 무시
                }
            } else {
                expandedCandidates.push(candidate);
            }
        }
        
        // Java 경로 검색
        for (const candidate of expandedCandidates) {
            if (candidate === 'java') {
                // PATH에서 java 확인
                try {
                    const { execSync } = require('child_process');
                    const result = execSync('where java', { encoding: 'utf8', timeout: 5000 });
                    if (result.trim()) {
                        const javaPath = result.trim().split('\n')[0];
                        console.log('☕ PATH에서 Java 발견:', javaPath);
                        return 'java';
                    }
                } catch (e) {
                    continue;
                }
            } else if (await fs.pathExists(candidate)) {
                // Java 버전 확인
                try {
                    const { execSync } = require('child_process');
                    const versionOutput = execSync(`"${candidate}" -version`, { 
                        encoding: 'utf8', 
                        timeout: 5000,
                        stdio: ['pipe', 'pipe', 'pipe']
                    });
                    const arch_info = is64Bit && candidate.includes('Program Files\\Java') ? '64비트' : 
                                     candidate.includes('Program Files (x86)') ? '32비트' : '알 수 없음';
                    console.log(`☕ Java 발견 (${arch_info}):`, candidate);
                    return candidate;
                } catch (e) {
                    console.warn(`⚠️ Java 실행 확인 실패: ${candidate}`);
                    continue;
                }
            }
        }
    } else {
        // macOS/Linux - 아키텍처별 경로
        const candidates = [
            '/usr/lib/jvm/java-21-openjdk/bin/java',
            '/usr/lib/jvm/java-17-openjdk/bin/java',
            '/usr/lib/jvm/java-11-openjdk/bin/java',
            '/usr/lib/jvm/java-8-openjdk/bin/java',
            '/System/Library/Frameworks/JavaVM.framework/Versions/Current/Commands/java', // macOS
            '/usr/bin/java',
            'java'
        ];
        
        for (const candidate of candidates) {
            if (candidate === 'java') {
                return 'java'; // 시스템 PATH 사용
            } else if (await fs.pathExists(candidate)) {
                console.log('☕ Java 발견:', candidate);
                return candidate;
            }
        }
    }
    
    const archInfo = platform === 'win32' && (arch === 'x64' || process.env.PROCESSOR_ARCHITEW6432 || 
                     process.env.PROCESSOR_ARCHITECTURE === 'AMD64') ? '64비트 ' : '';
    throw new Error(`Java를 찾을 수 없습니다. ${archInfo}Java 8 이상을 설치해주세요.`);
}

// 인증 정보 가져오기
async function getAuthData() {
    try {
        // Microsoft 인증 정보 로드
        if (minecraftAuth) {
            const savedAuth = await minecraftAuth.loadSavedAuth();
            if (savedAuth && minecraftAuth.isAuthValid(savedAuth)) {
                return {
                    username: savedAuth.data?.profile?.name || 'Player',
                    uuid: savedAuth.data?.profile?.id || '00000000-0000-0000-0000-000000000000',
                    accessToken: savedAuth.data?.accessToken || '',
                    profile: savedAuth.data?.profile
                };
            }
        }
        
        // 오프라인 모드 폴백
        return {
            username: 'Player',
            uuid: '00000000-0000-0000-0000-000000000000',
            accessToken: '',
            profile: {
                name: 'Player',
                id: '00000000-0000-0000-0000-000000000000'
            }
        };
    } catch (error) {
        console.warn('⚠️ 인증 정보 로드 실패, 오프라인 모드 사용:', error.message);
        return {
            username: 'Player',
            uuid: '00000000-0000-0000-0000-000000000000',
            accessToken: '',
            profile: {
                name: 'Player',
                id: '00000000-0000-0000-0000-000000000000'
            }
        };
    }
}

// 레거시 Java 경로 찾기 (호환성을 위해 유지)
async function findJavaPath() {
    try {
        return await findBestJavaPath();
    } catch (error) {
        // 설치된 Java 21 사용 (폴백)
        const java21Path = "C:\\Program Files\\Java\\jdk-21\\bin\\java.exe";
        if (await fs.pathExists(java21Path)) {
            return java21Path;
        }
        
        // 시스템 Java 사용
        return 'java';
    }
}



ipcMain.handle('check-install-status', async () => {
    try {
        // 실제 설치 상태 확인 로직
        // 현재는 시뮬레이션
        return {
            minecraft: true,
            forge: true,
            mods: []
        };
    } catch (error) {
        console.error('❌ 설치 상태 확인 오류:', error);
        return {
            minecraft: false,
            forge: false,
            mods: []
        };
    }
});

ipcMain.handle('install-minecraft', async () => {
    try {
        console.log('📦 마인크래프트 설치 시작...');
        
        // 실제 설치 로직
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return {
            success: true,
            message: '마인크래프트 설치 완료'
        };
    } catch (error) {
        console.error('❌ 마인크래프트 설치 오류:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

ipcMain.handle('install-forge', async () => {
    try {
        console.log('🔨 Forge 설치 시작...');
        
        // 실제 Forge 설치 로직
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
            success: true,
            message: 'Forge 설치 완료'
        };
    } catch (error) {
        console.error('❌ Forge 설치 오류:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// 서버 상태 확인
ipcMain.handle('check-server-status', async (event, serverIP) => {
    try {
        console.log(`🌐 서버 상태 확인: ${serverIP}`);
        
        // 실제 서버 상태 확인 로직
        // 현재는 시뮬레이션
        const isOnline = Math.random() > 0.3;
        
        if (isOnline) {
            return {
                online: true,
                players: {
                    online: Math.floor(Math.random() * 15) + 1,
                    max: 20
                },
                latency: Math.floor(Math.random() * 100) + 20
            };
        } else {
            return {
                online: false,
                error: '서버에 연결할 수 없습니다'
            };
        }
    } catch (error) {
        console.error('❌ 서버 상태 확인 오류:', error);
        return {
            online: false,
            error: error.message
        };
    }
});

// 마인크래프트 디렉토리 찾기
function getMinecraftDir() {
    const platform = os.platform();
    let mcDir;
    
    if (platform === 'win32') {
        mcDir = path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft');
    } else if (platform === 'darwin') {
        mcDir = path.join(os.homedir(), 'Library', 'Application Support', 'minecraft');
    } else {
        mcDir = path.join(os.homedir(), '.minecraft');
    }
    
    return mcDir;
}

// 모드 디렉토리 찾기
function getModsDir() {
    return path.join(getMinecraftDir(), 'mods');
}

// 설정 파일 경로
function getConfigPath() {
    return path.join(__dirname, 'config.json');
}

// 인증 정보 파일 경로
function getAuthPath() {
    return path.join(__dirname, 'auth.json');
}

// 설정 저장
ipcMain.handle('save-settings', async (event, settings) => {
    try {
        const configPath = getConfigPath();
        await fs.writeJson(configPath, settings, { spaces: 2 });
        return { success: true };
    } catch (error) {
        safeLog('Settings save error: ' + error.message);
        return { success: false, error: error.message };
    }
});

// 설정 로드
ipcMain.handle('load-settings', async () => {
    try {
        const configPath = getConfigPath();
        
        if (await fs.pathExists(configPath)) {
            const settings = await fs.readJson(configPath);
            return settings;
        } else {
            // 기본 설정
            const defaultSettings = {
                serverIP: 'localhost:25565',
                username: 'Player',
                memory: '2G',
                autoConnect: false,
                enableBgm: true,
                authDuration: 14 // 기본값: 2주
            };
            await fs.writeJson(configPath, defaultSettings, { spaces: 2 });
            return defaultSettings;
        }
    } catch (error) {
        safeLog('Settings load error: ' + error.message);
        return {
            serverIP: 'localhost:25565',
            username: 'Player',
            memory: '2G',
            autoConnect: false,
            enableBgm: true,
            authDuration: 14
        };
    }
});

// 모드팩 업데이트 확인
ipcMain.handle('check-modpack-updates', async () => {
    try {
        // 간단한 업데이트 확인 로직
        const fabricInstalled = await checkFabricInstalled();
        const modsCount = await getInstalledModsCount();
        
        // Fabric이 없거나 모드가 5개 미만이면 업데이트 필요
        const needsUpdate = !fabricInstalled || modsCount < 5;
        
        return {
            success: true,
            needsUpdate: needsUpdate,
            fabricInstalled: fabricInstalled,
            modsCount: modsCount
        };
    } catch (error) {
        return {
            success: false,
            needsUpdate: true, // 오류 시 업데이트 필요로 가정
            error: error.message
        };
    }
});

// Fabric 설치 상태 확인
async function checkFabricInstalled() {
    try {
        const versionsDir = path.join(getMinecraftDir(), 'versions');
        if (!await fs.pathExists(versionsDir)) {
            return false;
        }
        
        const versions = await fs.readdir(versionsDir);
        return versions.some(version => version.includes('fabric'));
    } catch (error) {
        return false;
    }
}

// 설치된 모드 개수 확인
async function getInstalledModsCount() {
    try {
        const modsDir = getModsDir();
        if (!await fs.pathExists(modsDir)) {
            return 0;
        }
        
        const files = await fs.readdir(modsDir);
        return files.filter(file => file.endsWith('.jar')).length;
    } catch (error) {
        return 0;
    }
}

// 모드 제거
ipcMain.handle('remove-mod', async (event, filename) => {
    try {
        const modPath = path.join(getModsDir(), filename);
        
        if (await fs.pathExists(modPath)) {
            await fs.remove(modPath);
            return {
                success: true,
                message: `${filename} removed successfully`
            };
        } else {
            return {
                success: false,
                error: 'Mod file not found'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});

// 모드 검색 (시뮬레이션)
ipcMain.handle('search-mods', async (event, query) => {
    try {
        // 실제로는 CurseForge API 또는 Modrinth API 사용
        const mockMods = [
            { id: 'sodium', name: 'Sodium', description: 'Modern rendering engine for Minecraft', downloads: 50000000 },
            { id: 'lithium', name: 'Lithium', description: 'Optimize game physics and mob AI', downloads: 30000000 },
            { id: 'iris', name: 'Iris Shaders', description: 'Shader support for Fabric', downloads: 20000000 },
            { id: 'journeymap', name: 'JourneyMap', description: 'Real-time map mod', downloads: 15000000 },
            { id: 'rei', name: 'Roughly Enough Items', description: 'Recipe viewer', downloads: 12000000 }
        ];
        
        const filteredMods = mockMods.filter(mod => 
            mod.name.toLowerCase().includes(query.toLowerCase()) ||
            mod.description.toLowerCase().includes(query.toLowerCase())
        );
        
        return {
            success: true,
            mods: filteredMods
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            mods: []
        };
    }
});

// 프로세스 종료 시 정리
process.on('exit', () => {
    safeLog('Application exiting...');
});

process.on('SIGINT', () => {
    safeLog('Received SIGINT, shutting down gracefully...');
    app.quit();
});

process.on('SIGTERM', () => {
    safeLog('Received SIGTERM, shutting down gracefully...');
    app.quit();
});

// 처리되지 않은 예외 처리
process.on('uncaughtException', (error) => {
    safeLog('Uncaught Exception: ' + error.message);
    // 앱을 종료하지 않고 계속 실행
});

process.on('unhandledRejection', (reason, promise) => {
    safeLog('Unhandled Rejection at: ' + promise + ' reason: ' + reason);
    // 앱을 종료하지 않고 계속 실행
}); 