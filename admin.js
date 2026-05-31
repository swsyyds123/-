const API_URL = 'https://api.swsong.ccwu.cc';

class AdminApp {
    constructor() {
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) { window.location.replace('login.html'); return; }
        const user = JSON.parse(savedUser);
        this.adminPassword = user.password;

        this.categories = [];
        this.links = [];
        this.settings = {};
        
        this.editingCategoryId = null; // 正在编辑的分类ID
        this.editingLinkId = null;     // 正在编辑的链接ID

        this.init();
    }

    async init() {
        await this.loadData();
        this.bindEvents();
        this.setupDragSort(); // 启用拖拽
    }

    // 从云端加载数据
    async loadData() {
        try {
            const res = await fetch(`${API_URL}/api/data`);
            const data = await res.json();
            if (data) {
                this.categories = data.categories || [];
                this.links = data.links || [];
                this.settings = data.settings || {};
                this.refreshUI();
            }
        } catch (e) {
            console.error("加载失败", e);
            alert("无法连接到API，请检查Worker状态");
        }
    }

    // 同步到云端 KV
    async syncToCloud() {
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
                this.showToast("同步云端成功！");
                localStorage.setItem('nav_sync', Date.now().toString());
            } else {
                alert("同步失败：" + result.error);
            }
        } catch (e) {
            alert("同步出错，请检查网络");
        }
    }

    refreshUI() {
        this.renderCategories();
        this.renderLinks();
        this.updateCategorySelects();
    }

    // --- 分类管理 ---
    renderCategories() {
        const container = document.getElementById('categoriesList');
        // 按 order 排序
        this.categories.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        container.innerHTML = this.categories.map(c => `
            <div class="list-item" draggable="true" data-id="${c.id}">
                <div class="list-item-info">
                    <i class="fas fa-grip-vertical" style="color:#ccc; margin-right:10px; cursor:move"></i>
                    <span class="list-item-name">${c.name}</span>
                </div>
                <div class="list-item-actions">
                    <button class="btn-secondary" onclick="app.openEditCategory('${c.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-danger" onclick="app.deleteCategory('${c.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    openEditCategory(id) {
        const cat = this.categories.find(c => c.id === id);
        if (!cat) return;
        this.editingCategoryId = id;
        document.getElementById('categoryModalTitle').textContent = "编辑分类";
        document.getElementById('categoryName').value = cat.name;
        document.getElementById('categoryModal').classList.add('active');
    }

    async saveCategory() {
        const name = document.getElementById('categoryName').value.trim();
        if (!name) return;

        if (this.editingCategoryId) {
            // 编辑
            const cat = this.categories.find(c => c.id === this.editingCategoryId);
            cat.name = name;
        } else {
            // 新增
            this.categories.push({ id: Date.now().toString(), name: name, order: this.categories.length });
        }

        this.editingCategoryId = null;
        document.getElementById('categoryModal').classList.remove('active');
        this.refreshUI();
        await this.syncToCloud();
    }

    async deleteCategory(id) {
        if (!confirm("确定删除该分类及其下所有链接吗？")) return;
        this.categories = this.categories.filter(c => c.id !== id);
        this.links = this.links.filter(l => l.categoryId !== id);
        this.refreshUI();
        await this.syncToCloud();
    }

    // --- 链接管理 ---
    renderLinks() {
        const container = document.getElementById('linksList');
        const filterId = document.getElementById('linkFilterCategory').value;
        
        let displayLinks = this.links;
        if (filterId) displayLinks = this.links.filter(l => l.categoryId === filterId);

        container.innerHTML = displayLinks.map(l => `
            <div class="list-item">
                <div class="list-item-info">
                    <span class="list-item-name">${l.name}</span>
                    <small style="color:#888; margin-left:10px">${l.url}</small>
                </div>
                <div class="list-item-actions">
                    <button class="btn-secondary" onclick="app.openEditLink('${l.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-danger" onclick="app.deleteLink('${l.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    openEditLink(id) {
        const link = this.links.find(l => l.id === id);
        if (!link) return;
        this.editingLinkId = id;
        document.getElementById('linkModalTitle').textContent = "编辑链接";
        document.getElementById('linkName').value = link.name;
        document.getElementById('linkUrl').value = link.url;
        document.getElementById('linkCategory').value = link.categoryId;
        document.getElementById('linkModal').classList.add('active');
    }

    async saveLink() {
        const name = document.getElementById('linkName').value.trim();
        const url = document.getElementById('linkUrl').value.trim();
        const catId = document.getElementById('linkCategory').value;

        if (!name || !url || !catId) return;

        if (this.editingLinkId) {
            const link = this.links.find(l => l.id === this.editingLinkId);
            link.name = name; link.url = url; link.categoryId = catId;
        } else {
            this.links.push({ id: Date.now().toString(), name, url, categoryId: catId, order: 0 });
        }

        this.editingLinkId = null;
        document.getElementById('linkModal').classList.remove('active');
        this.refreshUI();
        await this.syncToCloud();
    }

    async deleteLink(id) {
        if (!confirm("确定删除此链接吗？")) return;
        this.links = this.links.filter(l => l.id !== id);
        this.refreshUI();
        await this.syncToCloud();
    }

    // 拖拽排序逻辑
    setupDragSort() {
        const list = document.getElementById('categoriesList');
        let draggedItem = null;

        list.addEventListener('dragstart', (e) => {
            draggedItem = e.target;
            e.target.style.opacity = '0.5';
        });

        list.addEventListener('dragend', async (e) => {
            e.target.style.opacity = '';
            // 重新计算所有分类的 order
            const items = [...list.querySelectorAll('.list-item')];
            items.forEach((item, index) => {
                const id = item.dataset.id;
                const cat = this.categories.find(c => c.id === id);
                if (cat) cat.order = index;
            });
            await this.syncToCloud();
        });

        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(list, e.clientY);
            if (afterElement == null) {
                list.appendChild(draggedItem);
            } else {
                list.insertBefore(draggedItem, afterElement);
            }
        });

        function getDragAfterElement(container, y) {
            const elements = [...container.querySelectorAll('.list-item:not(.dragging)')];
            return elements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
    }

    // 辅助：更新下拉框
    updateCategorySelects() {
        const html = this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        const selects = ['quickCategory', 'linkCategory', 'linkFilterCategory'];
        selects.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const firstOpt = id === 'linkFilterCategory' ? '<option value="">全部分类</option>' : '<option value="">选择分类</option>';
                el.innerHTML = firstOpt + html;
            }
        });
    }

    bindEvents() {
        // 绑定弹窗关闭
        document.querySelectorAll('.modal-close, .btn-secondary').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
                this.editingCategoryId = null;
                this.editingLinkId = null;
            });
        });

        document.getElementById('categoryModalSave').onclick = () => this.saveCategory();
        document.getElementById('linkModalSave').onclick = () => this.saveLink();
        document.getElementById('linkFilterCategory').onchange = () => this.renderLinks();
        
        // 快速添加
        document.getElementById('quickAddBtn').onclick = async () => {
            const name = document.getElementById('quickName').value;
            const url = document.getElementById('quickUrl').value;
            const catId = document.getElementById('quickCategory').value;
            if (name && url && catId) {
                this.links.push({ id: Date.now().toString(), name, url, categoryId: catId, order: 0 });
                this.refreshUI();
                await this.syncToCloud();
                document.getElementById('quickName').value = '';
                document.getElementById('quickUrl').value = '';
            }
        };
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
