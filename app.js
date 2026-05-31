const API_URL = 'https://api.swsong.ccwu.cc';

class NavigationApp {
    constructor() {
        this.categories = [];
        this.links = [];
        this.settings = { siteTitle: '导航中心', fontSize: 'medium', backgroundStyle: 'gradient1', backgroundImage: '' };
        
        // --- 核心修改：闪烁修复第一步 (从本地缓存瞬间读取上次的背景) ---
        this.applyCache(); 
        
        this.init();
    }

    // 立即应用缓存，防止变色闪烁
    applyCache() {
        const cached = localStorage.getItem('nav_settings_cache');
        if (cached) {
            try {
                this.settings = JSON.parse(cached);
                this.applySettings();
            } catch(e) {}
        }
    }

    async init() {
        const loader = document.getElementById('loadingOverlay');
        if (loader) loader.style.display = 'flex';

        try {
            const res = await fetch(`${API_URL}/api/data`, { cache: 'no-cache' });
            const data = await res.json();
            
            if (data && data.categories) {
                this.categories = data.categories;
                this.links = data.links || [];
                this.settings = data.settings || this.settings;
                
                // --- 核心修改：保存当前设置到缓存，供下次打开秒开 ---
                localStorage.setItem('nav_settings_cache', JSON.stringify(this.settings));
                
                this.applySettings();
                this.render();
            }
        } catch (e) {
            console.error("云端加载失败，使用缓存或默认数据");
        } finally {
            // 确保渲染完成后再关闭遮罩
            setTimeout(() => {
                if (loader) loader.style.opacity = '0';
                setTimeout(() => { if(loader) loader.style.display = 'none'; }, 300);
            }, 100);
        }
    }

    applySettings() {
        document.title = this.settings.siteTitle || '导航页';
        const logo = document.querySelector('#siteLogo span');
        if (logo) logo.textContent = this.settings.siteTitle;
        
        // 应用背景
        if (this.settings.backgroundStyle === 'custom' && this.settings.backgroundImage) {
            document.body.style.backgroundImage = `url(${this.settings.backgroundImage})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundAttachment = 'fixed';
            document.body.style.backgroundPosition = 'center';
        } else {
            // 如果不是自定义，恢复默认紫色渐变
            document.body.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
        
        document.body.className = `font-${this.settings.fontSize || 'medium'}`;
    }

    render() {
        const container = document.getElementById('categoriesContainer');
        if (!container) return;
        
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
