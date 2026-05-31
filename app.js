const API_URL = 'https://api.swsong.ccwu.cc';

class NavigationApp {
    constructor() {
        this.categories = JSON.parse(localStorage.getItem('nav_categories')) || [];
        this.links = JSON.parse(localStorage.getItem('nav_links')) || [];
        this.init();
    }

    async init() {
        this.render(); // 立即渲染本地的，防止白屏
        await this.loadData(); // 异步拿云端的
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) adminBtn.onclick = () => window.location.href = 'admin.html';
    }

    async loadData() {
        try {
            const res = await fetch(`${API_URL}/api/data`, { cache: 'no-cache' });
            const data = await res.json();
            if (data && data.categories && data.categories.length > 0) {
                this.categories = data.categories;
                this.links = data.links || [];
                const siteTitle = data.settings?.siteTitle || '导航中心';
                document.querySelector('#siteLogo span').textContent = siteTitle;
                // 更新本地缓存
                localStorage.setItem('nav_categories', JSON.stringify(this.categories));
                localStorage.setItem('nav_links', JSON.stringify(this.links));
                this.render();
            }
        } catch (e) { console.log("云端拉取失败，处于离线模式"); }
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
