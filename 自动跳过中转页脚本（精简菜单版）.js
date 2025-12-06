// ==UserScript==
// @name         自动跳过中转页 - 精简版
// @namespace    https://github.com/js-win
// @version      5.0.0
// @description  自动跳过点击链接后的网页中转页，支持自定义添加中转页和白名单机制
// @author       lhj1618
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_notification
// @grant        GM_addStyle
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';
    
    // 添加CSS样式 - 暗黑主题
    GM_addStyle(`
        .skip-redirect-ui {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            z-index: 2147483647;
        }
        
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
        
        .skip-redirect-form-checkbox {
            margin-right: 4px;
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
        
        /* 响应式调整 */
        @media (max-width: 768px) {
            .skip-redirect-panel {
                width: 95%;
                max-height: 90vh;
            }
        }
    `);
    
    // 中转页管理器
    class RedirectManager {
        constructor() {
            this.whitelistKey = 'redirect_skip_whitelist';
            this.settingsKey = 'redirect_skip_settings';
            this.defaultSettings = {
                enabled: true,
                autoSkip: true,
                showNotifications: true,
                skipDelay: 1000,
                maxAttempts: 3
            };
            
            this.initialize();
        }
        
        // 初始化
        initialize() {
            this.loadSettings();
            this.loadWhitelist();
            this.setupMenuCommands();
            this.createUI();
            
            if (this.settings.enabled) {
                this.startMonitoring();
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
                    <label>
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
                // 如果有跳转参数，创建匹配该域名的规则
                pattern = `^https?://${this.escapeRegExp(hostname)}${this.escapeRegExp(pathname)}\\?.*(url|target|redirect|goto|link|u|href|dest|destination)=`;
                name = `${hostname} 跳转规则`;
            } else if (searchParams.toString()) {
                // 如果有查询参数但不包含跳转参数
                const firstParam = Array.from(searchParams.keys())[0];
                pattern = `^https?://${this.escapeRegExp(hostname)}${this.escapeRegExp(pathname)}\\?.*${this.escapeRegExp(firstParam)}=`;
                name = `${hostname} 通用规则`;
            } else {
                // 如果没有查询参数，使用更通用的模式
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
                this.showNotification(`规则"${this.whitelist[index].name}"已${this.whitelist[index].enabled ? '启用' : '禁用'}<br>当前有 ${enabledRules} 个规则启用`);
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
            // 只保留一个菜单命令：管理中转页规则
            GM_registerMenuCommand('管理中转页规则', () => {
                this.showPanel();
                this.showNotification('已打开规则管理面板');
            });
        }
        
        // 尝试跳过重定向
        attemptRedirectSkip() {
            const url = window.location.href;
            
            if (this.isRedirectPage(url)) {
                this.skipRedirect();
            }
        }
        
        // 检查并跳过
        checkAndSkip() {
            if (this.settings.enabled && this.settings.autoSkip) {
                setTimeout(() => this.attemptRedirectSkip(), 500);
            }
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
        
        // 获取匹配的规则
        getMatchingRule(url) {
            return this.whitelist.find(rule => {
                if (!rule.enabled) return false;
                
                try {
                    const regex = new RegExp(rule.pattern, 'i');
                    return regex.test(url);
                } catch (e) {
                    return url.includes(rule.pattern);
                }
            });
        }
        
        // 跳过重定向
        skipRedirect() {
            const url = window.location.href;
            const rule = this.getMatchingRule(url);
            
            if (!rule) return;
            
            if (this.settings.showNotifications) {
                this.showNotification(`正在跳过中转页: ${rule.name}`);
            }
            
            const targetUrl = this.extractTargetUrl(url);
            
            if (targetUrl) {
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, this.settings.skipDelay);
            } else {
                this.tryAlternativeSkipMethods();
            }
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
        
        // 尝试其他跳过方法
        tryAlternativeSkipMethods() {
            const skipSelectors = [
                'a[href*="skip"]',
                'a[href*="continue"]',
                'a:contains("跳过")',
                'a:contains("继续")',
                'a:contains("访问")',
                'button:contains("跳过")',
                'button:contains("继续")',
                '.skip-btn',
                '.continue-btn',
                '.redirect-btn'
            ];
            
            for (const selector of skipSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    elements[0].click();
                    return;
                }
            }
            
            const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
            if (metaRefresh && metaRefresh.content) {
                const content = metaRefresh.content;
                const match = content.match(/url=(.+)/i);
                if (match && match[1]) {
                    window.location.href = match[1];
                    return;
                }
            }
            
            const scripts = document.getElementsByTagName('script');
            for (const script of scripts) {
                const text = script.textContent;
                const redirectPatterns = [
                    /window\.location\.href\s*=\s*["']([^"']+)["']/,
                    /window\.location\s*=\s*["']([^"']+)["']/,
                    /window\.replace\(["']([^"']+)["']\)/,
                    /location\.replace\(["']([^"']+)["']\)/
                ];
                
                for (const pattern of redirectPatterns) {
                    const match = text.match(pattern);
                    if (match && match[1] && this.isValidUrl(match[1])) {
                        window.location.href = match[1];
                        return;
                    }
                }
            }
        }
        
        // 开始监控
        startMonitoring() {
            if (this.settings.enabled && this.settings.autoSkip) {
                this.attemptRedirectSkip();
            }
            
            let lastUrl = location.href;
            new MutationObserver(() => {
                const url = location.href;
                if (url !== lastUrl) {
                    lastUrl = url;
                    setTimeout(() => this.checkAndSkip(), 100);
                }
            }).observe(document, {subtree: true, childList: true});
        }
        
        // 保存设置
        saveSettings() {
            GM_setValue(this.settingsKey, this.settings);
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
