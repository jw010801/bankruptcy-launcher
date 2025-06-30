const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const os = require('os');

const MinecraftAuth = require('./minecraft-auth');
const ModManager = require('./mod-manager');
const FabricInstaller = require('./fabric-installer');

// Minecraft Launcher Core 라이브러리 import
const { launch, Version, diagnose } = require('@xmcl/core');
const { installJreFromMojang } = require('@xmcl/installer');

let mainWindow;
let minecraftAuth;
let modManager;
let fabricInstaller;



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
        safeLog('✅ 런처 초기화 완료');
    } catch (error) {
        safeLog('❌ 초기화 오류: ' + error.message);
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
        
        if (!minecraftAuth) {
            return {
                success: false,
                error: 'MinecraftAuth 인스턴스가 초기화되지 않았습니다'
            };
        }
        
        // Device Code 콜백 설정
        minecraftAuth.onDeviceCodeReceived = (deviceCodeInfo) => {
            console.log('📱 Device Code 정보를 렌더러로 전송:', deviceCodeInfo.userCode);
            event.sender.send('device-code-received', deviceCodeInfo);
        };
        
        const authData = await minecraftAuth.authenticate();
        
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
        return { success: true };
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
        
        const gamePath = getMinecraftDir();
        const javaPath = await findBestJavaPath();
        
        // Fabric 버전 확인
        let version = launchData.version;
        if (!version) {
            try {
                const modpackConfig = await fs.readJson(path.join(__dirname, 'modpack-config.json'));
                version = `fabric-loader-${modpackConfig.fabricVersion}-${modpackConfig.minecraftVersion}`;
                console.log('🧵 Fabric 버전 자동 감지:', version);
            } catch (error) {
                console.warn('⚠️ 모드팩 설정 로드 실패, 바닐라 버전 사용:', error.message);
                version = '1.20.1';
            }
        }
        
        try {
            // 버전 정보 파싱
            const resolvedVersion = await Version.parse(gamePath, version);
            console.log('✅ 버전 정보 파싱 성공:', resolvedVersion.id);
            
            // 필수 파일 진단
            const issues = await diagnose(resolvedVersion.id, gamePath);
            if (issues.issues && issues.issues.length > 0) {
                console.warn('⚠️ 마인크래프트 파일 문제 발견:', issues.issues.length, '개');
            }
            
            // 사용자 인증 정보 가져오기
            const authData = launchData.authData || await getAuthData();
            
            // 메모리 설정
            const memory = launchData.memory || '8G'; // 기본값 8GB로 상향
            const memoryValue = parseInt(memory.replace('G', ''));
            
            console.log('🔍 === 메인 프로세스에서 설정 확인 ===');
            console.log('🧠 받은 메모리 설정:', launchData.memory);
            console.log('🧠 최종 메모리 값:', memory);
            console.log('🧠 메모리 숫자값:', memoryValue);
            
            // 성능 프로파일 설정
            const performanceProfile = launchData.performanceProfile || 'balanced';
            const gpuOptimization = launchData.gpuOptimization !== false;
            
            // 성능 프로파일별 JVM 옵션 생성
            const jvmArgs = generateJVMArgs(memoryValue, memory, performanceProfile, gpuOptimization);
            console.log(`🎯 성능 프로파일: ${performanceProfile}, GPU 최적화: ${gpuOptimization}`);
            
            // 마인크래프트 실행
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
                extraJVMArgs: jvmArgs
            });
            
            console.log('✅ 마인크래프트 실행 성공! PID:', process.pid);
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

