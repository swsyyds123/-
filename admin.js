// ========== API 配置 ==========
const API_URL = 'https://nav-api.2798402860.workers.dev';
const ADMIN_PASSWORD = '123..sws..716';

// 后台管理页面
class AdminApp {
    constructor() {
        if (!this.isAuthenticated()) {
            window.location.replace('login.html?redirect=admin');
            return;
        }

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
        
        this.init();
    }

    isAuthenticated() {
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) return false;

        try {
            const currentUser = JSON.parse(savedUser);
            if (!currentUser || !currentUser.username || !currentUser.expiresAt) {
                localStorage.removeItem('currentUser');
                return false;
            }

            if (Date.now() > currentUser.expiresAt) {
                localStorage.removeItem('currentUser');
                return false;
            }

            return true;
        } catch (e) {
            localStorage.removeItem('currentUser');
            return false;
        }
    }

    init() {
        this.loadData();
        this.bindEvents();
        this.renderCategories();
        this.renderLinks();
        this.updateCategorySelects();
        this.updateSettingsUI();
    }

    // ========== 从 Cloudflare Workers API 加载数据 ==========
    loadData() {
        fetch(`${API_URL}/api/data`)
            .then(res => {
                if (!res.ok) throw new Error('API 请求失败');
                return res.json();
            })
            .then(data => {
                console.log('从 API 加载数据成功:', data);
                if (data.categories && data.categories.length > 0) {
                    this.categories = data.categories;
                } else {
                    this.categories = this.getDefaultCategories();
                }
                if (data.links && data.links.length > 0) {
                    this.links = data.links;
                } else {
                    this.links = this.getDefaultLinks();
                }
                if (data.settings) {
                    this.settings = { ...this.settings, ...data.settings };
                }
                // 缓存到本地
                localStorage.setItem('nav_categories', JSON.stringify(this.categories));
                localStorage.setItem('nav_links', JSON.stringify(this.links));
                localStorage.setItem('nav_settings', JSON.stringify(this.settings));
                this.renderCategories();
                this.renderLinks();
                this.updateCategorySelects();
                this.updateSettingsUI();
            })
            .catch(err => {
                console.error('API 加载失败，使用本地数据:', err);
                // 回退到 localStorage
                const savedCategories = localStorage.getItem('nav_categories');
                const savedLinks = localStorage.getItem('nav_links');
                const savedSettings = localStorage.getItem('nav_settings');

                if (savedCategories) {
                    try { this.categories = JSON.parse(savedCategories); } 
                    catch (e) { this.categories = this.getDefaultCategories(); }
                } else {
                    this.categories = this.getDefaultCategories();
                }

                if (savedLinks) {
                    try { this.links = JSON.parse(savedLinks); } 
                    catch (e) { this.links = this.getDefaultLinks(); }
                } else {
                    this.links = this.getDefaultLinks();
                }

                if (savedSettings) {
                    try { this.settings = { ...this.settings, ...JSON.parse(savedSettings) }; } 
                    catch (e) {}
                }

                this.renderCategories();
                this.renderLinks();
                this.updateCategorySelects();
                this.updateSettingsUI();
            });
    }

    // ========== 保存数据到 Cloudflare Workers API ==========
