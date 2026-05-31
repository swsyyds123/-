const API_URL = 'https://api.swsong.ccwu.cc';

class AdminApp {
    constructor() {
        // 1. 获取登录时存下的密码
        const savedUser = localStorage.getItem('currentUser');
        if (!this.isAuthenticated(savedUser)) {
            window.location.replace('login.html?redirect=admin');
            return;
        }
        const user = JSON.parse(savedUser);
        this.adminPassword = user.password; // 自动获取密码

        // 2. 初始化数据
        this.categories = [];
        this.links = [];
        this.settings = { themeColor: '#6366f1', backgroundStyle: 'gradient1', fontSize: 'medium', layout: 'grid', siteTitle: '导航中心' };
        this.editingCategory = null;
        this.editingLink = null;
        this.deleteCallback = null;

        this.init();
    }

    isAuthenticated(savedUser) {
        if (!savedUser) return false;
        const user = JSON.parse(savedUser);
        return user.password && Date.now() < user.expiresAt;
    }

    init() {
        this.loadData();
        this.bindEvents();
    }

    loadData() {
        fetch(`${API_URL}/api/data`)
            .then(res => res.json())
            .then(data => {
                if (data.categories && data.categories.length > 0) {
                    this.categories = data.categories;
                    this.links = data.links || [];
                    this.settings = { ...this.settings, ...data.settings };
                } else {
                    this.categories = this.getDefaultCategories();
                    this.links = this.getDefaultLinks();
                }
                this.renderAll();
            })
            .catch(err => {
                console.error('API 加载失败，尝试本地数据:', err);
                const c = localStorage.getItem('nav_categories');
                if (c) this.categories = JSON.parse(c);
                this.renderAll();
            });
    }

    saveData() {
        const payload = {
            password: this.adminPassword,
            categories: this.categories,
            links: this.links,
            settings: this.settings
        };

        fetch(`${API_URL}/api/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                localStorage.setItem('nav_categories', JSON.stringify(this.categories));
                localStorage.setItem('nav_links', JSON.stringify(this.links));
                localStorage.setItem('nav_settings', JSON.stringify(this.settings));
                localStorage.setItem('nav_sync', Date.now().toString());
                this.showToast('同步成功！');
            } else {
                alert('保存失败: ' + data.error);
            }
        });
    }

    // --- 这里的逻辑完全恢复你提供的初始版本 ---
    renderAll() {
        this.renderCategories();
        this.renderLinks();
        this.updateCategorySelects();
        this.updateSettingsUI();
    }

    bindEvents() {
        // 顶部导航切换
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
        document.getElementById('logoutBtn').onclick = () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        };
        document.getElementById('addCategoryBtn').onclick = () => {
            this.editingCategory = null;
            document.getElementById('categoryModalTitle').textContent = '添加分类';
            document.getElementById('categoryName').value = '';
            this.openModal('categoryModal');
        };
        document.getElementById('categoryModalSave').onclick = () => this.saveCategory();
        document.getElementById('saveSettings').onclick = () => {
            this.settings.siteTitle = document.getElementById('siteTitle').value;
            this.saveData();
        };
        document.getElementById('quickAddBtn').onclick = () => this.quickAddLink();
        
        // 弹窗关闭
        document.querySelectorAll('.modal-close, #categoryModalCancel').forEach(b => {
            b.onclick = () => this.closeAllModals();
        });
    }

    renderCategories() {
        const container = document.getElementById('categoriesList');
        container.innerHTML = this.categories.map(c => `
            <div class="list-item">
                <div class="list-item-name">${c.name}</div>
                <div class="list-item-actions">
                    <button class="delete-btn" onclick="app.deleteCategoryConfirm('${c.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    saveCategory() {
        const name = document.getElementById('categoryName').value.trim();
        if (!name) return;
        this.categories.push({ id: Date.now().toString(), name: name, order: this.categories.length });
        this.saveData();
        this.closeAllModals();
        this.renderAll();
    }

    deleteCategoryConfirm(id) {
        if (confirm("确定要删除吗？")) {
            this.categories = this.categories.filter(c => c.id !== id);
            this.links = this.links.filter(l => l.categoryId !== id);
            this.saveData();
            this.renderAll();
        }
    }

    renderLinks() {
        const container = document.getElementById('linksList');
        container.innerHTML = this.links.map(l => `
            <div class="list-item">
                <div class="list-item-name">${l.name} (${l.url})</div>
            </div>
        `).join('');
    }

    updateCategorySelects() {
        const html = this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        document.getElementById('quickCategory').innerHTML = '<option value="">选择分类</option>' + html;
        document.getElementById('linkCategory').innerHTML = html;
    }

    quickAddLink() {
        const name = document.getElementById('quickName').value;
        const url = document.getElementById('quickUrl').value;
        const catId = document.getElementById('quickCategory').value;
        if (!name || !url || !catId) return;
        this.links.push({ id: Date.now().toString(), categoryId: catId, name, url, order: 0 });
        this.saveData();
        document.getElementById('quickName').value = '';
        document.getElementById('quickUrl').value = '';
        this.renderAll();
    }

    updateSettingsUI() {
        document.getElementById('siteTitle').value = this.settings.siteTitle || '导航中心';
    }

    openModal(id) { document.getElementById(id).classList.add('active'); }
    closeAllModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active')); }
    showToast(m) {
        const t = document.createElement('div');
        t.style.cssText = "position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:0.5rem 1.5rem;border-radius:8px;z-index:9999";
        t.textContent = m;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2000);
    }
    
    // 默认数据略... (保持你之前的那些默认数组)
    getDefaultCategories() { return [ { id: '1', name: '嫖之呼吸', order: 0 } ]; }
    getDefaultLinks() { return []; }
}

const app = new AdminApp();
