const API_URL = 'https://api.swsong.ccwu.cc';

class AdminApp {
    constructor() {
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) { window.location.replace('login.html'); return; }
        const user = JSON.parse(savedUser);
        this.adminPassword = user.password;

        this.categories = [];
        this.links = [];
        this.settings = { themeColor: '#6366f1', backgroundStyle: 'gradient1', fontSize: 'medium', layout: 'grid', siteTitle: '导航中心', backgroundImage: '' };
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadData();
    }

    async loadData() {
        try {
            const res = await fetch(`${API_URL}/api/data`);
            const data = await res.json();
            if (data && data.categories) {
                this.categories = data.categories;
                this.links = data.links || [];
                this.settings = { ...this.settings, ...data.settings };
            }
            this.refreshUI();
        } catch (e) { console.error("加载失败", e); }
    }

    refreshUI() {
        this.renderCategories();
        this.renderLinks();
        this.updateCategorySelects();
        // 恢复个性化设置的显示
        document.getElementById('siteTitle').value = this.settings.siteTitle || '';
        document.getElementById('bgImageUrl').value = this.settings.backgroundImage || '';
        document.querySelectorAll('.font-option').forEach(btn => btn.classList.toggle('active', btn.dataset.size === this.settings.fontSize));
        document.querySelectorAll('.layout-option').forEach(btn => btn.classList.toggle('active', btn.dataset.layout === this.settings.layout));
    }

    bindEvents() {
        // 顶部切换
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.onclick = (e) => {
                const section = e.currentTarget.dataset.section;
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                document.querySelectorAll('.panel-section').forEach(s => s.style.display = 'none');
                document.getElementById(section + 'Section').style.display = 'block';
            };
        });

        document.getElementById('backBtn').onclick = () => window.location.href = 'index.html';
        document.getElementById('logoutBtn').onclick = () => { localStorage.clear(); window.location.href = 'login.html'; };
        
        // 分类操作
        document.getElementById('addCategoryBtn').onclick = () => {
            document.getElementById('categoryName').value = '';
            document.getElementById('categoryModal').classList.add('active');
        };
        document.getElementById('categoryModalSave').onclick = () => this.saveCategory();

        // 个性化设置操作
        document.querySelectorAll('.font-option').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.font-option').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.settings.fontSize = e.target.dataset.size;
            };
        });
        document.querySelectorAll('.layout-option').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.layout-option').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.settings.layout = e.target.dataset.layout;
            };
        });
        
        // 背景图片预览与应用
        document.getElementById('previewBgBtn').onclick = () => {
            const url = document.getElementById('bgImageUrl').value;
            const preview = document.getElementById('bgPreviewContainer');
            preview.innerHTML = `<img src="${url}" style="max-width:100%; max-height:150px;">`;
            this.settings.backgroundImage = url;
        };
        document.getElementById('applyBgBtn').onclick = () => {
            this.settings.backgroundImage = document.getElementById('bgImageUrl').value;
            this.settings.backgroundStyle = 'custom';
            this.saveData();
        };

        document.getElementById('saveSettings').onclick = () => {
            this.settings.siteTitle = document.getElementById('siteTitle').value;
            this.saveData();
        };

        document.getElementById('quickAddBtn').onclick = () => this.quickAddLink();
        document.querySelectorAll('.modal-close, #categoryModalCancel').forEach(b => {
            b.onclick = () => document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        });
    }

    async saveData() {
        const payload = { password: this.adminPassword, categories: this.categories, links: this.links, settings: this.settings };
        const res = await fetch(`${API_URL}/api/data`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const result = await res.json();
        if (result.success) {
            this.showToast("同步成功！");
            localStorage.setItem('nav_sync', Date.now().toString());
        } else { alert("同步失败：" + result.error); }
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

    saveCategory() {
        const name = document.getElementById('categoryName').value.trim();
        if (!name) return;
        this.categories.push({ id: Date.now().toString(), name: name, order: this.categories.length });
        this.saveData();
        document.getElementById('categoryModal').classList.remove('active');
        this.refreshUI();
    }

    deleteCategory(id) {
        if (!confirm("确定删除吗？")) return;
        this.categories = this.categories.filter(c => c.id !== id);
        this.links = this.links.filter(l => l.categoryId !== id);
        this.saveData();
        this.refreshUI();
    }

    renderLinks() {
        const container = document.getElementById('linksList');
        if (!container) return;
        container.innerHTML = this.links.map(l => `<div class="list-item">${l.name} (${l.url})</div>`).join('');
    }

    updateCategorySelects() {
        const html = this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        document.getElementById('quickCategory').innerHTML = '<option value="">选择分类</option>' + html;
    }

    showToast(m) {
        const t = document.createElement('div');
        t.style.cssText = "position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:white;padding:0.6rem 1.2rem;border-radius:8px;z-index:9999";
        t.textContent = m;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2000);
    }
}
window.app = new AdminApp();
