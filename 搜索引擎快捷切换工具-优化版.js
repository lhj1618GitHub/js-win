// ==UserScript==
// @name         搜索引擎快捷切换工具
// @namespace    https://github.com
// @version      7.0.0
// @description  在搜索页面快捷切换搜索引擎，支持自定义和管理搜索引擎
// @author       YourName
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // 优化的暗黑配色方案 - 增强对比度和可读性
    const DARK_THEME = {
        // 主色调
        primary: '#1a1a1a',          // 更深的背景，提高对比度
        secondary: '#2a2a2a',        // 次要背景
        tertiary: '#3a3a3a',         // 第三级背景
        
        // 强调色
        accent: '#5865f2',           // 主强调色（蓝色）
        accentHover: '#4752c4',      // 悬停状态的强调色
        
        // 文本颜色
        textPrimary: '#f0f0f0',      // 主要文本 - 更亮以提高可读性
        textSecondary: '#c0c0c0',    // 次要文本
        textTertiary: '#a0a0a0',     // 第三级文本
        
        // 边框和阴影
        border: '#444444',           // 边框颜色
        borderLight: '#555555',      // 浅色边框
        borderDark: '#333333',       // 深色边框
        hover: '#3a3a3a',           // 悬停状态背景
        shadow: 'rgba(0, 0, 0, 0.4)', // 阴影颜色
        
        // 透明背景
        transparentBg: 'rgba(26, 26, 26, 0.85)', // 悬浮按钮背景
        panelBg: 'rgba(26, 26, 26, 0.95)',      // 面板背景，提高不透明度
        
        // 功能色
        success: '#43b581',          // 成功色
        warning: '#faa61a',          // 警告色
        danger: '#f04747',           // 危险/错误色
        
        // 引擎项颜色
        engineItemBg: 'rgba(255, 255, 255, 0.07)',    // 引擎项背景
        engineItemHover: 'rgba(88, 101, 242, 0.15)',  // 引擎项悬停背景（使用强调色）
        engineItemBorder: 'rgba(255, 255, 255, 0.1)', // 引擎项边框
        
        // 列表交替背景色
        listEven: 'rgba(255, 255, 255, 0.04)',        // 偶数行背景
        listOdd: 'rgba(255, 255, 255, 0.02)',         // 奇数行背景
        
        // 按钮颜色
        buttonPrimary: '#5865f2',    // 主按钮
        buttonPrimaryHover: '#4752c4', // 主按钮悬停
        buttonSecondary: '#3a3a3a',  // 次要按钮
        buttonSecondaryHover: '#4a4a4a', // 次要按钮悬停
        
        // 输入框颜色
        inputBg: '#2a2a2a',          // 输入框背景
        inputBorder: '#444444',      // 输入框边框
        inputFocus: '#5865f2',       // 输入框焦点边框
        
        // 滚动条颜色
        scrollbarTrack: '#2a2a2a',   // 滚动条轨道
        scrollbarThumb: '#4a4a4a',    // 滚动条滑块
        scrollbarThumbHover: '#5a5a5a' // 滚动条滑块悬停
    };

    // 默认搜索引擎列表
    const DEFAULT_SEARCH_ENGINES = [
        { id: 'google', name: 'Google', url: 'https://www.google.com/search?q={q}', icon: 'G' },
        { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q={q}', icon: 'B' },
        { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd={q}', icon: '度' },
        { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={q}', icon: 'D' },
        { id: 'yandex', name: 'Yandex', url: 'https://yandex.com/search/?text={q}', icon: 'Я' },
        { id: 'github', name: 'GitHub', url: 'https://github.com/search?q={q}', icon: '<>' },
        { id: 'stackoverflow', name: 'Stack Overflow', url: 'https://stackoverflow.com/search?q={q}', icon: 'S' },
        { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/results?search_query={q}', icon: 'Y' },
        { id: 'wikipedia', name: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php?search={q}', icon: 'W' },
        { id: 'zhihu', name: '知乎', url: 'https://www.zhihu.com/search?type=content&q={q}', icon: '知' }
    ];

    class SearchEngineManager {
        constructor() {
            this.searchEngines = this.loadSearchEngines();
            this.currentKeyword = this.extractKeyword();
            this.isManagementOpen = false;
            this.hideTimer = null;
            this.hideDelay = 150;
            this.forceShowButton = false;
            this.isFloatingButtonCreated = false;
            this.init();
        }

        // 加载搜索引擎数据
        loadSearchEngines() {
            const saved = GM_getValue('searchEngines');
            if (!saved || !Array.isArray(saved) || saved.length === 0) {
                GM_setValue('searchEngines', DEFAULT_SEARCH_ENGINES);
                return DEFAULT_SEARCH_ENGINES;
            }
            return saved;
        }

        // 保存搜索引擎数据
        saveSearchEngines() {
            GM_setValue('searchEngines', this.searchEngines);
        }

        // 从当前URL提取搜索关键词
        extractKeyword() {
            const url = new URL(window.location.href);
            const params = new URLSearchParams(url.search);
            const pathname = url.pathname;
            
            // 常见搜索参数
            const searchParams = ['q', 'query', 'wd', 'search', 'keyword', 'text', 'p', 's', 'search_query', 'searchTerm', 'term', 'words'];
            
            // 检查URL参数
            for (const param of searchParams) {
                const value = params.get(param);
                if (value && value.trim()) {
                    return decodeURIComponent(value.trim());
                }
            }
            
            // 检查路径模式（如抖音 https://www.douyin.com/search/关键词）
            const pathSearchPatterns = [
                /^\/search\/(.+)$/i,
                /^\/s\/(.+)$/i,
                /^\/search\/[^\/]+\/(.+)$/i,
                /^\/results\/(.+)$/i,
                /^\/find\/(.+)$/i
            ];
            
            for (const pattern of pathSearchPatterns) {
                const match = pathname.match(pattern);
                if (match && match[1]) {
                    const keyword = match[1].split('/')[0].split('?')[0];
                    if (keyword && keyword.trim()) {
                        return decodeURIComponent(keyword.trim());
                    }
                }
            }
            
            // 检查常见搜索路径结构
            if (pathname.includes('/search/')) {
                const parts = pathname.split('/search/');
                if (parts.length > 1 && parts[1]) {
                    const keyword = parts[1].split('/')[0].split('?')[0];
                    if (keyword && keyword.trim()) {
                        return decodeURIComponent(keyword.trim());
                    }
                }
            }
            
            // 尝试从搜索框获取
            const searchInputs = [
                'input[type="search"]',
                'input[name="q"]',
                'input[name="wd"]',
                'input[name="query"]',
                'input[name="search"]',
                'input[name="keyword"]',
                'input[name="text"]',
                'input[name="s"]',
                '#search', '.search',
                '[role="searchbox"]',
                '[type="search"]',
                '.search-input',
                '.search-box',
                '.search-field',
                'input[placeholder*="搜索"]',
                'input[placeholder*="Search"]',
                'input[placeholder*="search"]',
                '.search__input',
                '.search-input__input',
                'input.search',
                '.search-form input[type="text"]',
                'form[role="search"] input[type="text"]'
            ];
            
            for (const selector of searchInputs) {
                try {
                    const input = document.querySelector(selector);
                    if (input && input.value && input.value.trim()) {
                        return input.value.trim();
                    }
                } catch (e) {
                    // 忽略选择器错误
                }
            }
            
            // 尝试从页面标题中提取
            const title = document.title;
            const searchPatterns = [
                /(.*) - (Google|百度|Bing|DuckDuckGo|Yandex|GitHub|Stack Overflow|YouTube|Wikipedia|知乎|抖音|Douyin) (搜索|Search)/i,
                /(.*)的搜索结果/i,
                /Search results for "(.*)"/i,
                /"(.*)" 的搜索结果/i,
                /(.*) - 搜索/i,
                /搜索：(.*) -/i,
                /(.*) - 搜索/i
            ];
            
            for (const pattern of searchPatterns) {
                const match = title.match(pattern);
                if (match && match[1]) {
                    return match[1].trim();
                }
            }
            
            return '';
        }

        // 检查URL中是否有{q}占位符
        hasQPlaceholder(url) {
            return url && url.includes('{q}');
        }

        // 修复URL，确保有{q}占位符
        fixUrlPlaceholder(url) {
            if (!url) return url;
            
            // 如果已经包含{q}占位符，直接返回
            if (this.hasQPlaceholder(url)) {
                return url;
            }
            
            // 尝试检测常见的搜索参数模式
            const urlObj = new URL(url);
            const searchParams = ['q', 'query', 'wd', 'search', 'keyword', 'text', 'p', 's', 'search_query', 'searchTerm', 'term'];
            
            for (const param of searchParams) {
                if (urlObj.searchParams.has(param)) {
                    // 替换现有的参数值为{q}
                    const value = urlObj.searchParams.get(param);
                    if (value) {
                        urlObj.searchParams.set(param, '{q}');
                        return urlObj.toString();
                    }
                }
            }
            
            // 如果没有找到搜索参数，尝试添加?q={q}或&q={q}
            if (urlObj.search) {
                if (urlObj.search.includes('?')) {
                    return url + '&q={q}';
                } else {
                    return url + '?q={q}';
                }
            } else {
                return url + '?q={q}';
            }
        }

        // 检查当前页面是否是搜索引擎页面
        isSearchEnginePage() {
            return !!this.extractKeyword();
        }

        // 从URL中提取主机名
        extractHostname(url) {
            try {
                const urlObj = new URL(url);
                let hostname = urlObj.hostname.toLowerCase();
                hostname = hostname.replace(/^www\./, '');
                return hostname;
            } catch (e) {
                console.error('解析URL失败:', url, e);
                return '';
            }
        }

        // 检查当前页面是否与搜索引擎列表匹配
        isPageMatchingSearchEngines() {
            const currentHostname = this.extractHostname(window.location.href);
            if (!currentHostname) return false;
            
            for (const engine of this.searchEngines) {
                const engineHostname = this.extractHostname(engine.url);
                if (engineHostname && engineHostname === currentHostname) {
                    return true;
                }
            }
            
            return false;
        }

        // 检查是否应该显示悬浮按钮
        shouldShowFloatingButton() {
            if (this.forceShowButton) {
                return true;
            }
            
            if (this.isSearchEnginePage()) {
                return true;
            }
            
            if (this.isPageMatchingSearchEngines()) {
                return true;
            }
            
            return false;
        }

        // 添加当前页面的搜索引擎
        addCurrentSearchEngine() {
            const url = new URL(window.location.href);
            const hostname = this.extractHostname(url.href);
            const params = new URLSearchParams(url.search);
            const pathname = url.pathname;
            
            // 查找搜索参数
            const searchParams = ['q', 'query', 'wd', 'search', 'keyword', 'text', 'p', 's', 'search_query', 'searchTerm'];
            let searchParam = null;
            
            for (const param of searchParams) {
                if (params.has(param)) {
                    searchParam = param;
                    break;
                }
            }
            
            // 检查是否为路径式搜索（如抖音、GitHub等）
            let isPathSearch = false;
            const searchPaths = ['/search/', '/s/', '/query/', '/find/', '/results/', '/search'];
            
            for (const path of searchPaths) {
                if (pathname.includes(path)) {
                    isPathSearch = true;
                    break;
                }
            }
            
            if (!searchParam && !isPathSearch) {
                alert('无法检测到当前页面的搜索参数，请手动添加搜索引擎。\n\n提示：您可以在搜索引擎管理界面手动添加。');
                return;
            }
            
            // 获取网站名称
            let siteName = hostname.split('.')[0];
            if (siteName) {
                siteName = siteName.charAt(0).toUpperCase() + siteName.slice(1);
            } else {
                siteName = '自定义';
            }
            
            // 构建基础URL
            let finalUrl;
            if (isPathSearch) {
                // 路径式搜索，如抖音
                const basePath = url.pathname.split('/search/')[0] + '/search/';
                finalUrl = `${url.protocol}//${url.host}${basePath}{q}`;
            } else {
                // 参数式搜索
                const baseUrl = `${url.protocol}//${url.host}${url.pathname}`;
                const hasQuery = url.search.includes('?');
                const separator = hasQuery ? '&' : '?';
                finalUrl = `${baseUrl}${separator}${searchParam}={q}`;
            }
            
            const newEngine = {
                id: `${hostname}_${Date.now()}`,
                name: siteName,
                url: finalUrl,
                icon: siteName.charAt(0)
            };
            
            this.searchEngines.push(newEngine);
            this.saveSearchEngines();
            this.refreshUI();
            this.showNotification(`已添加搜索引擎: ${siteName}`);
            
            this.checkAndUpdateFloatingButton();
        }

        // 添加自定义搜索引擎
        addCustomEngine(name, url) {
            const newEngine = {
                id: `custom_${Date.now()}`,
                name: name,
                url: url,
                icon: name.charAt(0)
            };
            
            this.searchEngines.push(newEngine);
            this.saveSearchEngines();
            this.refreshUI();
            
            this.checkAndUpdateFloatingButton();
        }

        // 删除搜索引擎
        deleteEngine(id) {
            this.searchEngines = this.searchEngines.filter(engine => engine.id !== id);
            this.saveSearchEngines();
            this.refreshUI();
            
            this.checkAndUpdateFloatingButton();
        }

        // 更新搜索引擎
        updateEngine(id, updates) {
            const index = this.searchEngines.findIndex(engine => engine.id === id);
            if (index !== -1) {
                this.searchEngines[index] = { ...this.searchEngines[index], ...updates };
                this.saveSearchEngines();
                this.refreshUI();
                
                this.checkAndUpdateFloatingButton();
            }
        }

        // 重新排序搜索引擎
        reorderEngines(fromIndex, toIndex) {
            const [movedEngine] = this.searchEngines.splice(fromIndex, 1);
            this.searchEngines.splice(toIndex, 0, movedEngine);
            this.saveSearchEngines();
            this.refreshUI();
        }

        // 使用指定搜索引擎搜索
        searchWithEngine(engine) {
            if (!this.currentKeyword) {
                this.currentKeyword = this.extractKeyword();
                
                if (!this.currentKeyword) {
                    const searchInputs = [
                        'input[type="text"]',
                        'input[type="search"]',
                        'textarea',
                        'input:not([type])'
                    ];
                    
                    for (const selector of searchInputs) {
                        try {
                            const input = document.querySelector(selector);
                            if (input && input.value && input.value.trim()) {
                                this.currentKeyword = input.value.trim();
                                break;
                            }
                        } catch (e) {
                            // 忽略错误
                        }
                    }
                    
                    if (!this.currentKeyword) {
                        const userInput = prompt('未检测到搜索关键词，请输入要搜索的内容:');
                        if (!userInput || !userInput.trim()) {
                            return;
                        }
                        this.currentKeyword = userInput.trim();
                    }
                }
            }
            
            const encodedKeyword = encodeURIComponent(this.currentKeyword);
            const searchUrl = engine.url.replace(/{q}/g, encodedKeyword);
            window.open(searchUrl, '_blank');
        }

        // 显示通知
        showNotification(message) {
            const notification = document.createElement('div');
            notification.className = 'search-switcher-notification';
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${DARK_THEME.success};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10000;
                font-size: 14px;
                animation: fadeInOut 3s ease;
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'fadeOut 0.5s ease';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 500);
                }
            }, 2500);
        }

        // 检查并更新悬浮按钮状态
        checkAndUpdateFloatingButton() {
            if (this.shouldShowFloatingButton()) {
                if (!this.isFloatingButtonCreated) {
                    this.createFloatingButton();
                }
            } else if (!this.forceShowButton && this.isFloatingButtonCreated) {
                this.removeFloatingButton();
            }
        }

        // 清除隐藏定时器
        clearHideTimer() {
            if (this.hideTimer) {
                clearTimeout(this.hideTimer);
                this.hideTimer = null;
            }
        }

        // 设置隐藏定时器
        setHideTimer() {
            this.clearHideTimer();
            this.hideTimer = setTimeout(() => {
                if (!this.isManagementOpen) {
                    this.hideMainPanel();
                }
            }, this.hideDelay);
        }

        // 初始化
        init() {
            this.createStyles();
            this.createMainPanel();
            this.createManagementPanel();
            
            this.checkAndUpdateFloatingButton();
            
            this.setupEventListeners();
            this.registerMenuCommands();
        }

        // 创建样式
        createStyles() {
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateX(100%); }
                    15% { opacity: 1; transform: translateX(0); }
                    85% { opacity: 1; transform: translateX(0); }
                    100% { opacity: 0; transform: translateX(100%); }
                }
                
                /* 悬浮按钮 */
                .search-switcher-floating-btn {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 40px;
                    height: 40px;
                    background: ${DARK_THEME.transparentBg};
                    backdrop-filter: blur(10px);
                    border: 1px solid ${DARK_THEME.borderLight};
                    border-radius: 20px;
                    cursor: pointer;
                    z-index: 9998;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: ${DARK_THEME.textSecondary};
                    font-size: 18px;
                    transition: all 0.3s ease;
                    opacity: 0.3;
                }
                
                .search-switcher-floating-btn:hover {
                    opacity: 1;
                    background: ${DARK_THEME.primary};
                    width: 120px;
                    color: ${DARK_THEME.textPrimary};
                    border-color: ${DARK_THEME.accent};
                }
                
                .search-switcher-floating-btn:hover::after {
                    content: "切换搜索";
                    margin-left: 8px;
                    font-size: 14px;
                }
                
                /* 主面板 */
                .search-switcher-main-panel {
                    position: fixed;
                    top: 65px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: ${DARK_THEME.panelBg};
                    backdrop-filter: blur(20px);
                    border: 1px solid ${DARK_THEME.borderLight};
                    border-radius: 12px;
                    padding: 16px;
                    z-index: 9999;
                    min-width: 280px;
                    max-width: 380px;
                    max-height: 600px;
                    overflow-y: auto;
                    display: none;
                    box-shadow: 0 8px 32px ${DARK_THEME.shadow};
                    animation: fadeIn 0.2s ease;
                }
                
                .search-switcher-main-panel.visible {
                    display: block;
                }
                
                /* 页面信息 */
                .search-switcher-page-info {
                    font-size: 12px;
                    color: ${DARK_THEME.textTertiary};
                    margin-bottom: 12px;
                    padding: 8px;
                    background: ${DARK_THEME.secondary};
                    border-radius: 8px;
                    border: 1px solid ${DARK_THEME.borderDark};
                }
                
                /* 关键词信息 */
                .search-switcher-keyword-info {
                    font-size: 12px;
                    color: ${DARK_THEME.textSecondary};
                    margin-bottom: 16px;
                    padding: 10px;
                    background: ${DARK_THEME.secondary};
                    border-radius: 8px;
                    word-break: break-all;
                    border-left: 3px solid ${DARK_THEME.accent};
                    border: 1px solid ${DARK_THEME.borderDark};
                }
                
                .search-switcher-no-keyword-info {
                    font-size: 12px;
                    color: ${DARK_THEME.warning};
                    margin-bottom: 16px;
                    padding: 10px;
                    background: ${DARK_THEME.secondary};
                    border-radius: 8px;
                    word-break: break-all;
                    border-left: 3px solid ${DARK_THEME.warning};
                    border: 1px solid ${DARK_THEME.borderDark};
                }
                
                /* 搜索引擎列表 */
                .search-switcher-engine-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-bottom: 16px;
                }
                
                .search-switcher-engine-item {
                    display: flex;
                    align-items: center;
                    padding: 12px 14px;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: ${DARK_THEME.textPrimary};
                    background: ${DARK_THEME.engineItemBg};
                    border: 1px solid ${DARK_THEME.engineItemBorder};
                    position: relative;
                }
                
                .search-switcher-engine-item:hover {
                    background: ${DARK_THEME.engineItemHover};
                    border-color: ${DARK_THEME.accent};
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }
                
                .search-switcher-engine-item:active {
                    transform: translateY(0);
                }
                
                .search-switcher-engine-icon {
                    width: 32px;
                    height: 32px;
                    background: ${DARK_THEME.accent};
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 12px;
                    font-size: 14px;
                    font-weight: bold;
                    color: white;
                    flex-shrink: 0;
                }
                
                .search-switcher-engine-info {
                    flex: 1;
                    min-width: 0;
                }
                
                .search-switcher-engine-name {
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 4px;
                    color: ${DARK_THEME.textPrimary};
                }
                
                .search-switcher-engine-url {
                    font-size: 12px;
                    color: ${DARK_THEME.textTertiary};
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 250px;
                }
                
                /* 按钮 */
                .search-switcher-button {
                    width: 100%;
                    padding: 12px;
                    border: none;
                    border-radius: 10px;
                    background: ${DARK_THEME.buttonSecondary};
                    color: ${DARK_THEME.textPrimary};
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s ease;
                    margin-bottom: 8px;
                    font-weight: 500;
                    border: 1px solid ${DARK_THEME.borderDark};
                }
                
                .search-switcher-button:hover {
                    background: ${DARK_THEME.buttonSecondaryHover};
                    transform: translateY(-1px);
                    border-color: ${DARK_THEME.borderLight};
                }
                
                .search-switcher-button:active {
                    transform: translateY(0);
                }
                
                .search-switcher-button.primary {
                    background: ${DARK_THEME.buttonPrimary};
                    border-color: ${DARK_THEME.accent};
                }
                
                .search-switcher-button.primary:hover {
                    background: ${DARK_THEME.buttonPrimaryHover};
                    border-color: ${DARK_THEME.accentHover};
                }
                
                /* 管理面板 */
                .search-switcher-management-panel {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: ${DARK_THEME.primary};
                    border: 1px solid ${DARK_THEME.borderLight};
                    border-radius: 12px;
                    padding: 20px;
                    z-index: 10000;
                    min-width: 500px;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                    display: none;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                }
                
                .search-switcher-management-panel.visible {
                    display: block;
                }
                
                .search-switcher-management-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid ${DARK_THEME.borderDark};
                }
                
                .search-switcher-management-title {
                    font-size: 18px;
                    font-weight: bold;
                    color: ${DARK_THEME.textPrimary};
                }
                
                .search-switcher-close-btn {
                    background: none;
                    border: none;
                    color: ${DARK_THEME.textSecondary};
                    font-size: 20px;
                    cursor: pointer;
                    padding: 5px;
                    border-radius: 4px;
                }
                
                .search-switcher-close-btn:hover {
                    background: ${DARK_THEME.hover};
                    color: ${DARK_THEME.textPrimary};
                }
                
                .search-switcher-management-list {
                    margin-bottom: 20px;
                }
                
                .search-switcher-management-item {
                    display: flex;
                    align-items: center;
                    padding: 14px;
                    border-radius: 10px;
                    margin-bottom: 10px;
                    border: 1px solid ${DARK_THEME.borderDark};
                    gap: 12px;
                }
                
                .search-switcher-management-item:hover {
                    border-color: ${DARK_THEME.borderLight};
                    background: ${DARK_THEME.hover};
                }
                
                .search-switcher-drag-handle {
                    cursor: move;
                    color: ${DARK_THEME.textTertiary};
                    font-size: 18px;
                    flex-shrink: 0;
                }
                
                .search-switcher-management-item-content {
                    flex: 1;
                    min-width: 0;
                    overflow: hidden;
                }
                
                .search-switcher-management-item-name {
                    font-weight: bold;
                    color: ${DARK_THEME.textPrimary};
                    margin-bottom: 4px;
                    font-size: 14px;
                }
                
                .search-switcher-management-item-url {
                    font-size: 12px;
                    color: ${DARK_THEME.textSecondary};
                    word-break: break-all;
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    line-height: 1.4;
                }
                
                .search-switcher-management-actions {
                    display: flex;
                    gap: 8px;
                    flex-shrink: 0;
                }
                
                .search-switcher-action-btn {
                    padding: 6px 12px;
                    border: none;
                    border-radius: 6px;
                    background: ${DARK_THEME.tertiary};
                    color: ${DARK_THEME.textPrimary};
                    cursor: pointer;
                    font-size: 12px;
                    transition: background 0.2s ease;
                    white-space: nowrap;
                    border: 1px solid ${DARK_THEME.borderDark};
                }
                
                .search-switcher-action-btn:hover {
                    background: ${DARK_THEME.hover};
                    border-color: ${DARK_THEME.borderLight};
                }
                
                .search-switcher-action-btn.delete {
                    background: ${DARK_THEME.danger};
                    border-color: #d13c3c;
                }
                
                .search-switcher-action-btn.delete:hover {
                    background: #d13c3c;
                }
                
                /* 表单 */
                .search-switcher-form-group {
                    margin-bottom: 16px;
                }
                
                .search-switcher-form-label {
                    display: block;
                    margin-bottom: 6px;
                    font-size: 13px;
                    color: ${DARK_THEME.textSecondary};
                }
                
                .search-switcher-form-input {
                    width: 100%;
                    padding: 10px;
                    background: ${DARK_THEME.inputBg};
                    border: 1px solid ${DARK_THEME.inputBorder};
                    border-radius: 8px;
                    color: ${DARK_THEME.textPrimary};
                    font-size: 13px;
                }
                
                .search-switcher-form-input:focus {
                    outline: none;
                    border-color: ${DARK_THEME.inputFocus};
                }
                
                .search-switcher-form-row {
                    display: flex;
                    gap: 10px;
                }
                
                .search-switcher-form-row .search-switcher-form-group {
                    flex: 1;
                }
                
                /* 遮罩层 */
                .search-switcher-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 9999;
                    display: none;
                }
                
                .search-switcher-overlay.visible {
                    display: block;
                }
                
                /* 滚动条样式优化 */
                .search-switcher-main-panel::-webkit-scrollbar,
                .search-switcher-management-panel::-webkit-scrollbar {
                    width: 6px;
                }
                
                .search-switcher-main-panel::-webkit-scrollbar-track,
                .search-switcher-management-panel::-webkit-scrollbar-track {
                    background: ${DARK_THEME.scrollbarTrack};
                    border-radius: 4px;
                }
                
                .search-switcher-main-panel::-webkit-scrollbar-thumb,
                .search-switcher-management-panel::-webkit-scrollbar-thumb {
                    background: ${DARK_THEME.scrollbarThumb};
                    border-radius: 4px;
                }
                
                .search-switcher-main-panel::-webkit-scrollbar-thumb:hover,
                .search-switcher-management-panel::-webkit-scrollbar-thumb:hover {
                    background: ${DARK_THEME.scrollbarThumbHover};
                }
                
                /* 无结果时的提示 */
                .search-switcher-no-engines {
                    text-align: center;
                    padding: 20px;
                    color: ${DARK_THEME.textTertiary};
                    font-size: 13px;
                }
            `;
            
            document.head.appendChild(style);
        }

        // 创建悬浮按钮
        createFloatingButton() {
            if (this.isFloatingButtonCreated) {
                return;
            }
            
            this.floatingBtn = document.createElement('div');
            this.floatingBtn.className = 'search-switcher-floating-btn';
            this.floatingBtn.innerHTML = '🔍';
            this.floatingBtn.title = '搜索引擎切换器 (鼠标悬停展开)';
            document.body.appendChild(this.floatingBtn);
            this.isFloatingButtonCreated = true;
            
            this.setupFloatingButtonEvents();
        }

        // 移除悬浮按钮
        removeFloatingButton() {
            if (this.floatingBtn && this.floatingBtn.parentNode) {
                this.floatingBtn.parentNode.removeChild(this.floatingBtn);
                this.floatingBtn = null;
                this.isFloatingButtonCreated = false;
            }
        }

        // 设置悬浮按钮事件监听
        setupFloatingButtonEvents() {
            if (!this.floatingBtn) return;
            
            this.floatingBtn.addEventListener('mouseenter', () => {
                this.showMainPanel();
            });
            
            this.floatingBtn.addEventListener('mouseleave', () => {
                this.setHideTimer();
            });
        }

        // 创建主面板
        createMainPanel() {
            this.mainPanel = document.createElement('div');
            this.mainPanel.className = 'search-switcher-main-panel';
            document.body.appendChild(this.mainPanel);
            this.refreshMainPanel();
        }

        // 创建管理面板
        createManagementPanel() {
            this.overlay = document.createElement('div');
            this.overlay.className = 'search-switcher-overlay';
            document.body.appendChild(this.overlay);
            
            this.managementPanel = document.createElement('div');
            this.managementPanel.className = 'search-switcher-management-panel';
            this.managementPanel.innerHTML = `
                <div class="search-switcher-management-header">
                    <div class="search-switcher-management-title">搜索引擎管理</div>
                    <button class="search-switcher-close-btn">×</button>
                </div>
                <div class="search-switcher-management-list" id="managementList"></div>
                <div class="search-switcher-form-row">
                    <div class="search-switcher-form-group">
                        <label class="search-switcher-form-label">搜索引擎名称</label>
                        <input type="text" class="search-switcher-form-input" id="newEngineName" placeholder="例如: Google">
                    </div>
                    <div class="search-switcher-form-group">
                        <label class="search-switcher-form-label">搜索URL模板</label>
                        <input type="text" class="search-switcher-form-input" id="newEngineUrl" placeholder="例如: https://www.google.com/search?q={q}">
                    </div>
                </div>
                <div class="search-switcher-form-group">
                    <small style="color: ${DARK_THEME.textTertiary};">提示: 使用 {q} 作为搜索关键词的占位符</small>
                </div>
                <button class="search-switcher-button primary" id="addEngineBtn">添加搜索引擎</button>
            `;
            
            document.body.appendChild(this.managementPanel);
        }

        // 刷新主面板
        refreshMainPanel() {
            this.mainPanel.innerHTML = '';
            
            // 显示当前页面信息
            const pageInfo = document.createElement('div');
            pageInfo.className = 'search-switcher-page-info';
            
            const currentHostname = this.extractHostname(window.location.href);
            const isMatching = this.isPageMatchingSearchEngines();
            const hasKeyword = !!this.currentKeyword;
            
            let infoText = `当前页面: ${currentHostname}`;
            if (hasKeyword) {
                infoText += ` | 检测到关键词`;
            }
            if (isMatching) {
                infoText += ` | 匹配搜索引擎列表`;
            }
            
            pageInfo.textContent = infoText;
            this.mainPanel.appendChild(pageInfo);
            
            // 当前关键词显示
            if (this.currentKeyword) {
                const keywordInfo = document.createElement('div');
                keywordInfo.className = 'search-switcher-keyword-info';
                keywordInfo.textContent = `搜索关键词: ${this.currentKeyword}`;
                this.mainPanel.appendChild(keywordInfo);
            } else {
                const noKeywordInfo = document.createElement('div');
                noKeywordInfo.className = 'search-switcher-no-keyword-info';
                noKeywordInfo.textContent = '当前页面未检测到搜索关键词';
                this.mainPanel.appendChild(noKeywordInfo);
            }
            
            // 搜索引擎列表
            const engineList = document.createElement('div');
            engineList.className = 'search-switcher-engine-list';
            
            if (this.searchEngines.length === 0) {
                const noEngines = document.createElement('div');
                noEngines.className = 'search-switcher-no-engines';
                noEngines.textContent = '暂无搜索引擎，请添加一个';
                engineList.appendChild(noEngines);
            } else {
                this.searchEngines.forEach(engine => {
                    const engineItem = document.createElement('div');
                    engineItem.className = 'search-switcher-engine-item';
                    engineItem.dataset.engineId = engine.id;
                    
                    const index = this.searchEngines.indexOf(engine);
                    
                    // 为引擎项设置交替背景色
                    if (index % 2 === 0) {
                        engineItem.style.background = DARK_THEME.listEven;
                    } else {
                        engineItem.style.background = DARK_THEME.listOdd;
                    }
                    
                    const engineHostname = this.extractHostname(engine.url);
                    const currentHostname = this.extractHostname(window.location.href);
                    const isCurrentEngine = engineHostname === currentHostname;
                    
                    if (isCurrentEngine) {
                        engineItem.style.borderLeft = `3px solid ${DARK_THEME.accent}`;
                    }
                    
                    engineItem.innerHTML = `
                        <div class="search-switcher-engine-icon">${engine.icon}</div>
                        <div class="search-switcher-engine-info">
                            <div class="search-switcher-engine-name">${engine.name}${isCurrentEngine ? ' (当前)' : ''}</div>
                            <div class="search-switcher-engine-url">${engine.url}...</div>
                        </div>
                    `;
                    
                    engineItem.addEventListener('click', () => {
                        this.searchWithEngine(engine);
                    });
                    
                    engineList.appendChild(engineItem);
                });
            }
            
            this.mainPanel.appendChild(engineList);
            
            // 按钮
            const addCurrentBtn = document.createElement('button');
            addCurrentBtn.className = 'search-switcher-button primary';
            addCurrentBtn.textContent = '一键添加当前搜索引擎';
            addCurrentBtn.addEventListener('click', () => {
                this.addCurrentSearchEngine();
                this.hideMainPanel();
            });
            
            const manageBtn = document.createElement('button');
            manageBtn.className = 'search-switcher-button';
            manageBtn.textContent = '搜索引擎管理';
            manageBtn.addEventListener('click', () => {
                this.showManagementPanel();
                this.hideMainPanel();
            });
            
            this.mainPanel.appendChild(addCurrentBtn);
            this.mainPanel.appendChild(manageBtn);
        }

        // 刷新管理面板
        refreshManagementPanel() {
            const managementList = this.managementPanel.querySelector('#managementList');
            managementList.innerHTML = '';
            
            this.searchEngines.forEach((engine, index) => {
                const item = document.createElement('div');
                item.className = 'search-switcher-management-item';
                item.draggable = true;
                item.dataset.index = index;
                
                if (index % 2 === 0) {
                    item.style.background = DARK_THEME.listEven;
                } else {
                    item.style.background = DARK_THEME.listOdd;
                }
                
                item.innerHTML = `
                    <div class="search-switcher-drag-handle">⋮⋮</div>
                    <div class="search-switcher-management-item-content">
                        <div class="search-switcher-management-item-name">${engine.name}</div>
                        <div class="search-switcher-management-item-url">${engine.url}</div>
                    </div>
                    <div class="search-switcher-management-actions">
                        <button class="search-switcher-action-btn edit-btn" data-id="${engine.id}">编辑</button>
                        <button class="search-switcher-action-btn delete delete-btn" data-id="${engine.id}">删除</button>
                    </div>
                `;
                
                // 拖拽功能
                item.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', index.toString());
                    item.style.opacity = '0.5';
                });
                
                item.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    item.style.borderTop = `2px solid ${DARK_THEME.accent}`;
                });
                
                item.addEventListener('dragleave', () => {
                    item.style.borderTop = 'none';
                });
                
                item.addEventListener('drop', (e) => {
                    e.preventDefault();
                    item.style.borderTop = 'none';
                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    const toIndex = index;
                    if (fromIndex !== toIndex) {
                        this.reorderEngines(fromIndex, toIndex);
                    }
                });
                
                item.addEventListener('dragend', () => {
                    document.querySelectorAll('.search-switcher-management-item').forEach(el => {
                        el.style.opacity = '1';
                        el.style.borderTop = 'none';
                    });
                });
                
                // 编辑功能
                const editBtn = item.querySelector('.edit-btn');
                editBtn.addEventListener('click', () => {
                    this.editEngine(engine.id);
                });
                
                // 删除功能
                const deleteBtn = item.querySelector('.delete-btn');
                deleteBtn.addEventListener('click', () => {
                    if (confirm(`确定要删除搜索引擎 "${engine.name}" 吗？`)) {
                        this.deleteEngine(engine.id);
                    }
                });
                
                managementList.appendChild(item);
            });
            
            // 添加新搜索引擎功能
            const addBtn = this.managementPanel.querySelector('#addEngineBtn');
            addBtn.onclick = () => {
                const nameInput = this.managementPanel.querySelector('#newEngineName');
                const urlInput = this.managementPanel.querySelector('#newEngineUrl');
                
                const name = nameInput.value.trim();
                const url = urlInput.value.trim();
                
                if (!name) {
                    alert('请输入搜索引擎名称');
                    return;
                }
                
                if (!url) {
                    alert('请输入搜索URL模板');
                    return;
                }
                
                if (!url.includes('{q}')) {
                    if (!confirm('URL模板中没有找到 {q} 占位符，是否继续添加？\n\n提示: {q} 会被替换为搜索关键词')) {
                        return;
                    }
                }
                
                this.addCustomEngine(name, url);
                nameInput.value = '';
                urlInput.value = '';
                nameInput.focus();
            };
        }

        // 编辑搜索引擎
        editEngine(id) {
            const engine = this.searchEngines.find(e => e.id === id);
            if (!engine) return;
            
            const newName = prompt('请输入新的搜索引擎名称:', engine.name);
            if (newName === null) return;
            
            const newUrl = prompt('请输入新的搜索URL模板:', engine.url);
            if (newUrl === null) return;
            
            this.updateEngine(id, { 
                name: newName.trim(), 
                url: newUrl.trim(),
                icon: newName.trim().charAt(0)
            });
        }

        // 显示主面板
        showMainPanel() {
            this.currentKeyword = this.extractKeyword();
            this.refreshMainPanel();
            this.mainPanel.classList.add('visible');
            this.clearHideTimer();
        }

        // 隐藏主面板
        hideMainPanel() {
            if (!this.isManagementOpen) {
                this.mainPanel.classList.remove('visible');
            }
        }

        // 显示管理面板
        showManagementPanel() {
            this.isManagementOpen = true;
            this.overlay.classList.add('visible');
            this.managementPanel.classList.add('visible');
            this.refreshManagementPanel();
        }

        // 隐藏管理面板
        hideManagementPanel() {
            this.isManagementOpen = false;
            this.overlay.classList.remove('visible');
            this.managementPanel.classList.remove('visible');
        }

        // 刷新UI
        refreshUI() {
            this.refreshMainPanel();
            this.refreshManagementPanel();
        }

        // 显示悬浮按钮（用于菜单命令）
        showFloatingButtonFromMenu() {
            this.forceShowButton = true;
            if (!this.isFloatingButtonCreated) {
                this.createFloatingButton();
                this.showNotification('已显示悬浮按钮，刷新页面后恢复自动检测逻辑');
            } else {
                this.showNotification('悬浮按钮已显示');
            }
        }

        // 注册菜单命令
        registerMenuCommands() {
            GM_registerMenuCommand('显示悬浮按钮', () => {
                this.showFloatingButtonFromMenu();
            });
            
            GM_registerMenuCommand('管理搜索引擎', () => {
                this.showManagementPanel();
            });
            
            GM_registerMenuCommand('添加当前搜索引擎', () => {
                this.addCurrentSearchEngine();
            });
            
            GM_registerMenuCommand('刷新搜索关键词', () => {
                this.currentKeyword = this.extractKeyword();
                this.showNotification(`已刷新关键词: ${this.currentKeyword || '未检测到关键词'}`);
                this.refreshMainPanel();
            });
        }

        // 设置事件监听器
        setupEventListeners() {
            // 主面板事件
            this.mainPanel.addEventListener('mouseenter', () => {
                this.clearHideTimer();
            });
            
            this.mainPanel.addEventListener('mouseleave', () => {
                this.setHideTimer();
            });
            
            // 管理面板关闭按钮
            const closeBtn = this.managementPanel.querySelector('.search-switcher-close-btn');
            closeBtn.addEventListener('click', () => {
                this.hideManagementPanel();
            });
            
            // 点击遮罩层关闭管理面板
            this.overlay.addEventListener('click', () => {
                this.hideManagementPanel();
            });
            
            // 管理面板内点击事件不冒泡
            this.managementPanel.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // 监听页面变化，更新关键词和悬浮按钮状态
            let lastUrl = window.location.href;
            setInterval(() => {
                if (window.location.href !== lastUrl) {
                    lastUrl = window.location.href;
                    this.currentKeyword = this.extractKeyword();
                    this.refreshMainPanel();
                    
                    this.checkAndUpdateFloatingButton();
                }
            }, 1000);
            
            // 监听输入框变化，实时更新关键词
            document.addEventListener('input', (e) => {
                if (e.target && (e.target.type === 'text' || e.target.type === 'search' || 
                    e.target.tagName === 'TEXTAREA' || e.target.classList.contains('search'))) {
                    setTimeout(() => {
                        this.currentKeyword = this.extractKeyword();
                        this.refreshMainPanel();
                    }, 500);
                }
            });
        }
    }

    // 初始化脚本
    window.addEventListener('load', () => {
        setTimeout(() => {
            new SearchEngineManager();
        }, 1000);
    });

})();
