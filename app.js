const API_URL = 'https://api.swsong.ccwu.cc';

class NavigationApp {
    constructor() {
        this.categories = [];
        this.links = [];
        this.settings = { siteTitle: '导航中心', fontSize: 'medium' };
        this.init();
    }

    async init() {
        // 显示加载动画
        const loader = document.getElementById('loadingOverlay');
        if (loader) loader.style.display = 'flex';

        try {
            const res = await fetch(`${API_URL}/api/data`, { cache: 'no-cache' });
            const data = await res.json();
            
            if (data && data.categories) {
                this.categories = data.categories;
                this.links = data.links || [];
                this.settings = data.settings || this.settings;
                this.applySettings();
                this.render();
                this.initSearch(); // ← 初始化搜索
            }
        } catch (e) {
            console.error("加载失败");
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }

    applySettings() {
        document.title = this.settings.siteTitle;
        const logo = document.querySelector('#siteLogo span');
        if (logo) logo.textContent = this.settings.siteTitle;
        
        // 应用背景
        if (this.settings.backgroundStyle === 'custom' && this.settings.backgroundImage) {
            document.body.style.backgroundImage = `url(${this.settings.backgroundImage})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundAttachment = 'fixed';
        }
        
        document.body.className = `font-${this.settings.fontSize || 'medium'}`;
    }

    render() {
        const container = document.getElementById('categoriesContainer');
        if (!container) return;
        
        // 按 order 排序分类
        const sortedCats = this.categories.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        container.innerHTML = sortedCats.map(cat => {
            const catLinks = this.links.filter(l => l.categoryId === cat.id);
            return `
                <div class="category-wrapper">
                    <div class="category-title">${cat.name}</div>
                    <div class="category-card">
                        <div class="category-links">
                            ${catLinks.map(l => `
                                <a href="${l.url}" target="_blank" class="link-item">
                                    <span class="link-name">${l.name}</span>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ========== 搜索功能 ==========
    initSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        const searchClear = document.getElementById('searchClear');
        const searchEngine = document.getElementById('searchEngine');

        if (!searchInput) return;

        // 实时过滤导航内链接
        searchInput.addEventListener('input', (e) => {
            const kw = e.target.value.trim().toLowerCase();
            
            // 显示/隐藏清空按钮
            if (searchClear) searchClear.style.display = kw ? 'block' : 'none';

            // 如果选了"导航"模式或没选引擎，只过滤本地链接
            if (searchEngine && searchEngine.value === 'nav') {
                this.filterLinks(kw);
                return;
            }

            // 其他引擎输入时不跳转，等点击搜索按钮或回车
            if (!kw) {
                this.render(); // 清空时恢复全部
            }
        });

        // 回车触发搜索
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });

        // 搜索按钮点击
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.performSearch());
        }

        // 清空按钮
        if (searchClear) {
            searchClear.addEventListener('click', () => {
                searchInput.value = '';
                searchClear.style.display = 'none';
                this.render();
                searchInput.focus();
            });
        }

        // 搜索引擎切换为"导航"时立即过滤当前输入
        if (searchEngine) {
            searchEngine.addEventListener('change', () => {
                const kw = searchInput.value.trim().toLowerCase();
                if (searchEngine.value === 'nav') {
                    this.filterLinks(kw);
                }
            });
        }
    }

    // 本地导航过滤
    filterLinks(kw) {
        const container = document.getElementById('categoriesContainer');
        if (!container) return;

        if (!kw) {
            this.render();
            return;
        }

        const sortedCats = this.categories.sort((a, b) => (a.order || 0) - (b.order || 0));

        container.innerHTML = sortedCats.map(cat => {
            const catLinks = this.links.filter(l => 
                l.categoryId === cat.id && 
                l.name.toLowerCase().includes(kw)
            );
            
            if (catLinks.length === 0) return ''; // 无匹配链接的分类不显示

            return `
                <div class="category-wrapper">
                    <div class="category-title">${cat.name}</div>
                    <div class="category-card">
                        <div class="category-links">
                            ${catLinks.map(l => `
                                <a href="${l.url}" target="_blank" class="link-item">
                                    <span class="link-name">${l.name}</span>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 外部搜索引擎跳转
    performSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchEngine = document.getElementById('searchEngine');
        if (!searchInput || !searchEngine) return;

        const kw = searchInput.value.trim();
        if (!kw) return;

        const engine = searchEngine.value;
        let url = '';

        switch (engine) {
            case 'google':
                url = `https://www.google.com/search?q=${encodeURIComponent(kw)}`;
                break;
            case 'baidu':
                url = `https://www.baidu.com/s?wd=${encodeURIComponent(kw)}`;
                break;
            case 'bing':
                url = `https://www.bing.com/search?q=${encodeURIComponent(kw)}`;
                break;
            case 'nav':
                this.filterLinks(kw.toLowerCase());
                return; // 本地过滤不跳转
            default:
                url = `https://www.baidu.com/s?wd=${encodeURIComponent(kw)}`;
        }

        window.open(url, '_blank');
    }
}

new NavigationApp();
