// 前台导航页应用
// 支持 Cloudflare Workers API + 本地缓存

const API_URL = 'https://nav-api.2798402860.workers.dev';

class NavigationApp {
    constructor() {
        this.lastCloudTime = 0;
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
        this.searchQuery = '';
        this.searchEngine = 'baidu';
        this.lastSyncTime = 0;
        this.syncTimer = null;
        
        this.init();
    }

async init() {
    // 1. 先展示加载动画（可选）
    this.showLoading();

    // 2. 立即从本地缓存加载并渲染，让用户秒开网站
    this.loadLocalData(); 
    this.applySettings();
    this.render();
    this.hideLoading(); // 渲染完本地的就关掉加载动画

    // 3. 异步从云端获取最新数据，静默更新
    this.syncFromCloud().then(() => {
        console.log("云端数据已同步并静默更新");
    });

    this.bindEvents();
    this.setupSyncListener();
    this.startCloudSync();
}

// 新增一个专门读取本地的方法
loadLocalData() {
    const savedCategories = localStorage.getItem('nav_categories');
    const savedLinks = localStorage.getItem('nav_links');
    const savedSettings = localStorage.getItem('nav_settings');

    if (savedCategories) this.categories = JSON.parse(savedCategories);
    else this.categories = this.getDefaultCategories();

    if (savedLinks) this.links = JSON.parse(savedLinks);
    else this.links = this.getDefaultLinks();

    if (savedSettings) this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
}

    // ========== 数据加载 ==========

// app.js
async init() {
    this.showLoading();
    // 1. 先用默认数据垫底，保证页面不白屏
    this.categories = this.getDefaultCategories();
    this.links = this.getDefaultLinks();
    this.render(); 

    // 2. 异步加载云端，加载完立刻重新画一遍
    await this.loadData();
    
    this.bindEvents();
    this.hideLoading();
}

async loadData() {
    try {
        const response = await fetch(`${API_URL}/api/data`, {
            cache: 'no-cache'
        });
        if (response.ok) {
            const cloudData = await response.json();
            // 只要云端有分类，就强制覆盖并重新渲染
            if (cloudData && cloudData.categories && cloudData.categories.length > 0) {
                this.categories = cloudData.categories;
                this.links = cloudData.links || [];
                this.settings = { ...this.settings, ...(cloudData.settings || {}) };
                
                console.log('[Nav] 云端配置加载成功，重新渲染界面');
                this.applySettings();
                this.render(); // <--- 关键：拿到数据后必须再调用一次 render
                this.cacheToLocal();
            }
        }
    } catch (err) {
        console.error('[Nav] 同步失败:', err);
    }
}

    cacheToLocal() {
        try {
            localStorage.setItem('nav_categories', JSON.stringify(this.categories));
            localStorage.setItem('nav_links', JSON.stringify(this.links));
            localStorage.setItem('nav_settings', JSON.stringify(this.settings));
            localStorage.setItem('nav_sync', Date.now().toString());
        } catch (e) {
            console.error('[Nav] 本地缓存失败:', e);
        }
    }

    // ========== 云端同步 ==========

    startCloudSync() {
        // 每 30 秒检查一次云端是否有更新
        this.syncTimer = setInterval(() => {
            this.syncFromCloud();
        }, 30000);
    }

async syncFromCloud() {
    try {
        const response = await fetch(`${API_URL}/api/data`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) return;

        const data = await response.json();
        if (!data || !data.categories) return;

        // 通过 updatedAt 判断是否有更新
        const cloudTime = data.updatedAt || 0;
        const localTime = parseInt(localStorage.getItem('nav_sync') || '0');

        // 关键修复：只有云端数据真正比本地新，且内容有变化时才更新
        if (cloudTime > localTime && cloudTime !== this.lastCloudTime) {
            this.lastCloudTime = cloudTime;  // 记录这次同步的时间戳
            this.categories = data.categories;
            this.links = data.links;
            this.settings = { ...this.settings, ...(data.settings || {}) };
            this.cacheToLocal();
            this.applySettings();
            this.render();
            console.log('[Nav] 检测到云端更新，已自动同步');
        }
    } catch (err) {
        // 静默失败
    }
}

    stopCloudSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }

    // ========== 默认数据 ==========

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

    // ========== 事件绑定 ==========

    bindEvents() {
        const searchInput = document.getElementById('searchInput');
        const searchClear = document.getElementById('searchClear');
        const searchBtn = document.getElementById('searchBtn');
        const searchEngine = document.getElementById('searchEngine');
        const adminBtn = document.getElementById('adminBtn');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.render();
            });

            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') this.executeSearch();
            });
        }

        if (searchClear) {
            searchClear.addEventListener('click', () => {
                searchInput.value = '';
                this.searchQuery = '';
                searchClear.style.display = 'none';
                this.render();
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.executeSearch());
        }

        if (searchEngine) {
            searchEngine.addEventListener('change', (e) => {
                this.searchEngine = e.target.value;
            });
        }

        if (adminBtn) {
            adminBtn.addEventListener('click', () => {
                window.location.href = 'admin.html';
            });
        }

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.closeAllModals();
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllModals();
        });
    }

    executeSearch() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) return;

        if (this.searchEngine === 'nav') {
            this.searchQuery = query.toLowerCase();
            this.render();
        } else {
            const urls = {
                google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
                baidu: `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
                bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`
            };
            window.open(urls[this.searchEngine], '_blank');
        }
    }

    // ========== 设置应用 ==========

    applySettings() {
        document.documentElement.style.setProperty('--primary-color', this.settings.themeColor);
        document.documentElement.style.setProperty('--primary-hover', this.adjustColor(this.settings.themeColor, -20));

        this.applyBackground();

        document.body.className = document.body.className.replace(/font-\w+/g, '') + ` font-${this.settings.fontSize}`;
        document.body.className = document.body.className.replace(/layout-\w+/g, '') + ` layout-${this.settings.layout}`;

        this.updateSiteTitle();
    }

    applyBackground() {
        document.body.classList.remove('bg-gradient1', 'bg-gradient2', 'bg-gradient3', 'bg-solid', 'bg-custom');
        
        if (this.settings.backgroundStyle === 'custom' && this.settings.backgroundImage) {
            document.body.classList.add('bg-custom');
            document.body.style.backgroundImage = `url(${this.settings.backgroundImage})`;
        } else {
            document.body.classList.add(`bg-${this.settings.backgroundStyle}`);
            document.body.style.backgroundImage = '';
        }
    }

    updateSiteTitle() {
        const logo = document.getElementById('siteLogo');
        if (logo) {
            const span = logo.querySelector('span');
            if (span) span.textContent = this.settings.siteTitle || '导航中心';
        }
    }

    adjustColor(color, amount) {
        const hex = color.replace('#', '');
        const num = parseInt(hex, 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + amount));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    // ========== 渲染 ==========

    render() {
        const container = document.getElementById('categoriesContainer');
        if (!container) return;
        
        const sortedCategories = [...this.categories].sort((a, b) => a.order - b.order);
        
        container.innerHTML = '';

        sortedCategories.forEach((category, index) => {
            const categoryLinks = this.links
                .filter(link => link.categoryId === category.id)
                .sort((a, b) => a.order - b.order);
            
            let filteredLinks = categoryLinks;
            if (this.searchEngine === 'nav' && this.searchQuery) {
                filteredLinks = categoryLinks.filter(link => 
                    link.name.toLowerCase().includes(this.searchQuery)
                );
                if (filteredLinks.length === 0) return;
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'category-wrapper';
            wrapper.style.animationDelay = `${index * 0.1}s`;
            
            wrapper.innerHTML = `
                <div class="category-title">${category.name}</div>
                <div class="category-card">
                    <div class="category-links">
                        ${filteredLinks.map(link => `
                            <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="link-item">
                                <span class="link-name">${link.name}</span>
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;

            container.appendChild(wrapper);
        });

        const searchClear = document.getElementById('searchClear');
        if (searchClear) {
            searchClear.style.display = this.searchQuery ? 'block' : 'none';
        }
    }

    // ========== 弹窗控制 ==========

    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    // ========== 加载动画 ==========

    showLoading() {
        const loading = document.getElementById('loadingOverlay');
        if (loading) {
            loading.style.display = 'flex';
            loading.style.opacity = '1';
        }
    }

    hideLoading() {
        setTimeout(() => {
            const loading = document.getElementById('loadingOverlay');
            if (loading) {
                loading.style.opacity = '0';
                setTimeout(() => {
                    loading.style.display = 'none';
                }, 300);
            }
        }, 500);
    }

    // ========== 同步监听 ==========

setupSyncListener() {
    // 监听 localStorage 变化（同一浏览器多标签页同步）
    window.addEventListener('storage', (e) => {
        if (e.key === 'nav_sync') {
            this.loadData().then(() => this.render());
        }
    });

    // 定时检查本地同步标记（同一窗口内检测 admin 页面修改）
    // 修复：记录上次检查的时间戳，避免自己触发自己
    this.lastCheckedSync = localStorage.getItem('nav_sync') || '0';
    
    setInterval(() => {
        const syncTime = localStorage.getItem('nav_sync');
        if (syncTime && syncTime !== this.lastCheckedSync) {
            this.lastCheckedSync = syncTime;
            this.loadData().then(() => this.render());
        }
    }, 1000);
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
                if (toast.parentNode) document.body.removeChild(toast);
            }, 300);
        }, 2000);
    }
}

const app = new NavigationApp();
