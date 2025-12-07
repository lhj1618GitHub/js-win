// ==UserScript==
// @name         自动跳过中转页 - 顶部固定提示版
// @namespace    https://github.com/
// @version      7.3.0
// @description  点击中转页链接时，在新标签页打开目标地址，并在页面顶部显示跳转提示
// @author       YourName
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @grant        GM_addStyle
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';
    
    // 添加CSS样式 - 暗黑主题
    GM_addStyle(`
        /* 控制面板样式 - 暗黑主题 */
        .skip-redirect-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 500px;
            max-height: 85vh;
            background: #1e1e1e;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            z-index: 2147483647;
            display: none;
            flex-direction: column;
            overflow: hidden;
            color: #e0e0e0;
        }
        
        .skip-redirect-panel.active {
            display: flex;
        }
        
        .skip-redirect-panel-header {
            padding: 12px 16px;
            background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .skip-redirect-panel-title {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }
        
        .skip-redirect-panel-close {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background 0.2s;
        }
        
        .skip-redirect-panel-close:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .skip-redirect-panel-content {
            padding: 16px;
            flex: 1;
            overflow-y: auto;
            background: #1e1e1e;
        }
        
        .skip-redirect-panel-footer {
            padding: 12px 16px;
            border-top: 1px solid #333;
            display: flex;
            justify-content: space-between;
            gap: 8px;
            background: #252525;
        }
        
        /* 规则列表样式 - 暗黑主题 */
        .skip-redirect-rule-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .skip-redirect-rule-item {
            background: #2d2d2d;
            border: 1px solid #444;
            border-radius: 6px;
            padding: 10px 12px;
            transition: all 0.2s;
        }
        
        .skip-redirect-rule-item:hover {
            background: #3a3a3a;
        }
        
        .skip-redirect-rule-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }
        
        .skip-redirect-rule-item-title {
            font-weight: 600;
            color: #fff;
            font-size: 14px;
        }
        
        .skip-redirect-rule-item-status {
            font-size: 11px;
            padding: 1px 6px;
            border-radius: 8px;
            font-weight: 500;
        }
        
        .skip-redirect-rule-item-status.enabled {
            background: #155724;
            color: #d4edda;
        }
        
        .skip-redirect-rule-item-status.disabled {
            background: #721c24;
            color: #f8d7da;
        }
        
        .skip-redirect-rule-item-pattern {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 11px;
            color: #aaa;
            background: #252525;
            padding: 6px 8px;
            border-radius: 3px;
            margin: 6px 0;
            word-break: break-all;
        }
        
        .skip-redirect-rule-item-actions {
            display: flex;
            gap: 6px;
            justify-content: flex-end;
        }
        
        /* 按钮样式 - 暗黑主题 */
        .skip-redirect-btn {
            padding: 4px 8px;
            border: none;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .skip-redirect-btn-primary {
            background: #007bff;
            color: white;
        }
        
        .skip-redirect-btn-primary:hover {
            background: #0056b3;
        }
        
        .skip-redirect-btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .skip-redirect-btn-secondary:hover {
            background: #545b62;
        }
        
        .skip-redirect-btn-success {
            background: #28a745;
            color: white;
        }
        
        .skip-redirect-btn-success:hover {
            background: #1e7e34;
        }
        
        .skip-redirect-btn-danger {
            background: #dc3545;
            color: white;
        }
        
        .skip-redirect-btn-danger:hover {
            background: #bd2130;
        }
        
        /* 表单样式 - 暗黑主题 */
        .skip-redirect-form-group {
            margin-bottom: 10px;
        }
        
        .skip-redirect-form-label {
            display: block;
            margin-bottom: 4px;
            font-weight: 500;
            color: #333;
            font-size: 12px;
        }
        
        .skip-redirect-form-input {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #444;
            border-radius: 3px;
            font-size: 12px;
            box-sizing: border-box;
            background: #252525;
            color: #e0e0e0;
        }
        
        .skip-redirect-form-input:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.15);
        }
        
        .skip-redirect-form-textarea {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #444;
            border-radius: 3px;
            font-size: 11px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            resize: vertical;
            min-height: 50px;
            box-sizing: border-box;
            background: #252525;
            color: #e0e0e0;
        }
        
        .skip-redirect-form-checkbox-label {
            font-size: 12px;
            color: #e0e0e0;
        }
        
        /* 空白状态 */
        .skip-redirect-empty-state {
            text-align: center;
            padding: 30px 16px;
            color: #6c757d;
        }
        
        .skip-redirect-empty-state-icon {
            font-size: 36px;
            margin-bottom: 8px;
            color: #dee2e6;
        }
        
        .skip-redirect-empty-state h3 {
            margin: 0 0 8px 0;
            font-size: 16px;
        }
        
        .skip-redirect-empty-state p {
            margin: 0;
            font-size: 12px;
        }
        
        /* 遮罩层 */
        .skip-redirect-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 2147483646;
            display: none;
        }
        
        .skip-redirect-overlay.active {
            display: block;
        }
        
        /* 顶部跳转提示样式 - 关键修改 */
        .skip-redirect-banner {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #1e4a2e 0%, #2d5a3d 100%);
            color: white;
            padding: 12px 20px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
            z-index: 2147483647;
            display: none;
            align-items: center;
            justify-content: space-between;
            border-bottom: 3px solid #28a745;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            animation: slideDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .skip-redirect-banner.show {
            display: flex;
        }
        
        .skip-redirect-banner.closing {
            animation: slideUp 0.3s ease-in forwards;
        }
        
        .skip-redirect-banner-content {
            display: flex;
            align-items: center;
            flex: 1;
        }
        
        .skip-redirect-banner-icon {
            font-size: 18px;
            margin-right: 10px;
            color: #7fff7f;
        }
        
        .skip-redirect-banner-text {
            font-size: 14px;
            font-weight: 500;
        }
        
        .skip-redirect-banner-url {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 11px;
            color: #b8e6b8;
            background: rgba(255, 255, 255, 0.1);
            padding: 4px 8px;
            border-radius: 3px;
            margin-left: 12px;
            max-width: 400px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .skip-redirect-banner-actions {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        
        .skip-redirect-banner-btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
        }
        
        .skip-redirect-banner-btn-close {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            width: 24px;
            height: 24px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }
        
        .skip-redirect-banner-btn-close:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        
        .skip-redirect-banner-btn-focus {
            background: #28a745;
            color: white;
        }
        
        .skip-redirect-banner-btn-focus:hover {
            background: #218838;
        }
        
        @keyframes slideDown {
            from {
                transform: translateY(-100%);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        @keyframes slideUp {
            from {
                transform: translateY(0);
                opacity: 1;
            }
            to {
                transform: translateY(-100%);
                opacity: 0;
            }
        }
        
        /* 响应式调整 */
        @media (max-width: 768px) {
            .skip-redirect-panel {
                width: 95%;
                max-height: 90vh;
            }
            
            .skip-redirect-banner {
                padding: 10px 12px;
                flex-wrap: wrap;
            }
            
            .skip-redirect-banner-content {
                width: 100%;
                margin-bottom: 8px;
            }
            
            .skip-redirect-banner-url {
                max-width: 200px;
                font-size: 10px;
            }
            
            .skip-redirect-banner-actions {
                width: 100%;
                justify-content: flex-end;
            }
        }
    `);
    
    // 中转页管理器
    class RedirectManager {
        constructor() {
            this.whitelistKey = 'redirect_skip_whitelist';
            this.settingsKey = 'redirect_skip_settings';
            this.redirectInfoKey = 'current_redirect_info'; // 用于存储跳转信息
            this.defaultSettings = {
                enabled: true,
                clickPrevention: true,
                showNotifications: true,
                showBanner: true,
                bannerAutoClose: 8000, // 横幅8秒后自动关闭
                skipDelay: 100
            };
            
            this.initialize();
        }
        
        // 初始化
        initialize() {
            this.loadSettings();
            this.loadWhitelist();
            this.setupMenuCommands();
            this.createUI();
            
            // 检查当前页面是否是从中转页跳转过来的
            this.checkAndShowBanner();
            
            if (this.settings.enabled) {
                this.setupPreventiveInterception();
            }
        }
        
        // 加载设置
        loadSettings() {
            const savedSettings = GM_getValue(this.settingsKey);
            this.settings = savedSettings ? {...this.defaultSettings, ...savedSettings} : this.defaultSettings;
        }
        
        // 加载白名单
        loadWhitelist() {
            const savedWhitelist = GM_getValue(this.whitelistKey);
            this.whitelist = savedWhitelist || this.getDefaultWhitelist();
        }
        
        // 获取默认白名单
        getDefaultWhitelist() {
            return [
                {
                    id: '1',
                    name: '百度搜索跳转',
                    pattern: '^https?://www\\.baidu\\.com/link\\?',
                    enabled: true,
                    created: new Date().toISOString(),
                    description: '自动跳过百度搜索结果的中转页'
                },
                {
                    id: '2',
                    name: '知乎外链跳转',
                    pattern: '^https?://link\\.zhihu\\.com/\\?target=',
                    enabled: true,
                    created: new Date().toISOString(),
                    description: '跳过知乎外部链接的中转页'
                },
                {
                    id: '3',
                    name: 'CSDN外链',
                    pattern: '^https?://link\\.csdn\\.net/\\?target=',
                    enabled: true,
                    created: new Date().toISOString(),
                    description: '跳过CSDN博客的外部链接'
                },
                {
                    id: '4',
                    name: '简书外链',
                    pattern: '^https?://www\\.jianshu\\.com/go-wild\\?',
                    enabled: true,
                    created: new Date().toISOString(),
                    description: '跳过简书文章的外部链接'
                },
                {
                    id: '5',
                    name: '通用中转页',
                    pattern: 'redirect|jump|goto|go=',
                    enabled: true,
                    created: new Date().toISOString(),
                    description: '匹配常见的中转页URL模式'
                }
            ];
        }
        
        // 设置预防性拦截
        setupPreventiveInterception() {
            if (!this.settings.clickPrevention) {
                return;
            }
            
            // 监听点击事件
            document.addEventListener('click', (e) => {
                this.handleLinkClick(e);
            }, true);
            
            console.log('中转页预检查拦截已启用');
        }
        
        // 处理链接点击
        handleLinkClick(event) {
            // 找到被点击的链接元素
            let target = event.target;
            while (target && target.tagName !== 'A') {
                target = target.parentElement;
            }
            
            if (!target || !target.href) {
                return;
            }
            
            const href = target.href;
            
            // 检查是否需要跳过
            const targetUrl = this.extractTargetUrlFromLink(href, target);
            if (targetUrl && targetUrl !== href) {
                // 阻止默认行为
                event.preventDefault();
                event.stopPropagation();
                
                // 保存跳转信息到本地存储，供新标签页读取
                const redirectInfo = {
                    originalUrl: href,
                    targetUrl: targetUrl,
                    linkText: target.textContent || target.innerText || '未知链接',
                    timestamp: Date.now()
                };
                GM_setValue(this.redirectInfoKey, redirectInfo);
                
                // 在新标签页打开目标URL
                const newTab = window.open(targetUrl, '_blank');
                
                // 清除跳转信息（避免影响其他页面）
                setTimeout(() => {
                    GM_deleteValue(this.redirectInfoKey);
                }, 1000);
                
                // 如果浏览器阻止了弹窗，显示通知
                if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
                    this.showNotification('跳转被浏览器阻止，请允许弹窗后重试');
                    // 清除跳转信息
                    GM_deleteValue(this.redirectInfoKey);
                }
                
                return false;
            }
            
            return true;
        }
        
        // 检查并显示横幅（在新页面加载时调用）
        checkAndShowBanner() {
            try {
                const redirectInfo = GM_getValue(this.redirectInfoKey);
                if (redirectInfo && this.settings.showBanner) {
                    // 检查时间戳，确保是最近5秒内的跳转
                    if (Date.now() - redirectInfo.timestamp < 5000) {
                        this.showBanner(redirectInfo);
                    }
                    // 清除跳转信息
                    GM_deleteValue(this.redirectInfoKey);
                }
            } catch (e) {
                console.warn('检查跳转信息时出错:', e);
            }
        }
        
        // 显示顶部横幅
        showBanner(redirectInfo) {
            // 移除现有的横幅
            this.removeExistingBanner();
            
            // 创建横幅元素
            const banner = document.createElement('div');
            banner.className = 'skip-redirect-banner';
            banner.id = 'skip-redirect-banner-' + Date.now();
            
            // 截取链接文本和URL
            const shortLinkText = redirectInfo.linkText.length > 25 ? 
                redirectInfo.linkText.substring(0, 25) + '...' : redirectInfo.linkText;
            const shortTargetUrl = redirectInfo.targetUrl.length > 50 ? 
                redirectInfo.targetUrl.substring(0, 50) + '...' : redirectInfo.targetUrl;
            
            banner.innerHTML = `
                <div class="skip-redirect-banner-content">
                    <span class="skip-redirect-banner-icon">✅</span>
                    <span class="skip-redirect-banner-text">
                        已跳过中转页：${this.escapeHtml(shortLinkText)}
                    </span>
                    <span class="skip-redirect-banner-url" title="${this.escapeHtml(redirectInfo.targetUrl)}">
                        ${this.escapeHtml(shortTargetUrl)}
                    </span>
                </div>
                <div class="skip-redirect-banner-actions">
                    <button class="skip-redirect-banner-btn skip-redirect-banner-btn-focus" onclick="window.focus()">
                        🔙 返回
                    </button>
                    <button class="skip-redirect-banner-btn skip-redirect-banner-btn-close" title="关闭提示">×</button>
                </div>
            `;
            
            // 添加到页面顶部
            document.body.insertBefore(banner, document.body.firstChild);
            
            // 强制显示横幅
            setTimeout(() => {
                banner.classList.add('show');
            }, 100);
            
            // 设置自动关闭
            let autoCloseTimeout = null;
            if (this.settings.bannerAutoClose > 0) {
                autoCloseTimeout = setTimeout(() => {
                    this.closeBanner(banner);
                }, this.settings.bannerAutoClose);
            }
            
            // 关闭按钮事件
            const closeBtn = banner.querySelector('.skip-redirect-banner-btn-close');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (autoCloseTimeout) {
                    clearTimeout(autoCloseTimeout);
                }
                this.closeBanner(banner);
            });
            
            // 存储横幅引用
            this.currentBanner = banner;
        }
        
        // 关闭横幅
        closeBanner(banner) {
            if (!banner || !banner.parentNode) {
                return;
            }
            
            banner.classList.add('closing');
            setTimeout(() => {
                if (banner.parentNode) {
                    banner.remove();
                }
                if (this.currentBanner === banner) {
                    this.currentBanner = null;
                }
            }, 300);
        }
        
        // 移除现有横幅
        removeExistingBanner() {
            const existingBanner = document.querySelector('.skip-redirect-banner');
            if (existingBanner) {
                existingBanner.remove();
            }
            this.currentBanner = null;
        }
        
        // 从链接中提取目标URL
        extractTargetUrlFromLink(href, linkElement) {
            // 检查是否是中转页
            if (!this.isRedirectPage(href)) {
                return null;
            }
            
            // 尝试从URL参数中提取目标
            let targetUrl = this.extractTargetUrl(href);
            if (targetUrl) {
                return targetUrl;
            }
            
            // 检查链接元素是否有data-*属性包含目标URL
            if (linkElement) {
                for (let i = 0; i < linkElement.attributes.length; i++) {
                    const attr = linkElement.attributes[i];
                    if (attr.name.startsWith('data-') && this.isValidUrl(attr.value)) {
                        return attr.value;
                    }
                }
            }
            
            return null;
        }
        
        // 检查是否为中转页
        isRedirectPage(url) {
            return this.whitelist.some(rule => {
                if (!rule.enabled) return false;
                
                try {
                    const regex = new RegExp(rule.pattern, 'i');
                    return regex.test(url);
                } catch (e) {
                    return url.includes(rule.pattern);
                }
            });
        }
        
        // 从URL中提取目标URL
        extractTargetUrl(url) {
            const urlObj = new URL(url);
            const params = urlObj.searchParams;
            
            const targetParamNames = ['url', 'target', 'redirect', 'goto', 'link', 'u', 'href', 'dest', 'destination'];
            
            for (const paramName of targetParamNames) {
                const target = params.get(paramName);
                if (target && this.isValidUrl(target)) {
                    return decodeURIComponent(target);
                }
            }
            
            if (urlObj.hash) {
                const hash = urlObj.hash.substring(1);
                if (this.isValidUrl(hash)) {
                    return decodeURIComponent(hash);
                }
                
                const hashParams = new URLSearchParams(hash);
                for (const paramName of targetParamNames) {
                    const target = hashParams.get(paramName);
                    if (target && this.isValidUrl(target)) {
                        return decodeURIComponent(target);
                    }
                }
            }
            
            return null;
        }
        
        // 验证URL是否有效
        isValidUrl(string) {
            try {
                const url = new URL(string);
                return url.protocol === 'http:' || url.protocol === 'https:';
            } catch (_) {
                return false;
            }
        }
        
        // 创建UI界面
        createUI() {
            // 创建遮罩层
            this.overlay = document.createElement('div');
            this.overlay.className = 'skip-redirect-overlay';
            this.overlay.onclick = () => this.hidePanel();
            
            // 创建控制面板
            this.panel = document.createElement('div');
            this.panel.className = 'skip-redirect-panel';
            
            // 面板头部
            const header = document.createElement('div');
            header.className = 'skip-redirect-panel-header';
            
            const title = document.createElement('h3');
            title.className = 'skip-redirect-panel-title';
            title.textContent = '中转页跳过规则管理';
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'skip-redirect-panel-close';
            closeBtn.innerHTML = '&times;';
            closeBtn.onclick = () => this.hidePanel();
            
            header.appendChild(title);
            header.appendChild(closeBtn);
            
            // 面板内容区域
            this.content = document.createElement('div');
            this.content.className = 'skip-redirect-panel-content';
            
            // 面板底部
            const footer = document.createElement('div');
            footer.className = 'skip-redirect-panel-footer';
            
            const addBtn = document.createElement('button');
            addBtn.className = 'skip-redirect-btn skip-redirect-btn-success';
            addBtn.textContent = '添加规则';
            addBtn.onclick = () => this.showAddRuleForm();
            
            const quickAddBtn = document.createElement('button');
            quickAddBtn.className = 'skip-redirect-btn skip-redirect-btn-primary';
            quickAddBtn.textContent = '一键添加';
            quickAddBtn.onclick = () => this.quickAddRule();
            
            footer.appendChild(addBtn);
            footer.appendChild(quickAddBtn);
            
            this.panel.appendChild(header);
            this.panel.appendChild(this.content);
            this.panel.appendChild(footer);
            
            // 添加到页面
            document.documentElement.appendChild(this.overlay);
            document.documentElement.appendChild(this.panel);
            
            // 初始渲染规则列表
            this.renderRuleList();
            
            // 添加ESC键关闭功能
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.panel.classList.contains('active')) {
                    this.hidePanel();
                }
            });
        }
        
        // 显示面板
        showPanel() {
            this.panel.classList.add('active');
            this.overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
        // 隐藏面板
        hidePanel() {
            this.panel.classList.remove('active');
            this.overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
        
        // 渲染规则列表
        renderRuleList() {
            this.content.innerHTML = '';
            
            if (this.whitelist.length === 0) {
                const emptyState = document.createElement('div');
                emptyState.className = 'skip-redirect-empty-state';
                emptyState.innerHTML = `
                    <div class="skip-redirect-empty-state-icon">📄</div>
                    <h3>暂无规则</h3>
                    <p>点击下方按钮添加中转页规则</p>
                `;
                this.content.appendChild(emptyState);
                return;
            }
            
            const ruleList = document.createElement('div');
            ruleList.className = 'skip-redirect-rule-list';
            
            this.whitelist.forEach((rule, index) => {
                const ruleItem = document.createElement('div');
                ruleItem.className = 'skip-redirect-rule-item';
                ruleItem.innerHTML = `
                    <div class="skip-redirect-rule-item-header">
                        <div class="skip-redirect-rule-item-title">${this.escapeHtml(rule.name)}</div>
                        <span class="skip-redirect-rule-item-status ${rule.enabled ? 'enabled' : 'disabled'}">
                            ${rule.enabled ? '启用' : '禁用'}
                        </span>
                    </div>
                    <div class="skip-redirect-rule-item-pattern">${this.escapeHtml(rule.pattern)}</div>
                    ${rule.description ? `<div style="font-size: 11px; color: #666; margin-bottom: 6px;">${this.escapeHtml(rule.description)}</div>` : ''}
                    <div class="skip-redirect-rule-item-actions">
                        <button class="skip-redirect-btn skip-redirect-btn-secondary edit-btn" data-index="${index}">编辑</button>
                        <button class="skip-redirect-btn ${rule.enabled ? 'skip-redirect-btn-danger' : 'skip-redirect-btn-success'} toggle-btn" data-index="${index}">
                            ${rule.enabled ? '禁用' : '启用'}
                        </button>
                        <button class="skip-redirect-btn skip-redirect-btn-danger delete-btn" data-index="${index}">删除</button>
                    </div>
                `;
                
                ruleList.appendChild(ruleItem);
            });
            
            this.content.appendChild(ruleList);
            
            // 添加事件监听
            setTimeout(() => {
                document.querySelectorAll('.edit-btn').forEach(btn => {
                    btn.onclick = (e) => {
                        const index = parseInt(e.target.getAttribute('data-index'));
                        this.showEditRuleForm(index);
                    };
                });
                
                document.querySelectorAll('.toggle-btn').forEach(btn => {
                    btn.onclick = (e) => {
                        const index = parseInt(e.target.getAttribute('data-index'));
                        this.toggleRule(index);
                    };
                });
                
                document.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.onclick = (e) => {
                        const index = parseInt(e.target.getAttribute('data-index'));
                        this.deleteRule(index);
                    };
                });
            }, 0);
        }
        
        // 显示添加规则表单
        showAddRuleForm(rule = null) {
            const isEdit = rule !== null;
            const title = isEdit ? '编辑规则' : '添加规则';
            
            const formHtml = `
                <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; color: #e0e0e0;">${title}</h3>
                <div class="skip-redirect-form-group">
                    <label class="skip-redirect-form-label">规则名称</label>
                    <input type="text" class="skip-redirect-form-input" id="rule-name" value="${isEdit ? this.escapeHtml(rule.name) : ''}" placeholder="例如：百度搜索跳转">
                </div>
                <div class="skip-redirect-form-group">
                    <label class="skip-redirect-form-label">URL匹配模式（支持正则表达式）</label>
                    <textarea class="skip-redirect-form-textarea" id="rule-pattern" placeholder="例如：^https?://www\\.baidu\\.com/link\\?">${isEdit ? this.escapeHtml(rule.pattern) : ''}</textarea>
                </div>
                <div class="skip-redirect-form-group">
                    <label class="skip-redirect-form-label">规则描述（可选）</label>
                    <input type="text" class="skip-redirect-form-input" id="rule-description" value="${isEdit ? this.escapeHtml(rule.description || '') : ''}" placeholder="规则的描述信息">
                </div>
                <div class="skip-redirect-form-group">
                    <label class="skip-redirect-form-checkbox-label">
                        <input type="checkbox" class="skip-redirect-form-checkbox" id="rule-enabled" ${isEdit ? (rule.enabled ? 'checked' : '') : 'checked'}>
                        启用此规则
                    </label>
                </div>
                <div class="skip-redirect-form-group" style="display: flex; gap: 8px; margin-top: 16px;">
                    <button class="skip-redirect-btn skip-redirect-btn-secondary" id="cancel-btn">取消</button>
                    <button class="skip-redirect-btn skip-redirect-btn-success" id="save-btn">保存</button>
                </div>
            `;
            
            this.content.innerHTML = formHtml;
            
            // 添加事件监听
            setTimeout(() => {
                document.getElementById('cancel-btn').onclick = () => this.renderRuleList();
                document.getElementById('save-btn').onclick = () => {
                    this.saveRule(isEdit ? rule.id : null);
                };
            }, 0);
        }
        
        // 显示编辑规则表单
        showEditRuleForm(index) {
            if (index >= 0 && index < this.whitelist.length) {
                this.showAddRuleForm(this.whitelist[index]);
            }
        }
        
        // 保存规则
        saveRule(ruleId = null) {
            const name = document.getElementById('rule-name').value.trim();
            const pattern = document.getElementById('rule-pattern').value.trim();
            const description = document.getElementById('rule-description').value.trim();
            const enabled = document.getElementById('rule-enabled').checked;
            
            if (!name || !pattern) {
                this.showNotification('请填写规则名称和匹配模式');
                return;
            }
            
            // 验证正则表达式
            try {
                new RegExp(pattern);
            } catch (e) {
                this.showNotification('无效的正则表达式: ' + e.message);
                return;
            }
            
            const rule = {
                id: ruleId || Date.now().toString(),
                name: name,
                pattern: pattern,
                description: description,
                enabled: enabled,
                created: ruleId ? this.whitelist.find(r => r.id === ruleId)?.created : new Date().toISOString(),
                updated: new Date().toISOString()
            };
            
            if (ruleId) {
                // 更新现有规则
                const index = this.whitelist.findIndex(r => r.id === ruleId);
                if (index !== -1) {
                    this.whitelist[index] = rule;
                }
            } else {
                // 添加新规则
                this.whitelist.push(rule);
            }
            
            this.saveWhitelist();
            this.renderRuleList();
            this.showNotification(ruleId ? '规则已更新' : '规则已添加');
        }
        
        // 一键添加规则
        quickAddRule() {
            const currentUrl = window.location.href;
            const url = new URL(currentUrl);
            const hostname = url.hostname;
            const pathname = url.pathname;
            
            // 尝试从URL中提取有用的信息
            const searchParams = url.searchParams;
            const hasRedirectParam = Array.from(searchParams.keys()).some(key => 
                ['url', 'target', 'redirect', 'goto', 'link', 'u', 'href', 'dest', 'destination'].includes(key.toLowerCase())
            );
            
            let pattern = '';
            let name = '';
            
            if (hasRedirectParam) {
                pattern = `^https?://${this.escapeRegExp(hostname)}${this.escapeRegExp(pathname)}\\?.*(url|target|redirect|goto|link|u|href|dest|destination)=`;
                name = `${hostname} 跳转规则`;
            } else if (searchParams.toString()) {
                const firstParam = Array.from(searchParams.keys())[0];
                pattern = `^https?://${this.escapeRegExp(hostname)}${this.escapeRegExp(pathname)}\\?.*${this.escapeRegExp(firstParam)}=`;
                name = `${hostname} 通用规则`;
            } else {
                pattern = `^https?://${this.escapeRegExp(hostname)}`;
                name = `${hostname} 通用规则`;
            }
            
            // 显示表单并填充
            this.showAddRuleForm({
                id: null,
                name: name,
                pattern: pattern,
                description: '通过一键添加功能生成的规则',
                enabled: true
            });
            
            this.showNotification('已根据当前URL生成规则模板，请确认并保存');
        }
        
        // 切换规则状态
        toggleRule(index) {
            if (index >= 0 && index < this.whitelist.length) {
                this.whitelist[index].enabled = !this.whitelist[index].enabled;
                this.saveWhitelist();
                this.renderRuleList();
                
                const enabledRules = this.whitelist.filter(r => r.enabled).length;
                this.showNotification(`规则"${this.whitelist[index].name}"已${this.永远redirect[index].enabled ? '启用' : '禁用'}<br>当前有 ${enabledRules} 个规则启用`);
            }
        }
        
        // 删除规则
        deleteRule(index) {
            if (index >= 0 && index < this.whitelist.length) {
                const ruleName = this.whitelist[index].name;
                if (confirm(`确定要删除规则 "${ruleName}" 吗？\n此操作不可撤销。`)) {
                    this.whitelist.splice(index, 1);
                    this.saveWhitelist();
                    this.renderRuleList();
                    
                    const enabledRules = this.whitelist.filter(r => r.enabled).length;
                    this.showNotification(`规则"${ruleName}"已删除<br>当前有 ${enabledRules} 个规则启用`);
                }
            }
        }
        
        // 转义正则表达式特殊字符
        escapeRegExp(string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        
        // 转义HTML特殊字符
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // 设置菜单命令
        setupMenuCommands() {
            GM_registerMenuCommand('管理中转页规则', () => {
                this.showPanel();
                this.showNotification('已打开规则管理面板');
            });
        }
        
        // 保存白名单
        saveWhitelist() {
            GM_setValue(this.whitelistKey, this.whitelist);
        }
        
        // 显示通知
        showNotification(message, timeout = 3000) {
            if (typeof GM_notification === 'function') {
                GM_notification({
                    text: message,
                    title: '中转页跳过脚本',
                    timeout: timeout
                });
            } else {
                alert(message);
            }
        }
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new RedirectManager();
        });
    } else {
        new RedirectManager();
    }
})();