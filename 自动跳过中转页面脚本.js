// ==UserScript==
// @name         自动跳过中转页面
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  自动跳过中转页面，支持站点可配置和管理。
// @match        *://*/*
// @run-at       document-start
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @license MIT
// ==/UserScript==

(function () {
  'use strict';

  // --------------------------------------
  // 配置管理
  // --------------------------------------
  const STORAGE_KEY = 'auto_redirect_rules';
  
  // 默认规则
  const defaultRules = [
    { host: "link.juejin.cn", keys: ["target"] },
    { host: "sspai.com", keys: ["target"] },
    { host: "link.zhihu.com", keys: ["target"] },
    { host: "link.csdn.net", keys: ["target"] },
    { host: "www.jianshu.com", keys: ["url"] },
    { host: "gitee.com", keys: ["target"] },
    { host: "afdian.com", keys: ["target"] },
    { host: "weibo.cn", keys: ["toasturl", "url", "u"] },
    { host: "www.youtube.com", keys: ["q"] },
    { host: "www.yuque.com", keys: ["url"] },
    { host: "developer.aliyun.com", keys: ["target"] },
    { host: "www.douban.com", keys: ["url"] },
    { host: "xie.infoq.cn", keys: ["target"] },
    { host: "www.infoq.cn", keys: ["target"] },
    { host: "www.oschina.net", keys: ["url"] },
    { host: "www.gcores.com", keys: ["target"] },
    { host: "urlsec.qq.com", keys: ["url"] },
    { host: "c.pc.qq.com", keys: ["pfurl"] },
    { host: "docs.qq.com", keys: ["url"] },
    { host: "cloud.tencent.com", keys: ["target"] },
    { host: "www.kdocs.cn", keys: ["target"] },
    { host: "www.google.com.hk", keys: ["q"] },
  ];

  // 获取规则
  function getRules() {
    const saved = GM_getValue(STORAGE_KEY, null);
    if (!saved) {
      return defaultRules.map(rule => ({ ...rule, isDefault: true }));
    }
    return saved;
  }

  // 保存规则
  function saveRules(rules) {
    GM_setValue(STORAGE_KEY, rules);
  }

  // 检查是否是默认规则
  function isDefaultRule(rule) {
    return rule.isDefault !== undefined ? rule.isDefault : defaultRules.some(r => r.host === rule.host);
  }

  // --------------------------------------
  // 工具函数
  // --------------------------------------
  const multiDecode = (v) => {
    if (!v) return v;
    try {
      for (let i = 0; i < 5; i++) v = decodeURIComponent(v);
    } catch {}
    return v;
  };

  const findQuery = (keys) => {
    try {
      const url = new URL(location.href);
      for (const k of keys) {
        const val = url.searchParams.get(k);
        if (val) return val;
      }
    } catch {}
    return null;
  };

  // --------------------------------------
  // 重定向逻辑
  // --------------------------------------
  function performRedirect() {
    const rules = getRules();
    const curHost = location.host;

    for (const rule of rules) {
      if (curHost !== rule.host) continue;

      const raw = findQuery(rule.keys);
      if (!raw) continue;

      const target = multiDecode(raw.trim());
      if (!target) continue;

      if (/^https?:\/\//.test(target) && target !== location.href) {
        console.log("[重定向]=>", target);
        location.replace(target);
      }
      break;
    }
  }

  // --------------------------------------
  // 用户界面面板
  // --------------------------------------
  let panelManager = null;
  let eventManager = null;
  let editingRule = null;

  // 创建一次性的样式
  const createStyles = () => {
    if (document.getElementById('ars-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'ars-styles';
    style.textContent = `
      .ars-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
        display: none;
        overflow: hidden;
        color: #e0e0e0;
      }
      .ars-panel.visible {
        display: flex !important;
        flex-direction: column;
      }
      .ars-header {
        background: #2d2d2d;
        color: #fff;
        padding: 18px 24px;
        border-bottom: 1px solid #404040;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .ars-title {
        font-size: 18px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .ars-close {
        background: #404040;
        border: none;
        color: #999;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 28px;
        height: 28px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      .ars-close:hover {
        background: #505050;
        color: #fff;
      }
      .ars-content {
        flex: 1;
        overflow-y: auto;
        background: #1a1a1a;
      }
      .ars-stats {
        padding: 16px 24px;
        background: #252525;
        border-bottom: 1px solid #333;
        display: flex;
        justify-content: space-between;
        font-size: 13px;
      }
      .ars-stat-value {
        font-size: 20px;
        font-weight: 700;
        color: #4dabf7;
      }
      .ars-stat-label {
        color: #aaa;
        font-size: 12px;
        margin-top: 2px;
      }
      .ars-section {
        padding: 20px 24px;
      }
      .ars-section-title {
        font-weight: 600;
        margin-bottom: 16px;
        color: #e0e0e0;
        font-size: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .ars-list-count {
        color: #999;
        font-weight: 400;
        font-size: 13px;
      }
      .ars-rule-list {
        background: #252525;
        border-radius: 6px;
        border: 1px solid #333;
        overflow: hidden;
        max-height: 400px;
        overflow-y: auto;
      }
      .ars-rule-item {
        padding: 12px 16px;
        border-bottom: 1px solid #333;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: background-color 0.2s;
      }
      .ars-rule-item:hover {
        background: #2d2d2d;
      }
      .ars-rule-item:last-child {
        border-bottom: none;
      }
      .ars-rule-info {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        min-width: 0;
      }
      .ars-rule-host {
        font-weight: 500;
        color: #e0e0e0;
        font-size: 13px;
        width: 200px;
        flex-shrink: 0;
        font-family: 'SF Mono', 'Consolas', 'Monaco', 'Andale Mono', monospace;
      }
      .ars-rule-type {
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 500;
        flex-shrink: 0;
      }
      .ars-type-default {
        background: #2d5279;
        color: #a5d8ff;
      }
      .ars-type-custom {
        background: #2d7949;
        color: #a5ffc7;
      }
      .ars-rule-keys {
        display: flex;
        gap: 6px;
        flex: 1;
        flex-wrap: wrap;
        min-width: 0;
      }
      .ars-key-tag {
        background: #3a3a3a;
        color: #ccc;
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
        white-space: nowrap;
      }
      .ars-rule-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }
      .ars-action-btn {
        padding: 6px 12px;
        border: 1px solid;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
        transition: all 0.2s;
      }
      .ars-edit-btn {
        background: #2d5279;
        border-color: #3a6ea5;
        color: #a5d8ff;
      }
      .ars-edit-btn:hover {
        background: #3a6ea5;
        border-color: #4dabf7;
        color: #fff;
      }
      .ars-delete-btn {
        background: #5c2d3a;
        border-color: #993d4d;
        color: #ffa8b5;
      }
      .ars-delete-btn:hover {
        background: #993d4d;
        border-color: #c92a2a;
        color: #fff;
      }
      .ars-footer {
        padding: 16px 24px;
        border-top: 1px solid #333;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #2d2d2d;
      }
      .ars-btn {
        padding: 8px 16px;
        border: 1px solid;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
      }
      .ars-btn-primary {
        background: #2d5279;
        border-color: #3a6ea5;
        color: #a5d8ff;
      }
      .ars-btn-primary:hover {
        background: #3a6ea5;
        border-color: #4dabf7;
        color: #fff;
      }
      .ars-btn-secondary {
        background: #3a3a3a;
        border-color: #555;
        color: #ccc;
      }
      .ars-btn-secondary:hover {
        background: #4a4a4a;
        border-color: #666;
        color: #fff;
      }
      .ars-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.6);
        z-index: 9999;
        display: none;
        backdrop-filter: blur(3px);
      }
      .ars-overlay.visible {
        display: block !important;
      }
      .ars-empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #666;
      }
      .ars-empty-icon {
        font-size: 40px;
        margin-bottom: 12px;
        opacity: 0.4;
      }
      .ars-empty-text {
        font-size: 13px;
      }
      .ars-rule-list::-webkit-scrollbar {
        width: 6px;
      }
      .ars-rule-list::-webkit-scrollbar-track {
        background: #252525;
      }
      .ars-rule-list::-webkit-scrollbar-thumb {
        background: #404040;
        border-radius: 3px;
      }
      .ars-rule-list::-webkit-scrollbar-thumb:hover {
        background: #505050;
      }
      .ars-form-group {
        margin-bottom: 20px;
      }
      .ars-form-label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #e0e0e0;
        font-size: 13px;
      }
      .ars-form-input {
        width: 100%;
        padding: 10px 12px;
        background: #252525;
        border: 1px solid #404040;
        border-radius: 4px;
        font-size: 13px;
        color: #e0e0e0;
        box-sizing: border-box;
        font-family: 'SF Mono', 'Consolas', 'Monaco', 'Andale Mono', monospace;
      }
      .ars-form-input:focus {
        outline: none;
        border-color: #4dabf7;
      }
      .ars-form-input::placeholder {
        color: #666;
      }
      .ars-form-help {
        font-size: 12px;
        color: #999;
        margin-top: 6px;
      }
      .ars-form-example {
        background: #252525;
        border-left: 3px solid #4dabf7;
        padding: 12px;
        margin-top: 20px;
        font-size: 12px;
      }
      .ars-form-example-title {
        font-weight: 600;
        margin-bottom: 4px;
        color: #e0e0e0;
      }
      .ars-form-example-text {
        color: #999;
        line-height: 1.5;
      }
      .ars-form-buttons {
        display: flex;
        gap: 12px;
        margin-top: 24px;
      }
      .ars-form-buttons .ars-btn {
        flex: 1;
      }
      code {
        background: #2d2d2d;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'SF Mono', 'Consolas', 'Monaco', 'Andale Mono', monospace;
        font-size: 12px;
        color: #a5d8ff;
      }
    `;
    document.head.appendChild(style);
  };

  // 面板管理器
  const createPanelManager = () => ({
    main: null,
    overlay: null,
    addRule: null,
    editRule: null,
    
    init() {
      this.createOverlay();
      createStyles();
    },
    
    createOverlay() {
      if (!this.overlay) {
        this.overlay = document.createElement('div');
        this.overlay.className = 'ars-overlay';
        document.body.appendChild(this.overlay);
      }
    },
    
    showOverlay() {
      if (this.overlay) {
        this.overlay.classList.add('visible');
      }
    },
    
    hideOverlay() {
      if (this.overlay) {
        this.overlay.classList.remove('visible');
      }
    },
    
    createPanel(type, content, width = '700px') {
      const panel = document.createElement('div');
      panel.className = 'ars-panel';
      panel.style.width = width;
      panel.id = `ars-${type}-panel`;
      panel.innerHTML = content;
      document.body.appendChild(panel);
      return panel;
    },
    
    showPanel(panel) {
      if (panel) {
        panel.classList.add('visible');
        this.showOverlay();
      }
    },
    
    hidePanel(panel) {
      if (panel) {
        panel.classList.remove('visible');
      }
      this.hideOverlay();
    },
    
    removePanel(panel) {
      if (panel && panel.parentNode) {
        panel.parentNode.removeChild(panel);
      }
    },
    
    cleanup() {
      this.removePanel(this.main);
      this.removePanel(this.addRule);
      this.removePanel(this.editRule);
      this.main = this.addRule = this.editRule = null;
    }
  });

  // 面板模板
  const panelTemplates = {
    main: `
      <div class="ars-header">
        <div class="ars-title">🚀 跳转规则列表</div>
        <button class="ars-close" title="关闭">×</button>
      </div>
      <div class="ars-content">
        <div class="ars-stats">
          <div>
            <div class="ars-stat-value" id="ars-rule-count">0</div>
            <div class="ars-stat-label">总规则数</div>
          </div>
          <div>
            <div class="ars-stat-value" id="ars-default-count">0</div>
            <div class="ars-stat-label">默认规则</div>
          </div>
          <div>
            <div class="ars-stat-value" id="ars-custom-count">0</div>
            <div class="ars-stat-label">自定义规则</div>
          </div>
        </div>
        <div class="ars-section">
          <div class="ars-section-title">
            <span>已配置的站点</span>
            <span class="ars-list-count" id="ars-list-count">0条规则</span>
          </div>
          <div class="ars-rule-list" id="ars-rule-list">
            <div class="ars-empty-state">
              <div class="ars-empty-icon">📋</div>
              <div class="ars-empty-text">暂无规则，点击下方按钮添加</div>
            </div>
          </div>
        </div>
      </div>
      <div class="ars-footer">
        <div>
          <button class="ars-btn ars-btn-secondary" id="ars-reset-btn">↺ 恢复默认</button>
        </div>
        <button class="ars-btn ars-btn-primary" id="ars-add-rule-btn">+ 添加新规则</button>
      </div>
    `,
    
    form: (isEdit) => `
      <div class="ars-header">
        <div class="ars-title">${isEdit ? '✏️ 编辑跳转规则' : '➕ 添加跳转规则'}</div>
        <button class="ars-close" title="关闭">×</button>
      </div>
      <div class="ars-content" style="padding: 24px;">
        <div class="ars-form-group">
          <label class="ars-form-label" for="ars-host-input">域名</label>
          <input type="text" class="ars-form-input" id="ars-host-input" 
                 placeholder="example.com（不需要包含 http://）" />
          <div class="ars-form-help">输入需要跳转的站点域名</div>
        </div>
        <div class="ars-form-group">
          <label class="ars-form-label" for="ars-keys-input">URL参数名</label>
          <input type="text" class="ars-form-input" id="ars-keys-input" 
                 placeholder="target,url,link（多个参数用英文逗号分隔）" />
          <div class="ars-form-help">该域名用于跳转的URL参数名称，多个参数按优先级顺序填写</div>
        </div>
        <div class="ars-form-example">
          <div class="ars-form-example-title">示例说明</div>
          <div class="ars-form-example-text">
            对于链接：<code>https://link.juejin.cn/?target=https://example.com</code><br>
            域名填写：<code>link.juejin.cn</code><br>
            参数名填写：<code>target</code>
          </div>
        </div>
        <div class="ars-form-buttons">
          <button class="ars-btn ars-btn-secondary" id="ars-cancel-btn">取消</button>
          <button class="ars-btn ars-btn-primary" id="ars-confirm-btn">${isEdit ? '保存更改' : '添加规则'}</button>
        </div>
      </div>
    `
  };

  // 事件管理器
  const createEventManager = () => ({
    handlers: new Map(),
    
    add(panel, event, selector, handler) {
      if (!panel) return;
      
      const wrappedHandler = (e) => {
        if (e.target.matches(selector) || e.target.closest(selector)) {
          handler(e);
        }
      };
      
      panel.addEventListener(event, wrappedHandler);
      const key = `${panel.id}-${event}-${selector}`;
      this.handlers.set(key, { panel, event, handler: wrappedHandler });
    },
    
    removeAll(panel) {
      for (const [key, { panel: storedPanel, event, handler }] of this.handlers) {
        if (!panel || storedPanel === panel) {
          storedPanel.removeEventListener(event, handler);
          this.handlers.delete(key);
        }
      }
    },
    
    clear() {
      for (const { panel, event, handler } of this.handlers.values()) {
        panel.removeEventListener(event, handler);
      }
      this.handlers.clear();
    }
  });

  // 通用面板函数
  function showMainPanel() {
    if (!panelManager) {
      panelManager = createPanelManager();
    }
    
    if (!panelManager.main) {
      panelManager.main = panelManager.createPanel('main', panelTemplates.main);
      setupMainPanelEvents();
    }
    
    updateRuleList();
    updateStats();
    panelManager.showPanel(panelManager.main);
  }

  function showFormPanel(isEdit = false, rule = null) {
    if (!panelManager) {
      panelManager = createPanelManager();
    }
    
    const panelType = isEdit ? 'editRule' : 'addRule';
    const existingPanel = panelManager[panelType];
    
    // 移除旧的面板
    if (existingPanel) {
      if (eventManager) {
        eventManager.removeAll(existingPanel);
      }
      panelManager.removePanel(existingPanel);
      panelManager[panelType] = null;
    }
    
    // 创建新面板
    panelManager[panelType] = panelManager.createPanel(panelType, panelTemplates.form(isEdit), '500px');
    const newPanel = panelManager[panelType];
    
    // 填充数据
    if (isEdit && rule) {
      document.getElementById('ars-host-input').value = rule.host;
      document.getElementById('ars-keys-input').value = rule.keys.join(', ');
      editingRule = rule;
    } else {
      editingRule = null;
    }
    
    // 设置事件
    setupFormPanelEvents(newPanel, isEdit);
    
    // 隐藏主面板，显示表单面板
    panelManager.hidePanel(panelManager.main);
    panelManager.showPanel(newPanel);
  }

  function hidePanel(panel) {
    if (panelManager && panel) {
      panelManager.hidePanel(panel);
    }
  }

  function hideFormPanel() {
    if (panelManager) {
      if (panelManager.addRule) hidePanel(panelManager.addRule);
      if (panelManager.editRule) hidePanel(panelManager.editRule);
    }
    showMainPanel();
  }

  // 事件设置
  function setupMainPanelEvents() {
    const panel = panelManager.main;
    if (!panel) return;
    
    if (!eventManager) {
      eventManager = createEventManager();
    }
    
    // 关闭按钮
    eventManager.add(panel, 'click', '.ars-close', () => hidePanel(panel));
    
    // 添加规则按钮
    eventManager.add(panel, 'click', '#ars-add-rule-btn', () => showFormPanel(false));
    
    // 恢复默认按钮
    eventManager.add(panel, 'click', '#ars-reset-btn', () => {
      if (confirm('确定要恢复默认规则吗？这将删除所有自定义规则。')) {
        const resetRules = defaultRules.map(rule => ({ ...rule, isDefault: true }));
        saveRules(resetRules);
        updateRuleList();
        updateStats();
      }
    });
    
    // 规则项操作
    eventManager.add(panel, 'click', '.ars-edit-btn', (e) => {
      const host = e.target.closest('.ars-edit-btn').getAttribute('data-host');
      const rules = getRules();
      const rule = rules.find(r => r.host === host);
      if (rule) showFormPanel(true, rule);
    });
    
    eventManager.add(panel, 'click', '.ars-delete-btn', (e) => {
      const host = e.target.closest('.ars-delete-btn').getAttribute('data-host');
      if (confirm(`确定要删除规则 "${host}" 吗？`)) {
        const rules = getRules().filter(r => r.host !== host);
        saveRules(rules);
        updateRuleList();
        updateStats();
      }
    });
  }

  function setupFormPanelEvents(panel, isEdit) {
    if (!panel) return;
    
    if (!eventManager) {
      eventManager = createEventManager();
    }
    
    // 关闭和取消按钮
    eventManager.add(panel, 'click', '.ars-close, #ars-cancel-btn', () => hideFormPanel());
    
    // 确认按钮
    eventManager.add(panel, 'click', '#ars-confirm-btn', () => {
      isEdit ? saveEditedRule() : addNewRule();
    });
    
    // 输入框回车键
    eventManager.add(panel, 'keypress', '#ars-host-input', (e) => {
      if (e.key === 'Enter') document.getElementById('ars-keys-input').focus();
    });
    
    eventManager.add(panel, 'keypress', '#ars-keys-input', (e) => {
      if (e.key === 'Enter') document.getElementById('ars-confirm-btn').click();
    });
  }

  // 数据更新函数
  function updateStats() {
    const rules = getRules();
    let defaultCount = 0, customCount = 0;
    
    rules.forEach(rule => {
      isDefaultRule(rule) ? defaultCount++ : customCount++;
    });
    
    const countEl = id => document.getElementById(id);
    if (countEl('ars-rule-count')) countEl('ars-rule-count').textContent = rules.length;
    if (countEl('ars-default-count')) countEl('ars-default-count').textContent = defaultCount;
    if (countEl('ars-custom-count')) countEl('ars-custom-count').textContent = customCount;
    if (countEl('ars-list-count')) countEl('ars-list-count').textContent = `${rules.length}条规则`;
  }

  function updateRuleList() {
    const rules = getRules();
    const ruleList = document.getElementById('ars-rule-list');
    if (!ruleList) return;
    
    if (rules.length === 0) {
      ruleList.innerHTML = `
        <div class="ars-empty-state">
          <div class="ars-empty-icon">📋</div>
          <div class="ars-empty-text">暂无规则，点击下方按钮添加</div>
        </div>
      `;
      return;
    }
    
    ruleList.innerHTML = rules.map(rule => {
      const isDefault = isDefaultRule(rule);
      const typeClass = isDefault ? 'ars-type-default' : 'ars-type-custom';
      const typeText = isDefault ? '默认' : '自定义';
      
      return `
        <div class="ars-rule-item">
          <div class="ars-rule-info">
            <div class="ars-rule-host">${rule.host}</div>
            <div class="ars-rule-type ${typeClass}">${typeText}</div>
            <div class="ars-rule-keys">${rule.keys.map(key => `<span class="ars-key-tag">${key}</span>`).join('')}</div>
          </div>
          <div class="ars-rule-actions">
            <button class="ars-action-btn ars-edit-btn" data-host="${rule.host}">✏️ 编辑</button>
            ${!isDefault ? `<button class="ars-action-btn ars-delete-btn" data-host="${rule.host}">🗑️ 删除</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // 规则操作函数
  function addNewRule() {
    const hostInput = document.getElementById('ars-host-input');
    const keysInput = document.getElementById('ars-keys-input');
    
    let host = hostInput.value.trim();
    const keys = keysInput.value.split(',').map(k => k.trim()).filter(k => k);
    
    if (!host || keys.length === 0) {
      alert(!host ? '请输入域名！' : '请输入至少一个参数名！');
      hostInput.focus();
      return;
    }
    
    host = host.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    
    const rules = getRules();
    if (rules.some(rule => rule.host === host)) {
      alert(`域名 "${host}" 的规则已存在！`);
      hostInput.focus();
      return;
    }
    
    rules.push({ host, keys, isDefault: false });
    saveRules(rules);
    updateRuleList();
    updateStats();
    hideFormPanel();
    
    hostInput.value = keysInput.value = '';
  }

  function saveEditedRule() {
    if (!editingRule) return;
    
    const hostInput = document.getElementById('ars-host-input');
    const keysInput = document.getElementById('ars-keys-input');
    
    let newHost = hostInput.value.trim();
    const newKeys = keysInput.value.split(',').map(k => k.trim()).filter(k => k);
    
    if (!newHost || newKeys.length === 0) {
      alert(!newHost ? '请输入域名！' : '请输入至少一个参数名！');
      hostInput.focus();
      return;
    }
    
    newHost = newHost.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    
    const oldHost = editingRule.host;
    const rules = getRules();
    
    if (newHost !== oldHost && rules.some(rule => rule.host === newHost)) {
      alert(`域名 "${newHost}" 的规则已存在！`);
      hostInput.focus();
      return;
    }
    
    const isDefault = defaultRules.some(r => r.host === newHost);
    const updatedRules = rules.map(rule => 
      rule.host === oldHost ? { host: newHost, keys: newKeys, isDefault } : rule
    );
    
    saveRules(updatedRules);
    updateRuleList();
    updateStats();
    hideFormPanel();
  }

  // --------------------------------------
  // 初始化
  // --------------------------------------
  function init() {
    // 注册菜单命令
    if (typeof GM_registerMenuCommand !== 'undefined') {
      GM_registerMenuCommand('管理跳转规则', showMainPanel);
    }
    
    // 执行重定向逻辑
    performRedirect();
    
    // 预初始化面板管理器
    const initPanels = () => {
      if (!panelManager) {
        panelManager = createPanelManager();
        panelManager.init();
      }
    };
    
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPanels);
    } else {
      initPanels();
    }
  }

  // 启动脚本
  init();
})();
