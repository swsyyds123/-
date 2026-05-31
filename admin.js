// 1. 配置与全局状态
const API_URL = 'https://api.swsong.ccwu.cc';
window.state = {
    categories: [],
    links: [],
    settings: { siteTitle: '导航中心', backgroundStyle: 'gradient1', backgroundImage: '' },
    editingId: null
};

// 2. 核心：同步到云端 KV (每一次操作都会调用)
async function syncToKV() {
    console.log("正在同步云端...");
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const payload = {
        password: user.password || '',
        categories: window.state.categories,
        links: window.state.links,
        settings: window.state.settings
    };

    try {
        const res = await fetch(`${API_URL}/api/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
            showToast("同步成功：云端数据已更新");
        } else {
            alert("同步失败：" + result.error);
        }
    } catch (e) {
        alert("网络异常：无法连接到 Cloudflare Worker");
    }
}

// 3. 页面初始化
async function loadData() {
    try {
        const res = await fetch(`${API_URL}/api/data`, { cache: 'no-cache' });
        const data = await res.json();
        
        if (data && data.categories && data.categories.length > 0) {
            window.state.categories = data.categories;
            window.state.links = data.links || [];
            window.state.settings = { ...window.state.settings, ...data.settings };
        } else {
            // 云端为空时加载内置默认值
            window.state.categories = getDefaultCategories();
            window.state.links = getDefaultLinks();
            await syncToKV();
        }
        refreshUI();
    } catch (e) {
        window.state.categories = getDefaultCategories();
        window.state.links = getDefaultLinks();
        refreshUI();
    }
}

// 4. 渲染逻辑
function refreshUI() {
    renderCategories();
    renderLinks();
    updateSelects();
    // 渲染设置面板的数据
    document.getElementById('siteTitle').value = window.state.settings.siteTitle || '';
    document.getElementById('bgImageUrl').value = window.state.settings.backgroundImage || '';
    if (window.state.settings.backgroundImage) {
        document.getElementById('bgPreviewContainer').innerHTML = `<img src="${window.state.settings.backgroundImage}" style="max-height:100px; border-radius:5px">`;
    }
}

function renderCategories() {
    const container = document.getElementById('categoriesList');
    window.state.categories.sort((a, b) => (a.order || 0) - (b.order || 0));
    container.innerHTML = window.state.categories.map(c => `
        <div class="list-item" draggable="true" ondragstart="handleDragStart(event)" ondragover="handleDragOver(event)" ondrop="handleDrop(event)" data-id="${c.id}">
            <div class="list-item-info">
                <i class="fas fa-grip-vertical" style="color:#ccc; margin-right:15px"></i>
                <span>${c.name}</span>
            </div>
            <div class="list-item-actions">
                <button class="btn-secondary" onclick="openEditCategory('${c.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-danger" onclick="deleteCategory('${c.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function renderLinks() {
    const container = document.getElementById('linksList');
    const filterId = document.getElementById('linkFilterCategory').value;
    const kw = document.getElementById('linkSearch').value.toLowerCase();
    let list = window.state.links;
    if (filterId) list = list.filter(l => l.categoryId === filterId);
    if (kw) list = list.filter(l => l.name.toLowerCase().includes(kw));

    container.innerHTML = list.map(l => `
        <div class="list-item">
            <div class="list-item-info">
                <strong>${l.name}</strong>
                <small style="color:#888; margin-left:10px">${l.url}</small>
            </div>
            <div class="list-item-actions">
                <button class="btn-secondary" onclick="openEditLink('${l.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-danger" onclick="deleteLink('${l.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

// 5. 全局交互函数 (挂载到 window 确保 HTML 里的 onclick 永远有效)

// 关闭所有弹窗
window.closeModals = function() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    window.state.editingId = null;
};

// 分类编辑
window.openEditCategory = function(id) {
    const cat = window.state.categories.find(c => c.id === id);
    window.state.editingId = id;
    document.getElementById('categoryModalTitle').textContent = "编辑分类";
    document.getElementById('categoryName').value = cat.name;
    document.getElementById('categoryModal').classList.add('active');
};

// 链接编辑
window.openEditLink = function(id) {
    const link = window.state.links.find(l => l.id === id);
    window.state.editingId = id;
    document.getElementById('linkModalTitle').textContent = "编辑链接";
    document.getElementById('linkName').value = link.name;
    document.getElementById('linkUrl').value = link.url;
    document.getElementById('linkCategory').value = link.categoryId;
    document.getElementById('linkModal').classList.add('active');
};

// 删除逻辑
window.deleteCategory = async function(id) {
    if (!confirm("确定删除分类吗？")) return;
    window.state.categories = window.state.categories.filter(c => c.id !== id);
    window.state.links = window.state.links.filter(l => l.categoryId !== id);
    refreshUI(); await syncToKV();
};

window.deleteLink = async function(id) {
    if (!confirm("确定删除链接吗？")) return;
    window.state.links = window.state.links.filter(l => l.id !== id);
    refreshUI(); await syncToKV();
};

// 6. 拖拽排序
let draggedElement = null;
window.handleDragStart = (e) => { draggedElement = e.currentTarget; };
window.handleDragOver = (e) => { e.preventDefault(); };
window.handleDrop = async (e) => {
    e.preventDefault();
    const target = e.currentTarget;
    if (target !== draggedElement) {
        const list = document.getElementById('categoriesList');
        const items = [...list.querySelectorAll('.list-item')];
        const draggedIdx = items.indexOf(draggedElement);
        const targetIdx = items.indexOf(target);
        if (draggedIdx < targetIdx) target.after(draggedElement);
        else target.before(draggedElement);

        const newItems = [...list.querySelectorAll('.list-item')];
        newItems.forEach((item, index) => {
            const id = item.dataset.id;
            window.state.categories.find(c => c.id === id).order = index;
        });
        await syncToKV();
    }
};

// 7. 绑定所有按钮点击事件
window.onload = () => {
    loadData();

    // 选项卡切换
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = (e) => {
            const section = e.currentTarget.dataset.section;
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            document.querySelectorAll('.panel-section').forEach(s => s.style.display = 'none');
            document.getElementById(section + 'Section').style.display = 'block';
        };
    });

    // 绑定弹窗里的取消和关闭按钮 (修复你的问题)
    document.querySelectorAll('.modal-close, #categoryModalCancel, #linkModalCancel').forEach(btn => {
        btn.onclick = () => window.closeModals();
    });

    // 保存分类
    document.getElementById('categoryModalSave').onclick = async () => {
        const name = document.getElementById('categoryName').value.trim();
        if (!name) return;
        if (window.state.editingId) {
            window.state.categories.find(c => c.id === window.state.editingId).name = name;
        } else {
            window.state.categories.push({ id: Date.now().toString(), name, order: window.state.categories.length });
        }
        window.closeModals(); refreshUI(); await syncToKV();
    };

    // 保存链接
    document.getElementById('linkModalSave').onclick = async () => {
        const name = document.getElementById('linkName').value.trim();
        const url = document.getElementById('linkUrl').value.trim();
        const catId = document.getElementById('linkCategory').value;
        if (window.state.editingId) {
            const l = window.state.links.find(l => l.id === window.state.editingId);
            if (l) { l.name = name; l.url = url; l.categoryId = catId; }
        }
        window.closeModals(); refreshUI(); await syncToKV();
    };

    // 保存全局设置 (修复你的设置问题)
    document.getElementById('saveSettings').onclick = async () => {
        window.state.settings.siteTitle = document.getElementById('siteTitle').value;
        const bgUrl = document.getElementById('bgImageUrl').value.trim();
        if (bgUrl) {
            window.state.settings.backgroundImage = bgUrl;
            window.state.settings.backgroundStyle = 'custom';
        }
        await syncToKV();
    };

    // 快捷添加
    document.getElementById('quickAddBtn').onclick = async () => {
        const name = document.getElementById('quickName').value;
        const url = document.getElementById('quickUrl').value;
        const catId = document.getElementById('quickCategory').value;
        if (name && url && catId) {
            window.state.links.push({ id: Date.now().toString(), name, url, categoryId: catId, order: 0 });
            refreshUI(); await syncToKV();
        }
    };

    // 退出
    document.getElementById('logoutBtn').onclick = () => { localStorage.clear(); location.href='login.html'; };
};

// 8. 辅助函数
function updateSelects() {
    const html = window.state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('quickCategory').innerHTML = html;
    document.getElementById('linkCategory').innerHTML = html;
    document.getElementById('linkFilterCategory').innerHTML = '<option value="">全部分类</option>' + html;
}

function showToast(m) {
    const t = document.createElement('div');
    t.style.cssText = "position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:white;padding:0.8rem 1.5rem;border-radius:8px;z-index:9999";
    t.textContent = m; document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

// 9. 默认数据模板
function getDefaultCategories() {
    return [
        { id: '1', name: '嫖之呼吸', order: 0 }, { id: '2', name: '嫖之呼吸-动漫', order: 1 },
        { id: '3', name: '嫖之呼吸-电影', order: 2 }, { id: '4', name: '嫖之呼吸-壁纸', order: 3 },
        { id: '5', name: '嫖之呼吸-游戏', order: 4 }, { id: '6', name: '常用办公', order: 5 },
        { id: '7', name: '白嫖通道', order: 6 }, { id: '8', name: '模板下载', order: 7 },
        { id: '9', name: 'AI领头羊', order: 8 }, { id: '10', name: '私人专用', order: 9 },
        { id: '11', name: '其他导航', order: 10 }, { id: '12', name: '有趣', order: 11 }, { id: '13', name: '各站合集', order: 12 }
    ];
}

function getDefaultLinks() {
         // 此处包含你之前发我的所有 152 个链接（篇幅原因，仅展示部分，建议保持此数组完整）
        return [
            {"id": "1", "categoryId": "1", "name": "炫猿", "url": "http://xydh.fun", "order": 0},
            {"id": "2", "categoryId": "1", "name": "YouTube", "url": "https://www.youtube.com/", "order": 1},
            {"id": "3", "categoryId": "1", "name": "小鸡词典", "url": "https://jikipedia.com/", "order": 2},
            {"id": "4", "categoryId": "1", "name": "排行榜", "url": "http://guozhivip.com/rank/", "order": 3},
            {"id": "5", "categoryId": "1", "name": "幕布", "url": "https://mubu.com/app", "order": 4},
            {"id": "6", "categoryId": "1", "name": "孟坤工具箱", "url": "http://lab.mkblog.cn/", "order": 5},
            {"id": "7", "categoryId": "1", "name": "伸手党克星", "url": "https://btfy.eu.org/", "order": 6},
            {"id": "8", "categoryId": "1", "name": "Yandex", "url": "https://yandex.com/", "order": 7},
            {"id": "9", "categoryId": "2", "name": "AGE动漫", "url": "https://www.agedm.io/", "order": 0},
            {"id": "10", "categoryId": "2", "name": "打驴动漫", "url": "https://www.dalvdm.cc/", "order": 1},
            {"id": "11", "categoryId": "2", "name": "嘀哩嘀哩", "url": "https://www.dilidili23.com/", "order": 2},
            {"id": "12", "categoryId": "2", "name": "新番列表", "url": "https://www.miluxing.com/", "order": 3},
            {"id": "13", "categoryId": "2", "name": "菲特动漫", "url": "https://fitacg.com/", "order": 4},
            {"id": "14", "categoryId": "2", "name": "去看吧", "url": "https://11kt.net/", "order": 5},
            {"id": "15", "categoryId": "2", "name": "异世界动漫", "url": "https://www.dmmiku.net/", "order": 6},
            {"id": "16", "categoryId": "2", "name": "奇米动漫", "url": "https://www.qimiqimi.net/", "order": 7},
            {"id": "17", "categoryId": "2", "name": "MuteFun", "url": "https://www.mutedm.com/", "order": 8},
            {"id": "18", "categoryId": "2", "name": "咕咕番", "url": "https://www.gugu3.com/", "order": 9},
            {"id": "19", "categoryId": "2", "name": "动漫花园", "url": "https://animes.garden/", "order": 10},
            {"id": "20", "categoryId": "2", "name": "4K动漫", "url": "https://cn.agekkkk.com/", "order": 11},
            {"id": "21", "categoryId": "2", "name": "嗷呜动漫", "url": "https://www.aowu.tv/", "order": 12},
            {"id": "22", "categoryId": "3", "name": "七味", "url": "https://www.pkavi.com/", "order": 0},
            {"id": "23", "categoryId": "3", "name": "欧豹影院", "url": "https://www.obzhi.com/", "order": 1},
            {"id": "24", "categoryId": "3", "name": "LIBVIO", "url": "https://www.libvio.app/", "order": 2},
            {"id": "25", "categoryId": "3", "name": "7080", "url": "https://7080.wang/", "order": 3},
            {"id": "26", "categoryId": "3", "name": "音范丝", "url": "https://www.yinfans.me/", "order": 4},
            {"id": "27", "categoryId": "3", "name": "SubHD", "url": "https://subhd.tv/", "order": 5},
            {"id": "28", "categoryId": "3", "name": "片吧影视", "url": "https://www.yespb.com/", "order": 6},
            {"id": "29", "categoryId": "3", "name": "HDmoli", "url": "https://www.hdmoli.pro/", "order": 7},
            {"id": "30", "categoryId": "3", "name": "厂长资源", "url": "https://www.czzymovie.com/", "order": 8},
            {"id": "31", "categoryId": "3", "name": "观影", "url": "https://www.xn--wcv59z.com/", "order": 9},
            {"id": "32", "categoryId": "3", "name": "追剧猫", "url": "https://zhuiyingmao4.com/", "order": 10},
            {"id": "33", "categoryId": "3", "name": "茶杯狐", "url": "https://www.acupfox.com/", "order": 11},
            {"id": "34", "categoryId": "3", "name": "完整剧名", "url": "https://quarksoo.cc/search.php", "order": 12},
            {"id": "35", "categoryId": "3", "name": "盘链", "url": "https://pinglian.lol/index.php", "order": 13},
            {"id": "36", "categoryId": "4", "name": "极简壁纸", "url": "https://bz.zzzmh.cn/", "order": 0},
            {"id": "37", "categoryId": "4", "name": "搜图导航", "url": "https://www.91sotu.com/", "order": 1},
            {"id": "38", "categoryId": "4", "name": "画师通", "url": "https://www.huashi6.com/", "order": 2},
            {"id": "39", "categoryId": "4", "name": "Wallhaven", "url": "https://wallhaven.cc/", "order": 3},
            {"id": "40", "categoryId": "4", "name": "动漫壁纸", "url": "https://anime-pictures.net/", "order": 4},
            {"id": "41", "categoryId": "4", "name": "Yuumei", "url": "https://www.yuumeiart.com/", "order": 5},
            {"id": "42", "categoryId": "4", "name": "MyLive", "url": "https://mylivewallpapers.com/", "order": 6},
            {"id": "43", "categoryId": "4", "name": "4K壁纸", "url": "https://haowallpaper.com/homeView", "order": 7},
            {"id": "44", "categoryId": "5", "name": "吾爱破解", "url": "https://www.52pojie.cn/", "order": 0},
            {"id": "45", "categoryId": "5", "name": "刀网", "url": "https://www.x6d.com/", "order": 1},
            {"id": "46", "categoryId": "5", "name": "switch游戏下载", "url": "https://www.gamer520.com/", "order": 2},
            {"id": "47", "categoryId": "5", "name": "初音社", "url": "https://www.mikuclub.work/", "order": 3},
            {"id": "48", "categoryId": "5", "name": "LAOYEE", "url": "https://myzye.com/", "order": 4},
            {"id": "49", "categoryId": "5", "name": "STEAMTOOL", "url": "https://www.steamtools.net/", "order": 5},
            {"id": "50", "categoryId": "5", "name": "极限游戏", "url": "https://www.xgamefan.com/", "order": 6},
            {"id": "51", "categoryId": "5", "name": "BT收藏夹", "url": "https://zyscj.com/zy/search/btciliweb.html", "order": 7},
            {"id": "52", "categoryId": "5", "name": "枫音应用", "url": "https://www.fy6b.com/", "order": 8},
            {"id": "53", "categoryId": "5", "name": "BT之家", "url": "https://www.1lou.me/", "order": 9},
            {"id": "54", "categoryId": "5", "name": "游戏分享社区", "url": "https://www.gameshare.cc/", "order": 10},
            {"id": "55", "categoryId": "5", "name": "All Games", "url": "https://ankergames.net/games-list", "order": 11},
            {"id": "56", "categoryId": "6", "name": "文件格式转换", "url": "https://www.aconvert.com/", "order": 0},
            {"id": "57", "categoryId": "6", "name": "iKuuu", "url": "https://ikuuu.win/auth/login", "order": 1},
            {"id": "58", "categoryId": "6", "name": "软仓", "url": "https://www.ruancang.net/", "order": 2},
            {"id": "59", "categoryId": "6", "name": "PDF转DOC", "url": "https://pdf2doc.com/zh/", "order": 3},
            {"id": "60", "categoryId": "6", "name": "文件转换器", "url": "https://convertio.co/zh/", "order": 4},
            {"id": "61", "categoryId": "6", "name": "iLovePDF", "url": "https://www.ilovepdf.com/zh-cn", "order": 5},
            {"id": "62", "categoryId": "6", "name": "工具箱", "url": "https://www.toolnb.com/", "order": 6},
            {"id": "63", "categoryId": "6", "name": "趣作图", "url": "https://www.quzuotu.com/home", "order": 7},
            {"id": "64", "categoryId": "6", "name": "题库", "url": "https://www.gkzenti.cn/", "order": 8},
            {"id": "65", "categoryId": "6", "name": "学习通", "url": "https://i.chaoxing.com/", "order": 9},
            {"id": "66", "categoryId": "6", "name": "AI配音", "url": "https://acgn.ttson.cn/", "order": 10},
            {"id": "67", "categoryId": "6", "name": "微信网页版", "url": "https://szfilehelper.weixin.qq.com/", "order": 11},
            {"id": "68", "categoryId": "6", "name": "图床", "url": "https://imgloc.com/", "order": 12},
            {"id": "69", "categoryId": "7", "name": "MyFreeMP3", "url": "http://tool.liumingye.cn/music/", "order": 0},
            {"id": "70", "categoryId": "7", "name": "折飞机大全", "url": "https://www.foldnfly.com/#/1-1-1-1-1-1-1-1-2", "order": 1},
            {"id": "71", "categoryId": "7", "name": "果核剥壳", "url": "https://www.ghpym.com/", "order": 2},
            {"id": "72", "categoryId": "7", "name": "放屁网", "url": "https://www.fangpi.net/", "order": 3},
            {"id": "73", "categoryId": "7", "name": "BigJPG", "url": "https://bigjpg.com/", "order": 4},
            {"id": "74", "categoryId": "7", "name": "423down", "url": "https://www.423down.com/", "order": 5},
            {"id": "75", "categoryId": "7", "name": "文库下载", "url": "http://www.lexueduosi.com/", "order": 6},
            {"id": "76", "categoryId": "7", "name": "视频解析", "url": "https://snapany.com/zh/bilibili", "order": 7},
            {"id": "77", "categoryId": "7", "name": "Office激活", "url": "https://massgrave.dev/", "order": 8},
            {"id": "78", "categoryId": "7", "name": "阿虚同学的储物间", "url": "https://axutongxue.com/", "order": 9},
            {"id": "79", "categoryId": "7", "name": "软件搜搜", "url": "https://hew666.github.io/rjss/", "order": 10},
            {"id": "80", "categoryId": "7", "name": "哦游Max", "url": "https://oyoumax.com/", "order": 11},
            {"id": "81", "categoryId": "7", "name": "ScriptCat", "url": "https://scriptcat.org/zh-CN/search", "order": 12},
            {"id": "82", "categoryId": "7", "name": "软件社", "url": "https://www.sncys.com/", "order": 13},
            {"id": "83", "categoryId": "7", "name": "克隆窝", "url": "https://www.uy5.net/", "order": 14},
            {"id": "84", "categoryId": "8", "name": "简历模板", "url": "https://www.51386.com/", "order": 0},
            {"id": "85", "categoryId": "8", "name": "模之屋", "url": "https://www.aplaybox.com/", "order": 1},
            {"id": "86", "categoryId": "8", "name": "优品PPT", "url": "https://www.ypppt.com/", "order": 2},
            {"id": "87", "categoryId": "8", "name": "第一PPT", "url": "https://www.1ppt.com/", "order": 3},
            {"id": "88", "categoryId": "8", "name": "站长素材", "url": "https://sc.chinaz.com/", "order": 4},
            {"id": "89", "categoryId": "8", "name": "51PPT", "url": "https://www.51pptmoban.com/", "order": 5},
            {"id": "90", "categoryId": "8", "name": "PPTfans", "url": "https://www.pptfans.cn/", "order": 6},
            {"id": "91", "categoryId": "8", "name": "起兮抠图", "url": "http://matting.deeplor.com/", "order": 7},
            {"id": "92", "categoryId": "9", "name": "AIchatOS", "url": "https://chat18.aichatos.xyz/", "order": 0},
            {"id": "93", "categoryId": "9", "name": "深度AI导航", "url": "https://www.deepdhai.com/", "order": 1},
            {"id": "94", "categoryId": "9", "name": "文心一言", "url": "https://yiyan.baidu.com/", "order": 2},
            {"id": "95", "categoryId": "9", "name": "秘塔AI", "url": "https://metaso.cn/", "order": 3},
            {"id": "96", "categoryId": "9", "name": "Kimi", "url": "https://www.kimi.com/", "order": 4},
            {"id": "97", "categoryId": "9", "name": "通义千问", "url": "https://www.qianwen.com/", "order": 5},
            {"id": "98", "categoryId": "9", "name": "智谱清言", "url": "https://chatglm.cn/main/alltoolsdetail", "order": 6},
            {"id": "99", "categoryId": "9", "name": "天工AI", "url": "https://www.tiangong.cn/", "order": 7},
            {"id": "100", "categoryId": "9", "name": "讯飞星火", "url": "https://xinghuo.xfyun.cn", "order": 8},
            {"id": "101", "categoryId": "9", "name": "DeepSeek", "url": "https://chat.deepseek.com/", "order": 9},
            {"id": "102", "categoryId": "9", "name": "豆包", "url": "https://www.doubao.com/chat/", "order": 10},
            {"id": "103", "categoryId": "9", "name": "最伟大的AI", "url": "https://flo.ing/blank", "order": 11},
            {"id": "104", "categoryId": "9", "name": "LMArena", "url": "https://lmarena.ai/", "order": 12},
            {"id": "105", "categoryId": "9", "name": "Gemini", "url": "https://aistudio.google.com/", "order": 13},
            {"id": "106", "categoryId": "10", "name": "ALL", "url": "https://theporndude.vip/", "order": 0},
            {"id": "107", "categoryId": "10", "name": "百合大法", "url": "https://yuriimg.com/", "order": 1},
            {"id": "108", "categoryId": "10", "name": "ASMR Online", "url": "https://asmr.one/works", "order": 2},
            {"id": "109", "categoryId": "10", "name": "新片速递", "url": "https://v001.c0205117.cc/pw/", "order": 3},
            {"id": "110", "categoryId": "10", "name": "ASMR", "url": "https://asmr-300.com/works", "order": 4},
            {"id": "111", "categoryId": "10", "name": "紳士会所", "url": "https://www.sshs.pw/", "order": 5},
            {"id": "112", "categoryId": "10", "name": "每日大赛", "url": "https://mrds27.com", "order": 6},
            {"id": "113", "categoryId": "10", "name": "MissAV", "url": "https://missav.ws/cn/actresses?page=3", "order": 7},
            {"id": "114", "categoryId": "10", "name": "COS视频", "url": "https://spankbang.com/s/cosplay/", "order": 8},
            {"id": "115", "categoryId": "10", "name": "Artists", "url": "https://coomer.su/artists", "order": 9},
            {"id": "116", "categoryId": "10", "name": "四色", "url": "http://www.55nana.com", "order": 10},
            {"id": "117", "categoryId": "10", "name": "sex论坛", "url": "https://169bt.com/forum.php", "order": 11},
            {"id": "118", "categoryId": "11", "name": "萌站", "url": "http://moe321.com/", "order": 0},
            {"id": "119", "categoryId": "11", "name": "FOREVER", "url": "https://xydh.fun/wxcs0407forever", "order": 1},
            {"id": "120", "categoryId": "11", "name": "52111", "url": "https://xydh.fun/swsyyds", "order": 2},
            {"id": "121", "categoryId": "11", "name": "次元猫", "url": "https://acgmiao.net/", "order": 3},
            {"id": "122", "categoryId": "11", "name": "MyACG", "url": "https://myacg.pro/", "order": 4},
            {"id": "123", "categoryId": "11", "name": "快导航", "url": "https://www.hifast.cn/", "order": 5},
            {"id": "124", "categoryId": "11", "name": "Moebox", "url": "https://www.moe-box.com/", "order": 6},
            {"id": "125", "categoryId": "11", "name": "以一当十", "url": "https://www.yydsok.com/", "order": 7},
            {"id": "126", "categoryId": "11", "name": "凌凌柒啦导航", "url": "https://www.007la.com/", "order": 8},
            {"id": "127", "categoryId": "11", "name": "虾皮网", "url": "https://www.xia365.com/", "order": 9},
            {"id": "128", "categoryId": "11", "name": "极简导航", "url": "https://nav.zzzmh.cn/", "order": 10},
            {"id": "129", "categoryId": "11", "name": "爱达杂货铺", "url": "https://adzhp.cc/", "order": 11},
            {"id": "130", "categoryId": "11", "name": "零度博客", "url": "https://www.freedidi.com/", "order": 12},
            {"id": "131", "categoryId": "11", "name": "开发者导航", "url": "https://codernav.com/", "order": 13},
            {"id": "132", "categoryId": "12", "name": "逗比表情包", "url": "https://www.dbbqb.com/", "order": 0},
            {"id": "133", "categoryId": "12", "name": "有趣网址之家", "url": "https://youquhome.com/", "order": 1},
            {"id": "134", "categoryId": "12", "name": "听雨声", "url": "https://www.rainymood.com/", "order": 2},
            {"id": "135", "categoryId": "12", "name": "MVCAT", "url": "https://www.mvcat.com/", "order": 3},
            {"id": "136", "categoryId": "12", "name": "实况摄像头", "url": "https://www.skylinwebcams.com/", "order": 4},
            {"id": "137", "categoryId": "12", "name": "次元岛", "url": "http://ciyuandao.com/", "order": 5},
            {"id": "138", "categoryId": "12", "name": "DiskGirl", "url": "https://diskgirl.com/pc.html", "order": 6},
            {"id": "139", "categoryId": "12", "name": "童年模拟器", "url": "https://lemonjing.com/childhood/", "order": 7},
            {"id": "140", "categoryId": "12", "name": "奇趣收藏", "url": "https://fuun.fun/", "order": 8},
            {"id": "141", "categoryId": "13", "name": "A站", "url": "https://www.acfun.cn/", "order": 0},
            {"id": "142", "categoryId": "13", "name": "B站", "url": "https://www.bilibili.com/", "order": 1},
            {"id": "143", "categoryId": "13", "name": "C站", "url": "https://www.clicli.cc/", "order": 2},
            {"id": "144", "categoryId": "13", "name": "D站", "url": "https://www.5dm.link/", "order": 3},
            {"id": "145", "categoryId": "13", "name": "F站", "url": "https://www.fjyxdm.com/", "order": 4},
            {"id": "146", "categoryId": "13", "name": "I站", "url": "https://idanmu.im/", "order": 5},
            {"id": "147", "categoryId": "13", "name": "K站", "url": "https://konachan.net/", "order": 6},
            {"id": "148", "categoryId": "13", "name": "M站", "url": "https://www.missevan.com/", "order": 7},
            {"id": "149", "categoryId": "13", "name": "N站", "url": "https://www.nicovideo.jp/", "order": 8},
            {"id": "150", "categoryId": "13", "name": "O站", "url": "http://www.onijiang.com/", "order": 9},
            {"id": "151", "categoryId": "13", "name": "Z站", "url": "http://www.zzzfun.one/", "order": 10},
            {"id": "152", "categoryId": "13", "name": "E站", "url": "https://www.ezdmw.site/", "order": 11}
        ];
    }