// admin.js 里的 saveData 函数替换为这个：
saveData() {
    const payload = {
        password: ADMIN_PASSWORD,
        categories: this.categories,
        links: this.links,
        settings: this.settings
    };

    this.showToast('正在同步到云端...');

    fetch(`${API_URL}/api/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // 关键：在云端保存成功后，立即更新本地缓存的时间戳
            // 这样前台 index.html 刷新时才能拿到最新数据
            localStorage.setItem('nav_categories', JSON.stringify(this.categories));
            localStorage.setItem('nav_links', JSON.stringify(this.links));
            localStorage.setItem('nav_settings', JSON.stringify(this.settings));
            localStorage.setItem('nav_sync', Date.now().toString()); 
            
            this.showToast('同步成功！多端数据已更新');
            console.log('数据已同步到 Cloudflare KV');
        } else {
            this.showToast('保存失败: ' + (data.error || '未知错误'));
        }
    })
    .catch(err => {
        console.error('API 保存失败:', err);
        this.showToast('网络异常，保存失败');
    });
}

    resetBgPreview() {
        const previewContainer = document.getElementById('bgPreviewContainer');
        if (previewContainer) {
            previewContainer.innerHTML = `
                <div class="bg-preview-placeholder">
                    <i class="fas fa-image"></i>
                    <p>图片预览区域</p>
                </div>
            `;
            previewContainer.classList.remove('has-image');
        }
    }

    previewImage(url) {
        const previewContainer = document.getElementById('bgPreviewContainer');
        previewContainer.innerHTML = '';
        
        const img = document.createElement('img');
        img.className = 'bg-preview';
        img.src = url;
        img.onload = () => {
            previewContainer.classList.add('has-image');
            this.showToast('图片预览成功');
        };
        img.onerror = () => {
            previewContainer.innerHTML = `
                <div class="bg-preview-placeholder">
                    <i class="fas fa-image"></i>
                    <p>图片加载失败，请检查链接</p>
                </div>
            `;
            previewContainer.classList.remove('has-image');
            this.showToast('图片加载失败，请检查链接');
        };
        
        previewContainer.appendChild(img);
        document.getElementById('localBgImage').value = '';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getDefaultCategories() {
        return [
            { id: '1', name: '嫖之呼吸', order: 0 },
            { id: '2', name: '嫖之呼吸-动漫', order: 1 },
            { id: '3', name: '嫖之呼吸-电影', order: 2 },
            { id: '4', name: '嫖之呼吸-壁纸', order: 3 },
            { id: '5', name: '嫖之呼吸-游戏', order: 4 },
            { id: '6', name: '常用办公', order: 5 },
            { id: '7', name: '白嫖通道', order: 6 },
            { id: '8', name: '模板下载', order: 7 },
            { id: '9', name: 'AI领头羊', order: 8 },
            { id: '10', name: '私人专用', order: 9 },
            { id: '11', name: '其他导航', order: 10 },
            { id: '12', name: '有趣', order: 11 },
            { id: '13', name: '各站合集', order: 12 }
        ];
    }

    getDefaultLinks() {
        return [
            { id: '1', categoryId: '1', name: '炫猿', url: 'http://xydh.fun', order: 0 },
            { id: '2', categoryId: '1', name: 'YouTube', url: 'https://www.youtube.com/', order: 1 },
            { id: '3', categoryId: '1', name: '小鸡词典', url: 'https://jikipedia.com/', order: 2 },
            { id: '4', categoryId: '1', name: '排行榜', url: 'http://guozhivip.com/rank/', order: 3 },
            { id: '5', categoryId: '1', name: '幕布', url: 'https://mubu.com/app', order: 4 },
            { id: '6', categoryId: '1', name: '孟坤工具箱', url: 'http://lab.mkblog.cn/', order: 5 },
            { id: '7', categoryId: '1', name: '伸手党克星', url: 'https://btfy.eu.org/', order: 6 },
            { id: '8', categoryId: '1', name: 'Yandex', url: 'https://yandex.com/', order: 7 },
            { id: '9', categoryId: '2', name: 'AGE动漫', url: 'https://www.agedm.io/', order: 0 },
            { id: '10', categoryId: '2', name: '打驴动漫', url: 'https://www.dalvdm.cc/', order: 1 },
            { id: '11', categoryId: '2', name: '嘀哩嘀哩', url: 'https://www.dilidili23.com/', order: 2 },
            { id: '12', categoryId: '2', name: '新番列表', url: 'https://www.miluxing.com/', order: 3 },
            { id: '13', categoryId: '2', name: '菲特动漫', url: 'https://fitacg.com/', order: 4 },
            { id: '14', categoryId: '2', name: '去看吧', url: 'https://11kt.net/', order: 5 },
            { id: '15', categoryId: '2', name: '异世界动漫', url: 'https://www.dmmiku.net/', order: 6 },
            { id: '16', categoryId: '2', name: '奇米动漫', url: 'https://www.qimiqimi.net/', order: 7 },
            { id: '17', categoryId: '2', name: 'MuteFun', url: 'https://www.mutedm.com/', order: 8 },
            { id: '18', categoryId: '2', name: '咕咕番', url: 'https://www.gugu3.com/', order: 9 },
            { id: '19', categoryId: '2', name: '动漫花园', url: 'https://animes.garden/', order: 10 },
            { id: '20', categoryId: '2', name: '4K动漫', url: 'https://cn.agekkkk.com/', order: 11 },
            { id: '21', categoryId: '2', name: '嗷呜动漫', url: 'https://www.aowu.tv/', order: 12 },
            { id: '22', categoryId: '3', name: '七味', url: 'https://www.pkavi.com/', order: 0 },
            { id: '23', categoryId: '3', name: '欧豹影院', url: 'https://www.obzhi.com/', order: 1 },
            { id: '24', categoryId: '3', name: 'LIBVIO', url: 'https://www.libvio.app/', order: 2 },
            { id: '25', categoryId: '3', name: '7080', url: 'https://7080.wang/', order: 3 },
            { id: '26', categoryId: '3', name: '音范丝', url: 'https://www.yinfans.me/', order: 4 },
            { id: '27', categoryId: '3', name: 'SubHD', url: 'https://subhd.tv/', order: 5 },
            { id: '28', categoryId: '3', name: '片吧影视', url: 'https://www.yespb.com/', order: 6 },
            { id: '29', categoryId: '3', name: 'HDmoli', url: 'https://www.hdmoli.pro/', order: 7 },
            { id: '30', categoryId: '3', name: '厂长资源', url: 'https://www.czzymovie.com/', order: 8 },
            { id: '31', categoryId: '3', name: '观影', url: 'https://www.xn--wcv59z.com/', order: 9 },
            { id: '32', categoryId: '3', name: '追剧猫', url: 'https://zhuiyingmao4.com/', order: 10 },
            { id: '33', categoryId: '3', name: '茶杯狐', url: 'https://www.acupfox.com/', order: 11 },
            { id: '34', categoryId: '3', name: '完整剧名', url: 'https://quarksoo.cc/search.php', order: 12 },
            { id: '35', categoryId: '3', name: '盘链', url: 'https://pinglian.lol/index.php', order: 13 },
            { id: '36', categoryId: '4', name: '极简壁纸', url: 'https://bz.zzzmh.cn/', order: 0 },
            { id: '37', categoryId: '4', name: '搜图导航', url: 'https://www.91sotu.com/', order: 1 },
            { id: '38', categoryId: '4', name: '画师通', url: 'https://www.huashi6.com/', order: 2 },
            { id: '39', categoryId: '4', name: 'Wallhaven', url: 'https://wallhaven.cc/', order: 3 },
            { id: '40', categoryId: '4', name: '动漫壁纸', url: 'https://anime-pictures.net/', order: 4 },
            { id: '41', categoryId: '4', name: 'Yuumei', url: 'https://www.yuumeiart.com/', order: 5 },
            { id: '42', categoryId: '4', name: 'MyLive', url: 'https://mylivewallpapers.com/', order: 6 },
            { id: '43', categoryId: '4', name: '4K壁纸', url: 'https://haowallpaper.com/homeView', order: 7 },
            { id: '44', categoryId: '5', name: '吾爱破解', url: 'https://www.52pojie.cn/', order: 0 },
            { id: '45', categoryId: '5', name: '刀网', url: 'https://www.x6d.com/', order: 1 },
            { id: '46', categoryId: '5', name: 'switch游戏下载', url: 'https://www.gamer520.com/', order: 2 },
            { id: '47', categoryId: '5', name: '初音社', url: 'https://www.mikuclub.work/', order: 3 },
            { id: '48', categoryId: '5', name: 'LAOYEE', url: 'https://myzye.com/', order: 4 },
            { id: '49', categoryId: '5', name: 'STEAMTOOL', url: 'https://www.steamtools.net/', order: 5 },
            { id: '50', categoryId: '5', name: '极限游戏', url: 'https://www.xgamefan.com/', order: 6 },
            { id: '51', categoryId: '5', name: 'BT收藏夹', url: 'https://zyscj.com/zy/search/btciliweb.html', order: 7 },
            { id: '52', categoryId: '5', name: '枫音应用', url: 'https://www.fy6b.com/', order: 8 },
            { id: '53', categoryId: '5', name: 'BT之家', url: 'https://www.1lou.me/', order: 9 },
            { id: '54', categoryId: '5', name: '游戏分享社区', url: 'https://www.gameshare.cc/', order: 10 },
            { id: '55', categoryId: '5', name: 'All Games', url: 'https://ankergames.net/games-list', order: 11 },
            { id: '56', categoryId: '6', name: '文件格式转换', url: 'https://www.aconvert.com/', order: 0 },
            { id: '57', categoryId: '6', name: 'iKuuu', url: 'https://ikuuu.win/auth/login', order: 1 },
            { id: '58', categoryId: '6', name: '软仓', url: 'https://www.ruancang.net/', order: 2 },
            { id: '59', categoryId: '6', name: 'PDF转DOC', url: 'https://pdf2doc.com/zh/', order: 3 },
            { id: '60', categoryId: '6', name: '文件转换器', url: 'https://convertio.co/zh/', order: 4 },
            { id: '61', categoryId: '6', name: 'iLovePDF', url: 'https://www.ilovepdf.com/zh-cn', order: 5 },
            { id: '62', categoryId: '6', name: '工具箱', url: 'https://www.toolnb.com/', order: 6 },
            { id: '63', categoryId: '6', name: '趣作图', url: 'https://www.quzuotu.com/home', order: 7 },
            { id: '64', categoryId: '6', name: '题库', url: 'https://www.gkzenti.cn/', order: 8 },
            { id: '65', categoryId: '6', name: '学习通', url: 'https://i.chaoxing.com/', order: 9 },
            { id: '66', categoryId: '6', name: 'AI配音', url: 'https://acgn.ttson.cn/', order: 10 },
            { id: '67', categoryId: '6', name: '微信网页版', url: 'https://szfilehelper.weixin.qq.com/', order: 11 },
            { id: '68', categoryId: '6', name: '图床', url: 'https://imgloc.com/', order: 12 },
            { id: '69', categoryId: '7', name: 'MyFreeMP3', url: 'http://tool.liumingye.cn/music/', order: 0 },
            { id: '70', categoryId: '7', name: '折飞机大全', url: 'https://www.foldnfly.com/#/1-1-1-1-1-1-1-1-2', order: 1 },
            { id: '71', categoryId: '7', name: '果核剥壳', url: 'https://www.ghpym.com/', order: 2 },
            { id: '72', categoryId: '7', name: '放屁网', url: 'https://www.fangpi.net/', order: 3 },
            { id: '73', categoryId: '7', name: 'BigJPG', url: 'https://bigjpg.com/', order: 4 },
            { id: '74', categoryId: '7', name: '423down', url: 'https://www.423down.com/', order: 5 },
            { id: '75', categoryId: '7', name: '文库下载', url: 'http://www.lexueduosi.com/', order: 6 },
            { id: '76', categoryId: '7', name: '视频解析', url: 'https://snapany.com/zh/bilibili', order: 7 },
            { id: '77', categoryId: '7', name: 'Office激活', url: 'https://massgrave.dev/', order: 8 },
            { id: '78', categoryId: '7', name: '阿虚同学的储物间', url: 'https://axutongxue.com/', order: 9 },
            { id: '79', categoryId: '7', name: '软件搜搜', url: 'https://hew666.github.io/rjss/', order: 10 },
            { id: '80', categoryId: '7', name: '哦游Max', url: 'https://oyoumax.com/', order: 11 },
            { id: '81', categoryId: '7', name: 'ScriptCat', url: 'https://scriptcat.org/zh-CN/search', order: 12 },
            { id: '82', categoryId: '7', name: '软件社', url: 'https://www.sncys.com/', order: 13 },
            { id: '83', categoryId: '7', name: '克隆窝', url: 'https://www.uy5.net/', order: 14 },
            { id: '84', categoryId: '8', name: '简历模板', url: 'https://www.51386.com/', order: 0 },
            { id: '85', categoryId: '8', name: '模之屋', url: 'https://www.aplaybox.com/', order: 1 },
            { id: '86', categoryId: '8', name: '优品PPT', url: 'https://www.ypppt.com/', order: 2 },
            { id: '87', categoryId: '8', name: '第一PPT', url: 'https://www.1ppt.com/', order: 3 },
            { id: '88', categoryId: '8', name: '站长素材', url: 'https://sc.chinaz.com/', order: 4 },
            { id: '89', categoryId: '8', name: '51PPT', url: 'https://www.51pptmoban.com/', order: 5 },
            { id: '90', categoryId: '8', name: 'PPTfans', url: 'https://www.pptfans.cn/', order: 6 },
            { id: '91', categoryId: '8', name: '起兮抠图', url: 'http://matting.deeplor.com/', order: 7 },
            { id: '92', categoryId: '9', name: 'AIchatOS', url: 'https://chat18.aichatos.xyz/', order: 0 },
            { id: '93', categoryId: '9', name: '深度AI导航', url: 'https://www.deepdhai.com/', order: 1 },
            { id: '94', categoryId: '9', name: '文心一言', url: 'https://yiyan.baidu.com/', order: 2 },
            { id: '95', categoryId: '9', name: '秘塔AI', url: 'https://metaso.cn/', order: 3 },
            { id: '96', categoryId: '9', name: 'Kimi', url: 'https://www.kimi.com/', order: 4 },
            { id: '97', categoryId: '9', name: '通义千问', url: 'https://www.qianwen.com/', order: 5 },
            { id: '98', categoryId: '9', name: '智谱清言', url: 'https://chatglm.cn/main/alltoolsdetail', order: 6 },
            { id: '99', categoryId: '9', name: '天工AI', url: 'https://www.tiangong.cn/', order: 7 },
            { id: '100', categoryId: '9', name: '讯飞星火', url: 'https://xinghuo.xfyun.cn', order: 8 },
            { id: '101', categoryId: '9', name: 'DeepSeek', url: 'https://chat.deepseek.com/', order: 9 },
            { id: '102', categoryId: '9', name: '豆包', url: 'https://www.doubao.com/chat/', order: 10 },
            { id: '103', categoryId: '9', name: '最伟大的AI', url: 'https://flo.ing/blank', order: 11 },
            { id: '104', categoryId: '9', name: 'LMArena', url: 'https://lmarena.ai/', order: 12 },
            { id: '105', categoryId: '9', name: 'Gemini', url: 'https://aistudio.google.com/', order: 13 },
            { id: '106', categoryId: '10', name: 'ALL', url: 'https://theporndude.vip/', order: 0 },
            { id: '107', categoryId: '10', name: '百合大法', url: 'https://yuriimg.com/', order: 1 },
            { id: '108', categoryId: '10', name: 'ASMR Online', url: 'https://asmr.one/works', order: 2 },
            { id: '109', categoryId: '10', name: '新片速递', url: 'https://v001.c0205117.cc/pw/', order: 3 },
            { id: '110', categoryId: '10', name: 'ASMR', url: 'https://asmr-300.com/works', order: 4 },
            { id: '111', categoryId: '10', name: '紳士会所', url: 'https://www.sshs.pw/', order: 5 },
            { id: '112', categoryId: '10', name: '每日大赛', url: 'https://mrds27.com', order: 6 },
            { id: '113', categoryId: '10', name: 'MissAV', url: 'https://missav.ws/cn/actresses?page=3', order: 7 },
            { id: '114', categoryId: '10', name: 'COS视频', url: 'https://spankbang.com/s/cosplay/', order: 8 },
            { id: '115', categoryId: '10', name: 'Artists', url: 'https://coomer.su/artists', order: 9 },
            { id: '116', categoryId: '10', name: '四色', url: 'http://www.55nana.com', order: 10 },
            { id: '117', categoryId: '10', name: 'sex论坛', url: 'https://169bt.com/forum.php', order: 11 },
            { id: '118', categoryId: '11', name: '萌站', url: 'http://moe321.com/', order: 0 },
            { id: '119', categoryId: '11', name: 'FOREVER', url: 'https://xydh.fun/wxcs0407forever', order: 1 },
            { id: '120', categoryId: '11', name: '52111', url: 'https://xydh.fun/swsyyds', order: 2 },
            { id: '121', categoryId: '11', name: '次元猫', url: 'https://acgmiao.net/', order: 3 },
            { id: '122', categoryId: '11', name: 'MyACG', url: 'https://myacg.pro/', order: 4 },
            { id: '123', categoryId: '11', name: '快导航', url: 'https://www.hifast.cn/', order: 5 },
            { id: '124', categoryId: '11', name: 'Moebox', url: 'https://www.moe-box.com/', order: 6 },
            { id: '125', categoryId: '11', name: '以一当十', url: 'https://www.yydsok.com/', order: 7 },
            { id: '126', categoryId: '11', name: '凌凌柒啦导航', url: 'https://www.007la.com/', order: 8 },
            { id: '127', categoryId: '11', name: '虾皮网', url: 'https://www.xia365.com/', order: 9 },
            { id: '128', categoryId: '11', name: '极简导航', url: 'https://nav.zzzmh.cn/', order: 10 },
            { id: '129', categoryId: '11', name: '爱达杂货铺', url: 'https://adzhp.cc/', order: 11 },
            { id: '130', categoryId: '11', name: '零度博客', url: 'https://www.freedidi.com/', order: 12 },
            { id: '131', categoryId: '11', name: '开发者导航', url: 'https://codernav.com/', order: 13 },
            { id: '132', categoryId: '12', name: '逗比表情包', url: 'https://www.dbbqb.com/', order: 0 },
            { id: '133', categoryId: '12', name: '有趣网址之家', url: 'https://youquhome.com/', order: 1 },
            { id: '134', categoryId: '12', name: '听雨声', url: 'https://www.rainymood.com/', order: 2 },
            { id: '135', categoryId: '12', name: 'MVCAT', url: 'https://www.mvcat.com/', order: 3 },
            { id: '136', categoryId: '12', name: '实况摄像头', url: 'https://www.skylinewebcams.com/', order: 4 },
            { id: '137', categoryId: '12', name: '次元岛', url: 'http://ciyuandao.com/', order: 5 },
            { id: '138', categoryId: '12', name: 'DiskGirl', url: 'https://diskgirl.com/pc.html', order: 6 },
            { id: '139', categoryId: '12', name: '童年模拟器', url: 'https://lemonjing.com/childhood/', order: 7 },
            { id: '140', categoryId: '12', name: '奇趣收藏', url: 'https://fuun.fun/', order: 8 },
            { id: '141', categoryId: '13', name: 'A站', url: 'https://www.acfun.cn/', order: 0 },
            { id: '142', categoryId: '13', name: 'B站', url: 'https://www.bilibili.com/', order: 1 },
            { id: '143', categoryId: '13', name: 'C站', url: 'https://www.clicli.cc/', order: 2 },
            { id: '144', categoryId: '13', name: 'D站', url: 'https://www.5dm.link/', order: 3 },
            { id: '145', categoryId: '13', name: 'F站', url: 'https://www.fjyxdm.com/', order: 4 },
            { id: '146', categoryId: '13', name: 'I站', url: 'https://idanmu.im/', order: 5 },
            { id: '147', categoryId: '13', name: 'K站', url: 'https://konachan.net/', order: 6 },
            { id: '148', categoryId: '13', name: 'M站', url: 'https://www.missevan.com/', order: 7 },
            { id: '149', categoryId: '13', name: 'N站', url: 'https://www.nicovideo.jp/', order: 8 },
            { id: '150', categoryId: '13', name: 'O站', url: 'http://www.onijiang.com/', order: 9 },
            { id: '151', categoryId: '13', name: 'Z站', url: 'http://www.zzzfun.one/', order: 10 },
            { id: '152', categoryId: '13', name: 'E站', url: 'https://www.ezdmw.site/', order: 11 }
        ];
    }

    bindEvents() {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.target.closest('.nav-item');
                if (!targetBtn) return;
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                targetBtn.classList.add('active');
                document.querySelectorAll('.panel-section').forEach(s => s.style.display = 'none');
                const sectionId = targetBtn.dataset.section + 'Section';
                const section = document.getElementById(sectionId);
                if (section) section.style.display = 'block';
            });
        });

        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        document.getElementById('previewBtn').addEventListener('click', () => {
            window.open('index.html', '_blank');
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html?redirect=admin';
        });

        document.getElementById('quickAddBtn').addEventListener('click', () => {
            this.quickAddLink();
        });

        document.getElementById('addCategoryBtn').addEventListener('click', () => {
            this.editingCategory = null;
            document.getElementById('categoryModalTitle').textContent = '添加分类';
            document.getElementById('categoryName').value = '';
            document.getElementById('categoryOrder').value = this.categories.length.toString();
            this.openModal('categoryModal');
        });

        document.getElementById('categoryModalSave').addEventListener('click', () => {
            this.saveCategory();
        });

        document.getElementById('categoryModalClose').addEventListener('click', () => {
            this.closeModal('categoryModal');
        });

        document.getElementById('categoryModalCancel').addEventListener('click', () => {
            this.closeModal('categoryModal');
        });

        document.getElementById('linkModalSave').addEventListener('click', () => {
            this.saveLink();
        });

        document.getElementById('linkModalClose').addEventListener('click', () => {
            this.closeModal('linkModal');
        });

        document.getElementById('linkModalCancel').addEventListener('click', () => {
            this.closeModal('linkModal');
        });

        document.getElementById('confirmDelete').addEventListener('click', () => {
            if (this.deleteCallback) {
                this.deleteCallback();
            }
            this.closeModal('confirmModal');
        });

        document.getElementById('confirmModalClose').addEventListener('click', () => {
            this.closeModal('confirmModal');
        });

        document.getElementById('confirmCancel').addEventListener('click', () => {
            this.closeModal('confirmModal');
        });

        document.getElementById('previewBgBtn').addEventListener('click', () => {
            const bgUrl = document.getElementById('bgImageUrl').value.trim();
            if (!bgUrl) {
                this.showToast('请输入图片链接');
                return;
            }
            this.previewImage(bgUrl);
        });

        document.getElementById('localBgImage').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
            if (!allowedTypes.includes(file.type)) {
                this.showToast('不支持的图片格式，请选择 JPG、PNG、WEBP、GIF 或 BMP 格式');
                e.target.value = '';
                return;
            }
            
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                this.showToast(`图片大小超过限制（最大 5MB），当前文件大小：${this.formatFileSize(file.size)}`);
                e.target.value = '';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const previewContainer = document.getElementById('bgPreviewContainer');
                previewContainer.innerHTML = '';
                
                const img = document.createElement('img');
                img.className = 'bg-preview';
                img.src = event.target.result;
                img.onload = () => {
                    previewContainer.classList.add('has-image');
                    const info = document.createElement('div');
                    info.className = 'preview-info';
                    info.textContent = `${file.name} · ${this.formatFileSize(file.size)}`;
                    previewContainer.appendChild(info);
                    this.showToast('图片预览成功');
                };
                img.onerror = () => {
                    previewContainer.innerHTML = `
                        <div class="bg-preview-placeholder">
                            <i class="fas fa-image"></i>
                            <p>图片读取失败</p>
                        </div>
                    `;
                    previewContainer.classList.remove('has-image');
                    this.showToast('图片读取失败');
                    e.target.value = '';
                };
                
                previewContainer.appendChild(img);
                document.getElementById('bgImageUrl').value = '';
            };
            
            reader.onerror = () => {
                this.showToast('文件读取失败，请重试');
                e.target.value = '';
            };
            
            reader.readAsDataURL(file);
        });

        document.getElementById('applyBgBtn').addEventListener('click', () => {
            const bgUrl = document.getElementById('bgImageUrl').value.trim();
            const previewContainer = document.getElementById('bgPreviewContainer');
            const previewImg = previewContainer.querySelector('.bg-preview');
            
            let imageData = bgUrl;
            
            if (!bgUrl && previewImg && previewImg.src.startsWith('data:')) {
                imageData = previewImg.src;
            }
            
            if (!imageData) {
                this.showToast('请先选择或预览图片');
                return;
            }
            
            if (!imageData.startsWith('data:')) {
                try {
                    new URL(imageData);
                } catch (e) {
                    this.showToast('请输入有效的图片链接');
                    return;
                }
            }
            
            this.settings.backgroundStyle = 'custom';
            this.settings.backgroundImage = imageData;
            this.saveData();
            this.showToast('背景图片已应用');
        });

        document.getElementById('clearBgBtn').addEventListener('click', () => {
            this.settings.backgroundStyle = 'gradient1';
            this.settings.backgroundImage = '';
            this.saveData();
            this.resetBgPreview();
            document.getElementById('bgImageUrl').value = '';
            document.getElementById('localBgImage').value = '';
            this.showToast('背景已恢复为默认');
        });

        document.getElementById('bgImageUrl').addEventListener('input', () => {
            document.getElementById('localBgImage').value = '';
            this.resetBgPreview();
        });

        document.querySelectorAll('.font-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.font-option').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.settings.fontSize = e.target.dataset.size;
            });
        });

        document.querySelectorAll('.layout-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.layout-option').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.settings.layout = e.target.dataset.layout;
            });
        });

        document.getElementById('saveSettings').addEventListener('click', () => {
            this.settings.siteTitle = document.getElementById('siteTitle').value || '导航中心';
            const bgUrl = document.getElementById('bgImageUrl').value;
            this.settings.backgroundImage = bgUrl;
            if (bgUrl && bgUrl.trim()) {
                this.settings.backgroundStyle = 'custom';
            }
            this.saveData();
            this.showToast('设置已保存');
        });

        document.getElementById('resetSettings').addEventListener('click', () => {
            this.categories = this.getDefaultCategories();
            this.links = this.getDefaultLinks();
            this.saveData();
            this.renderCategories();
            this.renderLinks();
            this.updateCategorySelects();
            this.showToast('分类和链接已重置为默认值');
            return;
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });

        document.getElementById('linkSearch').addEventListener('input', () => {
            this.renderLinks();
        });

        document.getElementById('linkFilterCategory').addEventListener('change', () => {
            this.renderLinks();
        });

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeAllModals();
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        this.setupDragSort();
    }

    setupDragSort() {
        const container = document.getElementById('categoriesList');
        let draggedItem = null;

        container.addEventListener('dragstart', (e) => {
            if (e.target.closest('.list-item')) {
                draggedItem = e.target.closest('.list-item');
                draggedItem.classList.add('dragging');
            }
        });

        container.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
                this.updateCategoryOrder();
            }
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(container, e.clientY);
            if (afterElement == null) {
                container.appendChild(draggedItem);
            } else {
                container.insertBefore(draggedItem, afterElement);
            }
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.list-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    updateCategoryOrder() {
        const items = document.querySelectorAll('#categoriesList .list-item');
        items.forEach((item, index) => {
            const id = item.dataset.id;
            const category = this.categories.find(c => c.id === id);
            if (category) {
                category.order = index;
            }
        });
        this.saveData();
        this.renderCategories();
        this.showToast('顺序已更新');
    }

    renderCategories() {
        const container = document.getElementById('categoriesList');
        const sortedCategories = [...this.categories].sort((a, b) => a.order - b.order);

        if (sortedCategories.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>暂无分类，点击上方按钮添加</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sortedCategories.map(category => `
            <div class="list-item" data-id="${category.id}" draggable="true">
                <div class="list-item-content">
                    <div class="list-item-info">
                        <div class="list-item-name">${category.name}</div>
                        <div class="list-item-meta">排序: ${category.order}</div>
                    </div>
                </div>
                <div class="list-item-actions">
                    <button class="order-btn" onclick="app.moveCategoryUp('${category.id}')">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                    <button class="order-btn" onclick="app.moveCategoryDown('${category.id}')">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <button class="edit-btn" onclick="app.editCategory('${category.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="app.deleteCategoryConfirm('${category.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    moveCategoryUp(id) {
        const index = this.categories.findIndex(c => c.id === id);
        if (index > 0) {
            const temp = this.categories[index];
            this.categories[index] = this.categories[index - 1];
            this.categories[index - 1] = temp;
            this.categories.forEach((c, i) => c.order = i);
            this.saveData();
            this.renderCategories();
        }
    }

    moveCategoryDown(id) {
        const index = this.categories.findIndex(c => c.id === id);
        if (index < this.categories.length - 1) {
            const temp = this.categories[index];
            this.categories[index] = this.categories[index + 1];
            this.categories[index + 1] = temp;
            this.categories.forEach((c, i) => c.order = i);
            this.saveData();
            this.renderCategories();
        }
    }

    renderLinks() {
        const container = document.getElementById('linksList');
        const filterCategory = document.getElementById('linkFilterCategory').value;
        const searchQuery = document.getElementById('linkSearch').value.toLowerCase();

        let filteredLinks = [...this.links];
        
        if (filterCategory) {
            filteredLinks = filteredLinks.filter(l => l.categoryId === filterCategory);
        }
        
        if (searchQuery) {
            filteredLinks = filteredLinks.filter(l => 
                l.name.toLowerCase().includes(searchQuery) ||
                l.url.toLowerCase().includes(searchQuery)
            );
        }

        const sortedLinks = filteredLinks.sort((a, b) => a.order - b.order);

        if (sortedLinks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-link"></i>
                    <p>暂无链接</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sortedLinks.map(link => {
            const category = this.categories.find(c => c.id === link.categoryId);
            return `
                <div class="list-item">
                    <div class="list-item-content">
                        <div class="list-item-info">
                            <div class="list-item-name">${link.name}</div>
                            <div class="list-item-meta">${category?.name || '未分类'} · ${link.url}</div>
                        </div>
                    </div>
                    <div class="list-item-actions">
                        <button class="edit-btn" onclick="app.editLink('${link.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" onclick="app.deleteLinkConfirm('${link.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateCategorySelects() {
        const selects = [
            document.getElementById('quickCategory'),
            document.getElementById('linkCategory'),
            document.getElementById('linkFilterCategory')
        ];
        
        const sortedCategories = [...this.categories].sort((a, b) => a.order - b.order);
        
        selects.forEach(select => {
            if (select) {
                const currentValue = select.value;
                select.innerHTML = sortedCategories.map(c => 
                    `<option value="${c.id}">${c.name}</option>`
                ).join('');
                if (select.id === 'linkFilterCategory') {
                    select.innerHTML = `<option value="">全部分类</option>` + select.innerHTML;
                }
                select.value = currentValue;
            }
        });
    }

    editCategory(id) {
        const category = this.categories.find(c => c.id === id);
        if (!category) return;

        this.editingCategory = category;
        document.getElementById('categoryModalTitle').textContent = '编辑分类';
        document.getElementById('categoryName').value = category.name;
        document.getElementById('categoryOrder').value = category.order.toString();
        this.openModal('categoryModal');
    }

    saveCategory() {
        const name = document.getElementById('categoryName').value.trim();
        const order = parseInt(document.getElementById('categoryOrder').value) || 0;

        if (!name) {
            this.showToast('请输入分类名称');
            return;
        }

        if (this.editingCategory) {
            const index = this.categories.findIndex(c => c.id === this.editingCategory.id);
            if (index !== -1) {
                this.categories[index] = { ...this.categories[index], name, order };
            }
            this.showToast('分类已更新');
        } else {
            const newCategory = {
                id: Date.now().toString(),
                name,
                order
            };
            this.categories.push(newCategory);
            this.showToast('分类已添加');
        }

        this.saveData();
        this.closeModal('categoryModal');
        this.renderCategories();
        this.updateCategorySelects();
    }

    deleteCategoryConfirm(id) {
        const category = this.categories.find(c => c.id === id);
        if (!category) return;

        const linksInCategory = this.links.filter(l => l.categoryId === id);
        const message = linksInCategory.length > 0
            ? `确定要删除分类「${category.name}」吗？该分类下的 ${linksInCategory.length} 个链接也将被删除。`
            : `确定要删除分类「${category.name}」吗？`;

        document.getElementById('confirmMessage').textContent = message;
        this.deleteCallback = () => this.deleteCategory(id);
        this.openModal('confirmModal');
    }

    deleteCategory(id) {
        this.categories = this.categories.filter(c => c.id !== id);
        this.links = this.links.filter(l => l.categoryId !== id);
        this.categories.forEach((c, i) => c.order = i);
        this.saveData();
        this.renderCategories();
        this.renderLinks();
        this.updateCategorySelects();
        this.showToast('分类已删除');
    }

    quickAddLink() {
        const name = document.getElementById('quickName').value.trim();
        const url = document.getElementById('quickUrl').value.trim();
        const categoryId = document.getElementById('quickCategory').value;

        if (!name || !url) {
            this.showToast('请填写网站名称和地址');
            return;
        }

        if (!categoryId) {
            this.showToast('请选择分类');
            return;
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            this.showToast('请输入有效的网址');
            return;
        }

        const newLink = {
            id: Date.now().toString(),
            categoryId,
            name,
            url,
            order: this.links.filter(l => l.categoryId === categoryId).length
        };

        this.links.push(newLink);
        this.saveData();
        this.renderLinks();

        document.getElementById('quickName').value = '';
        document.getElementById('quickUrl').value = '';
        document.getElementById('quickCategory').value = '';

        this.showToast('链接已添加');
    }

    editLink(id) {
        const link = this.links.find(l => l.id === id);
        if (!link) return;

        this.editingLink = link;
        document.getElementById('linkModalTitle').textContent = '编辑链接';
        document.getElementById('linkName').value = link.name;
        document.getElementById('linkUrl').value = link.url;
        document.getElementById('linkOrder').value = link.order.toString();
        this.updateCategorySelects();
        document.getElementById('linkCategory').value = link.categoryId;
        this.openModal('linkModal');
    }

    saveLink() {
        const categoryId = document.getElementById('linkCategory').value;
        const name = document.getElementById('linkName').value.trim();
        const url = document.getElementById('linkUrl').value.trim();
        const order = parseInt(document.getElementById('linkOrder').value) || 0;

        if (!name || !url) {
            this.showToast('请填写完整信息');
            return;
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            this.showToast('请输入有效的网址');
            return;
        }

        if (this.editingLink) {
            const index = this.links.findIndex(l => l.id === this.editingLink.id);
            if (index !== -1) {
                this.links[index] = { ...this.links[index], categoryId, name, url, order };
            }
            this.showToast('链接已更新');
        }

        this.saveData();
        this.closeModal('linkModal');
        this.renderLinks();
    }

    deleteLinkConfirm(id) {
        const link = this.links.find(l => l.id === id);
        if (!link) return;

        document.getElementById('confirmMessage').textContent = `确定要删除链接「${link.name}」吗？`;
        this.deleteCallback = () => this.deleteLink(id);
        this.openModal('confirmModal');
    }

    deleteLink(id) {
        this.links = this.links.filter(l => l.id !== id);
        this.saveData();
        this.renderLinks();
        this.showToast('链接已删除');
    }

    updateSettingsUI() {
        document.querySelectorAll('.font-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === this.settings.fontSize);
        });

        document.querySelectorAll('.layout-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.layout === this.settings.layout);
        });

        document.getElementById('siteTitle').value = this.settings.siteTitle || '导航中心';
        document.getElementById('bgImageUrl').value = this.settings.backgroundImage || '';
    }

    exportData() {
        const data = {
            categories: this.categories,
            links: this.links,
            settings: this.settings,
            exportTime: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nav-config-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('配置已导出');
    }

    importData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.categories) this.categories = data.categories;
                if (data.links) this.links = data.links;
                if (data.settings) this.settings = { ...this.settings, ...data.settings };

                this.saveData();
                this.renderCategories();
                this.renderLinks();
                this.updateCategorySelects();
                this.updateSettingsUI();

                this.showToast('配置已导入');
            } catch (error) {
                this.showToast('导入失败：无效的JSON文件');
            }
        };
        reader.readAsText(file);
    }

    openModal(id) {
        document.getElementById(id).classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal(id) {
        document.getElementById(id).classList.remove('active');
        document.body.style.overflow = '';
    }

    closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-size: 0.9rem;
            z-index: 3000;
            animation: slideUp 0.3s ease;
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 2000);
    }
}

const app = new AdminApp();
