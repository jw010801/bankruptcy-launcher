# 파산게임 런처 - 빠른 개발 가이드

## 🎯 목표: 1-2주 내 기본 런처 완성

### 핵심 기능만 구현
```
✅ 서버 상태 확인
✅ 마인크래프트 실행
✅ 설정 저장/로드
✅ 깔끔한 UI
```

## 🚀 빠른 시작

### 1. 개발 환경 설정 (10분)
```bash
# Node.js 설치 (https://nodejs.org)
# 프로젝트 폴더에서 실행:

npm install electron --save-dev
npm install electron-builder --save-dev
npm install fs-extra --save
npm install node-fetch@2 --save
```

### 2. 런처 실행 (즉시)
```bash
# 개발 모드로 실행
npm start

# 또는
npm run dev
```

### 3. 빌드 및 배포 (5분)
```bash
# Windows 실행파일 생성
npm run build-win

# 결과물: dist/파산게임 런처 Setup.exe
```

## 📁 프로젝트 구조

```
launcher/
├── package.json          # 프로젝트 설정
├── main.js               # 메인 프로세스
├── index.html            # UI 구조
├── style.css             # 스타일링
├── renderer.js           # 렌더러 프로세스
├── assets/               # 리소스 폴더
│   ├── icon.png          # 런처 아이콘
│   ├── icon-small.png    # 작은 아이콘
│   └── sounds/           # 효과음 (선택사항)
└── dist/                 # 빌드 결과물
```

## 🎨 AI 리소스 생성 (1-2시간)

### 필수 아이콘 생성
1. **Bing Image Creator** 접속 (copilot.microsoft.com)
2. 프롬프트 입력:
```
"Modern minimalist casino game launcher icon, 
poker chip with dollar sign, dark background, 
orange and teal colors, 256x256 pixels, clean design"
```
3. 생성된 이미지를 `assets/icon.png`로 저장
4. 온라인 ICO 변환기로 `icon.ico` 생성

### BGM 생성 (선택사항)
1. **Suno AI** 접속 (suno.ai)
2. 프롬프트 입력:
```
"Dark atmospheric casino background music, 
mysterious electronic ambient, 2 minutes, loop-friendly"
```
3. 생성된 음악을 `assets/sounds/bgm.mp3`로 저장

## ⚙️ 설정 및 커스터마이징

### 서버 정보 변경
```javascript
// renderer.js에서 기본 서버 주소 변경
const DEFAULT_SERVER = "당신의서버주소:25565";
```

### 런처 제목 변경
```html
<!-- index.html -->
<title>당신의 서버 런처</title>
```

### 색상 테마 변경
```css
/* style.css에서 색상 변수 수정 */
:root {
    --primary-color: #ff6b35;    /* 주황색 */
    --secondary-color: #4ecdc4;  /* 청록색 */
    --background-color: #1a1a1a; /* 배경색 */
}
```

## 🔧 고급 기능 (추후 추가)

### 서버 상태 실시간 확인
```javascript
// minecraft-server-util 패키지 설치 후
const util = require('minecraft-server-util');

async function checkServerStatus(host, port) {
    try {
        const response = await util.status(host, port);
        return {
            online: true,
            players: response.players,
            version: response.version.name
        };
    } catch (error) {
        return { online: false };
    }
}
```

### 자동 업데이트
```javascript
// electron-updater 패키지 활용
const { autoUpdater } = require('electron-updater');

autoUpdater.checkForUpdatesAndNotify();
```

### 모드팩 자동 설치
```javascript
// 모드 파일 다운로드 및 설치
async function downloadMods() {
    // 구현 예정
}
```

## 🐛 문제 해결

### 일반적인 오류들

#### 1. "Electron 실행 안됨"
```bash
# Node.js 재설치 후
npm install
npm start
```

#### 2. "아이콘이 안보임"
```
- assets/icon.png 파일 확인
- 경로가 올바른지 확인
- 파일 크기가 적절한지 확인 (1MB 이하)
```

#### 3. "빌드 실패"
```bash
# 캐시 클리어 후 재시도
npm cache clean --force
npm install
npm run build-win
```

## 📱 추가 플랫폼 지원

### macOS 빌드
```json
// package.json에 추가
"build-mac": "electron-builder --mac"
```

### Linux 빌드
```json
// package.json에 추가
"build-linux": "electron-builder --linux"
```

## 🎯 개발 우선순위

### 1주차 (핵심 기능)
```
✅ 기본 UI 구현
✅ 서버 상태 확인
✅ 마인크래프트 실행
✅ 설정 저장/로드
```

### 2주차 (완성도 향상)
```
⚪ 아이콘 및 디자인 완성
⚪ 효과음 추가
⚪ 오류 처리 개선
⚪ 빌드 및 배포 테스트
```

### 3주차 (고급 기능)
```
⚪ 실시간 서버 모니터링
⚪ 뉴스/공지사항 피드
⚪ 사용자 프로필
⚪ 자동 업데이트
```

## 💡 개발 팁

### 빠른 테스트
```bash
# 코드 변경 후 즉시 확인
npm start
# Ctrl+R로 런처 새로고침
```

### 디버깅
```javascript
// 개발자 도구 열기 (main.js에 추가)
mainWindow.webContents.openDevTools();
```

### 성능 최적화
```javascript
// 불필요한 기능 비활성화
webSecurity: false,
nodeIntegration: true,
contextIsolation: false
```

## 🎉 완성 후 배포

### 1. 실행파일 생성
```bash
npm run build-win
```

### 2. 친구들에게 배포
```
- dist/ 폴더의 Setup.exe 파일 공유
- 또는 GitHub Releases 활용
```

### 3. 피드백 수집
```
- 사용성 테스트
- 버그 리포트 수집
- 기능 개선 요청
```

이렇게 하면 **1-2주 안에 완성도 높은 런처**를 만들 수 있습니다! 🚀

기본 기능부터 시작해서 점진적으로 개선해나가는 것이 핵심입니다. 