// ========== API 配置 ==========
const API_URL = 'https://api.swsong.ccwu.cc';

class AdminApp {
    constructor() {
        // 1. 从缓存获取登录信息（包含密码）
        const savedUser = localStorage.getItem('currentUser');
        this.adminPassword = '';
        if (savedUser) {
            try {
                const userData = JSON.parse(savedUser);
                this.adminPassword = userData.password || '';
            } catch(e) {
                this.adminPassword = '';
            }
        }

        // 2. 权限检查
        if (!this.isAuthenticated()) {
            window.location.replace('login.html?redirect=admin');
            return;
        }

        // 3. 初始化基础数据结构
        this.categories = [];
        this.links = [];
        this.settings = {
            themeColor: '#6366f1',
            backgroundStyle: 'gradient1',
            backgroundColor: '#1e1e2e',
            backgroundImage: '',
            fontSize: 'medium',
            layout: 'grid',
            siteTitle: '导航中心'
        };
        this.editingCategory = null;
        this.editingLink = null;
        this.deleteCallback = null;
        
        // 4. 启动应用
        this.init();
    }

    // 检查登录是否有效
    isAuthenticated() {
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) return false;
        try {
            const currentUser = JSON.parse(savedUser);
            if (!currentUser || !currentUser.username || !currentUser.expiresAt) return false;
            return Date.now() <= currentUser.expiresAt;
        } catch (e) {
            return false;
        }
    }

    init() {
        this.loadData();
        this.bindEvents();
    }

    // ========== 从云端加载数据 ==========
    loadData() {
        console.log('[Admin] 正在拉取数据...');
        fetch(`${API_URL}/api/data`)
            .then(res => res.json())
            .then(data => {
                if (data.categories) this.categories = data.categories;
                if (data.links) this.links = data.links;
                if (data.settings) this.settings = { ...this.settings, ...data.settings };
                
                this.refreshUI();
            })
            .catch(err => {
                console.error('加载失败，尝试读取本地缓存:', err);
                this.loadFromLocal();
            });
    }

    loadFromLocal() {
        const c = localStorage.getItem('nav_categories');
        const l = localStorage.getItem('nav_links');
        const s = localStorage.getItem('nav_settings');
        if (c) this.categories = JSON.parse(c);
        if (l) this.links = JSON.parse(l);
        if (s) this.settings = JSON.parse(s);
        this.refreshUI();
    }

    refreshUI() {
        this.renderCategories();
        this.renderLinks();
        this.updateCategorySelects();
        this.updateSettingsUI();
    }

    // ========== 保存数据到云端 (安全版) ==========
    saveData() {
        const payload = {
            password: this.adminPassword, // 核心：使用登录时输入的密码
            categories: this.categories,
            links: this.links,
            settings: this.settings
        };

        this.showToast('正在同步至云端...');

        fetch(`${API_URL}/api/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // 保存本地备份
                localStorage.setItem('nav_categories', JSON.stringify(this.categories));
                localStorage.setItem('nav_links', JSON.stringify(this.links));
                localStorage.setItem('nav_settings', JSON.stringify(this.settings));
                localStorage.setItem('nav_sync', Date.now().toString()); 
                this.showToast('同步成功！');
            } else {
                alert('保存失败：' + (data.error || '未知错误'));
                if (data.error === '权限不足') window.location.href = 'login.html';
            }
        })
        .catch(err => {
            console.error('网络错误:', err);
            this.showToast('网络异常，已保存到本地');
        });
    }

    // ========== 以下是 UI 逻辑，保持不变 ==========
    bindEvents() {
        // 顶部导航切换
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.target.closest('.nav-item');
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                targetBtn.classList.add('active');
                document.querySelectorAll('.panel-section').forEach(s => s.style.display = 'none');
                const sectionId = targetBtn.dataset.section + 'Section';
                document.getElementById(sectionId).style.display = 'block';
            });
        });

        document.getElementById('backBtn').onclick = () => window.location.href = 'index.html';
        document.getElementById('previewBtn').onclick = () => window.open('index.html', '_blank');
        document.getElementById('logoutBtn').onclick = () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        };

        document.getElementById('quickAddBtn').onclick = () => this.quickAddLink();
        document.getElementById('saveSettings').onclick = () => {
            this.settings.siteTitle = document.getElementById('siteTitle').value || '导航中心';
            this.saveData();
        };

        // 绑定弹窗关闭
        document.getElementById('categoryModalClose').onclick = () => this.closeModal('categoryModal');
        document.getElementById('categoryModalCancel').onclick = () => this.closeModal('categoryModal');
        document.getElementById('categoryModalSave').onclick = () => this.saveCategory();
        document.getElementById('addCategoryBtn').onclick = () => {
            this.editingCategory = null;
            document.getElementById('categoryModalTitle').textContent = '添加分类';
            document.getElementById('categoryName').value = '';
            this.openModal('categoryModal');
        };
        
        // 绑定链接弹窗
        document.getElementById('linkModalClose').onclick = () => this.closeModal('linkModal');
        document.getElementById('linkModalCancel').onclick = () => this.closeModal('linkModal');
        document.getElementById('linkModalSave').onclick = () => this.saveLink();

        // 绑定删除弹窗
        document.getElementById('confirmModalClose').onclick = () => this.closeModal('confirmModal');
        document.getElementById('confirmCancel').onclick = () => this.closeModal('confirmModal');
        document.getElementById('confirmDelete').onclick = () => {
            if (this.deleteCallback) this.deleteCallback();
            this.closeModal('confirmModal');
        };
    }

    renderCategories() {
        const container = document.getElementById('categoriesList');
        const sorted = [...this.categories].sort((a, b) => a.order - b.order);
        if (sorted.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无分类</div>';
            return;
        }
        container.innerHTML = sorted.map(c => `
            <div class="list-item">
                <div class="list-item-name">${c.name}</div>
                <div class="list-item-actions">
                    <button onclick="app.editCategory('${c.id}')"><i class="fas fa-edit"></i></button>
                    <button onclick="app.deleteCategoryConfirm('${c.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    renderLinks() {
        const container = document.getElementById('linksList');
        if (this.links.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无链接</div>';
            return;
        }
        container.innerHTML = this.links.map(l => `
            <div class="list-item">
                <div class="list-item-name">${l.name} <small>(${l.url})</small></div>
                <div class="list-item-actions">
                    <button onclick="app.editLink('${l.id}')"><i class="fas fa-edit"></i></button>
                    <button onclick="app.deleteLinkConfirm('${l.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    updateCategorySelects() {
        const html = this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        document.getElementById('quickCategory').innerHTML = '<option value="">选择分类</option>' + html;
        document.getElementById('linkCategory').innerHTML = html;
    }

    updateSettingsUI() {
        document.getElementById('siteTitle').value = this.settings.siteTitle;
    }

    openModal(id) { document.getElementById(id).classList.add('active'); }
    closeModal(id) { document.getElementById(id).classList.remove('active'); }

    editCategory(id) {
        const c = this.categories.find(x => x.id === id);
        this.editingCategory = c;
        document.getElementById('categoryName').value = c.name;
        this.openModal('categoryModal');
    }

    saveCategory() {
        const name = document.getElementById('categoryName').value.trim();
        if (!name) return;
        if (this.editingCategory) {
            this.editingCategory.name = name;
        } else {
            this.categories.push({ id: Date.now().toString(), name: name, order: this.categories.length });
        }
        this.saveData();
        this.closeModal('categoryModal');
        this.refreshUI();
    }

    deleteCategoryConfirm(id) {
        this.deleteCallback = () => {
            this.categories = this.categories.filter(c => c.id !== id);
            this.links = this.links.filter(l => l.categoryId !== id);
            this.saveData();
            this.refreshUI();
        };
        this.openModal('confirmModal');
    }

    quickAddLink() {
        const name = document.getElementById('quickName').value;
        const url = document.getElementById('quickUrl').value;
        const catId = document.getElementById('quickCategory').value;
        if (!name || !url || !catId) return this.showToast('请填写完整');
        this.links.push({ id: Date.now().toString(), categoryId: catId, name, url, order: 0 });
        this.saveData();
        this.refreshUI();
        document.getElementById('quickName').value = '';
        document.getElementById('quickUrl').value = '';
    }

    showToast(msg) {
        const t = document.createElement('div');
        t.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#000;color:#fff;padding:10px 20px;border-radius:5px;z-index:9999";
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2000);
    }
}

// 启动
const app = new AdminApp();
