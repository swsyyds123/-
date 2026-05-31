const API_URL = 'https://api.swsong.ccwu.cc';

class AdminApp {
    constructor() {
        this.initData();
        const savedUser = localStorage.getItem('currentUser');
        if (!this.isAuthenticated(savedUser)) {
            window.location.replace('login.html?redirect=admin');
            return;
        }
        
        const user = JSON.parse(savedUser);
        this.adminPassword = user.password;
        this.init();
    }

    isAuthenticated(data) {
        if (!data) return false;
        const u = JSON.parse(data);
        return u.username && u.password && Date.now() < u.expiresAt;
    }

    initData() {
        this.categories = [];
        this.links = [];
        this.settings = { siteTitle: '导航中心', fontSize: 'medium', layout: 'grid' };
        this.editingCategory = null;
    }

    init() {
        this.bindEvents();
        this.loadData();
    }

    // 从云端加载
    async loadData() {
        try {
            const res = await fetch(`${API_URL}/api/data`);
            const data = await res.json();
            if (data.categories) {
                this.categories = data.categories;
                this.links = data.links || [];
                this.settings = { ...this.settings, ...(data.settings || {}) };
            } else {
                // 如果云端没数据，加载默认值
                this.categories = [ { id: '1', name: '嫖之呼吸', order: 0 } ];
            }
            this.refreshUI();
        } catch (e) {
            console.error("加载失败", e);
        }
    }

    refreshUI() {
        this.renderCategories();
        this.renderLinks();
        this.updateCategorySelects();
        document.getElementById('siteTitle').value = this.settings.siteTitle || '';
    }

    bindEvents() {
        // 1. 顶部页签切换
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                document.querySelectorAll('.panel-section').forEach(s => s.style.display = 'none');
                document.getElementById(section + 'Section').style.display = 'block';
            });
        });

        // 2. 返回主页与预览
        document.getElementById('backBtn').onclick = () => window.location.href = 'index.html';
        document.getElementById('previewBtn').onclick = () => window.open('index.html', '_blank');
        document.getElementById('logoutBtn').onclick = () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        };

        // 3. 分类与设置保存
        document.getElementById('addCategoryBtn').onclick = () => {
            this.editingCategory = null;
            document.getElementById('categoryModalTitle').textContent = '添加分类';
            document.getElementById('categoryName').value = '';
            document.getElementById('categoryModal').classList.add('active');
        };
        document.getElementById('categoryModalSave').onclick = () => this.saveCategory();
        document.getElementById('saveSettings').onclick = () => {
            this.settings.siteTitle = document.getElementById('siteTitle').value;
            this.saveData();
        };
        document.getElementById('quickAddBtn').onclick = () => this.quickAddLink();

        // 4. 弹窗通用关闭
        document.querySelectorAll('.modal-close, #categoryModalCancel').forEach(b => {
            b.onclick = () => document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        });
    }

    async saveData() {
        const payload = {
            password: this.adminPassword,
            categories: this.categories,
            links: this.links,
            settings: this.settings
        };
        const res = await fetch(`${API_URL}/api/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
            this.showToast("同步成功！");
            localStorage.setItem('nav_sync', Date.now().toString());
        } else {
            alert("同步失败：" + result.error);
        }
    }

    renderCategories() {
        const container = document.getElementById('categoriesList');
        if (!container) return;
        container.innerHTML = this.categories.map(c => `
            <div class="list-item">
                <div class="list-item-name">${c.name}</div>
                <div class="list-item-actions">
                    <button class="delete-btn" onclick="window.app.deleteCategory('${c.id}')"><i class="fas fa-trash"></i></button>
                </div>
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
        this.saveData();
        this.refreshUI();
    }

    renderLinks() {
        const container = document.getElementById('linksList');
        if (!container) return;
        container.innerHTML = this.links.map(l => `
            <div class="list-item">
                <div class="list-item-name">${l.name} <small>(${l.url})</small></div>
            </div>
        `).join('');
    }

    updateCategorySelects() {
        const html = this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        document.getElementById('quickCategory').innerHTML = '<option value="">选择分类</option>' + html;
    }

    quickAddLink() {
        const name = document.getElementById('quickName').value.trim();
        const url = document.getElementById('quickUrl').value.trim();
        const catId = document.getElementById('quickCategory').value;
        if (!name || !url || !catId) return;
        this.links.push({ id: Date.now().toString(), categoryId: catId, name, url, order: 0 });
        this.saveData();
        document.getElementById('quickName').value = '';
        document.getElementById('quickUrl').value = '';
        this.refreshUI();
    }

    showToast(msg) {
        const div = document.createElement('div');
        div.className = 'toast';
        div.style.cssText = "position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:white;padding:0.8rem 1.5rem;border-radius:8px;z-index:9999";
        div.textContent = msg;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 2000);
    }
}

// 绑定到 window 以便 HTML 里的 onclick 能找到
window.app = new AdminApp();