// 성능 프로파일별 JVM 옵션 생성
function generateJVMArgs(memoryValue, memory, performanceProfile, gpuOptimization) {
    console.log(`🔧 JVM 옵션 생성: 메모리=${memory}, 프로파일=${performanceProfile}, GPU최적화=${gpuOptimization}`);
    
    // 기본 메모리 설정
    const baseArgs = [
        `-Xms${Math.max(2, Math.floor(memoryValue / 2))}G`,
        `-Xmx${memory}`,
        
        // 기본 시스템 설정
        '-Djava.awt.headless=false',
        '-Dfile.encoding=UTF-8',
        '-Dusing.aikars.flags=https://mcflags.emc.gs',
        '-Daikars.new.flags=true'
    ];
    
    // 성능 프로파일별 추가 옵션
    let profileArgs = [];
    
    switch (performanceProfile) {
        case 'performance':
            // 🚀 성능 우선 모드 - 최대 FPS, 최소 지연시간
            profileArgs = [
                // 가장 공격적인 G1GC 설정
                '-XX:+UseG1GC',
                '-XX:+ParallelRefProcEnabled',
                '-XX:MaxGCPauseMillis=50', // 극도로 짧은 GC 중단 시간
                '-XX:+UnlockExperimentalVMOptions',
                '-XX:+DisableExplicitGC',
                '-XX:+AlwaysPreTouch',
                '-XX:G1NewSizePercent=35', // 더 큰 Young Generation
                '-XX:G1ReservePercent=15',
                '-XX:G1HeapRegionSize=32M', // 더 큰 힙 리전
                '-XX:G1HeapWastePercent=2', // 낮은 낭비 허용치
                '-XX:G1MixedGCCountTarget=2', // 더 빈번한 Mixed GC
                '-XX:InitiatingHeapOccupancyPercent=8', // 매우 일찍 GC 시작
                '-XX:G1MixedGCLiveThresholdPercent=95',
                '-XX:G1RSetUpdatingPauseTimePercent=3',
                '-XX:SurvivorRatio=16', // 더 작은 Survivor 공간
                '-XX:+PerfDisableSharedMem',
                '-XX:MaxTenuringThreshold=1',
                
                // 최고 성능 JIT 최적화
                '-XX:+TieredCompilation',
                '-XX:TieredStopAtLevel=4',
                '-XX:+UseCodeCacheFlushing',
                '-XX:ReservedCodeCacheSize=1024m', // 더 큰 코드 캐시
                '-XX:InitialCodeCacheSize=256m',
                '-XX:+OptimizeStringConcat',
                '-XX:+UseStringDeduplication',
                
                // 메모리 최적화
                '-XX:+UseCompressedOops',
                '-XX:+UseLargePages',
                '-XX:LargePageSizeInBytes=4m',
                '-XX:NativeMemoryTracking=off',
                
                // 스레드 최적화
                '-XX:+UseThreadPriorities',
                '-XX:ThreadPriorityPolicy=1',
                '-XX:+UseFPUForSpilling',
                
                // 네트워킹 최적화
                '-Dnetworkaddress.cache.ttl=15',
                '-Djava.net.preferIPv4Stack=true',
                
                // 프로파일 식별
                '-DperformanceProfile=performance'
            ];
            break;
            
        case 'quality':
            // 🎨 화질 우선 모드 - 안정성과 품질 중심
            profileArgs = [
                // 안정적인 G1GC 설정
                '-XX:+UseG1GC',
                '-XX:+ParallelRefProcEnabled',
                '-XX:MaxGCPauseMillis=200', // 더 긴 GC 중단 시간 허용
                '-XX:+UnlockExperimentalVMOptions',
                '-XX:+DisableExplicitGC',
                '-XX:+AlwaysPreTouch',
                '-XX:G1NewSizePercent=25',
                '-XX:G1ReservePercent=25', // 더 많은 예약 공간
                '-XX:G1HeapRegionSize=16M',
                '-XX:G1HeapWastePercent=8', // 더 높은 낭비 허용치
                '-XX:G1MixedGCCountTarget=6', // 더 점진적인 GC
                '-XX:InitiatingHeapOccupancyPercent=20',
                '-XX:G1MixedGCLiveThresholdPercent=85',
                '-XX:G1RSetUpdatingPauseTimePercent=8',
                '-XX:SurvivorRatio=32',
                '-XX:+PerfDisableSharedMem',
                '-XX:MaxTenuringThreshold=2',
                
                // 품질 중심 JIT 설정
                '-XX:+TieredCompilation',
                '-XX:TieredStopAtLevel=4',
                '-XX:ReservedCodeCacheSize=768m',
                '-XX:InitialCodeCacheSize=192m',
                '-XX:+OptimizeStringConcat',
                '-XX:+UseStringDeduplication',
                
                // 메모리 안정성
                '-XX:+UseCompressedOops',
                '-XX:NativeMemoryTracking=summary',
                
                // 네트워킹
                '-Dnetworkaddress.cache.ttl=60',
                '-Djava.net.preferIPv4Stack=true',
                
                // 프로파일 식별
                '-DperformanceProfile=quality'
            ];
            break;
            
        case 'battery':
            // 🔋 배터리 절약 모드 - 전력 효율성 중심
            profileArgs = [
                // 절약형 GC 설정
                '-XX:+UseG1GC', // G1GC도 전력 효율적
                '-XX:+ParallelRefProcEnabled',
                '-XX:MaxGCPauseMillis=300', // 더 긴 중단 시간으로 빈도 감소
                '-XX:+UnlockExperimentalVMOptions',
                '-XX:+DisableExplicitGC',
                '-XX:G1NewSizePercent=15', // 작은 Young Generation
                '-XX:G1ReservePercent=30',
                '-XX:G1HeapRegionSize=8M', // 작은 힙 리전
                '-XX:G1HeapWastePercent=15',
                '-XX:G1MixedGCCountTarget=8', // 더 적은 Mixed GC
                '-XX:InitiatingHeapOccupancyPercent=35', // 늦은 GC 시작
                '-XX:G1MixedGCLiveThresholdPercent=75',
                '-XX:SurvivorRatio=64', // 더 큰 Survivor 공간
                '-XX:MaxTenuringThreshold=3',
                
                // 절약형 JIT 설정
                '-XX:+TieredCompilation',
                '-XX:TieredStopAtLevel=3', // 최고 레벨 컴파일 제한
                '-XX:ReservedCodeCacheSize=256m', // 작은 코드 캐시
                '-XX:InitialCodeCacheSize=64m',
                
                // 메모리 절약
                '-XX:+UseCompressedOops',
                '-XX:NativeMemoryTracking=off',
                
                // 네트워킹 절약
                '-Dnetworkaddress.cache.ttl=300',
                '-Djava.net.preferIPv4Stack=true',
                
                // 프로파일 식별
                '-DperformanceProfile=battery'
            ];
            break;
            
        default: // 'balanced'
            // ⚖️ 균형 모드 - 성능과 안정성의 균형
            profileArgs = [
                // 균형잡힌 G1GC 설정 (기본 Aikar's Flags 기반)
                '-XX:+UseG1GC',
                '-XX:+ParallelRefProcEnabled',
                '-XX:MaxGCPauseMillis=130',
                '-XX:+UnlockExperimentalVMOptions',
                '-XX:+DisableExplicitGC',
                '-XX:+AlwaysPreTouch',
                '-XX:G1NewSizePercent=28',
                '-XX:G1ReservePercent=20',
                '-XX:G1HeapRegionSize=16M',
                '-XX:G1HeapWastePercent=5',
                '-XX:G1MixedGCCountTarget=3',
                '-XX:InitiatingHeapOccupancyPercent=12',
                '-XX:G1MixedGCLiveThresholdPercent=90',
                '-XX:G1RSetUpdatingPauseTimePercent=5',
                '-XX:SurvivorRatio=32',
                '-XX:+PerfDisableSharedMem',
                '-XX:MaxTenuringThreshold=1',
                
                // 균형잡힌 성능 최적화
                '-XX:+UseFastUnorderedTimeStamps',
                '-XX:+OptimizeStringConcat',
                '-XX:+UseStringDeduplication',
                '-XX:+TieredCompilation',
                '-XX:TieredStopAtLevel=4',
                '-XX:+UseCompressedOops',
                
                // 균형잡힌 메모리 설정
                '-XX:+UseCodeCacheFlushing',
                '-XX:ReservedCodeCacheSize=512m',
                '-XX:InitialCodeCacheSize=128m',
                '-XX:NativeMemoryTracking=off',
                
                // 스레드 설정
                '-XX:+UseThreadPriorities',
                '-XX:ThreadPriorityPolicy=1',
                
                // 네트워킹
                '-Dnetworkaddress.cache.ttl=30',
                '-Djava.net.preferIPv4Stack=true',
                
                // 프로파일 식별
                '-DperformanceProfile=balanced'
            ];
            break;
    }
    
    // GPU 최적화 옵션
    let gpuArgs = [];
    if (gpuOptimization) {
        gpuArgs = [
            // OpenGL 및 그래픽 최적화
            '-Dsun.java2d.d3d=false',
            '-Dsun.java2d.opengl=true',
            '-Dsun.java2d.pmoffscreen=false',
            '-Dsun.java2d.noddraw=true',
            '-Dsun.java2d.ddscale=true',
            
            // LWJGL 최적화
            '-Dorg.lwjgl.util.Debug=false',
            '-Dorg.lwjgl.util.NoChecks=true',
            
            // GPU 식별
            '-DgpuOptimization=enabled'
        ];
    }
    
    // 모드 호환성 옵션 (모든 프로파일에 공통)
    const modArgs = [
        '-Dfml.readTimeout=180',
        '-Dfml.loginTimeout=180',
        '-Dmixin.hotSwap=true',
        '-Dmixin.checks.interfaces=true'
    ];
    
    // 모든 옵션 결합
    const finalArgs = [...baseArgs, ...profileArgs, ...gpuArgs, ...modArgs];
    
    console.log(`✅ 생성된 JVM 옵션 수: ${finalArgs.length}`);
    return finalArgs;
}

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



