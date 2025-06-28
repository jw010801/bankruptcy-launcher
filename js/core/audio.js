/**
 * 오디오 시스템 모듈
 * 효과음과 배경음악을 관리합니다.
 */

(function() {
    'use strict';

    class AudioManager {
        constructor() {
            // 효과음 시스템
            this.sounds = {
                click: new Audio('assets/sounds/click.mp3'),
                success: new Audio('assets/sounds/success.mp3'),
                purchase: new Audio('assets/sounds/purchase.mp3')
            };

            // 볼륨 조정
            this.sounds.click.volume = 0.5;
            this.sounds.success.volume = 0.3;  // 성공 효과음 볼륨 낮춤
            this.sounds.purchase.volume = 0.5;

            // 배경음악
            this.bgm = new Audio('assets/sounds/bgm.mp3');
            this.bgm.loop = true;
            this.bgm.volume = 0.3;

            // BGM 자동 재생 상태
            this.bgmEnabled = true;
            this.bgmReady = false;
            
            console.log('🎵 AudioManager 초기화 완료');
        }

        /**
         * 효과음 재생
         * @param {string} type - 효과음 타입 (click, success, purchase)
         */
        playSound(type) {
            if (this.sounds[type]) {
                this.sounds[type].currentTime = 0;
                this.sounds[type].play().catch(e => console.log('Sound play failed:', e));
            }
        }

        /**
         * BGM 재생
         */
        playBGM() {
            if (this.bgmEnabled) {
                this.bgm.play().catch(e => {
                    console.log('BGM autoplay blocked, will play after user interaction');
                    // 첫 번째 클릭 시 BGM 시작
                    this.setupUserInteractionBGM();
                });
            }
        }

        /**
         * BGM 정지
         */
        stopBGM() {
            this.bgm.pause();
            this.bgm.currentTime = 0;
        }

        /**
         * BGM 일시정지
         */
        pauseBGM() {
            this.bgm.pause();
        }

        /**
         * BGM 활성화/비활성화
         * @param {boolean} enabled - BGM 활성화 여부
         */
        setBGMEnabled(enabled) {
            this.bgmEnabled = enabled;
            if (enabled) {
                this.playBGM();
            } else {
                this.pauseBGM();
            }
        }

        /**
         * BGM 볼륨 설정
         * @param {number} volume - 볼륨 (0.0 ~ 1.0)
         */
        setBgmVolume(volume) {
            this.bgm.volume = Math.max(0, Math.min(1, volume));
        }

        /**
         * 효과음 볼륨 설정
         * @param {number} volume - 볼륨 (0.0 ~ 1.0)
         */
        setSfxVolume(volume) {
            Object.values(this.sounds).forEach(sound => {
                sound.volume = Math.max(0, Math.min(1, volume));
            });
        }

        /**
         * 사용자 상호작용 후 BGM 재생 설정
         */
        setupUserInteractionBGM() {
            if (!this.bgmReady) {
                document.addEventListener('click', () => {
                    if (this.bgmEnabled) {
                        this.bgm.play().catch(e => console.log('BGM play failed:', e));
                    }
                }, { once: true });
                this.bgmReady = true;
            }
        }

        /**
         * 모든 오디오 볼륨 설정
         * @param {number} volume - 볼륨 (0.0 ~ 1.0)
         */
        setMasterVolume(volume) {
            // 효과음 볼륨 조정
            Object.values(this.sounds).forEach(sound => {
                sound.volume = volume * 0.5; // 기본 볼륨의 50%
            });
            
            // BGM 볼륨 조정
            this.bgm.volume = volume * 0.3; // 기본 볼륨의 30%
        }

        /**
         * 오디오 시스템 초기화
         * @param {Object} settings - 설정 객체
         */
        initialize(settings = {}) {
            this.setBGMEnabled(settings.enableBgm !== false);
            
            // 지연된 BGM 시작 (사용자 상호작용 대기)
            setTimeout(() => {
                this.playBGM();
            }, 1000);
        }
    }

    // 전역 오디오 매니저 인스턴스
    const audioManager = new AudioManager();

    // 전역 객체로 노출
    window.AudioManager = AudioManager;
    window.audioManager = audioManager;

    console.log('🎵 오디오 모듈 로드 완료');

})(); 