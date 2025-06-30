const { PublicClientApplication } = require('@azure/msal-node');
const axios = require('axios');
const { shell } = require('electron');
const http = require('http');
const url = require('url');
const { Client } = require('@azure/msal-node');
const fs = require('fs').promises;
const path = require('path');

/**
 * 마인크래프트 Microsoft 인증 클래스
 * 전체 인증 플로우: Microsoft OAuth → Xbox Live → XSTS → Minecraft
 */
class MinecraftAuth {
    constructor() {
        // Microsoft Azure 앱 설정
        this.msalConfig = {
            auth: {
                clientId: "54fd49e4-2103-4044-9603-2b028c814ec3", // Mojang Studios 공식 Client ID
                authority: "https://login.microsoftonline.com/consumers"
            },
            cache: {
                cacheLocation: "localStorage"
            }
        };
        
        this.pca = new PublicClientApplication(this.msalConfig);
        this.currentAccount = null;
        this.clientId = '00000000402b5328'; // Minecraft Launcher Client ID
        this.redirectUri = 'https://login.live.com/oauth20_desktop.srf';
        this.authData = null;
        this.authFilePath = path.join(__dirname, 'auth.json');
    }

    /**
     * HTTP 서버를 시작하여 인증 콜백을 받습니다
     */
    startAuthServer(port = 53682) {
        return new Promise((resolve, reject) => {
            const server = http.createServer((req, res) => {
                const parsedUrl = url.parse(req.url, true);
                
                if (parsedUrl.pathname === '/') {
                    // 인증 성공 페이지
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`
                        <html>
                        <head><title>인증 완료</title></head>
                        <body style="font-family: Arial; text-align: center; padding: 50px;">
                            <h1>🎉 Microsoft 인증 완료!</h1>
                            <p>이 창을 닫고 런처로 돌아가세요.</p>
                            <script>
                                setTimeout(() => window.close(), 3000);
                            </script>
                        </body>
                        </html>
                    `);
                    
                    // 인증 코드가 있으면 처리
                    if (parsedUrl.query.code) {
                        resolve({
                            code: parsedUrl.query.code,
                            state: parsedUrl.query.state
                        });
                        server.close();
                    }
                } else {
                    res.writeHead(404);
                    res.end('Not Found');
                }
            });
            
            server.listen(port, 'localhost', () => {
                console.log(`🌐 인증 서버가 http://localhost:${port} 에서 시작되었습니다`);
            });
            
            server.on('error', (err) => {
                reject(err);
            });
        });
    }

    /**
     * 1단계: Microsoft OAuth2 인증 (Browser-based fallback)
     */
    async authenticateWithBrowser() {
        try {
            console.log('🌐 브라우저 기반 인증 시작...');
            
            // 로컬 서버 시작
            const serverPromise = this.startAuthServer();
            
            const authRequest = {
                scopes: ['XboxLive.signin', 'offline_access'],
                redirectUri: 'http://localhost:53682',
                openBrowser: async (authUrl) => {
                    console.log('🔗 브라우저에서 인증 URL 열기:', authUrl);
                    await shell.openExternal(authUrl);
                }
            };

            // Interactive 인증 시도
            const response = await this.pca.acquireTokenInteractive(authRequest);
            this.currentAccount = response.account;
            
            return {
                success: true,
                accessToken: response.accessToken,
                account: response.account
            };
            
        } catch (error) {
            console.error('브라우저 인증 실패:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 1단계: Microsoft OAuth2 인증 (Device Code Flow)
     */
    async authenticateWithMicrosoft() {
        try {
            console.log('🔄 Device Code Flow 시작...');
            console.log('📋 MSAL 설정:', this.msalConfig);
            console.log('📋 PCA 인스턴스 상태:', !!this.pca);
            
            const deviceCodeRequest = {
                scopes: ['XboxLive.signin', 'offline_access'],
                deviceCodeCallback: (response) => {
                    // 디버깅을 위한 전체 응답 로그
                    console.log('\n🔍 Device Code 응답 전체:', JSON.stringify(response, null, 2));
                    
                    // 사용자에게 표시할 디바이스 코드 정보
                    console.log('\n🔐 Microsoft 인증 안내:');
                    console.log(`브라우저에서 ${response.verificationUri || response.verification_uri} 로 이동하세요`);
                    console.log(`인증 코드: ${response.userCode || response.user_code}`);
                    console.log('또는 직접 링크를 클릭하세요:', response.verificationUriComplete || response.verification_uri_complete);
                    
                    // Device Code 정보를 전역 변수에 저장 (UI 업데이트용)
                    const userCode = response.userCode || response.user_code;
                    const verificationUri = response.verificationUri || response.verification_uri;
                    
                    // 렌더러 프로세스에서 접근할 수 있도록 저장
                    global.lastDeviceCode = userCode;
                    global.lastVerificationUri = verificationUri;
                    
                    console.log('📱 Device Code 전역 저장:', userCode);
                    
                    // 자동으로 브라우저 열기
                    const completeUri = response.verificationUriComplete || response.verification_uri_complete;
                    const baseUri = verificationUri;
                    
                    let urlToOpen = completeUri;
                    if (!urlToOpen && baseUri && userCode) {
                        // verificationUriComplete가 없으면 기본 URI 사용
                        urlToOpen = baseUri;
                        console.log('📋 기본 URI 사용:', urlToOpen);
                    }
                    
                    if (urlToOpen) {
                        console.log('🌐 브라우저 열기 시도:', urlToOpen);
                        try {
                            shell.openExternal(urlToOpen);
                            console.log('✅ 브라우저 열기 성공');
                            console.log('👆 브라우저에서 인증 코드를 입력하세요:', userCode);
                        } catch (shellError) {
                            console.error('❌ 브라우저 열기 실패:', shellError);
                        }
                    } else {
                        console.warn('⚠️ 브라우저를 열 수 있는 URI를 찾을 수 없음');
                        console.log('📋 수동 인증이 필요합니다:');
                        console.log(`1. 브라우저에서 ${baseUri} 로 이동`);
                        console.log(`2. 인증 코드 입력: ${userCode}`);
                    }
                    
                    // UI에 메시지 전달 (다양한 속성명 시도)
                    this.deviceCodeInfo = {
                        userCode: response.userCode || response.user_code,
                        verificationUri: response.verificationUri || response.verification_uri,
                        verificationUriComplete: response.verificationUriComplete || response.verification_uri_complete,
                        message: response.message
                    };
                    
                    // 콜백이 설정되어 있으면 호출
                    if (this.onDeviceCodeReceived) {
                        console.log('📞 Device Code 콜백 호출');
                        this.onDeviceCodeReceived(this.deviceCodeInfo);
                    }
                }
            };

            console.log('🔄 Device Code 요청 시작...');
            // Device Code 인증
            const response = await this.pca.acquireTokenByDeviceCode(deviceCodeRequest);
            console.log('✅ Device Code 인증 완료');
            console.log('📋 응답 계정:', response.account?.username || '알 수 없음');
            
            this.currentAccount = response.account;
            
            return {
                success: true,
                accessToken: response.accessToken,
                account: response.account
            };
        } catch (error) {
            console.error('❌ Microsoft 인증 실패:', error);
            console.error('❌ 에러 타입:', error.constructor.name);
            console.error('❌ 에러 세부사항:', {
                errorCode: error.errorCode,
                errorMessage: error.errorMessage,
                subError: error.subError,
                correlationId: error.correlationId,
                stack: error.stack
            });
            
            let userFriendlyError = error.message;
            if (error.errorCode === 'post_request_failed' && error.errorMessage.includes('invalid_grant')) {
                userFriendlyError = '인증이 만료되었거나 취소되었습니다. 다시 시도해주세요.';
            } else if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
                userFriendlyError = '네트워크 연결을 확인해주세요.';
            }
            
            return {
                success: false,
                error: userFriendlyError
            };
        }
    }

    /**
     * 2단계: Xbox Live 인증
     */
    async authenticateWithXboxLive(accessToken) {
        try {
            const response = await axios.post('https://user.auth.xboxlive.com/user/authenticate', {
                Properties: {
                    AuthMethod: "RPS",
                    SiteName: "user.auth.xboxlive.com",
                    RpsTicket: `d=${accessToken}`
                },
                RelyingParty: "http://auth.xboxlive.com",
                TokenType: "JWT"
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            return {
                success: true,
                token: response.data.Token,
                userHash: response.data.DisplayClaims.xui[0].uhs
            };
        } catch (error) {
            console.error('Xbox Live 인증 실패:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 3단계: XSTS Token 획득
     */
    async getXSTSToken(xblToken) {
        try {
            const response = await axios.post('https://xsts.auth.xboxlive.com/xsts/authorize', {
                Properties: {
                    SandboxId: "RETAIL",
                    UserTokens: [xblToken]
                },
                RelyingParty: "rp://api.minecraftservices.com/",
                TokenType: "JWT"
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            return {
                success: true,
                token: response.data.Token,
                userHash: response.data.DisplayClaims.xui[0].uhs
            };
        } catch (error) {
            console.error('XSTS Token 획득 실패:', error);
            
            // 특별한 에러 코드 처리
            if (error.response && error.response.data && error.response.data.XErr) {
                const xerr = error.response.data.XErr;
                let errorMessage = '알 수 없는 오류가 발생했습니다.';
                
                switch (xerr) {
                    case 2148916227:
                        errorMessage = '계정이 Xbox에서 차단되었습니다.';
                        break;
                    case 2148916233:
                        errorMessage = 'Xbox 계정이 없습니다. Xbox 계정을 먼저 생성해주세요.';
                        break;
                    case 2148916235:
                        errorMessage = 'Xbox Live를 사용할 수 없는 국가입니다.';
                        break;
                    case 2148916238:
                        errorMessage = '미성년자 계정입니다. 성인 계정으로 가족에 추가되어야 합니다.';
                        break;
                }
                
                return {
                    success: false,
                    error: errorMessage,
                    xerr: xerr
                };
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 4단계: Minecraft 인증
     */
    async authenticateWithMinecraft(xstsToken, userHash) {
        try {
            const response = await axios.post('https://api.minecraftservices.com/authentication/login_with_xbox', {
                identityToken: `XBL3.0 x=${userHash};${xstsToken}`
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            return {
                success: true,
                accessToken: response.data.access_token,
                tokenType: response.data.token_type,
                expiresIn: response.data.expires_in
            };
        } catch (error) {
            console.error('Minecraft 인증 실패:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 5단계: 게임 소유권 확인
     */
    async checkGameOwnership(mcAccessToken) {
        try {
            const response = await axios.get('https://api.minecraftservices.com/entitlements/mcstore', {
                headers: {
                    'Authorization': `Bearer ${mcAccessToken}`
                }
            });

            const hasMinecraft = response.data.items.some(item => 
                item.name === 'product_minecraft' || item.name === 'game_minecraft'
            );

            return {
                success: true,
                ownsGame: hasMinecraft,
                items: response.data.items
            };
        } catch (error) {
            console.error('게임 소유권 확인 실패:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 6단계: 플레이어 프로필 정보 획득
     */
    async getPlayerProfile(mcAccessToken) {
        try {
            const response = await axios.get('https://api.minecraftservices.com/minecraft/profile', {
                headers: {
                    'Authorization': `Bearer ${mcAccessToken}`
                }
            });

            return {
                success: true,
                profile: {
                    id: response.data.id,
                    name: response.data.name,
                    skins: response.data.skins || [],
                    capes: response.data.capes || []
                }
            };
        } catch (error) {
            console.error('플레이어 프로필 획득 실패:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 수동 토큰 입력 방식 (최후의 수단)
     */
    async authenticateManually() {
        console.log('\n🔧 수동 인증 방식 안내:');
        console.log('1. 브라우저에서 https://login.live.com/oauth20_authorize.srf 로 이동');
        console.log('2. 다음 파라미터들을 URL에 추가:');
        console.log('   client_id=54fd49e4-2103-4044-9603-2b028c814ec3');
        console.log('   response_type=code');
        console.log('   scope=XboxLive.signin%20offline_access');
        console.log('   redirect_uri=http://localhost:53682');
        console.log('3. 로그인 후 URL에서 code= 부분을 복사하여 런처에 입력하세요');
        
        return {
            success: false,
            error: '수동 인증이 필요합니다. 콘솔 안내를 따라주세요.'
        };
    }

    /**
     * 메인 인증 메서드 (main.js에서 호출)
     */
    async authenticate() {
        try {
            console.log('🔐 Microsoft 인증 시작...');
            
            // 1. Microsoft OAuth2 (Device Code 우선, 실패 시 Browser 방식)
            let msResult = await this.authenticateWithMicrosoft();
            if (!msResult.success) {
                console.log('⚠️ Device Code 인증 실패, Browser 방식으로 재시도...');
                msResult = await this.authenticateWithBrowser();
                if (!msResult.success) {
                    console.log('⚠️ Browser 인증도 실패, 수동 인증 안내 표시...');
                    msResult = await this.authenticateManually();
                    throw new Error(`모든 인증 방식 실패: ${msResult.error}`);
                }
            }
            
            console.log('✅ Microsoft 인증 성공');

            // 2. Xbox Live 인증
            const xblResult = await this.authenticateWithXboxLive(msResult.accessToken);
            if (!xblResult.success) {
                throw new Error(`Xbox Live 인증 실패: ${xblResult.error}`);
            }
            
            console.log('✅ Xbox Live 인증 성공');

            // 3. XSTS Token
            const xstsResult = await this.getXSTSToken(xblResult.token);
            if (!xstsResult.success) {
                throw new Error(`XSTS Token 획득 실패: ${xstsResult.error}`);
            }
            
            console.log('✅ XSTS Token 획득 성공');

            // 4. Minecraft 인증
            const mcResult = await this.authenticateWithMinecraft(xstsResult.token, xstsResult.userHash);
            if (!mcResult.success) {
                throw new Error(`Minecraft 인증 실패: ${mcResult.error}`);
            }
            
            console.log('✅ Minecraft 인증 성공');

            // 5. 게임 소유권 확인
            const ownershipResult = await this.checkGameOwnership(mcResult.accessToken);
            if (!ownershipResult.success) {
                throw new Error(`게임 소유권 확인 실패: ${ownershipResult.error}`);
            }
            
            if (!ownershipResult.ownsGame) {
                throw new Error('마인크래프트를 소유하고 있지 않습니다.');
            }
            
            console.log('✅ 게임 소유권 확인 완료');

            // 6. 플레이어 프로필
            const profileResult = await this.getPlayerProfile(mcResult.accessToken);
            if (!profileResult.success) {
                throw new Error(`플레이어 프로필 획득 실패: ${profileResult.error}`);
            }
            
            console.log('✅ 플레이어 프로필 획득 완료');

            // 📝 인증 정보 저장 (중요!)
            const authDataToSave = {
                accessToken: mcResult.accessToken,
                refreshToken: msResult.refreshToken || null, // Refresh Token 저장
                profile: profileResult.profile,
                account: msResult.account,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24시간 후 만료
                savedAt: new Date().toISOString()
            };
            
            await this.saveAuth(authDataToSave);
            console.log('✅ 인증 정보 저장 완료');

            return {
                success: true,
                data: {
                    accessToken: mcResult.accessToken,
                    profile: profileResult.profile,
                    account: msResult.account
                }
            };

        } catch (error) {
            console.error('❌ 인증 실패:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 로그아웃
     */
    async logout() {
        try {
            if (this.currentAccount) {
                await this.pca.getTokenCache().removeAccount(this.currentAccount);
                this.currentAccount = null;
            }
            await this.clearAuth();
            return { success: true };
        } catch (error) {
            console.error('로그아웃 실패:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Refresh Token을 사용한 토큰 갱신
     */
    async refreshToken() {
        try {
            console.log('🔄 Refresh Token으로 토큰 갱신 시도...');
            
            if (!this.authData || !this.authData.refreshToken) {
                console.log('❌ Refresh Token이 없음, 재인증 필요');
                return { success: false, error: 'No refresh token available' };
            }
            
            const silentRequest = {
                scopes: ['XboxLive.signin', 'offline_access'],
                refreshToken: this.authData.refreshToken,
                account: this.currentAccount
            };
            
            const response = await this.pca.acquireTokenSilent(silentRequest);
            
            if (response.accessToken) {
                console.log('✅ 토큰 갱신 성공');
                
                // 새로운 토큰으로 Minecraft 인증 진행
                const xblResult = await this.authenticateWithXboxLive(response.accessToken);
                if (!xblResult.success) {
                    throw new Error(`Xbox Live 인증 실패: ${xblResult.error}`);
                }
                
                const xstsResult = await this.getXSTSToken(xblResult.token);
                if (!xstsResult.success) {
                    throw new Error(`XSTS Token 획득 실패: ${xstsResult.error}`);
                }
                
                const mcResult = await this.authenticateWithMinecraft(xstsResult.token, xstsResult.userHash);
                if (!mcResult.success) {
                    throw new Error(`Minecraft 인증 실패: ${mcResult.error}`);
                }
                
                // 갱신된 인증 정보 저장
                const updatedAuthData = {
                    ...this.authData,
                    accessToken: mcResult.accessToken,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24시간 후
                    refreshToken: response.refreshToken || this.authData.refreshToken
                };
                
                await this.saveAuth(updatedAuthData);
                
                return {
                    success: true,
                    accessToken: mcResult.accessToken
                };
            }
            
        } catch (error) {
            console.error('❌ 토큰 갱신 실패:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 인증 정보 유효성 확인 (개선된 버전)
     */
    isAuthValid(authData) {
        if (!authData || !authData.expiresAt) {
            return false;
        }
        
        const expiresAt = new Date(authData.expiresAt);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        
        // 1시간 이내 만료 예정이면 갱신 필요로 판단
        const oneHour = 60 * 60 * 1000;
        return timeUntilExpiry > oneHour;
    }

    /**
     * 저장된 인증 정보 로드 (개선된 버전)
     */
    async loadSavedAuth() {
        try {
            const authExists = await this.checkAuthFileExists();
            if (!authExists) {
                console.log('📝 저장된 인증 파일이 없음');
                return null;
            }

            const authData = await fs.readFile(this.authFilePath, 'utf8');
            const parsedAuth = JSON.parse(authData);
            
            if (this.isAuthValid(parsedAuth)) {
                console.log('✅ 저장된 인증 정보가 유효함');
                this.authData = parsedAuth;
                return parsedAuth;
            } else {
                console.log('⚠️ 저장된 토큰이 만료됨, 갱신 시도...');
                
                // 토큰 갱신 시도
                const refreshResult = await this.refreshToken();
                if (refreshResult.success) {
                    console.log('✅ 토큰 갱신 성공');
                    return this.authData;
                } else {
                    console.log('❌ 토큰 갱신 실패, 재인증 필요');
                    await this.clearAuth();
                    return null;
                }
            }
        } catch (error) {
            console.error('❌ 저장된 인증 정보 로드 실패:', error);
            return null;
        }
    }

    /**
     * 인증 정보 저장
     */
    async saveAuth(authData) {
        try {
            await fs.writeFile(this.authFilePath, JSON.stringify(authData, null, 2));
            this.authData = authData;
            console.log('✅ 인증 정보 저장 완료');
        } catch (error) {
            console.error('❌ 인증 정보 저장 실패:', error);
        }
    }

    /**
     * 인증 정보 삭제
     */
    async clearAuth() {
        try {
            const authExists = await this.checkAuthFileExists();
            if (authExists) {
                await fs.unlink(this.authFilePath);
            }
            this.authData = null;
            console.log('✅ 인증 정보 삭제 완료');
        } catch (error) {
            console.error('❌ 인증 정보 삭제 실패:', error);
        }
    }

    /**
     * 인증 파일 존재 확인
     */
    async checkAuthFileExists() {
        try {
            await fs.access(this.authFilePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 현재 인증 데이터 반환
     */
    getAuthData() {
        return this.authData;
    }
}

module.exports = MinecraftAuth; 