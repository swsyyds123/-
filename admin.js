const API_URL = 'https://api.swsong.ccwu.cc';

class AdminApp {
    constructor() {
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) {
            window.location.replace('login.html?redirect=admin');
            return;
        }
        const user = JSON.parse(savedUser);
        this.adminPassword = user.password; // 拿到登录时输入的密码

        this.categories = [];
        this.links = [];
        this.settings = { siteTitle: '导航中心', fontSize: 'medium', layout: 'grid' };
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadData();
    }

    async loadData() {
        try {
            console.log("正在尝试从云端同步...");
            const res = await fetch(`${API_URL}/api/data`);
            const data = await res.json();
            
            // 如果云端有数据，使用云端的；否则使用默认初始数据
            if (data && data.categories && data.categories.length > 0) {
                this.categories = data.categories;
                this.links = data.links || [];
                this.settings = data.settings || this.settings;
                console.log("云端数据加载成功");
            } else {
                console.log("云端无数据，加载默认初始值");
                this.categories = [
                    { id: '1', name: '嫖之呼吸', order: 0 },
                    { id: '2', name: '常用办公', order: 1 }
                ];
                this.links = [];
            }
            this.renderAll();
        } catch (e) {
            console.error("加载失败", e);
            alert("同步失败，请检查网络");
        }
    }

    renderAll() {
        this.renderCategories();
        this.renderLinks();
        this.updateCategorySelects();
        document.getElementById('siteTitle').value = this.settings.siteTitle || '';
    }

    bindEvents() {
        // 1. 顶部页签切换逻辑 (解决点什么都没反应)
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.onclick = (e) => {
                const section = e.currentTarget.dataset.section;
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                document.querySelectorAll('.panel-section').forEach(s => s.style.display = 'none');
                document.getElementById(section + 'Section').style.display = 'block';
            };
        });

        // 2. 基础控制按钮
        document.getElementById('backBtn').onclick = () => window.location.href = 'index.html';
        document.getElementById('logoutBtn').onclick = () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        };

        // 3. 添加分类弹窗
        document.getElementById('addCategoryBtn').onclick = () => {
            document.getElementById('categoryModalTitle').textContent = '添加分类';
            document.getElementById('categoryName').value = '';
            document.getElementById('categoryModal').classList.add('active');
        };

        // 4. 保存分类
        document.getElementById('categoryModalSave').onclick = () => {
            const name = document.getElementById('categoryName').value.trim();
            if (!name) return;
            this.categories.push({ id: Date.now().toString(), name: name, order: this.categories.length });
            this.saveData();
            this.closeModals();
            this.renderAll();
        };

        // 5. 保存设置
        document.getElementById('saveSettings').onclick = () => {
            this.settings.siteTitle = document.getElementById('siteTitle').value;
            this.saveData();
        };

        // 6. 快速添加链接
        document.getElementById('quickAddBtn').onclick = () => {
            const name = document.getElementById('quickName').value;
            const url = document.getElementById('quickUrl').value;
            const catId = document.getElementById('quickCategory').value;
            if (!name || !url || !catId) return alert("请填写完整信息");
            this.links.push({ id: Date.now().toString(), categoryId: catId, name, url, order: 0 });
            this.saveData();
            this.renderAll();
        };

        // 7. 弹窗关闭
        document.querySelectorAll('.modal-close, #categoryModalCancel').forEach(b => {
            b.onclick = () => this.closeModals();
        });
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
            const result = await res.json();
            if (result.success) {
                this.showToast("同步成功！");
                localStorage.setItem('nav_sync', Date.now().toString());
            } else {
                alert("保存失败：" + result.error);
                if (result.error.includes("密码")) window.location.href = 'login.html';
            }
        } catch (e) { alert("网络错误，无法连接云端"); }
    }

    renderCategories() {
        const list = document.getElementById('categoriesList');
        if (!list) return;
        list.innerHTML = this.categories.map(c => `
            <div class="list-item">
                <div class="list-item-name">${c.name}</div>
                <button class="btn-danger" style="padding:4px 8px" onclick="window.app.deleteCategory('${c.id}')">删除</button>
            </div>
        `).join('');
    }

    deleteCategory(id) {
        if (!confirm("删除分类会同时删除该分类下的链接，确定吗？")) return;
        this.categories = this.categories.filter(c => c.id !== id);
        this.links = this.links.filter(l => l.categoryId !== id);
        this.saveData();
        this.renderAll();
    }

    renderLinks() {
        const list = document.getElementById('linksList');
        if (!list) return;
        list.innerHTML = this.links.map(l => `
            <div class="list-item">
                <div class="list-item-name">${l.name} <small>(${l.url})</small></div>
            </div>
        `).join('');
    }

    updateCategorySelects() {
        const html = this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        document.getElementById('quickCategory').innerHTML = '<option value="">选择分类</option>' + html;
    }

    closeModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    }

    showToast(msg) {
        const t = document.createElement('div');
        t.style.cssText = "position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:white;padding:0.8rem 1.5rem;border-radius:8px;z-index:9999";
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2000);
    }
}

// 绑定到 window
window.app = new AdminApp();
