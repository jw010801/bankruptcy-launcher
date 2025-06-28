const { contextBridge, ipcRenderer } = require('electron');

// 안전한 Electron API를 renderer 프로세스에 노출
contextBridge.exposeInMainWorld('electronAPI', {
    // Microsoft 인증 관련
    invoke: (channel, ...args) => {
        const validChannels = [
            'microsoft-login',
            'microsoft-logout', 
            'load-saved-auth',
            'launch-minecraft',
            'window-close',
            'window-minimize',
            'window-restore',
            'check-process-running',
            'check-install-status',
            'install-minecraft',
            'install-forge',
            'check-server-status',
            'save-settings',
            'load-settings',
            'check-modpack-updates',
            'install-modpack',
            'device-code-received'
        ];
        
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        }
        throw new Error(`Invalid IPC channel: ${channel}`);
    },
    
    // 이벤트 송신
    send: (channel, data) => {
        const validChannels = ['open-external-url'];
        
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        } else {
            throw new Error(`Invalid IPC channel: ${channel}`);
        }
    },
    
    // 이벤트 수신
    on: (channel, func) => {
        const validChannels = ['device-code-received'];
        
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        } else {
            throw new Error(`Invalid IPC channel: ${channel}`);
        }
    },
    
    // 이벤트 수신 해제
    removeAllListeners: (channel) => {
        const validChannels = ['device-code-received'];
        
        if (validChannels.includes(channel)) {
            ipcRenderer.removeAllListeners(channel);
        }
    },
    
    allowedChannels: [
        'microsoft-login',
        'microsoft-logout',
        'load-saved-auth',
        'launch-minecraft',
        'window-close',
        'window-minimize',
        'window-restore',
        'check-process-running',
        'check-install-status',
        'install-minecraft',
        'install-forge',
        'check-server-status',
        'save-settings',
        'load-settings',
        'check-modpack-updates',
        'install-modpack',
        'device-code-received'
    ]
});

console.log('🔒 Preload 스크립트 로드 완료 - 안전한 IPC 통신 설정됨'); 