const API_URL = 'https://api.swsong.ccwu.cc';

class AdminApp {
    constructor() {
        console.log("管理后台正在启动...");
        this.initData();
        
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) {
            console.log("未检测到登录信息，跳转登录页");
            window.location.replace('login.html?redirect=admin');
            return;
        }

        try {
            const user = JSON.parse(savedUser);
            this.adminPassword = user.password || '';
            if (Date.now() > user.expiresAt) {
                window.location.replace('login.html');
                return;
            }
        } catch (e) {
            window.location.replace('login.html');
            return;
        }

        // 绑定按钮事件
        this.bindEvents();
        // 尝试从云端加载数据
        this.loadData();
    }

    initData() {
        this.categories = [];
        this.links = [];
        this.settings = { siteTitle: '导航中心', fontSize: 'medium', layout: 'grid' };
    }

    bindEvents() {
        // 绑定顶部导航
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.onclick = (e) => {
                const section = e.currentTarget.dataset.section;
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                document.querySelectorAll('.panel-section').forEach(s => s.style.display = 'none');
                const target = document.getElementById(section + 'Section');
                if (target) target.style.display = 'block';
            };
        });

        // 绑定基础按钮
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.onclick = () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        };

        const saveSettings = document.getElementById('saveSettings');
        if (saveSettings) saveSettings.onclick = () => {
            this.settings.siteTitle = document.getElementById('siteTitle').value;
            this.saveData();
        };

        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) addCategoryBtn.onclick = () => {
            this.editingCategory = null;
            document.getElementById('categoryModalTitle').textContent = '添加分类';
            document.getElementById('categoryName').value = '';
            document.getElementById('categoryModal').classList.add('active');
        };

        // 弹窗取消按钮
        document.querySelectorAll('.modal-close, .btn-secondary').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
            });
        });
        
        // 分类保存
        document.getElementById('categoryModalSave').onclick = () => this.saveCategory();
        // 快速添加链接
        document.getElementById('quickAddBtn').onclick = () => this.quickAddLink();
    }

    loadData() {
        fetch(`${API_URL}/api/data`)
            .then(res => res.json())
            .then(data => {
                console.log("云端数据已拉取:", data);
                if (data.categories) this.categories = data.categories;
                if (data.links) this.links = data.links;
                if (data.settings) this.settings = { ...this.settings, ...data.settings };
                this.renderUI();
            })
            .catch(err => {
                console.error("加载云端失败，使用本地默认:", err);
                this.renderUI();
            });
    }

    renderUI() {
        this.renderCategories();
        this.renderLinks();
        this.updateCategorySelects();
        document.getElementById('siteTitle').value = this.settings.siteTitle || '';
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
                alert('同步成功！');
                localStorage.setItem('nav_sync', Date.now().toString());
            } else {
                alert('同步失败：' + (data.error || '原因未知'));
            }
        })
        .catch(err => alert('网络错误，无法连接 API'));
    }

    renderCategories() {
        const list = document.getElementById('categoriesList');
        if (!list) return;
        list.innerHTML = this.categories.map(c => `
            <div class="list-item">
                <span>${c.name}</span>
                <button class="btn-danger" onclick="app.deleteCategory('${c.id}')">删除</button>
            </div>
        `).join('');
    }

    saveCategory() {
        const name = document.getElementById('categoryName').value;
        if (!name) return;
        this.categories.push({ id: Date.now().toString(), name: name, order: this.categories.length });
        this.saveData();
        document.getElementById('categoryModal').classList.remove('active');
        this.renderUI();
    }

    deleteCategory(id) {
        if (!confirm('确定删除吗？')) return;
        this.categories = this.categories.filter(c => c.id !== id);
        this.saveData();
        this.renderUI();
    }

    updateCategorySelects() {
        const html = this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        const qc = document.getElementById('quickCategory');
        if (qc) qc.innerHTML = '<option value="">选择分类</option>' + html;
    }

    quickAddLink() {
        const name = document.getElementById('quickName').value;
        const url = document.getElementById('quickUrl').value;
        const cat = document.getElementById('quickCategory').value;
        if (!name || !url || !cat) return alert('请填全');
        this.links.push({ id: Date.now().toString(), categoryId: cat, name, url, order: 0 });
        this.saveData();
        this.renderUI();
    }

    renderLinks() {
        const list = document.getElementById('linksList');
        if (!list) return;
        list.innerHTML = this.links.map(l => `<div class="list-item">${l.name} (${l.url})</div>`).join('');
    }
}

// 全局实例化
window.app = new AdminApp();
