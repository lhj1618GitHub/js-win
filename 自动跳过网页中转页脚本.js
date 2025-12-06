// ==UserScript==
// @name         自动跳过网页中转页
// @namespace    https://github.com/js-win
// @version      1.5
// @description  自动跳过点击链接后的网页中转页，支持一键添加当前页面规则
// @author       lhj1618
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_addStyle
// @grant        GM_openInTab
// @license      MIT
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 配置存储键名
    const STORAGE_KEY = 'skip_redirect_rules';
    const ENABLED_KEY = 'skip_redirect_enabled';
    const MENU_COMMAND_ID = 'skip_redirect_menu';

    // 默认中转页规则（常见的短链接、广告跳转、安全检测等中转页）
    const DEFAULT_RULES = [
        {
            id: 'default_1',
            name: '通用链接保护',
            enabled: true,
            patterns: [
                '^https?://link\\.zhihu\\.com/.*target=',
                '^https?://www\\.douban\\.com/link2/.*url=',
                '^https?://jump\\.bdimg\\.com/safecheck.*',
                '^https?://link\\.juejin\\.cn/.*target=',
                '^https?://c\\.pcmgr\\.qq\\.com/tapi/.*',
                '^https?://.*\\.url\\.cn/',
                '^https?://t\\.cn/',
                '^https?://url\\.cn/',
                '^https?://dwz\\.cn/',
                '^https?://.*\\.sogou\\.com/.*url=',
                '^https?://.*\\.sohu\\.com/.*url=',
                '^https?://.*\\.360\\.cn/.*url=',
                '^https?://security\\.verisign\\.com/.*',
                '^https?://.*\\.adsafe\\.com/.*',
                '^https?://.*/link\\?url=',
                '^https?://.*/jump\\?url=',
                '^https?://.*/redirect\\?url=',
                '^https?://.*/go\\?url=',
                '^https?://.*/url\\?url=',
                '^https?://.*/out\\?url=',
                '^https?://.*/\\?url='
            ],
            urlParamNames: ['url', 'target', 'u', 'link', 'to', 'redirect', 'jump', 'go', 'out', 'href']
        },
        {
            id: 'default_2',
            name: '搜索引擎中转',
            enabled: true,
            patterns: [
                '^https?://www\\.baidu\\.com/link\\?url=',
                '^https?://www\\.google\\.com/url\\?.*q=',
                '^https?://www\\.bing\\.com/.*url=',
                '^https?://.*\\.google\\..*/url\\?.*q='
            ],
            urlParamNames: ['url', 'q', 'u']
        },
        {
            id: 'default_3',
            name: 'Gitee链接中转',
            enabled: true,
            patterns: [
                '^https?://gitee\\.com/link\\?target=',
                '^https?://gitee\\.com/link\\?.*target='
            ],
            urlParamNames: ['target']
        }
    ];

    // 工具函数
    const Utils = {
        // 初始化规则
        initRules() {
            let rules = GM_getValue(STORAGE_KEY);
            if (!rules || !Array.isArray(rules)) {
                rules = DEFAULT_RULES;
                GM_setValue(STORAGE_KEY, rules);
            }
            
            let enabled = GM_getValue(ENABLED_KEY, true);
            GM_setValue(ENABLED_KEY, enabled);
            
            return { rules, enabled };
        },

        // 保存规则
        saveRules(rules) {
            GM_setValue(STORAGE_KEY, rules);
        },

        // 获取URL参数
        getUrlParam(name) {
            const url = new URL(window.location.href);
            return url.searchParams.get(name);
        },

        // 获取所有URL参数
        getAllUrlParams() {
            const url = new URL(window.location.href);
            const params = {};
            for (const [key, value] of url.searchParams.entries()) {
                params[key] = value;
            }
            return params;
        },

        // 解码URL
        decodeUrl(url) {
            try {
                return decodeURIComponent(url);
            } catch (e) {
                try {
                    return decodeURIComponent(url.replace(/\+/g, ' '));
                } catch (e2) {
                    return url;
                }
            }
        },

        // 检查URL是否匹配规则
        urlMatchesRule(url, rule) {
            if (!rule.enabled) return false;
            
            for (const pattern of rule.patterns) {
                try {
                    const regex = new RegExp(pattern);
                    if (regex.test(url)) {
                        return true;
                    }
                } catch (e) {
                    console.error(`正则表达式错误: ${pattern}`, e);
                }
            }
            return false;
        },

        // 从当前URL中提取目标URL
        extractTargetUrl(rules) {
            const currentUrl = window.location.href;
            
            for (const rule of rules) {
                if (!rule.enabled || !this.urlMatchesRule(currentUrl, rule)) {
                    continue;
                }

                // 从URL参数中提取
                for (const paramName of rule.urlParamNames || ['url']) {
                    const urlParam = this.getUrlParam(paramName);
                    if (urlParam) {
                        const decodedUrl = this.decodeUrl(urlParam);
                        if (decodedUrl && decodedUrl.startsWith('http')) {
                            return decodedUrl;
                        }
                    }
                }

                // 尝试从其他常见参数名中提取
                const commonParams = ['u', 'link', 'target', 'to', 'redirect', 'jump', 'go', 'out', 'href', 'q'];
                for (const paramName of commonParams) {
                    const urlParam = this.getUrlParam(paramName);
                    if (urlParam) {
                        const decodedUrl = this.decodeUrl(urlParam);
                        if (decodedUrl && decodedUrl.startsWith('http')) {
                            return decodedUrl;
                        }
                    }
                }
            }
            
            return null;
        },

        // 分析当前URL，提取可能的参数
        analyzeCurrentUrl() {
            const url = new URL(window.location.href);
            const params = this.getAllUrlParams();
            const commonParamNames = ['url', 'target', 'u', 'link', 'to', 'redirect', 'jump', 'go', 'out', 'href', 'q'];
            
            // 找到包含http/https的参数
            const potentialParams = [];
            for (const [key, value] of Object.entries(params)) {
                if (value && (value.includes('http://') || value.includes('https://'))) {
                    potentialParams.push(key);
                }
            }
            
            // 如果没找到，尝试常见参数名
            if (potentialParams.length === 0) {
                for (const paramName of commonParamNames) {
                    if (params[paramName]) {
                        potentialParams.push(paramName);
                    }
                }
            }
            
            return {
                domain: url.hostname,
                path: url.pathname,
                params: params,
                potentialParams: potentialParams,
                hasTargetUrl: potentialParams.length > 0
            };
        },

        // 从URL生成正则表达式
        generatePatternFromUrl(urlStr) {
            try {
                const url = new URL(urlStr);
                const domain = url.hostname.replace(/\./g, '\\.');
                const path = url.pathname.replace(/\//g, '\\/');
                let queryPattern = '';
                
                if (url.search) {
                    const searchParams = url.searchParams;
                    const paramParts = [];
                    
                    for (const [key, value] of searchParams.entries()) {
                        if (value && (value.includes('http://') || value.includes('https://'))) {
                            // 如果是URL参数，用通用匹配
                            paramParts.push(`${key}=[^&]*`);
                        } else if (value) {
                            // 其他参数精确匹配
                            paramParts.push(`${key}=${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
                        } else {
                            paramParts.push(`${key}`);
                        }
                    }
                    
                    if (paramParts.length > 0) {
                        queryPattern = '\\?' + paramParts.join('&');
                    }
                }
                
                return `^https?://${domain}${path}${queryPattern}`;
            } catch (e) {
                // 如果URL解析失败，使用简单模式
                return urlStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }
        },

        // 创建通知
        showNotification(message, type = 'info', duration = 3000) {
            const existingNotification = document.querySelector('.skip-redirect-notification');
            if (existingNotification) {
                document.body.removeChild(existingNotification);
            }
            
            const notification = document.createElement('div');
            notification.className = `skip-redirect-notification notification-${type}`;
            
            // 根据类型设置图标
            let icon = 'ℹ️';
            if (type === 'success') icon = '✅';
            if (type === 'warning') icon = '⚠️';
            if (type === 'error') icon = '❌';
            
            notification.innerHTML = `
                <div class="skip-redirect-notification-content">
                    <span class="notification-icon">${icon}</span>
                    <span class="notification-message">${message}</span>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // 显示动画
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            // 自动隐藏
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, duration);
        },

        // 显示确认对话框
        showConfirm(message, callback) {
            const overlay = document.createElement('div');
            overlay.className = 'skip-redirect-confirm-overlay';
            
            const dialog = document.createElement('div');
            dialog.className = 'skip-redirect-confirm-dialog';
            
            dialog.innerHTML = `
                <div class="confirm-message">${message}</div>
                <div class="confirm-buttons">
                    <button class="confirm-btn confirm-ok">确定</button>
                    <button class="confirm-btn confirm-cancel">取消</button>
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // 显示动画
            setTimeout(() => {
                overlay.classList.add('show');
            }, 10);
            
            return new Promise((resolve) => {
                const okBtn = dialog.querySelector('.confirm-ok');
                const cancelBtn = dialog.querySelector('.confirm-cancel');
                
                const closeDialog = (result) => {
                    overlay.classList.remove('show');
                    setTimeout(() => {
                        if (overlay.parentNode) {
                            document.body.removeChild(overlay);
                        }
                        resolve(result);
                    }, 300);
                };
                
                okBtn.addEventListener('click', () => closeDialog(true));
                cancelBtn.addEventListener('click', () => closeDialog(false));
                
                // 点击遮罩层关闭
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        closeDialog(false);
                    }
                });
            });
        },

        // 跳转到目标URL
        redirectToTarget(targetUrl) {
            if (targetUrl && targetUrl.startsWith('http')) {
                // 记录跳转日志
                console.log(`[Skip Redirect] 检测到中转页，正在跳转到: ${targetUrl}`);
                
                // 显示通知
                this.showNotification(`检测到中转页，正在跳转到目标页面...`, 'info', 2000);
                
                // 延迟跳转，确保通知可见
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 100);
            }
        }
    };

    // 规则管理器
    const RuleManager = {
        // 添加新规则
        addRule(name, pattern, urlParamNames = ['url']) {
            const { rules } = Utils.initRules();
            
            const newRule = {
                id: 'custom_' + Date.now(),
                name: name,
                enabled: true,
                patterns: Array.isArray(pattern) ? pattern : [pattern],
                urlParamNames: Array.isArray(urlParamNames) ? urlParamNames : [urlParamNames]
            };
            
            rules.push(newRule);
            Utils.saveRules(rules);
            return newRule;
        },

        // 一键添加当前页面规则
        addCurrentPageRule() {
            const analysis = Utils.analyzeCurrentUrl();
            const currentUrl = window.location.href;
            
            if (!analysis.hasTargetUrl) {
                return {
                    success: false,
                    message: '当前页面未检测到目标URL参数，无法自动生成规则。'
                };
            }
            
            // 检查是否已有匹配规则
            const { rules } = Utils.initRules();
            for (const rule of rules) {
                if (Utils.urlMatchesRule(currentUrl, rule)) {
                    return {
                        success: false,
                        message: `当前页面已有匹配规则: ${rule.name}`
                    };
                }
            }
            
            // 生成规则名称
            const domain = analysis.domain;
            const ruleName = `${domain} 链接中转`;
            
            // 生成正则表达式模式
            const pattern = this.generatePatternFromUrl(currentUrl);
            
            // 使用检测到的参数
            const urlParamNames = analysis.potentialParams.length > 0 ? 
                analysis.potentialParams : ['url'];
            
            // 添加规则
            const rule = this.addRule(ruleName, pattern, urlParamNames);
            
            return {
                success: true,
                message: `已添加规则: ${ruleName}`,
                rule: rule
            };
        },

        // 从URL生成正则表达式
        generatePatternFromUrl(urlStr) {
            return Utils.generatePatternFromUrl(urlStr);
        },

        // 检查当前页面是否已有匹配规则
        checkCurrentPageHasRule() {
            const { rules } = Utils.initRules();
            const currentUrl = window.location.href;
            
            for (const rule of rules) {
                if (rule.enabled && Utils.urlMatchesRule(currentUrl, rule)) {
                    return {
                        hasRule: true,
                        rule: rule
                    };
                }
            }
            
            return { hasRule: false };
        },

        // 删除规则
        deleteRule(ruleId) {
            const { rules } = Utils.initRules();
            const filteredRules = rules.filter(rule => rule.id !== ruleId);
            Utils.saveRules(filteredRules);
            return filteredRules;
        },

        // 更新规则状态
        updateRuleStatus(ruleId, enabled) {
            const { rules } = Utils.initRules();
            const updatedRules = rules.map(rule => {
                if (rule.id === ruleId) {
                    return { ...rule, enabled };
                }
                return rule;
            });
            Utils.saveRules(updatedRules);
            return updatedRules;
        },

        // 编辑规则
        editRule(ruleId, updates) {
            const { rules } = Utils.initRules();
            const updatedRules = rules.map(rule => {
                if (rule.id === ruleId) {
                    return { ...rule, ...updates };
                }
                return rule;
            });
            Utils.saveRules(updatedRules);
            return updatedRules;
        },

        // 获取所有规则
        getAllRules() {
            return Utils.initRules().rules;
        }
    };

    // UI管理器
    const UIManager = {
        currentOverlay: null,
        expandedRules: new Set(), // 存储展开的规则ID
        
        // 显示管理面板
        showManagementPanel() {
            // 移除现有的面板
            if (this.currentOverlay) {
                this.currentOverlay.remove();
            }
            
            const { rules, enabled } = Utils.initRules();
            
            // 分析当前页面
            const analysis = Utils.analyzeCurrentUrl();
            const hasRuleCheck = RuleManager.checkCurrentPageHasRule();
            
            // 创建遮罩层
            const overlay = document.createElement('div');
            overlay.className = 'skip-redirect-overlay';
            this.currentOverlay = overlay;
            
            // 创建面板
            const panel = document.createElement('div');
            panel.className = 'skip-redirect-panel';
            
            // 生成规则列表HTML
            let rulesHtml = '';
            let enabledCount = rules.filter(rule => rule.enabled).length;
            
            rules.forEach((rule, index) => {
                const isExpanded = this.expandedRules.has(rule.id);
                const isDefaultRule = rule.id.startsWith('default_');
                const ruleIndex = index + 1;
                
                rulesHtml += `
                    <div class="skip-redirect-rule-item ${isDefaultRule ? 'default-rule' : 'custom-rule'}" data-rule-id="${rule.id}">
                        <div class="rule-header">
                            <div class="rule-header-left">
                                <label class="rule-toggle">
                                    <input type="checkbox" class="rule-toggle-checkbox" ${rule.enabled ? 'checked' : ''} data-rule-id="${rule.id}">
                                    <span class="toggle-slider"></span>
                                </label>
                                <span class="rule-index">${ruleIndex}.</span>
                                <span class="rule-name">${this.escapeHtml(rule.name)}</span>
                                ${isDefaultRule ? `<span class="rule-badge default-badge">默认</span>` : `<span class="rule-badge custom-badge">自定义</span>`}
                                <span class="rule-status ${rule.enabled ? 'enabled' : 'disabled'}">
                                    ${rule.enabled ? '已启用' : '已禁用'}
                                </span>
                            </div>
                            <div class="rule-header-right">
                                <button class="rule-action-btn toggle-details" data-rule-id="${rule.id}" title="${isExpanded ? '收起详情' : '展开详情'}">
                                    ${isExpanded ? '▼' : '▶'}
                                </button>
                                ${!isDefaultRule ? `
                                    <button class="rule-action-btn edit-rule" data-rule-id="${rule.id}" title="编辑规则">
                                        ✎
                                    </button>
                                    <button class="rule-action-btn delete-rule" data-rule-id="${rule.id}" title="删除规则">
                                        ×
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        <div class="rule-details ${isExpanded ? 'expanded' : 'collapsed'}" data-rule-id="${rule.id}">
                            <div class="rule-section">
                                <div class="section-title">匹配模式</div>
                                <div class="section-content patterns-list">
                                    ${rule.patterns.map((pattern, idx) => `
                                        <div class="pattern-item">
                                            <span class="pattern-index">${idx + 1}.</span>
                                            <code class="pattern-code">${this.escapeHtml(pattern)}</code>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="rule-section">
                                <div class="section-title">URL参数名</div>
                                <div class="section-content">
                                    <div class="params-list">
                                        ${rule.urlParamNames.map(param => `<span class="param-tag">${this.escapeHtml(param)}</span>`).join('')}
                                    </div>
                                </div>
                            </div>
                            <div class="rule-section">
                                <div class="section-title">规则信息</div>
                                <div class="section-content rule-info">
                                    <div class="info-item">
                                        <span class="info-label">规则ID:</span>
                                        <span class="info-value">${rule.id}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">创建时间:</span>
                                        <span class="info-value">${rule.id.startsWith('custom_') ? '自定义规则' : '内置规则'}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">匹配数量:</span>
                                        <span class="info-value">${rule.patterns.length} 个模式</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            // 当前页面分析信息
            let currentPageInfo = '';
            if (hasRuleCheck.hasRule) {
                currentPageInfo = `
                    <div class="current-page-analysis has-rule">
                        <div class="analysis-header">
                            <span class="analysis-icon">📋</span>
                            <span class="analysis-title">当前页面分析</span>
                        </div>
                        <div class="analysis-content">
                            <div class="analysis-status success">
                                <span class="status-icon">✅</span>
                                <span class="status-text">已有匹配规则: <strong>${this.escapeHtml(hasRuleCheck.rule.name)}</strong></span>
                            </div>
                            <div class="analysis-detail">
                                <div class="detail-item">
                                    <span class="detail-label">规则状态:</span>
                                    <span class="detail-value ${hasRuleCheck.rule.enabled ? 'enabled' : 'disabled'}">
                                        ${hasRuleCheck.rule.enabled ? '已启用' : '已禁用'}
                                    </span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">规则类型:</span>
                                    <span class="detail-value">${hasRuleCheck.rule.id.startsWith('default_') ? '内置规则' : '自定义规则'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else if (analysis.hasTargetUrl) {
                currentPageInfo = `
                    <div class="current-page-analysis can-add">
                        <div class="analysis-header">
                            <span class="analysis-icon">🔍</span>
                            <span class="analysis-title">当前页面分析</span>
                        </div>
                        <div class="analysis-content">
                            <div class="analysis-status warning">
                                <span class="status-icon">⚠️</span>
                                <span class="status-text">未匹配到现有规则，可添加新规则</span>
                            </div>
                            <div class="analysis-detail">
                                <div class="detail-item">
                                    <span class="detail-label">检测到参数:</span>
                                    <div class="params-tags">
                                        ${analysis.potentialParams.map(param => `<span class="param-tag">${param}</span>`).join('')}
                                    </div>
                                </div>
                                <div class="analysis-actions">
                                    <button class="analysis-action-btn primary" id="skip-redirect-auto-add-btn">
                                        <span class="btn-icon">➕</span>
                                        一键添加此页面规则
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                currentPageInfo = `
                    <div class="current-page-analysis no-params">
                        <div class="analysis-header">
                            <span class="analysis-icon">🔍</span>
                            <span class="analysis-title">当前页面分析</span>
                        </div>
                        <div class="analysis-content">
                            <div class="analysis-status info">
                                <span class="status-icon">ℹ️</span>
                                <span class="status-text">未检测到目标URL参数</span>
                            </div>
                            <div class="analysis-detail">
                                <p class="detail-text">当前页面不是中转页，或没有检测到常见的URL跳转参数。</p>
                            </div>
                        </div>
                    </div>
                `;
            }

            panel.innerHTML = `
                <div class="panel-header">
                    <div class="panel-title">
                        <h3>中转页跳过规则管理</h3>
                        <div class="panel-subtitle">已启用 ${enabledCount}/${rules.length} 个规则</div>
                    </div>
                    <button class="close-btn" id="skip-redirect-close-btn" title="关闭">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
                
                <div class="panel-controls">
                    <div class="control-group">
                        <label class="global-toggle">
                            <input type="checkbox" id="skip-redirect-global-toggle" ${enabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                            <span class="toggle-label">启用自动跳过</span>
                        </label>
                        <div class="control-actions">
                            <button class="control-btn" id="skip-redirect-export-btn" title="导出规则">
                                <span class="btn-icon">📥</span>
                                导出
                            </button>
                            <button class="control-btn" id="skip-redirect-import-btn" title="导入规则">
                                <span class="btn-icon">📤</span>
                                导入
                            </button>
                        </div>
                    </div>
                </div>
                
                ${currentPageInfo}
                
                <div class="rules-section">
                    <div class="section-header">
                        <h4>规则列表 (${rules.length})</h4>
                        <div class="section-actions">
                            <button class="section-action-btn" id="skip-redirect-collapse-all" title="全部收起">
                                <span class="btn-icon">↕</span>
                                全部收起
                            </button>
                            <button class="section-action-btn" id="skip-redirect-expand-all" title="全部展开">
                                <span class="btn-icon">↔</span>
                                全部展开
                            </button>
                        </div>
                    </div>
                    <div class="rules-list" id="skip-redirect-rules-list">
                        ${rulesHtml || '<div class="no-rules">暂无规则</div>'}
                    </div>
                </div>
                
                <div class="panel-footer">
                    <div class="footer-info">
                        <div class="current-url-display">
                            <span class="url-label">当前URL:</span>
                            <code class="url-value">${this.escapeHtml(window.location.href)}</code>
                        </div>
                    </div>
                    <div class="footer-actions">
                        <button class="footer-btn secondary" id="skip-redirect-test-btn">
                            <span class="btn-icon">🧪</span>
                            测试当前页面
                        </button>
                        <button class="footer-btn" id="skip-redirect-close-panel-btn">
                            关闭
                        </button>
                    </div>
                </div>
            `;

            overlay.appendChild(panel);
            document.body.appendChild(overlay);

            // 添加样式
            this.addPanelStyles();
            
            // 绑定事件
            this.bindPanelEvents(overlay, analysis);
        },

        // 添加面板样式
        addPanelStyles() {
            if (document.querySelector('#skip-redirect-panel-styles')) {
                return;
            }
            
            const style = document.createElement('style');
            style.id = 'skip-redirect-panel-styles';
            style.textContent = `
                .skip-redirect-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 10000;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    animation: fadeIn 0.3s ease;
                }
                
                .skip-redirect-panel {
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                    width: 90%;
                    max-width: 900px;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                    animation: slideUp 0.3s ease;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }
                
                .panel-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid #e9ecef;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 12px 12px 0 0;
                }
                
                .panel-title h3 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 600;
                }
                
                .panel-subtitle {
                    font-size: 12px;
                    opacity: 0.8;
                    margin-top: 4px;
                }
                
                .close-btn {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: white;
                    transition: background 0.2s;
                }
                
                .close-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
                
                .panel-controls {
                    padding: 16px 24px;
                    border-bottom: 1px solid #e9ecef;
                    background: #f8f9fa;
                }
                
                .control-group {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .global-toggle {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .global-toggle input {
                    position: absolute;
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .global-toggle .toggle-slider {
                    position: relative;
                    width: 44px;
                    height: 24px;
                    background-color: #ccc;
                    border-radius: 12px;
                    transition: .4s;
                }
                
                .global-toggle .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 20px;
                    width: 20px;
                    left: 2px;
                    bottom: 2px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }
                
                .global-toggle input:checked + .toggle-slider {
                    background-color: #4CAF50;
                }
                
                .global-toggle input:checked + .toggle-slider:before {
                    transform: translateX(20px);
                }
                
                .toggle-label {
                    color: #333;
                }
                
                .control-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .control-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    background: #fff;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    color: #555;
                    transition: all 0.2s;
                }
                
                .control-btn:hover {
                    background: #f8f9fa;
                    border-color: #999;
                }
                
                .control-btn .btn-icon {
                    font-size: 12px;
                }
                
                .current-page-analysis {
                    margin: 16px 24px;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid #e9ecef;
                }
                
                .analysis-header {
                    padding: 12px 16px;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e9ecef;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .analysis-icon {
                    font-size: 16px;
                }
                
                .analysis-title {
                    font-weight: 600;
                    color: #333;
                }
                
                .analysis-content {
                    padding: 16px;
                }
                
                .analysis-status {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    border-radius: 6px;
                    margin-bottom: 12px;
                }
                
                .analysis-status.success {
                    background: #d4edda;
                    color: #155724;
                }
                
                .analysis-status.warning {
                    background: #fff3cd;
                    color: #856404;
                }
                
                .analysis-status.info {
                    background: #d1ecf1;
                    color: #0c5460;
                }
                
                .analysis-detail {
                    font-size: 13px;
                }
                
                .detail-item {
                    margin: 8px 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .detail-label {
                    font-weight: 500;
                    color: #666;
                    min-width: 80px;
                }
                
                .detail-value {
                    font-weight: 500;
                }
                
                .detail-value.enabled {
                    color: #28a745;
                }
                
                .detail-value.disabled {
                    color: #dc3545;
                }
                
                .params-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                
                .analysis-actions {
                    margin-top: 12px;
                }
                
                .analysis-action-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: transform 0.2s;
                }
                
                .analysis-action-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }
                
                .analysis-action-btn.primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                
                .rules-section {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0 24px;
                }
                
                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin: 16px 0 12px 0;
                }
                
                .section-header h4 {
                    margin: 0;
                    color: #333;
                    font-size: 16px;
                }
                
                .section-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .section-action-btn {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 8px;
                    background: #f8f9fa;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    color: #555;
                }
                
                .section-action-btn:hover {
                    background: #e9ecef;
                }
                
                .rules-list {
                    max-height: 300px;
                    overflow-y: auto;
                }
                
                .skip-redirect-rule-item {
                    border: 1px solid #e9ecef;
                    border-radius: 8px;
                    margin-bottom: 12px;
                    overflow: hidden;
                    transition: all 0.3s ease;
                }
                
                .skip-redirect-rule-item:hover {
                    border-color: #667eea;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
                }
                
                .rule-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: #f8f9fa;
                    cursor: pointer;
                }
                
                .rule-header-left {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex: 1;
                }
                
                .rule-toggle {
                    position: relative;
                    display: inline-block;
                    width: 40px;
                    height: 20px;
                }
                
                .rule-toggle input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .rule-toggle .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    transition: .4s;
                    border-radius: 20px;
                }
                
                .rule-toggle .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 2px;
                    bottom: 2px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }
                
                .rule-toggle input:checked + .toggle-slider {
                    background-color: #4CAF50;
                }
                
                .rule-toggle input:checked + .toggle-slider:before {
                    transform: translateX(20px);
                }
                
                .rule-index {
                    color: #999;
                    font-size: 12px;
                    min-width: 20px;
                }
                
                .rule-name {
                    font-weight: 500;
                    color: #333;
                    flex: 1;
                }
                
                .rule-badge {
                    font-size: 11px;
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-weight: 600;
                }
                
                .default-badge {
                    background: #e3f2fd;
                    color: #1976d2;
                }
                
                .custom-badge {
                    background: #f3e5f5;
                    color: #7b1fa2;
                }
                
                .rule-status {
                    font-size: 12px;
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-weight: 500;
                }
                
                .rule-status.enabled {
                    background: #d4edda;
                    color: #155724;
                }
                
                .rule-status.disabled {
                    background: #f8d7da;
                    color: #721c24;
                }
                
                .rule-header-right {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .rule-action-btn {
                    background: none;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 12px;
                    color: #666;
                    transition: all 0.2s;
                }
                
                .rule-action-btn:hover {
                    background: #f8f9fa;
                    border-color: #999;
                }
                
                .toggle-details {
                    font-family: monospace;
                }
                
                .edit-rule {
                    color: #2196F3;
                }
                
                .delete-rule {
                    color: #f44336;
                }
                
                .rule-details {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.3s ease;
                }
                
                .rule-details.expanded {
                    max-height: 1000px;
                }
                
                .rule-section {
                    padding: 12px 16px;
                    border-top: 1px solid #f0f0f0;
                }
                
                .rule-section:first-child {
                    border-top: none;
                }
                
                .section-title {
                    font-weight: 500;
                    color: #666;
                    margin-bottom: 8px;
                    font-size: 13px;
                }
                
                .section-content {
                    font-size: 12px;
                }
                
                .patterns-list {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                
                .pattern-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                }
                
                .pattern-index {
                    color: #999;
                    min-width: 16px;
                }
                
                .pattern-code {
                    background: #f5f5f5;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                    flex: 1;
                    word-break: break-all;
                }
                
                .params-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                
                .param-tag {
                    background: #e3f2fd;
                    color: #1976d2;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                }
                
                .rule-info {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                
                .info-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .info-label {
                    color: #666;
                    min-width: 80px;
                }
                
                .info-value {
                    color: #333;
                    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                }
                
                .no-rules {
                    text-align: center;
                    padding: 40px 20px;
                    color: #999;
                    font-size: 14px;
                }
                
                .panel-footer {
                    padding: 16px 24px;
                    border-top: 1px solid #e9ecef;
                    background: #f8f9fa;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .footer-info {
                    flex: 1;
                }
                
                .current-url-display {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .url-label {
                    font-size: 12px;
                    color: #666;
                    font-weight: 500;
                }
                
                .url-value {
                    background: #fff;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                    border: 1px solid #e9ecef;
                    word-break: break-all;
                }
                
                .footer-actions {
                    display: flex;
                    gap: 12px;
                }
                
                .footer-btn {
                    padding: 8px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .footer-btn.secondary {
                    background: #6c757d;
                    color: white;
                    border: none;
                }
                
                .footer-btn.secondary:hover {
                    background: #5a6268;
                }
                
                .footer-btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                }
                
                .footer-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }
                
                /* 通知样式 */
                .skip-redirect-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                    padding: 16px 20px;
                    min-width: 300px;
                    max-width: 400px;
                    z-index: 10001;
                    transform: translateX(120%);
                    transition: transform 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .skip-redirect-notification.show {
                    transform: translateX(0);
                }
                
                .skip-redirect-notification-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .notification-icon {
                    font-size: 20px;
                }
                
                .notification-message {
                    flex: 1;
                    line-height: 1.5;
                }
                
                .notification-success {
                    border-left: 4px solid #4CAF50;
                }
                
                .notification-info {
                    border-left: 4px solid #2196F3;
                }
                
                .notification-warning {
                    border-left: 4px solid #ff9800;
                }
                
                .notification-error {
                    border-left: 4px solid #f44336;
                }
                
                /* 确认对话框样式 */
                .skip-redirect-confirm-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 10002;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .skip-redirect-confirm-overlay.show {
                    opacity: 1;
                }
                
                .skip-redirect-confirm-dialog {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    min-width: 300px;
                    max-width: 400px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                    transform: translateY(20px);
                    transition: transform 0.3s ease;
                }
                
                .skip-redirect-confirm-overlay.show .skip-redirect-confirm-dialog {
                    transform: translateY(0);
                }
                
                .confirm-message {
                    margin-bottom: 20px;
                    line-height: 1.5;
                    color: #333;
                }
                
                .confirm-buttons {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }
                
                .confirm-btn {
                    padding: 8px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                
                .confirm-ok {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                }
                
                .confirm-ok:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }
                
                .confirm-cancel {
                    background: #6c757d;
                    color: white;
                    border: none;
                }
                
                .confirm-cancel:hover {
                    background: #5a6268;
                }
                
                /* 滚动条样式 */
                .rules-list::-webkit-scrollbar {
                    width: 6px;
                }
                
                .rules-list::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 3px;
                }
                
                .rules-list::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 3px;
                }
                
                .rules-list::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            
            document.head.appendChild(style);
        },

        // 绑定面板事件
        bindPanelEvents(overlay, analysis) {
            // 关闭按钮
            overlay.querySelector('#skip-redirect-close-btn').addEventListener('click', () => {
                overlay.remove();
                this.currentOverlay = null;
            });
            
            // 关闭面板按钮
            overlay.querySelector('#skip-redirect-close-panel-btn').addEventListener('click', () => {
                overlay.remove();
                this.currentOverlay = null;
            });
            
            // 全局启用/禁用切换
            overlay.querySelector('#skip-redirect-global-toggle').addEventListener('change', (e) => {
                const enabled = e.target.checked;
                GM_setValue(ENABLED_KEY, enabled);
                Utils.showNotification(`自动跳过功能已${enabled ? '启用' : '禁用'}`, 
                                      enabled ? 'success' : 'warning');
            });
            
            // 一键添加当前页面按钮
            const autoAddBtn = overlay.querySelector('#skip-redirect-auto-add-btn');
            if (autoAddBtn) {
                autoAddBtn.addEventListener('click', () => {
                    this.autoAddCurrentPage();
                });
            }
            
            // 测试当前页面按钮
            overlay.querySelector('#skip-redirect-test-btn').addEventListener('click', () => {
                this.testCurrentPage();
            });
            
            // 导出按钮
            overlay.querySelector('#skip-redirect-export-btn').addEventListener('click', () => {
                this.exportRules();
            });
            
            // 导入按钮
            overlay.querySelector('#skip-redirect-import-btn').addEventListener('click', () => {
                this.importRules();
            });
            
            // 全部收起按钮
            overlay.querySelector('#skip-redirect-collapse-all').addEventListener('click', () => {
                this.collapseAllRules();
            });
            
            // 全部展开按钮
            overlay.querySelector('#skip-redirect-expand-all').addEventListener('click', () => {
                this.expandAllRules();
            });
            
            // 规则启用/禁用切换
            overlay.querySelectorAll('.rule-toggle-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const ruleId = e.target.dataset.ruleId;
                    const enabled = e.target.checked;
                    RuleManager.updateRuleStatus(ruleId, enabled);
                    Utils.showNotification(`规则状态已${enabled ? '启用' : '禁用'}`, 'success');
                    this.showManagementPanel(); // 重新加载面板
                });
            });
            
            // 切换规则详情
            overlay.querySelectorAll('.toggle-details').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const ruleId = e.target.dataset.ruleId;
                    this.toggleRuleDetails(ruleId);
                });
            });
            
            // 删除规则按钮
            overlay.querySelectorAll('.delete-rule').forEach(button => {
                button.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const ruleId = e.target.dataset.ruleId;
                    const ruleName = e.target.closest('.skip-redirect-rule-item').querySelector('.rule-name').textContent;
                    
                    const confirmed = await Utils.showConfirm(`确定要删除规则 "${ruleName}" 吗？`);
                    if (confirmed) {
                        RuleManager.deleteRule(ruleId);
                        Utils.showNotification('规则已删除', 'success');
                        this.showManagementPanel(); // 重新加载面板
                    }
                });
            });
            
            // 编辑规则按钮
            overlay.querySelectorAll('.edit-rule').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const ruleId = e.target.dataset.ruleId;
                    this.editRule(ruleId);
                });
            });
            
            // 点击规则头部切换详情
            overlay.querySelectorAll('.rule-header').forEach(header => {
                header.addEventListener('click', (e) => {
                    if (!e.target.closest('.rule-action-btn')) {
                        const ruleId = header.closest('.skip-redirect-rule-item').dataset.ruleId;
                        this.toggleRuleDetails(ruleId);
                    }
                });
            });
        },

        // 切换规则详情
        toggleRuleDetails(ruleId) {
            const ruleItem = document.querySelector(`.skip-redirect-rule-item[data-rule-id="${ruleId}"]`);
            if (!ruleItem) return;
            
            const details = ruleItem.querySelector('.rule-details');
            const toggleBtn = ruleItem.querySelector('.toggle-details');
            
            if (details.classList.contains('expanded')) {
                details.classList.remove('expanded');
                this.expandedRules.delete(ruleId);
                if (toggleBtn) toggleBtn.textContent = '▶';
            } else {
                details.classList.add('expanded');
                this.expandedRules.add(ruleId);
                if (toggleBtn) toggleBtn.textContent = '▼';
            }
        },

        // 全部收起
        collapseAllRules() {
            const allDetails = document.querySelectorAll('.rule-details');
            allDetails.forEach(details => {
                details.classList.remove('expanded');
            });
            
            const allToggleBtns = document.querySelectorAll('.toggle-details');
            allToggleBtns.forEach(btn => {
                btn.textContent = '▶';
            });
            
            this.expandedRules.clear();
        },

        // 全部展开
        expandAllRules() {
            const { rules } = Utils.initRules();
            const allDetails = document.querySelectorAll('.rule-details');
            allDetails.forEach(details => {
                details.classList.add('expanded');
            });
            
            const allToggleBtns = document.querySelectorAll('.toggle-details');
            allToggleBtns.forEach(btn => {
                btn.textContent = '▼';
            });
            
            rules.forEach(rule => {
                this.expandedRules.add(rule.id);
            });
        },

        // 自动添加当前页面
        autoAddCurrentPage() {
            const result = RuleManager.addCurrentPageRule();
            
            if (result.success) {
                Utils.showNotification(result.message, 'success');
                // 重新加载面板
                setTimeout(() => {
                    this.showManagementPanel();
                }, 500);
            } else {
                Utils.showNotification(result.message, 'warning');
            }
        },

        // 编辑规则
        editRule(ruleId) {
            Utils.showNotification('编辑功能开发中，请稍后再试', 'info');
        },

        // 测试当前页面
        testCurrentPage() {
            const { rules, enabled } = Utils.initRules();
            
            if (!enabled) {
                Utils.showNotification('自动跳过功能已禁用', 'warning');
                return;
            }
            
            const targetUrl = Utils.extractTargetUrl(rules);
            
            if (targetUrl) {
                Utils.showNotification(`检测到中转页，目标URL：<br><small>${this.escapeHtml(targetUrl)}</small>`, 'success', 5000);
                
                // 询问是否要跳转
                setTimeout(() => {
                    Utils.showConfirm(`检测到中转页，目标URL为：\n${targetUrl}\n\n是否要跳转到目标页面？`, (confirmed) => {
                        if (confirmed) {
                            window.location.href = targetUrl;
                        }
                    });
                }, 100);
            } else {
                Utils.showNotification('当前页面未匹配任何中转页规则', 'info');
            }
        },

        // 导出规则
        exportRules() {
            const { rules } = Utils.initRules();
            const dataStr = JSON.stringify(rules, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `skip_redirect_rules_${new Date().toISOString().slice(0,10)}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            Utils.showNotification('规则已导出', 'success');
        },

        // 导入规则
        async importRules() {
            const confirmed = await Utils.showConfirm('导入规则将覆盖现有规则，是否继续？');
            if (!confirmed) return;
            
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.style.display = 'none';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const rules = JSON.parse(e.target.result);
                        if (!Array.isArray(rules)) {
                            throw new Error('规则格式错误');
                        }
                        
                        // 验证规则格式
                        for (const rule of rules) {
                            if (!rule.id || !rule.name || !Array.isArray(rule.patterns)) {
                                throw new Error('规则格式错误');
                            }
                        }
                        
                        GM_setValue(STORAGE_KEY, rules);
                        Utils.showNotification('规则已导入', 'success');
                        
                        // 重新加载页面使新规则生效
                        setTimeout(() => {
                            Utils.showConfirm('规则导入成功，是否重新加载页面使新规则生效？', (confirmed) => {
                                if (confirmed) {
                                    window.location.reload();
                                } else {
                                    this.showManagementPanel();
                                }
                            });
                        }, 500);
                    } catch (err) {
                        Utils.showNotification(`导入失败: ${err.message}`, 'error');
                    }
                };
                reader.readAsText(file);
            };
            
            document.body.appendChild(input);
            input.click();
            setTimeout(() => {
                document.body.removeChild(input);
            }, 100);
        },

        // HTML转义
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    // 主功能
    const Main = {
        // 初始化
        init() {
            const { rules, enabled } = Utils.initRules();
            
            // 注册菜单命令
            try {
                GM_registerMenuCommand('管理中转页规则', () => {
                    UIManager.showManagementPanel();
                }, MENU_COMMAND_ID);
                
                GM_registerMenuCommand('启用/禁用自动跳过', () => {
                    const currentEnabled = GM_getValue(ENABLED_KEY, true);
                    const newEnabled = !currentEnabled;
                    GM_setValue(ENABLED_KEY, newEnabled);
                    Utils.showNotification(`自动跳过功能已${newEnabled ? '启用' : '禁用'}`, 
                                          newEnabled ? 'success' : 'warning');
                });
                
                GM_registerMenuCommand('测试当前页面', () => {
                    UIManager.testCurrentPage();
                });
                
                GM_registerMenuCommand('一键添加当前页面规则', () => {
                    const result = RuleManager.addCurrentPageRule();
                    if (result.success) {
                        Utils.showNotification(result.message, 'success');
                    } else {
                        Utils.showNotification(result.message, 'warning');
                    }
                });
                
                GM_registerMenuCommand('导出规则', () => {
                    UIManager.exportRules();
                });
                
                GM_registerMenuCommand('导入规则', () => {
                    UIManager.importRules();
                });
            } catch (e) {
                // 有些脚本管理器不支持GM_registerMenuCommand
                console.warn('菜单命令注册失败，将使用浮动按钮代替');
                this.addFloatButton();
            }
            
            // 检查并处理跳转
            if (enabled) {
                setTimeout(() => {
                    const targetUrl = Utils.extractTargetUrl(rules);
                    if (targetUrl) {
                        Utils.redirectToTarget(targetUrl);
                    }
                }, 100);
            }
            
            console.log(`[Skip Redirect] 脚本已加载，自动跳过功能${enabled ? '已启用' : '已禁用'}`);
        },

        // 添加浮动按钮
        addFloatButton() {
            const floatBtn = document.createElement('div');
            floatBtn.className = 'skip-redirect-float-btn';
            floatBtn.innerHTML = '↗';
            floatBtn.title = '管理中转页规则';
            floatBtn.onclick = () => {
                UIManager.showManagementPanel();
            };
            document.body.appendChild(floatBtn);
        }
    };

    // 启动脚本
    Main.init();
})();
