const API_URL = 'https://api.swsong.ccwu.cc';

class AdminApp {
    constructor() {
        console.log("后台启动中...");
        // 1. 获取登录凭证
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) { window.location.replace('login.html'); return; }
        
        const user = JSON.parse(savedUser);
        this.adminPassword = user.password; 

        // 2. 初始化数据（先尝试读本地，防止刷新消失）
        this.categories = JSON.parse(localStorage.getItem('nav_categories')) || this.getDefaultCategories();
        this.links = JSON.parse(localStorage.getItem('nav_links')) || this.getDefaultLinks();
        this.settings = JSON.parse(localStorage.getItem('nav_settings')) || { siteTitle: '导航中心' };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderAll();
        this.loadData(); // 异步从云端拿最新的
    }

    // 从云端同步
    loadData() {
        fetch(`${API_URL}/api/data`)
            .then(res => res.json())
            .then(data => {
                // 关键点：只有当云端返回了有效的分类数据，才覆盖本地并渲染
                if (data && data.categories && data.categories.length > 0) {
                    console.log("云端数据同步成功");
                    this.categories = data.categories;
                    this.links = data.links || [];
                    this.settings = { ...this.settings, ...data.settings };
                    // 存入本地备份
                    localStorage.setItem('nav_categories', JSON.stringify(this.categories));
                    localStorage.setItem('nav_links', JSON.stringify(this.links));
                    this.renderAll();
                }
            })
            .catch(e => console.log("云端连接失败，使用本地模式"));
    }

    async saveData() {
        const payload = {
            password: this.adminPassword,
            categories: this.categories,
            links: this.links,
            settings: this.settings
        };
        try {
            const res = await fetch(`${API_URL}/api/data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                this.showToast("同步成功！");
                localStorage.setItem('nav_sync', Date.now().toString());
                // 同时保存到本地
                localStorage.setItem('nav_categories', JSON.stringify(this.categories));
                localStorage.setItem('nav_links', JSON.stringify(this.links));
            } else { alert("保存失败：" + data.error); }
        } catch (e) { alert("网络异常，保存到云端失败"); }
    }

    renderAll() {
        this.renderCategories();
        this.renderLinks();
        this.updateCategorySelects();
        const siteTitleInput = document.getElementById('siteTitle');
        if (siteTitleInput) siteTitleInput.value = this.settings.siteTitle || '';
    }

    bindEvents() {
        // 绑定顶部切换
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.onclick = (e) => {
                const section = e.currentTarget.dataset.section;
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                document.querySelectorAll('.panel-section').forEach(s => s.style.display = 'none');
                document.getElementById(section + 'Section').style.display = 'block';
            };
        });

        // 按钮绑定（直接使用 id）
        document.getElementById('backBtn').onclick = () => window.location.href = 'index.html';
        document.getElementById('logoutBtn').onclick = () => { localStorage.clear(); window.location.href = 'login.html'; };
        
        document.getElementById('addCategoryBtn').onclick = () => {
            document.getElementById('categoryName').value = '';
            document.getElementById('categoryModal').classList.add('active');
        };

        document.getElementById('categoryModalSave').onclick = () => {
            const name = document.getElementById('categoryName').value.trim();
            if (!name) return;
            this.categories.push({ id: Date.now().toString(), name, order: this.categories.length });
            this.saveData();
            this.closeModals();
            this.renderAll();
        };

        document.getElementById('quickAddBtn').onclick = () => {
            const name = document.getElementById('quickName').value;
            const url = document.getElementById('quickUrl').value;
            const catId = document.getElementById('quickCategory').value;
            if (!name || !url || !catId) return;
            this.links.push({ id: Date.now().toString(), categoryId: catId, name, url, order: 0 });
            this.saveData();
            this.renderAll();
            document.getElementById('quickName').value = '';
            document.getElementById('quickUrl').value = '';
        };

        document.getElementById('saveSettings').onclick = () => {
            this.settings.siteTitle = document.getElementById('siteTitle').value;
            this.saveData();
        };

        document.querySelectorAll('.modal-close, #categoryModalCancel').forEach(b => {
            b.onclick = () => this.closeModals();
        });
    }

    renderCategories() {
        const container = document.getElementById('categoriesList');
        if (!container) return;
        container.innerHTML = this.categories.map(c => `
            <div class="list-item">
                <div class="list-item-name">${c.name}</div>
                <button class="btn-danger" style="padding:4px 8px;border-radius:4px" onclick="app.deleteCategory('${c.id}')">删除</button>
            </div>
        `).join('');
    }

    deleteCategory(id) {
        if (!confirm("确定删除吗？")) return;
        this.categories = this.categories.filter(c => c.id !== id);
        this.links = this.links.filter(l => l.categoryId !== id);
        this.saveData();
        this.renderAll();
    }

    renderLinks() {
        const container = document.getElementById('linksList');
        if (!container) return;
        container.innerHTML = this.links.map(l => `<div class="list-item">${l.name} (${l.url})</div>`).join('');
    }

    updateCategorySelects() {
        const html = this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        const qc = document.getElementById('quickCategory');
        if (qc) qc.innerHTML = '<option value="">选择分类</option>' + html;
    }

    closeModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active')); }
    
    showToast(m) {
        const t = document.createElement('div');
        t.style.cssText = "position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:white;padding:0.6rem 1.2rem;border-radius:8px;z-index:9999";
        t.textContent = m;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2000);
    }

    getDefaultCategories() { return [{ id: '1', name: '默认分类', order: 0 }]; }
    getDefaultLinks() { return []; }
}

window.app = new AdminApp();
