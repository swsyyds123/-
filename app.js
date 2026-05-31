const API_URL = 'https://api.swsong.ccwu.cc';

class NavigationApp {
    constructor() {
        this.categories = [];
        this.links = [];
        this.settings = { siteTitle: '导航中心', backgroundStyle: 'gradient1' };
        this.init();
    }

    async init() {
        document.getElementById('loadingOverlay').style.display = 'flex';
        try {
            await this.loadData();
        } catch (e) {
            console.error("加载数据失败");
        } finally {
            // 无论成功还是失败，都必须关闭加载动画，防止卡死
            document.getElementById('loadingOverlay').style.display = 'none';
        }
        
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) adminBtn.onclick = () => window.location.href = 'admin.html';
    }

    async loadData() {
        const res = await fetch(`${API_URL}/api/data`, { cache: 'no-cache' });
        const data = await res.json();
        if (data && data.categories) {
            this.categories = data.categories;
            this.links = data.links || [];
            this.settings = { ...this.settings, ...data.settings };
            this.applySettings();
            this.render();
        }
    }

    applySettings() {
        // 应用标题
        document.querySelector('#siteLogo span').textContent = this.settings.siteTitle || '导航中心';
        // 应用背景图
        if (this.settings.backgroundStyle === 'custom' && this.settings.backgroundImage) {
            document.body.style.backgroundImage = `url(${this.settings.backgroundImage})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundAttachment = 'fixed';
        }
        // 应用字体
        document.body.className = `font-${this.settings.fontSize || 'medium'}`;
    }

    render() {
        const container = document.getElementById('categoriesContainer');
        if (!container) return;
        container.innerHTML = this.categories.map(cat => {
            const catLinks = this.links.filter(l => l.categoryId === cat.id);
            return `
                <div class="category-wrapper">
                    <div class="category-title">${cat.name}</div>
                    <div class="category-card">
                        <div class="category-links">
                            ${catLinks.map(l => `<a href="${l.url}" target="_blank" class="link-item"><span class="link-name">${l.name}</span></a>`).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}
new NavigationApp();
