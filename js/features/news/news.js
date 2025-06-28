/**
 * 뉴스 관리 모듈
 * 서버 소식 로드 및 표시 기능을 관리합니다.
 */

(function() {
    'use strict';

    class NewsManager {
        constructor() {
            this.newsContainer = null;
            this.refreshBtn = null;
            this.init();
        }

        async init() {
            this.newsContainer = document.getElementById('news-container') || document.querySelector('.news-section');
            this.refreshBtn = document.getElementById('refresh-news');
            
            if (this.refreshBtn) {
                this.refreshBtn.addEventListener('click', () => this.loadNews());
            }
            
            console.log('📰 NewsManager 초기화 완료');
        }

        async loadNews() {
            try {
                let newsData;
                
                // GitHub Pages에서 뉴스 우선 로드 (실시간 업데이트)
                try {
                    const timestamp = new Date().getTime();
                    const random = Math.random().toString(36).substring(7);
                    
                    // jsDelivr CDN을 먼저 시도 (빠른 캐시 갱신)
                    const jsdelivrUrl = `https://cdn.jsdelivr.net/gh/jw010801/bankruptcy-news@main/news.json?t=${timestamp}&r=${random}`;
                    console.log(`🌐 GitHub 뉴스 로드 시도... (jsDelivr)`);
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃
                    
                    const jsdelivrResponse = await fetch(jsdelivrUrl, {
                        method: 'GET',
                        signal: controller.signal,
                        cache: 'no-store',
                        headers: {
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache'
                        }
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (!jsdelivrResponse.ok) throw new Error('jsDelivr 로드 실패');
                    newsData = await jsdelivrResponse.json();
                    console.log('✅ jsDelivr CDN에서 뉴스 로드 성공');
                    
                } catch (jsdelivrError) {
                    console.warn('jsDelivr CDN 실패, GitHub Raw 시도:', jsdelivrError.message);
                    
                    try {
                        // GitHub Raw로 두 번째 시도
                        const newsUrl = `https://raw.githubusercontent.com/jw010801/bankruptcy-news/main/news.json?v=${timestamp}&r=${random}&nocache=1`;
                        console.log(`🌐 GitHub Raw 뉴스 로드 시도...`);
                        
                        const controller2 = new AbortController();
                        const timeoutId2 = setTimeout(() => controller2.abort(), 5000);
                        
                        const response = await fetch(newsUrl, {
                            method: 'GET',
                            signal: controller2.signal,
                            cache: 'no-store',
                            headers: {
                                'Cache-Control': 'no-cache, no-store, must-revalidate',
                                'Pragma': 'no-cache'
                            }
                        });
                        
                        clearTimeout(timeoutId2);
                        
                        if (!response.ok) throw new Error('GitHub Raw 로드 실패');
                        newsData = await response.json();
                        console.log('✅ GitHub Raw에서 뉴스 로드 성공');
                        
                    } catch (githubError) {
                        console.warn('GitHub 뉴스 로드 실패, 로컬 파일 시도:', githubError.message);
                        
                        // 로컬 news.json 파일 로드 (백업)
                        try {
                            const localResponse = await fetch('./news.json?v=' + timestamp);
                            if (localResponse.ok) {
                                newsData = await localResponse.json();
                                console.log('✅ 로컬 뉴스 파일 로드 성공');
                            } else {
                                throw new Error('로컬 파일 로드 실패');
                            }
                        } catch (localError) {
                            console.error('모든 뉴스 소스 로드 실패:', localError);
                            throw new Error('뉴스를 불러올 수 없습니다');
                        }
                    }
                }
                
                // 뉴스 표시
                this.displayNews(newsData);
                
            } catch (error) {
                console.error('뉴스 로드 실패:', error);
                this.showNewsError(error.message);
            }
        }

        displayNews(newsData) {
            if (!this.newsContainer || !newsData || !newsData.news) {
                console.warn('뉴스 컨테이너 또는 데이터 없음');
                return;
            }
            
            // 로딩 표시 제거
            const loadingElement = this.newsContainer.querySelector('.news-loading');
            if (loadingElement) {
                loadingElement.remove();
            }
            
            // 기존 뉴스 제거
            const existingNews = this.newsContainer.querySelectorAll('.news-item');
            existingNews.forEach(item => item.remove());
            
            // 새 뉴스 추가
            newsData.news.forEach(item => {
                const newsElement = this.createNewsElement(item);
                this.newsContainer.appendChild(newsElement);
            });
            
            console.log(`📰 뉴스 ${newsData.news.length}개 표시 완료`);
        }

        createNewsElement(newsItem) {
            const element = document.createElement('div');
            element.className = 'news-item';
            
            const icon = this.getNewsIcon(newsItem.type);
            
            // 날짜 형식을 실제 날짜로 표시
            let displayDate;
            if (newsItem.date) {
                const newsDate = new Date(newsItem.date);
                if (!isNaN(newsDate.getTime())) {
                    // 실제 날짜 형식으로 표시 (예: 2024.01.15)
                    displayDate = newsDate.toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    }).replace(/\. /g, '.').replace(/\.$/, '');
                } else {
                    displayDate = newsItem.date;
                }
            } else {
                displayDate = '날짜 없음';
            }
            
            element.innerHTML = `
                <div class="news-date">${displayDate}</div>
                <div class="news-title">${newsItem.title}</div>
                <div class="news-content">${newsItem.content}</div>
            `;
            
            return element;
        }

        getNewsIcon(type) {
            const icons = {
                event: '🎉',
                update: '🆕',
                maintenance: '🔧',
                announcement: '📢',
                warning: '⚠️',
                info: 'ℹ️',
                default: '📰'
            };
            return icons[type] || icons.default;
        }

        showNewsError(message) {
            if (!this.newsContainer) return;
            
            // 로딩 표시 제거
            const loadingElement = this.newsContainer.querySelector('.news-loading');
            if (loadingElement) {
                loadingElement.remove();
            }
            
            // 에러 메시지 표시
            const errorElement = document.createElement('div');
            errorElement.className = 'news-error';
            errorElement.innerHTML = `
                <div class="news-item">
                    <div class="news-date">오류</div>
                    <div class="news-title">뉴스 로드 실패</div>
                    <div class="news-content">${message}</div>
                </div>
            `;
            
            this.newsContainer.appendChild(errorElement);
        }
    }

    // 전역 뉴스 매니저 인스턴스
    const newsManager = new NewsManager();

    // 전역 객체로 노출
    window.NewsManager = NewsManager;
    window.newsManager = newsManager;

    console.log('📰 뉴스 모듈 로드 완료');

})(); 