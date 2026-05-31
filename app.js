const API_URL = 'https://api.swsong.ccwu.cc';

class NavigationApp {
    constructor() {
        this.categories = [];
        this.links = [];
        this.settings = { siteTitle: '导航中心' };
        this.init();
    }

    async init() {
        this.showLoading();
        await this.loadData();
        this.bindEvents();
        this.hideLoading();
    }

    async loadData() {
        try {
            const res = await fetch(`${API_URL}/api/data`, { cache: 'no-cache' });
            const data = await res.json();
            if (data && data.categories && data.categories.length > 0) {
                this.categories = data.categories;
                this.links = data.links || [];
                this.settings = data.settings || this.settings;
                console.log("[Nav] 云端数据加载成功");
            } else {
                console.log("[Nav] 云端无数据，使用空配置");
            }
        } catch (e) {
            console.error("同步失败，使用离线模式");
        }
        this.applySettings();
        this.render();
    }

    applySettings() {
        const title = document.querySelector('#siteLogo span');
        if (title) title.textContent = this.settings.siteTitle;
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

    bindEvents() {
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) adminBtn.onclick = () => window.location.href = 'admin.html';
    }

    showLoading() { document.getElementById('loadingOverlay').style.display = 'flex'; }
    hideLoading() { document.getElementById('loadingOverlay').style.display = 'none'; }
}

new NavigationApp();
