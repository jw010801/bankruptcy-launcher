const FabricInstaller = require('./fabric-installer');

async function installMods() {
    console.log('📦 모드팩 자동 설치 시작...\n');
    
    try {
        const installer = new FabricInstaller();
        
        console.log('📋 모드팩 설정 로드 중...');
        const config = await installer.loadModpackConfig();
        console.log(`✅ 모드팩: ${config.name} v${config.version}`);
        console.log(`🧵 Fabric 버전: ${config.fabricVersion}`);
        console.log(`🎮 마인크래프트 버전: ${config.minecraftVersion}`);
        console.log(`📦 필수 모드 개수: ${config.mods.length}개\n`);
        
        console.log('🔍 현재 설치된 모드 확인 중...');
        const installedMods = await installer.getInstalledMods();
        console.log(`📊 현재 설치된 모드: ${installedMods.length}개`);
        
        if (installedMods.length > 0) {
            console.log('📋 설치된 모드 목록:');
            installedMods.forEach(mod => {
                console.log(`  - ${mod.name}`);
            });
        }
        
        console.log('\n🚀 모드팩 설치 시작...');
        
        const result = await installer.installModpack((progress) => {
            const progressBar = '█'.repeat(Math.floor(progress.percentage / 5)) + 
                               '░'.repeat(20 - Math.floor(progress.percentage / 5));
            console.log(`[${progressBar}] ${progress.percentage}% - ${progress.currentMod || progress.message}`);
        });
        
        if (result.success) {
            console.log('\n✅ 모드팩 설치 완료!');
            console.log(`📦 설치된 모드: ${result.installedMods?.length || 0}개`);
            
            if (result.installedMods && result.installedMods.length > 0) {
                console.log('\n📋 새로 설치된 모드들:');
                result.installedMods.forEach(mod => {
                    console.log(`  ✅ ${mod}`);
                });
            }
            
            console.log('\n🎮 이제 런처에서 Fabric으로 게임을 시작할 수 있습니다!');
            
        } else {
            console.error('\n❌ 모드팩 설치 실패:', result.error);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n❌ 모드팩 설치 중 오류 발생:', error.message);
        console.error('스택 트레이스:', error.stack);
        process.exit(1);
    }
}

// 실행
if (require.main === module) {
    installMods();
}

module.exports = { installMods }; 