const API_URL = 'https://api.swsong.ccwu.cc';

class NavigationApp {
    constructor() {
        this.categories = [];
        this.links = [];
        this.settings = { siteTitle: '导航中心' };
        this.init();
    }

    async init() {
        await this.loadData();
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) adminBtn.onclick = () => window.location.href = 'admin.html';
    }

    async loadData() {
        try {
            const res = await fetch(`${API_URL}/api/data`, { cache: 'no-cache' });
            const data = await res.json();
            if (data && data.categories) {
                this.categories = data.categories;
                this.links = data.links || [];
                this.settings = data.settings || this.settings;
                this.render();
                document.querySelector('#siteLogo span').textContent = this.settings.siteTitle;
            }
        } catch (e) { console.log("云端同步失败"); }
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
