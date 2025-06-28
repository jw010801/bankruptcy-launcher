const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const os = require('os');
const MinecraftAuth = require('./minecraft-auth');
const ModManager = require('./mod-manager');
const FabricInstaller = require('./fabric-installer');

let mainWindow;
let minecraftAuth;
let modManager;
let fabricInstaller;

// 콘솔 인코딩 설정 (Windows 한글 문제 해결)
if (process.platform === 'win32') {
    try {
        process.stdout.setEncoding('utf8');
        process.stderr.setEncoding('utf8');
    } catch (e) {
        // 인코딩 설정 실패는 무시
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

// 창 컨트롤 IPC 핸들러
ipcMain.handle('window-close', () => {
    if (mainWindow) {
        mainWindow.close();
    }
});

ipcMain.handle('window-minimize', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
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

// 마인크래프트 실행 관련 IPC 핸들러
ipcMain.handle('launch-minecraft', async (event, launchData) => {
    try {
        console.log('🚀 마인크래프트 실행 요청:', launchData);
        
        // 실제 마인크래프트 실행 로직은 여기에 구현
        // minecraft-launcher-core 등의 라이브러리 사용
        
        // 현재는 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
            success: true,
            message: '마인크래프트가 실행되었습니다'
        };
    } catch (error) {
        console.error('❌ 마인크래프트 실행 오류:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

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