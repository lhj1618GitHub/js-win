// ==UserScript==
// @name         搜索引擎切换器
// @namespace    
// @version      2.0.0
// @description  在搜索结果页面添加悬浮按钮，快速切换不同搜索引擎
// @author      lhj1618
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';
    
    // 默认搜索引擎配置
    const DEFAULT_ENGINES = [
        { 
            id: 1, 
            name: "Google", 
            domain: "google.com", 
            url: "https://www.google.com/search?q={keyword}", 
            icon: "G", 
            color: "#4285F4",
            active: true,
            multiSearch: true
        },
        { 
            id: 2, 
            name: "Baidu", 
            domain: "baidu.com", 
            url: "https://www.baidu.com/s?wd={keyword}", 
            icon: "B", 
            color: "#2932E1",
            active: true,
            multiSearch: true
        },
        { 
            id: 3, 
            name: "Bing", 
            domain: "bing.com", 
            url: "https://www.bing.com/search?q={keyword}", 
            icon: "B", 
            color: "#008373",
            active: true,
            multiSearch: true
        },
        { 
            id: 4, 
            name: "DuckDuckGo", 
            domain: "duckduckgo.com", 
            url: "https://duckduckgo.com/?q={keyword}", 
            icon: "D", 
            color: "#DE5833",
            active: true,
            multiSearch: true
        }
    ];
    
    // 全局状态
    let currentEngines = [];
    let isMainPanelVisible = false;
    let isManagePanelVisible = false;
    let currentKeyword = "";
    let hoverTimeout = null;
    let isHoveringButton = false;
    let isHoveringMainPanel = false;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let isTemporaryShow = false; // 临时显示标志
    
    // 初始化
    function init() {
        // 加载引擎配置（必须先加载，isSearchResultPage需要用到）
        loadEngineConfig();
        
        // 检查是否应该显示按钮
        if (!shouldShowButton()) {
            return;
        }
        
        // 提取当前搜索关键词（仅在搜索页面有效）
        if (isSearchResultPage()) {
            currentKeyword = extractSearchKeyword();
        } else {
            currentKeyword = "";
        }
        
        // 创建UI元素
        createFloatingButton();
        createMainPanel();
        createManagePanel();
        
        // 添加样式
        addStyles();
        
        // 初始化事件监听
        setupEventListeners();
        
        console.log("搜索引擎切换器已加载");
    }
    
    // 判断是否应该显示按钮
    function shouldShowButton() {
        // 如果是临时显示模式，总是显示
        if (isTemporaryShow) {
            return true;
        }
        
        // 否则检查是否是搜索结果页面
        return isSearchResultPage();
    }
    
    // 注册菜单命令
    function registerMenuCommands() {
        GM_registerMenuCommand("在当前页面临时显示", showTemporaryButton);
    }
    
    // 在当前页面临时显示悬浮按钮
    function showTemporaryButton() {
        isTemporaryShow = true;
        
        // 如果还没有初始化，则初始化
        if (!document.getElementById("search-switcher-button")) {
            init();
        } else {
            // 如果已经初始化，确保按钮可见
            const button = document.getElementById("search-switcher-button");
            if (button) {
                button.style.display = "flex";
            }
        }
        
        // 显示主面板
        showMainPanel();
        
        alert("已在此页面临时显示悬浮按钮，刷新页面后将恢复默认行为");
    }
    
    // 检查当前页面是否为搜索结果页面
    function isSearchResultPage() {
        const url = window.location.href;
        const hostname = window.location.hostname;
        const path = window.location.pathname;
        const searchParams = window.location.search;
        
        // 1. 检查URL是否包含搜索参数
        const hasSearchParams = searchParams.includes("q=") || 
                               searchParams.includes("wd=") || 
                               searchParams.includes("query=") ||
                               searchParams.includes("text=") ||
                               searchParams.includes("p=") ||
                               searchParams.includes("search=") ||
                               searchParams.includes("s=");
        
        // 2. 检查路径是否匹配搜索结果页模式
        const isSearchPath = path.includes("/search") || 
                            path.includes("/s") ||
                            path.includes("/web") ||
                            path.includes("/find") ||
                            path.includes("/results");
        
        // 3. 检查页面中是否有搜索框
        const hasSearchInput = document.querySelector('input[type="text"][name*="q"], input[type="search"], input[name*="search"], input[name*="wd"], input[name*="query"]') !== null;
        
        // 4. 检查页面中是否有搜索表单
        const hasSearchForm = document.querySelector('form[action*="search"], form[role="search"]') !== null;
        
        // 5. 检查文档标题是否包含搜索相关关键词
        const title = document.title.toLowerCase();
        const isSearchTitle = title.includes("search") || 
                             title.includes("results") || 
                             title.includes("找到") || 
                             title.includes("检索");
        
        // 6. 检查是否在已配置的搜索引擎域名中
        const isConfiguredEngine = currentEngines.some(engine => {
            // 精确匹配域名或子域名
            if (engine.domain === hostname) {
                return true;
            }
            
            // 检查是否是子域名
            if (hostname.endsWith("." + engine.domain)) {
                return true;
            }
            
            // 检查主机名是否包含域名（部分匹配）
            if (hostname.includes(engine.domain)) {
                return true;
            }
            
            return false;
        });
        
        // 如果是已配置的搜索引擎页面，并且满足以下任一条件，就认为是搜索结果页面
        if (isConfiguredEngine) {
            if (hasSearchParams || isSearchPath || hasSearchInput || hasSearchForm) {
                console.log(`检测到已配置的搜索引擎页面: ${hostname}, 条件: hasSearchParams=${hasSearchParams}, isSearchPath=${isSearchPath}, hasSearchInput=${hasSearchInput}, hasSearchForm=${hasSearchForm}`);
                return true;
            }
        }
        
        // 7. 常见搜索引擎的搜索结果页面特征（作为备用检查）
        const searchPatterns = [
            /google\.com.*\/search/,
            /bing\.com.*\/search/,
            /baidu\.com.*\/(s|wd)/,
            /duckduckgo\.com/,
            /yahoo\.com.*\/search/,
            /so\.com\/s/,
            /yandex\.ru.*\/search/,
            /ecosia\.org.*\/search/,
            /ask\.com.*\/web/,
            /aol\.com.*\/search/,
            /dogpile\.com.*\/ws/,
            /webcrawler\.com.*\/ws/
        ];
        
        return searchPatterns.some(pattern => pattern.test(url)) && (hasSearchParams || isSearchPath);
    }
    
    // 从页面提取搜索关键词
    function extractSearchKeyword() {
        const urlParams = new URLSearchParams(window.location.search);
        let keyword = "";
        
        // 尝试从不同搜索引擎的参数中提取关键词
        if (urlParams.has("q")) {
            keyword = urlParams.get("q");
        } else if (urlParams.has("wd")) {
            keyword = urlParams.get("wd");
        } else if (urlParams.has("query")) {
            keyword = urlParams.get("query");
        } else if (urlParams.has("text")) {
            keyword = urlParams.get("text");
        } else if (urlParams.has("p")) {
            keyword = urlParams.get("p");
        } else if (urlParams.has("search")) {
            keyword = urlParams.get("search");
        } else if (urlParams.has("s")) {
            keyword = urlParams.get("s");
        }
        
        // 如果URL中没有，尝试从搜索框获取
        if (!keyword) {
            const searchInput = document.querySelector('input[type="text"], input[type="search"], input[name="q"]');
            if (searchInput && searchInput.value) {
                keyword = searchInput.value;
            }
        }
        
        return decodeURIComponent(keyword);
    }
    
    // 加载引擎配置
    function loadEngineConfig() {
        try {
            const savedEngines = GM_getValue("search_engines");
            if (savedEngines && Array.isArray(savedEngines) && savedEngines.length > 0) {
                currentEngines = savedEngines;
                // 确保新添加的multiSearch属性存在
                currentEngines.forEach(engine => {
                    if (engine.multiSearch === undefined) {
                        engine.multiSearch = true;
                    }
                });
            } else {
                currentEngines = JSON.parse(JSON.stringify(DEFAULT_ENGINES));
                saveEngineConfig();
            }
        } catch (e) {
            console.error("加载引擎配置失败:", e);
            currentEngines = JSON.parse(JSON.stringify(DEFAULT_ENGINES));
        }
    }
    
    // 保存引擎配置
    function saveEngineConfig() {
        try {
            GM_setValue("search_engines", currentEngines);
        } catch (e) {
            console.error("保存引擎配置失败:", e);
        }
    }
    
    // 创建悬浮按钮
    function createFloatingButton() {
        const button = document.createElement("div");
        button.id = "search-switcher-button";
        button.className = "search-switcher-button";
        button.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
        `;
        button.title = "切换搜索引擎";
        
        // 设置默认位置（居中顶部）
        button.style.position = "fixed";
        button.style.top = "20px";
        button.style.left = "50%";
        button.style.transform = "translateX(-50%)";
        
        // 创建连接桥接区域
        const bridge = document.createElement("div");
        bridge.id = "search-switcher-bridge";
        bridge.className = "search-switcher-bridge";
        
        document.body.appendChild(button);
        document.body.appendChild(bridge);
    }
    
    // 创建主面板
    function createMainPanel() {
        const panel = document.createElement("div");
        panel.id = "search-engine-main-panel";
        panel.className = "search-engine-panel main-panel";
        panel.innerHTML = `
            <div class="panel-header">
                <h3>搜索引擎</h3>
                <span class="panel-subtitle">点击切换，或使用多个引擎搜索</span>
                <button class="close-btn" id="main-panel-close-btn">×</button>
            </div>
            <div class="engines-list" id="engines-list">
                <!-- 引擎列表将通过JS动态生成 -->
            </div>
            <div class="panel-footer">
                <div class="footer-actions">
                    <button class="action-btn multi-search-btn" id="multi-search-btn" title="多引擎搜索">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                        </svg>
                        <span>多引擎</span>
                    </button>
                    <div class="quick-actions">
                        <button class="quick-action-btn" id="add-current-btn" title="添加当前引擎">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                        <button class="quick-action-btn" id="manage-engines-btn" title="管理引擎">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        renderEnginesList();
    }
    
    // 创建管理面板
    function createManagePanel() {
        const panel = document.createElement("div");
        panel.id = "search-engine-manage-panel";
        panel.className = "search-engine-panel manage-panel";
        panel.innerHTML = `
            <div class="panel-header">
                <h3>管理搜索引擎</h3>
                <button class="close-btn" id="manage-panel-close-btn">×</button>
            </div>
            <div class="manage-content">
                <div class="manage-footer">
                    <button class="action-btn quick-multi-search-btn" id="quick-multi-search-btn" title="多引擎搜索">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                        </svg>
                        <span>多引擎</span>
                    </button>
                    <div class="quick-actions">
                        <button class="quick-action-btn" id="add-engine-btn" title="添加新引擎">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="manage-list-container">
                    <div class="manage-list" id="manage-list">
                        <!-- 管理列表通过JS生成 -->
                    </div>
                </div>
                <div class="manage-hint">拖拽排序，开启/禁用引擎，勾选多引擎搜索</div>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // 创建添加引擎表单（隐藏状态）
        const addForm = document.createElement("div");
        addForm.id = "add-engine-form";
        addForm.className = "add-engine-form";
        addForm.style.display = "none";
        addForm.innerHTML = `
            <div class="panel-header">
                <h3>添加新搜索引擎</h3>
                <button class="close-btn" id="add-form-close-btn">×</button>
            </div>
            <div class="form-content">
                <div class="form-row">
                    <label class="form-label">引擎名称</label>
                    <input type="text" id="new-engine-name" class="form-input" placeholder="例如：Google" value="">
                </div>
                <div class="form-row">
                    <label class="form-label">域名</label>
                    <input type="text" id="new-engine-domain" class="form-input" placeholder="例如：google.com" value="">
                </div>
                <div class="form-row">
                    <label class="form-label">URL模板</label>
                    <input type="text" id="new-engine-url" class="form-input" placeholder="例如：https://www.google.com/search?q={keyword}" value="">
                    <div class="form-hint">注意：必须包含 {keyword} 占位符</div>
                </div>
                <div class="form-row">
                    <label class="form-checkbox">
                        <input type="checkbox" id="new-engine-multisearch" checked>
                        <span>启用多引擎搜索</span>
                    </label>
                </div>
                <div class="form-actions">
                    <button class="form-btn secondary" id="cancel-add-btn">取消</button>
                    <button class="form-btn primary" id="save-engine-btn">保存</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(addForm);
        
        // 初始渲染管理列表
        renderManageList();
    }
    
    // 渲染引擎列表
    function renderEnginesList() {
        const enginesList = document.getElementById("engines-list");
        if (!enginesList) return;
        
        enginesList.innerHTML = "";
        
        currentEngines
            .filter(engine => engine.active)
            .forEach(engine => {
                const engineItem = document.createElement("div");
                engineItem.className = "engine-item";
                engineItem.dataset.id = engine.id;
                engineItem.title = `使用 ${engine.name} 搜索`;
                
                engineItem.innerHTML = `
                    <div class="engine-icon" style="background-color: ${engine.color}">
                        ${engine.icon}
                    </div>
                    <div class="engine-info">
                        <div class="engine-name">${escapeHtml(engine.name)}</div>
                        <div class="engine-domain">${escapeHtml(engine.domain)}</div>
                    </div>
                    <div class="engine-action">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </div>
                `;
                
                enginesList.appendChild(engineItem);
            });
    }
    
    // 渲染管理列表
    function renderManageList() {
        const manageList = document.getElementById("manage-list");
        if (!manageList) return;
        
        manageList.innerHTML = "";
        
        // 统计启用了多引擎搜索的引擎数量
        const multiSearchCount = currentEngines.filter(engine => engine.active && engine.multiSearch).length;
        const multiSearchBtn = document.getElementById("quick-multi-search-btn");
        if (multiSearchBtn) {
            multiSearchBtn.title = `使用当前组合搜索 (${multiSearchCount}个引擎)`;
        }
        
        currentEngines.forEach((engine, index) => {
            const manageItem = document.createElement("div");
            manageItem.className = "manage-item";
            manageItem.dataset.id = engine.id;
            manageItem.dataset.index = index;
            manageItem.setAttribute("draggable", "true");
            
            manageItem.innerHTML = `
                <div class="manage-item-handle">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="5" r="1"></circle>
                        <circle cx="9" cy="12" r="1"></circle>
                        <circle cx="9" cy="19" r="1"></circle>
                        <circle cx="15" cy="5" r="1"></circle>
                        <circle cx="15" cy="12" r="1"></circle>
                        <circle cx="15" cy="19" r="1"></circle>
                    </svg>
                </div>
                <div class="manage-item-icon" style="background-color: ${engine.color}">
                    ${engine.icon}
                </div>
                <div class="manage-item-info">
                    <div class="manage-item-name-row">
                        <span class="manage-item-name">${escapeHtml(engine.name)}</span>
                        <div class="manage-item-url-truncated" title="${escapeHtml(engine.url)}">
                            ${escapeHtml(engine.url.length > 50 ? engine.url.substring(0, 50) + "..." : engine.url)}
                        </div>
                    </div>
                </div>
                <div class="manage-item-controls">
                    <div class="manage-item-control-group">
                        <span class="control-label">启用</span>
                        <label class="toggle-switch">
                            <input type="checkbox" class="engine-toggle" ${engine.active ? "checked" : ""}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="manage-item-control-group">
                        <span class="control-label">多搜索</span>
                        <label class="toggle-switch multi-switch" title="启用多引擎搜索">
                            <input type="checkbox" class="engine-multi-toggle" ${engine.multiSearch ? "checked" : ""}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="manage-item-actions">
                        <button class="manage-action-btn edit-engine-btn" title="编辑">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
                                <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
                            </svg>
                        </button>
                        <button class="manage-action-btn delete-engine-btn" title="删除">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            
            manageList.appendChild(manageItem);
        });
        
        setupManageDragAndDrop();
    }
    
    // 设置拖拽排序
    function setupManageDragAndDrop() {
        const manageList = document.getElementById("manage-list");
        if (!manageList) return;
        
        let draggedItem = null;
        
        manageList.querySelectorAll(".manage-item").forEach(item => {
            item.addEventListener("dragstart", function(e) {
                draggedItem = this;
                setTimeout(() => {
                    this.style.opacity = "0.4";
                }, 0);
            });
            
            item.addEventListener("dragover", function(e) {
                e.preventDefault();
                const afterElement = getDragAfterElement(manageList, e.clientY);
                if (afterElement == null) {
                    manageList.appendChild(draggedItem);
                } else {
                    manageList.insertBefore(draggedItem, afterElement);
                }
            });
            
            item.addEventListener("dragend", function(e) {
                setTimeout(() => {
                    this.style.opacity = "1";
                    updateEngineOrder();
                }, 0);
            });
        });
        
        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll(".manage-item:not(.dragging)")];
            
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
    }
    
    // 更新引擎顺序
    function updateEngineOrder() {
        const manageList = document.getElementById("manage-list");
        if (!manageList) return;
        
        const items = manageList.querySelectorAll(".manage-item");
        const newOrder = [];
        
        items.forEach(item => {
            const engineId = parseInt(item.dataset.id);
            const engine = currentEngines.find(e => e.id === engineId);
            if (engine) {
                newOrder.push(engine);
            }
        });
        
        // 确保所有引擎都在列表中
        currentEngines.forEach(engine => {
            if (!newOrder.find(e => e.id === engine.id)) {
                newOrder.push(engine);
            }
        });
        
        currentEngines = newOrder;
        saveEngineConfig();
        renderEnginesList();
    }
    
    // 添加样式
    function addStyles() {
        const css = `
            /* 悬浮按钮样式 */
            .search-switcher-button {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 10000;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                color: rgba(255, 255, 255, 0.8);
            }
            
            .search-switcher-button:hover {
                background: rgba(255, 255, 255, 0.1) !important;
                border-color: rgba(255, 255, 255, 0.3) !important;
                color: white;
                transform: translateX(-50%) scale(1.1);
                box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3);
            }
            
            .search-switcher-button.dragging {
                cursor: grabbing;
                transition: none;
                opacity: 0.8;
            }
            
            /* 桥接区域 - 修复鼠标移动问题 */
            .search-switcher-bridge {
                position: fixed;
                top: 60px; /* 按钮下方 */
                left: 50%;
                transform: translateX(-50%);
                width: 40px;
                height: 20px;
                z-index: 9998;
                pointer-events: none;
            }
            
            /* 引擎面板通用样式 */
            .search-engine-panel {
                position: fixed;
                top: 80px; /* 按钮下方 + 桥接区域高度 */
                left: 50%;
                transform: translateX(-50%);
                width: 420px;
                background: rgba(30, 30, 30, 0.95) !important;
                backdrop-filter: blur(20px);
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
                z-index: 9999;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                overflow: hidden;
            }
            
            .main-panel.show {
                opacity: 1;
                visibility: visible;
            }
            
            .manage-panel.show {
                opacity: 1;
                visibility: visible;
            }
            
            .panel-header {
                padding: 16px 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                position: relative;
            }
            
            .panel-header h3 {
                margin: 0 0 4px 0;
                color: white;
                font-size: 18px;
                font-weight: 600;
            }
            
            .panel-subtitle {
                color: rgba(255, 255, 255, 0.6);
                font-size: 12px;
            }
            
            .close-btn {
                position: absolute;
                top: 16px;
                right: 16px;
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.6);
                font-size: 24px;
                cursor: pointer;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            
            .close-btn:hover {
                color: white;
                background: rgba(255, 255, 255, 0.1);
            }
            
            /* 主面板样式 */
            .engines-list {
                max-height: 300px;
                overflow-y: auto;
                padding: 8px 0;
            }
            
            .engine-item {
                display: flex;
                align-items: center;
                padding: 12px 20px;
                cursor: pointer;
                transition: all 0.2s ease;
                border-left: 3px solid transparent;
            }
            
            .engine-item:hover {
                background: rgba(255, 255, 255, 0.05);
                border-left-color: rgba(77, 171, 247, 0.5);
            }
            
            .engine-icon {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 14px;
                margin-right: 12px;
                flex-shrink: 0;
            }
            
            .engine-info {
                flex-grow: 1;
                min-width: 0; /* 防止内容溢出 */
            }
            
            .engine-name {
                color: white;
                font-weight: 500;
                font-size: 14px;
                margin-bottom: 2px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .engine-domain {
                color: rgba(255, 255, 255, 0.5);
                font-size: 12px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .engine-action {
                color: rgba(255, 255, 255, 0.5);
                transition: all 0.2s ease;
                flex-shrink: 0;
                margin-left: 8px;
            }
            
            .engine-item:hover .engine-action {
                color: white;
            }
            
            /* 主面板底部操作栏 */
            .panel-footer {
                padding: 8px 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .footer-actions {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .action-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 8px 12px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: rgba(255, 255, 255, 0.8);
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                flex-grow: 1;
            }
            
            .action-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.2);
                color: white;
            }
            
            .quick-actions {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .quick-action-btn {
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: rgba(255, 255, 255, 0.8);
                cursor: pointer;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }
            
            .quick-action-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.2);
                color: white;
            }
            
            /* 管理面板样式 */
            .manage-content {
                padding: 0;
            }
            
            .manage-footer {
                padding: 8px 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .manage-list-container {
                max-height: 300px;
                overflow-y: auto;
            }
            
            .manage-list {
                padding: 8px 0;
            }
            
            .manage-item {
                display: flex;
                align-items: center;
                padding: 12px 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                cursor: move;
            }
            
            .manage-item:hover {
                background: rgba(255, 255, 255, 0.05);
            }
            
            .manage-item-handle {
                color: rgba(255, 255, 255, 0.3);
                margin-right: 12px;
                cursor: grab;
                flex-shrink: 0;
            }
            
            .manage-item-icon {
                width: 24px;
                height: 24px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
                font-weight: bold;
                margin-right: 12px;
                flex-shrink: 0;
            }
            
            .manage-item-info {
                flex-grow: 1;
                min-width: 0;
                overflow: hidden;
            }
            
            .manage-item-name-row {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .manage-item-name {
                color: white;
                font-size: 13px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .manage-item-url-truncated {
                color: rgba(255, 255, 255, 0.5);
                font-size: 11px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .manage-item-controls {
                display: flex;
                align-items: center;
                gap: 16px;
                flex-shrink: 0;
                margin-left: 8px;
            }
            
            .manage-item-control-group {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }
            
            .control-label {
                color: rgba(255, 255, 255, 0.5);
                font-size: 10px;
                white-space: nowrap;
            }
            
            .manage-item-actions {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-left: 8px;
            }
            
            .toggle-switch {
                position: relative;
                display: inline-block;
                width: 36px;
                height: 20px;
                flex-shrink: 0;
            }
            
            .multi-switch {
                width: 28px;
            }
            
            .toggle-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(255, 255, 255, 0.2);
                transition: .4s;
                border-radius: 20px;
            }
            
            .toggle-slider:before {
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
            
            .multi-switch .toggle-slider:before {
                height: 14px;
                width: 14px;
                left: 1px;
                bottom: 3px;
            }
            
            input:checked + .toggle-slider {
                background-color: #4dabf7;
            }
            
            input:checked + .toggle-slider:before {
                transform: translateX(16px);
            }
            
            .multi-switch input:checked + .toggle-slider:before {
                transform: translateX(12px);
            }
            
            .manage-action-btn {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: rgba(255, 255, 255, 0.6);
                cursor: pointer;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }
            
            .manage-action-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
            }
            
            .delete-engine-btn:hover {
                background: rgba(250, 82, 82, 0.2);
                border-color: rgba(250, 82, 82, 0.3);
                color: #fa5252;
            }
            
            .manage-hint {
                padding: 12px 20px;
                color: rgba(255, 255, 255, 0.5);
                font-size: 11px;
                text-align: center;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            /* 添加引擎表单样式 */
            .add-engine-form {
                width: 420px;
                background: rgba(30, 30, 30, 0.95) !important;
                backdrop-filter: blur(20px);
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
                z-index: 9999;
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
            }
            
            .form-content {
                padding: 20px;
            }
            
            .form-row {
                margin-bottom: 16px;
            }
            
            .form-label {
                display: block;
                color: rgba(255, 255, 255, 0.7);
                font-size: 12px;
                margin-bottom: 6px;
                font-weight: 500;
            }
            
            .form-input {
                width: 100%;
                padding: 10px 12px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: white;
                font-size: 12px;
                box-sizing: border-box;
            }
            
            .form-input:focus {
                outline: none;
                border-color: rgba(77, 171, 247, 0.5);
            }
            
            .form-hint {
                color: rgba(255, 255, 255, 0.5);
                font-size: 11px;
                margin-top: 4px;
            }
            
            .form-checkbox {
                display: flex;
                align-items: center;
                gap: 8px;
                color: rgba(255, 255, 255, 0.7);
                font-size: 12px;
                cursor: pointer;
            }
            
            .form-checkbox input[type="checkbox"] {
                margin: 0;
            }
            
            .form-actions {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                margin-top: 20px;
            }
            
            .form-btn {
                padding: 8px 16px;
                border-radius: 6px;
                border: none;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .form-btn.primary {
                background: rgba(77, 171, 247, 0.2);
                color: #4dabf7;
            }
            
            .form-btn.primary:hover {
                background: rgba(77, 171, 247, 0.3);
            }
            
            .form-btn.secondary {
                background: rgba(255, 255, 255, 0.05);
                color: rgba(255, 255, 255, 0.8);
            }
            
            .form-btn.secondary:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            
            /* 滚动条样式 */
            ::-webkit-scrollbar {
                width: 6px;
            }
            
            ::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 3px;
            }
            
            ::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 3px;
            }
            
            ::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.3);
            }
        `;
        
        const style = document.createElement("style");
        style.textContent = css;
        document.head.appendChild(style);
    }
    
    // 设置事件监听
    function setupEventListeners() {
        const button = document.getElementById("search-switcher-button");
        const bridge = document.getElementById("search-switcher-bridge");
        const mainPanel = document.getElementById("search-engine-main-panel");
        const managePanel = document.getElementById("search-engine-manage-panel");
        const addForm = document.getElementById("add-engine-form");
        
        // 悬浮按钮拖动功能
        button.addEventListener("mousedown", startDrag);
        
        function startDrag(e) {
            // 只响应左键拖动
            if (e.button !== 0) return;
            
            isDragging = true;
            button.classList.add("dragging");
            
            // 计算鼠标在按钮内的偏移量
            const rect = button.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            
            // 临时改变定位方式
            button.style.position = "absolute";
            button.style.left = (rect.left) + "px";
            button.style.top = (rect.top) + "px";
            button.style.transform = "none";
            
            document.addEventListener("mousemove", dragButton);
            document.addEventListener("mouseup", stopDrag);
            
            e.preventDefault();
        }
        
        function dragButton(e) {
            if (!isDragging) return;
            
            // 计算新位置
            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;
            
            // 应用新位置
            button.style.left = x + "px";
            button.style.top = y + "px";
        }
        
        function stopDrag() {
            isDragging = false;
            button.classList.remove("dragging");
            document.removeEventListener("mousemove", dragButton);
            document.removeEventListener("mouseup", stopDrag);
        }
        
        // 主面板悬停逻辑
        button.addEventListener("mouseenter", function() {
            if (isDragging) return;
            
            isHoveringButton = true;
            clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(() => {
                if (isHoveringButton && !isMainPanelVisible && !isManagePanelVisible) {
                    showMainPanel();
                }
            }, 150);
        });
        
        button.addEventListener("mouseleave", function(e) {
            if (isDragging) return;
            
            isHoveringButton = false;
            // 检查鼠标是否移动到桥接区域或主面板
            if (!bridge.contains(e.relatedTarget) && !mainPanel.contains(e.relatedTarget)) {
                hideMainPanelWithDelay();
            }
        });
        
        // 桥接区域事件
        bridge.addEventListener("mouseenter", function() {
            if (isDragging) return;
            
            isHoveringButton = true;
            clearTimeout(hoverTimeout);
            if (!isMainPanelVisible && !isManagePanelVisible) {
                showMainPanel();
            }
        });
        
        bridge.addEventListener("mouseleave", function(e) {
            if (isDragging) return;
            
            isHoveringButton = false;
            if (!mainPanel.contains(e.relatedTarget) && !button.contains(e.relatedTarget)) {
                hideMainPanelWithDelay();
            }
        });
        
        // 主面板事件
        mainPanel.addEventListener("mouseenter", function() {
            if (isDragging) return;
            
            isHoveringMainPanel = true;
            clearTimeout(hoverTimeout);
        });
        
        mainPanel.addEventListener("mouseleave", function(e) {
            if (isDragging) return;
            
            isHoveringMainPanel = false;
            if (!button.contains(e.relatedTarget) && !bridge.contains(e.relatedTarget)) {
                hideMainPanelWithDelay();
            }
        });
        
        // 主面板关闭按钮
        document.getElementById("main-panel-close-btn").addEventListener("click", hideMainPanel);
        
        // 引擎点击事件
        document.getElementById("engines-list").addEventListener("click", function(e) {
            const engineItem = e.target.closest(".engine-item");
            if (engineItem) {
                const engineId = parseInt(engineItem.dataset.id);
                const engine = currentEngines.find(e => e.id === engineId);
                if (engine) {
                    performSearch(engine);
                }
            }
        });
        
        // 多引擎搜索
        document.getElementById("multi-search-btn").addEventListener("click", performMultiSearch);
        document.getElementById("quick-multi-search-btn").addEventListener("click", performMultiSearch);
        
        // 添加当前引擎
        document.getElementById("add-current-btn").addEventListener("click", addCurrentEngine);
        
        // 管理引擎按钮
        document.getElementById("manage-engines-btn").addEventListener("click", showManagePanel);
        
        // 管理面板关闭按钮
        document.getElementById("manage-panel-close-btn").addEventListener("click", hideManagePanel);
        
        // 添加新引擎按钮
        document.getElementById("add-engine-btn").addEventListener("click", showAddEngineForm);
        
        // 添加表单关闭按钮
        document.getElementById("add-form-close-btn").addEventListener("click", hideAddEngineForm);
        
        // 取消添加
        document.getElementById("cancel-add-btn").addEventListener("click", hideAddEngineForm);
        
        // 保存引擎
        document.getElementById("save-engine-btn").addEventListener("click", saveNewEngine);
        
        // 管理面板事件委托
        managePanel.addEventListener("click", function(e) {
            // 切换引擎状态
            if (e.target.classList.contains("engine-toggle")) {
                const toggle = e.target;
                const manageItem = toggle.closest(".manage-item");
                const engineId = parseInt(manageItem.dataset.id);
                const engine = currentEngines.find(e => e.id === engineId);
                if (engine) {
                    engine.active = toggle.checked;
                    saveEngineConfig();
                    renderEnginesList();
                    renderManageList(); // 重新渲染以更新按钮状态
                }
                e.stopPropagation(); // 阻止事件冒泡，防止面板关闭
                return;
            }
            
            // 切换多引擎搜索状态
            if (e.target.classList.contains("engine-multi-toggle")) {
                const toggle = e.target;
                const manageItem = toggle.closest(".manage-item");
                const engineId = parseInt(manageItem.dataset.id);
                const engine = currentEngines.find(e => e.id === engineId);
                if (engine) {
                    engine.multiSearch = toggle.checked;
                    saveEngineConfig();
                    renderManageList(); // 重新渲染以更新按钮状态
                }
                e.stopPropagation(); // 阻止事件冒泡，防止面板关闭
                return;
            }
            
            // 编辑引擎
            if (e.target.classList.contains("edit-engine-btn") || 
                e.target.closest(".edit-engine-btn")) {
                e.stopPropagation(); // 阻止事件冒泡，防止面板关闭
                const btn = e.target.classList.contains("edit-engine-btn") ? 
                           e.target : e.target.closest(".edit-engine-btn");
                const manageItem = btn.closest(".manage-item");
                const engineId = parseInt(manageItem.dataset.id);
                editEngine(engineId);
                return;
            }
            
            // 删除引擎
            if (e.target.classList.contains("delete-engine-btn") || 
                e.target.closest(".delete-engine-btn")) {
                e.stopPropagation(); // 阻止事件冒泡，防止面板关闭
                const btn = e.target.classList.contains("delete-engine-btn") ? 
                           e.target : e.target.closest(".delete-engine-btn");
                const manageItem = btn.closest(".manage-item");
                const engineId = parseInt(manageItem.dataset.id);
                deleteEngine(engineId);
                return;
            }
        });
        
        // 为管理面板内的按钮添加事件监听，阻止事件冒泡
        document.getElementById("quick-multi-search-btn").addEventListener("click", function(e) {
            e.stopPropagation(); // 阻止事件冒泡，防止面板关闭
            performMultiSearch();
        });
        
        document.getElementById("add-engine-btn").addEventListener("click", function(e) {
            e.stopPropagation(); // 阻止事件冒泡，防止面板关闭
            showAddEngineForm();
        });
        
        // 点击外部隐藏面板
        document.addEventListener("click", function(e) {
            if (!mainPanel.contains(e.target) && 
                !managePanel.contains(e.target) && 
                !addForm.contains(e.target) && 
                !button.contains(e.target) && 
                !bridge.contains(e.target)) {
                if (isMainPanelVisible) hideMainPanel();
                if (isManagePanelVisible) hideManagePanel();
                if (addForm.style.display === "block") hideAddEngineForm();
            }
        });
        
        // ESC键隐藏所有面板
        document.addEventListener("keydown", function(e) {
            if (e.key === "Escape") {
                if (isMainPanelVisible) hideMainPanel();
                if (isManagePanelVisible) hideManagePanel();
                if (document.getElementById("add-engine-form").style.display === "block") {
                    hideAddEngineForm();
                }
            }
        });
    }
    
    // 显示主面板
    function showMainPanel() {
        const mainPanel = document.getElementById("search-engine-main-panel");
        const bridge = document.getElementById("search-switcher-bridge");
        
        // 隐藏其他面板
        hideManagePanel();
        hideAddEngineForm();
        
        mainPanel.classList.add("show");
        bridge.style.pointerEvents = "auto";
        isMainPanelVisible = true;
    }
    
    // 隐藏主面板
    function hideMainPanel() {
        const mainPanel = document.getElementById("search-engine-main-panel");
        const bridge = document.getElementById("search-switcher-bridge");
        
        mainPanel.classList.remove("show");
        bridge.style.pointerEvents = "none";
        
        isMainPanelVisible = false;
        isHoveringButton = false;
        isHoveringMainPanel = false;
        clearTimeout(hoverTimeout);
    }
    
    // 延迟隐藏主面板
    function hideMainPanelWithDelay() {
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
            if (!isHoveringButton && !isHoveringMainPanel) {
                hideMainPanel();
            }
        }, 300);
    }
    
    // 显示管理面板
    function showManagePanel() {
        const managePanel = document.getElementById("search-engine-manage-panel");
        const bridge = document.getElementById("search-switcher-bridge");
        
        // 隐藏其他面板
        hideMainPanel();
        hideAddEngineForm();
        
        // 确保管理列表是最新的
        renderManageList();
        
        managePanel.classList.add("show");
        bridge.style.pointerEvents = "auto";
        isManagePanelVisible = true;
    }
    
    // 隐藏管理面板
    function hideManagePanel() {
        const managePanel = document.getElementById("search-engine-manage-panel");
        const bridge = document.getElementById("search-switcher-bridge");
        
        managePanel.classList.remove("show");
        bridge.style.pointerEvents = "none";
        
        isManagePanelVisible = false;
        clearTimeout(hoverTimeout);
    }
    
    // 显示添加引擎表单
    function showAddEngineForm() {
        const addForm = document.getElementById("add-engine-form");
        
        // 清空表单
        document.getElementById("new-engine-name").value = "";
        document.getElementById("new-engine-domain").value = window.location.hostname;
        document.getElementById("new-engine-url").value = "";
        document.getElementById("new-engine-multisearch").checked = true;
        
        addForm.style.display = "block";
    }
    
    // 隐藏添加引擎表单
    function hideAddEngineForm() {
        document.getElementById("add-engine-form").style.display = "none";
    }
    
    // 执行搜索
    function performSearch(engine) {
        let searchUrl;
        if (currentKeyword) {
            searchUrl = engine.url.replace("{keyword}", encodeURIComponent(currentKeyword));
        } else {
            // 在非搜索页面，使用空关键词打开引擎首页
            searchUrl = engine.url.replace("{keyword}", "");
        }
        
        window.open(searchUrl, "_blank");
        hideMainPanel();
        hideManagePanel();
    }
    
    // 多引擎搜索
    function performMultiSearch() {
        if (!currentKeyword) {
            alert("未检测到搜索关键词，将在各引擎首页进行搜索");
        }
        
        const activeEngines = currentEngines.filter(engine => engine.active && engine.multiSearch);
        if (activeEngines.length === 0) {
            alert("没有启用多引擎搜索的搜索引擎");
            return;
        }
        
        // 打开所有启用了多引擎搜索的引擎
        activeEngines.forEach(engine => {
            let searchUrl;
            if (currentKeyword) {
                searchUrl = engine.url.replace("{keyword}", encodeURIComponent(currentKeyword));
            } else {
                searchUrl = engine.url.replace("{keyword}", "");
            }
            window.open(searchUrl, "_blank");
        });
        
        hideMainPanel();
        hideManagePanel();
    }
    
    // 添加当前页面搜索引擎
    function addCurrentEngine() {
        const currentHostname = window.location.hostname;
        const currentUrl = window.location.href;
        
        // 尝试提取当前搜索引擎信息
        let engineName = "";
        let searchUrlTemplate = "";
        let recognized = false;
        
        // 根据当前域名识别搜索引擎
        const knownEngines = {
            "google.com": { name: "Google", url: "https://www.google.com/search?q={keyword}" },
            "baidu.com": { name: "Baidu", url: "https://www.baidu.com/s?wd={keyword}" },
            "bing.com": { name: "Bing", url: "https://www.bing.com/search?q={keyword}" },
            "duckduckgo.com": { name: "DuckDuckGo", url: "https://duckduckgo.com/?q={keyword}" },
            "yahoo.com": { name: "Yahoo", url: "https://search.yahoo.com/search?p={keyword}" },
            "yandex.ru": { name: "Yandex", url: "https://yandex.ru/search/?text={keyword}" },
            "ecosia.org": { name: "Ecosia", url: "https://www.ecosia.org/search?q={keyword}" },
            "so.com": { name: "360搜索", url: "https://www.so.com/s?q={keyword}" }
        };
        
        // 检查是否为已知搜索引擎
        for (const domain in knownEngines) {
            if (currentHostname.includes(domain)) {
                engineName = knownEngines[domain].name;
                searchUrlTemplate = knownEngines[domain].url;
                recognized = true;
                break;
            }
        }
        
        // 如果不是已知搜索引擎，尝试从页面中提取搜索表单
        if (!recognized) {
            const searchForms = document.querySelectorAll('form[role="search"], form[action*="search"], form[action*="s"], form[action*="q"]');
            
            for (const searchForm of searchForms) {
                const action = searchForm.getAttribute("action") || "";
                const method = (searchForm.getAttribute("method") || "get").toLowerCase();
                const inputs = searchForm.querySelectorAll('input[type="text"], input[type="search"]');
                
                for (const input of inputs) {
                    const inputName = input.getAttribute("name") || "q";
                    const inputPlaceholder = input.getAttribute("placeholder") || "";
                    
                    // 尝试从标题获取引擎名称
                    engineName = document.title.split("-")[0].split("|")[0].split("·")[0].trim();
                    if (engineName.length > 30) {
                        engineName = engineName.substring(0, 30) + "...";
                    }
                    
                    if (action && method === "get") {
                        const baseUrl = action.startsWith("http") ? action : 
                                      (action.startsWith("/") ? window.location.origin + action : 
                                      window.location.origin + "/" + action);
                        
                        // 构建搜索URL
                        const urlObj = new URL(baseUrl, window.location.origin);
                        const searchParams = new URLSearchParams(urlObj.search);
                        searchParams.set(inputName, "{keyword}");
                        
                        urlObj.search = searchParams.toString();
                        searchUrlTemplate = urlObj.href;
                        recognized = true;
                        break;
                    } else if (inputName) {
                        // 如果无法从action获取，尝试使用当前域名的搜索路径
                        searchUrlTemplate = `${window.location.origin}/search?${inputName}={keyword}`;
                        recognized = true;
                        break;
                    }
                }
                
                if (recognized) break;
            }
        }
        
        if (!recognized) {
            // 如果无法自动识别，显示添加表单
            showAddEngineForm();
            return;
        }
        
        // 检查是否已存在相同域名或名称的引擎
        const existingEngine = currentEngines.find(engine => 
            engine.domain === currentHostname || engine.name === engineName
        );
        
        if (existingEngine) {
            alert(`搜索引擎 "${engineName}" 已存在于列表中`);
            return;
        }
        
        // 创建新引擎
        const newEngine = {
            id: Date.now(),
            name: engineName,
            domain: currentHostname,
            url: searchUrlTemplate,
            icon: engineName.charAt(0).toUpperCase(),
            color: getRandomColor(),
            active: true,
            multiSearch: true
        };
        
        currentEngines.push(newEngine);
        saveEngineConfig();
        renderEnginesList();
        renderManageList(); // 确保管理面板更新
        
        // 显示管理面板
        showManagePanel();
        
        alert(`已添加搜索引擎: ${engineName}`);
    }
    
    // 保存新引擎
    function saveNewEngine() {
        const name = document.getElementById("new-engine-name").value.trim();
        const domain = document.getElementById("new-engine-domain").value.trim();
        const url = document.getElementById("new-engine-url").value.trim();
        const multiSearch = document.getElementById("new-engine-multisearch").checked;
        
        if (!name || !domain || !url) {
            alert("请填写所有字段");
            return;
        }
        
        if (!url.includes("{keyword}")) {
            alert("URL模板中必须包含 {keyword} 占位符");
            return;
        }
        
        // 检查是否已存在
        const existingEngine = currentEngines.find(engine => 
            engine.name.toLowerCase() === name.toLowerCase() || 
            engine.domain === domain
        );
        
        if (existingEngine) {
            alert("同名的搜索引擎已存在");
            return;
        }
        
        const newEngine = {
            id: Date.now(),
            name: name,
            domain: domain,
            url: url,
            icon: name.charAt(0).toUpperCase(),
            color: getRandomColor(),
            active: true,
            multiSearch: multiSearch
        };
        
        currentEngines.push(newEngine);
        saveEngineConfig();
        renderEnginesList();
        renderManageList(); // 确保管理面板更新
        
        // 隐藏表单，显示管理面板
        hideAddEngineForm();
        showManagePanel();
        
        alert(`搜索引擎 "${name}" 已添加`);
    }
    
    // 编辑引擎
    function editEngine(engineId) {
        const engine = currentEngines.find(e => e.id === engineId);
        if (!engine) return;
        
        const newName = prompt("编辑搜索引擎名称:", engine.name);
        if (newName === null) return;
        
        const newDomain = prompt("编辑域名:", engine.domain);
        if (newDomain === null) return;
        
        const newUrl = prompt("编辑URL模板 ({keyword} 为占位符):", engine.url);
        if (newUrl === null) return;
        
        if (!newUrl.includes("{keyword}")) {
            alert("URL模板中必须包含 {keyword} 占位符");
            return;
        }
        
        const multiSearch = confirm("是否启用多引擎搜索？");
        
        engine.name = newName.trim();
        engine.domain = newDomain.trim();
        engine.url = newUrl.trim();
        engine.icon = newName.trim().charAt(0).toUpperCase();
        engine.multiSearch = multiSearch;
        
        saveEngineConfig();
        renderEnginesList();
        renderManageList();
        
        alert("修改已保存");
    }
    
    // 删除引擎
    function deleteEngine(engineId) {
        if (!confirm("确定要删除这个搜索引擎吗？")) return;
        
        currentEngines = currentEngines.filter(engine => engine.id !== engineId);
        saveEngineConfig();
        renderEnginesList();
        renderManageList();
        
        alert("搜索引擎已删除");
    }
    
    // 工具函数：生成随机颜色
    function getRandomColor() {
        const colors = [
            "#4285F4", "#EA4335", "#FBBC05", "#34A853", 
            "#9C27B0", "#00BCD4", "#FF9800", "#4CAF50",
            "#2196F3", "#F44336", "#FFC107", "#009688"
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // 工具函数：转义HTML
    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 页面加载完成后初始化
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function() {
            init();
            registerMenuCommands();
        });
    } else {
        init();
        registerMenuCommands();
    }
})();