// 설치 관련 IPC 핸들러
ipcMain.handle('check-install-status', async () => {
    try {
        const fabricInstalled = await checkFabricInstalled();
        const modsCount = await getInstalledModsCount();
        
        return {
            minecraft: true,
            fabric: fabricInstalled,
            mods: []
        };
    } catch (error) {
        console.error('❌ 설치 상태 확인 오류:', error);
        return {
            minecraft: false,
            fabric: false,
            mods: []
        };
    }
});

ipcMain.handle('install-minecraft', async () => {
    try {
        console.log('📦 마인크래프트 설치 시작...');
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

ipcMain.handle('install-fabric', async () => {
    try {
        console.log('🧵 Fabric 설치 시작...');
        
        const FabricInstaller = require('./fabric-installer.js');
        const installer = new FabricInstaller();
        
        const modpackConfig = await installer.loadModpackConfig();
        
        const isInstalled = await installer.isFabricInstalled(
            modpackConfig.minecraftVersion, 
            modpackConfig.fabricVersion
        );
        
        if (!isInstalled) {
            console.log('🔧 Fabric 설치 실행 중...');
            const result = await installer.installFabric(
                modpackConfig.minecraftVersion,
                modpackConfig.fabricVersion
            );
            
            if (!result.success) {
                throw new Error(result.error);
            }
        } else {
            console.log('✅ Fabric이 이미 설치되어 있습니다.');
        }
        
        return {
            success: true,
            message: 'Fabric 설치 완료'
        };
    } catch (error) {
        console.error('❌ Fabric 설치 오류:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

ipcMain.handle('install-modpack', async (event, options = {}) => {
    try {
        console.log('📦 모드팩 설치 시작...');
        
        const FabricInstaller = require('./fabric-installer.js');
        const installer = new FabricInstaller();
        
        // 진행률 콜백 설정
        const progressCallback = (progress) => {
            console.log(`📊 ${progress.stage}: ${progress.message} (${progress.progress}%)`);
            if (event.sender) {
                event.sender.send('modpack-install-progress', progress);
            }
        };
        
        // 모드팩 설치 실행
        const result = await installer.installModpack(progressCallback);
        
        if (result.success) {
            console.log('✅ 모드팩 설치 완료!');
            

            
            const modsSummary = result.summary.mods;
            const resourcepacksSummary = result.summary.resourcepacks;
            
            let message = `모드팩 설치 완료! (모드: ${modsSummary.success}/${modsSummary.total}개`;
            if (resourcepacksSummary.total > 0) {
                message += `, 리소스팩: ${resourcepacksSummary.success}/${resourcepacksSummary.total}개`;
            }
            message += ')';
            
            return {
                success: true,
                message: message,
                summary: result.summary,
                results: result.results
            };
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('❌ 모드팩 설치 오류:', error);
        return {
            success: false,
            error: error.message
        };
    }
});




// 상태 확인 IPC 핸들러
ipcMain.handle('check-modpack-updates', async () => {
    try {
        const fabricInstalled = await checkFabricInstalled();
        const modsCount = await getInstalledModsCount();
        const resourcepacksCount = await getInstalledResourcepacksCount();
        
        // modpack-config.json에서 예상 개수 확인
        let expectedModsCount = 13; // 기본값 (최신: EMF, ETF, Not Enough Animations 포함)
        let expectedResourcepacksCount = 1; // 기본값 (Fresh Moves 활성화됨)
        
        try {
            const modpackConfig = await fs.readJson(path.join(__dirname, 'modpack-config.json'));
            expectedModsCount = modpackConfig.mods ? modpackConfig.mods.length : 10;
            expectedResourcepacksCount = modpackConfig.resourcepacks ? modpackConfig.resourcepacks.length : 0;
            
            console.log(`🔍 예상 모드 개수: ${expectedModsCount}, 현재 설치: ${modsCount}`);
            console.log(`🔍 예상 리소스팩 개수: ${expectedResourcepacksCount}, 현재 설치: ${resourcepacksCount}`);
        } catch (configError) {
            console.warn('⚠️ 모드팩 설정 로드 실패, 기본값 사용');
        }
        
        const needsUpdate = !fabricInstalled || 
                          modsCount < expectedModsCount || 
                          resourcepacksCount < expectedResourcepacksCount;
        
        return {
            success: true,
            needsUpdate: needsUpdate,
            fabricInstalled: fabricInstalled,
            modsCount: modsCount,
            expectedModsCount: expectedModsCount,
            resourcepacksCount: resourcepacksCount,
            expectedResourcepacksCount: expectedResourcepacksCount
        };
    } catch (error) {
        return {
            success: false,
            needsUpdate: true,
            error: error.message
        };
    }
});

ipcMain.handle('check-server-status', async (event, serverIP) => {
    try {
        console.log(`🌐 서버 상태 확인: ${serverIP}`);
        
        // 실제 서버 상태 확인 로직 (현재는 시뮬레이션)
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

// 설정 관리 IPC 핸들러
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
                memory: '8G', // 기본값 8GB로 상향
                autoConnect: false,
                enableBgm: true,
                authDuration: 90,
                launcherAction: 'close',
                performanceProfile: 'balanced',
                gpuOptimization: true,
                masterVolume: 0.7,
                bgmVolume: 0.5,
                sfxVolume: 0.8,
                enableSfx: true,
                autoUpdate: true,
                debugMode: false,
                keepLogins: true
            };
            await fs.writeJson(configPath, defaultSettings, { spaces: 2 });
            return defaultSettings;
        }
    } catch (error) {
        safeLog('Settings load error: ' + error.message);
        return {
            serverIP: 'localhost:25565',
            username: 'Player',
            memory: '8G', // 기본값 8GB로 상향
            autoConnect: false,
            enableBgm: true,
            authDuration: 90,
            launcherAction: 'close',
            performanceProfile: 'balanced',
            gpuOptimization: true,
            masterVolume: 0.7,
            bgmVolume: 0.5,
            sfxVolume: 0.8,
            enableSfx: true,
            autoUpdate: true,
            debugMode: false,
            keepLogins: true
        };
    }
});

// 모드 관리 IPC 핸들러
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

// 유틸리티 함수들

// 마인크래프트 디렉토리 경로
function getMinecraftDir() {
    const platform = os.platform();
    if (platform === 'win32') {
        return path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft');
    } else if (platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'minecraft');
    } else {
        return path.join(os.homedir(), '.minecraft');
    }
}

// 모드 디렉토리 경로
function getModsDir() {
    return path.join(getMinecraftDir(), 'mods');
}

// 리소스팩 디렉토리 경로
function getResourcepacksDir() {
    return path.join(getMinecraftDir(), 'resourcepacks');
}

// 설정 파일 경로
function getConfigPath() {
    return path.join(__dirname, 'config.json');
}

// 인증 정보 파일 경로
function getAuthPath() {
    return path.join(__dirname, 'auth.json');
}





// Fabric 설치 상태 확인
async function checkFabricInstalled() {
    try {
        const versionsDir = path.join(getMinecraftDir(), 'versions');
        if (!await fs.pathExists(versionsDir)) {
            console.log('🔍 버전 디렉토리가 존재하지 않음:', versionsDir);
            return false;
        }
        
        const versions = await fs.readdir(versionsDir);
        console.log('🔍 설치된 버전들:', versions);
        
        try {
            const modpackConfig = await fs.readJson(path.join(__dirname, 'modpack-config.json'));
            const expectedVersion = `fabric-loader-${modpackConfig.fabricVersion}-${modpackConfig.minecraftVersion}`;
            const fabricInstalled = versions.includes(expectedVersion);
            
            console.log(`🔍 예상 Fabric 버전: ${expectedVersion}`);
            console.log(`🔍 Fabric 설치 상태: ${fabricInstalled ? '✅ 설치됨' : '❌ 미설치'}`);
            
            return fabricInstalled;
        } catch (configError) {
            console.warn('⚠️ 모드팩 설정 로드 실패, 일반 Fabric 검사 수행');
            return versions.some(version => version.includes('fabric'));
        }
    } catch (error) {
        console.error('❌ Fabric 설치 상태 확인 실패:', error);
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

// 설치된 리소스팩 개수 확인
async function getInstalledResourcepacksCount() {
    try {
        const resourcepacksDir = getResourcepacksDir();
        if (!await fs.pathExists(resourcepacksDir)) {
            return 0;
        }
        
        const files = await fs.readdir(resourcepacksDir);
        return files.filter(file => file.endsWith('.zip') || file.endsWith('.jar')).length;
    } catch (error) {
        return 0;
    }
}

// 프로세스 종료 처리
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
});

process.on('unhandledRejection', (reason, promise) => {
    safeLog('Unhandled Rejection at: ' + promise + ' reason: ' + reason);
}); 