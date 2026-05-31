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
}
new NavigationApp();
