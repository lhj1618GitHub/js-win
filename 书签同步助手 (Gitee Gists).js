// ==UserScript==
// @name         书签同步助手 (Gitee Gists)
// @namespace    https://github.com/
// @version      1.4
// @description  带控制面板+完整文件夹支持的书签同步工具，适配Edge/Via
// @author       You
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        browser.bookmarks
// @grant        GM_download
// @connect      gitee.com
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // 配置项
    const CONFIG = {
        GIST_ID_KEY: 'gitee_gist_id',
        TOKEN_KEY: 'gitee_access_token',
        JSON_FILE: 'bookmarks_sync.json',
        HTML_FILE: 'bookmarks_sync.html',
        GITEE_API: 'https://gitee.com/api/v5'
    };

    // ========== 核心新增：控制面板创建与样式 ==========
    /**
     * 创建并显示控制面板
     */
    function createControlPanel() {
        // 避免重复创建
        if (document.getElementById('bookmark-sync-panel')) {
            togglePanel(true);
            return;
        }

        // 面板主容器
        const panel = document.createElement('div');
        panel.id = 'bookmark-sync-panel';
        panel.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 999999; width: 90%; max-width: 500px; background: #fff;
            border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            padding: 20px; font-family: sans-serif; color: #333;
            max-height: 80vh; overflow-y: auto; display: none;
        `;

        // 面板头部（标题+关闭按钮）
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eee;
        `;
        header.innerHTML = `
            <h3 style="margin:0; font-size:18px; color:#2d3748;">书签同步助手</h3>
            <button id="close-panel-btn" style="
                background: #f5f5f5; border: none; border-radius: 4px;
                padding: 4px 8px; cursor: pointer; font-size:14px;
            ">✕ 关闭</button>
        `;

        // 面板内容区
        const content = document.createElement('div');
        content.style.cssText = `display: flex; flex-direction: column; gap: 16px;`;

        // 1. 配置区
        const configSection = document.createElement('div');
        configSection.style.cssText = `padding: 12px; background: #f8f9fa; border-radius: 8px;`;
        configSection.innerHTML = `
            <h4 style="margin:0 0 8px 0; font-size:14px; color:#4a5568;">Gitee配置</h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <div>
                    <label style="font-size:12px; color:#718096;">Access Token（需gists权限）：</label>
                    <input type="text" id="gitee-token" style="
                        width: 100%; padding: 8px; border: 1px solid #ddd;
                        border-radius: 4px; font-size:14px; margin-top:4px;
                    " placeholder="输入Gitee私人令牌" value="${GM_getValue(CONFIG.TOKEN_KEY, '')}">
                </div>
                <div>
                    <label style="font-size:12px; color:#718096;">Gist ID（留空自动创建）：</label>
                    <input type="text" id="gitee-gist-id" style="
                        width: 100%; padding: 8px; border: 1px solid #ddd;
                        border-radius: 4px; font-size:14px; margin-top:4px;
                    " placeholder="输入Gist ID" value="${GM_getValue(CONFIG.GIST_ID_KEY, '')}">
                </div>
                <button id="save-config-btn" style="
                    background: #4299e1; color: #fff; border: none;
                    border-radius: 4px; padding: 8px; cursor: pointer;
                    font-size:14px; margin-top:4px;
                ">保存配置</button>
            </div>
        `;

        // 2. 结构化同步功能区
        const syncSection = document.createElement('div');
        syncSection.style.cssText = `padding: 12px; background: #f8f9fa; border-radius: 8px;`;
        syncSection.innerHTML = `
            <h4 style="margin:0 0 8px 0; font-size:14px; color:#4a5568;">结构化书签同步</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <button id="pull-bookmarks-btn" style="
                    background: #38b2ac; color: #fff; border: none;
                    border-radius: 4px; padding: 10px; cursor: pointer; font-size:14px;
                ">🔄 拉取远端书签</button>
                <button id="push-bookmarks-btn" style="
                    background: #9f7aea; color: #fff; border: none;
                    border-radius: 4px; padding: 10px; cursor: pointer; font-size:14px;
                ">📤 推送本地书签</button>
            </div>
        `;

        // 3. HTML文件功能区
        const htmlSection = document.createElement('div');
        htmlSection.style.cssText = `padding: 12px; background: #f8f9fa; border-radius: 8px;`;
        htmlSection.innerHTML = `
            <h4 style="margin:0 0 8px 0; font-size:14px; color:#4a5568;">HTML书签文件同步</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <button id="import-html-btn" style="
                    background: #48bb78; color: #fff; border: none;
                    border-radius: 4px; padding: 10px; cursor: pointer; font-size:14px;
                ">📥 导入本地HTML</button>
                <button id="download-html-btn" style="
                    background: #ed8936; color: #fff; border: none;
                    border-radius: 4px; padding: 10px; cursor: pointer; font-size:14px;
                ">📤 下载远端HTML</button>
            </div>
        `;

        // 4. 进度提示区
        const progressSection = document.createElement('div');
        progressSection.id = 'panel-progress';
        progressSection.style.cssText = `
            padding: 10px; background: #f5f5f5; border-radius: 6px;
            font-size:13px; color: #4a5568; min-height: 20px;
        `;
        progressSection.textContent = '就绪 - 请选择操作';

        // 组装面板
        content.appendChild(configSection);
        content.appendChild(syncSection);
        content.appendChild(htmlSection);
        content.appendChild(progressSection);
        panel.appendChild(header);
        panel.appendChild(content);
        document.body.appendChild(panel);

        // 遮罩层（防止点击背景）
        const mask = document.createElement('div');
        mask.id = 'panel-mask';
        mask.style.cssText = `
            position: fixed; top:0; left:0; width:100%; height:100%;
            background: rgba(0,0,0,0.5); z-index: 999998; display: none;
        `;
        document.body.appendChild(mask);

        // 绑定事件
        bindPanelEvents();
        // 显示面板
        togglePanel(true);
    }

    /**
     * 显示/隐藏控制面板
     * @param {boolean} show 是否显示
     */
    function togglePanel(show) {
        const panel = document.getElementById('bookmark-sync-panel');
        const mask = document.getElementById('panel-mask');
        if (show) {
            panel.style.display = 'block';
            mask.style.display = 'block';
        } else {
            panel.style.display = 'none';
            mask.style.display = 'none';
        }
    }

    /**
     * 绑定控制面板事件
     */
    function bindPanelEvents() {
        // 关闭按钮
        document.getElementById('close-panel-btn').addEventListener('click', () => {
            togglePanel(false);
        });

        // 保存配置
        document.getElementById('save-config-btn').addEventListener('click', () => {
            const token = document.getElementById('gitee-token').value.trim();
            const gistId = document.getElementById('gitee-gist-id').value.trim();
            GM_setValue(CONFIG.TOKEN_KEY, token);
            GM_setValue(CONFIG.GIST_ID_KEY, gistId);
            updateProgress('✅ 配置已保存！', 'success');
        });

        // 拉取书签
        document.getElementById('pull-bookmarks-btn').addEventListener('click', pullBookmarks);

        // 推送书签
        document.getElementById('push-bookmarks-btn').addEventListener('click', pushBookmarks);

        // 导入HTML
        document.getElementById('import-html-btn').addEventListener('click', importLocalHtmlToGitee);

        // 下载HTML
        document.getElementById('download-html-btn').addEventListener('click', downloadRemoteHtmlToLocal);

        // 点击遮罩层关闭面板
        document.getElementById('panel-mask').addEventListener('click', () => {
            togglePanel(false);
        });
    }

    /**
     * 更新面板进度提示
     * @param {string} msg 提示信息
     * @param {string} type 类型：info/success/warning/error
     */
    function updateProgress(msg, type = 'info') {
        const colors = {
            info: '#4a5568',
            success: '#48bb78',
            warning: '#ed8936',
            error: '#e53e3e'
        };
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        const progressEl = document.getElementById('panel-progress');
        progressEl.textContent = `${icons[type]} ${msg}`;
        progressEl.style.color = colors[type];
        console.log(`${icons[type]} ${msg}`);

        // 错误提示弹窗增强
        if (type === 'error') {
            alert(`${icons[type]} ${msg}`);
        }
    }

    // ========== 核心优化：书签文件夹功能 ==========
    /**
     * 递归构建书签树（保留文件夹层级）
     * @param {Array} nodes 书签节点数组
     * @param {string} parentId 父节点ID
     * @returns {Array} 带层级的书签树
     */
    function buildBookmarkTree(nodes, parentId = '') {
        const tree = [];
        const children = nodes.filter(node => node.parentId === parentId);

        for (const node of children) {
            const item = {
                id: node.id,
                title: node.title || '无标题',
                type: node.url ? 'bookmark' : 'folder',
                url: node.url || '',
                createTime: new Date(node.dateAdded).toISOString(),
                children: []
            };

            // 递归获取子节点
            if (!node.url) {
                item.children = buildBookmarkTree(nodes, node.id);
            }

            tree.push(item);
        }
        return tree;
    }

    /**
     * 序列化书签树（保留文件夹结构）
     * @param {Array} bookmarkTree 书签树
     * @returns {string} JSON字符串
     */
    function serializeBookmarkTree(bookmarkTree) {
        // 递归序列化
        function serializeNode(node) {
            const data = {
                id: node.id,
                title: node.title,
                type: node.type,
                createTime: node.createTime
            };
            if (node.type === 'bookmark') {
                data.url = node.url;
            } else {
                data.children = node.children.map(child => serializeNode(child));
            }
            return data;
        }

        return JSON.stringify({
            version: 1.4,
            updateTime: new Date().toISOString(),
            bookmarkTree: bookmarkTree.map(node => serializeNode(node))
        }, null, 2);
    }

    /**
     * 反序列化书签树
     * @param {string} jsonStr JSON字符串
     * @returns {Array} 书签树
     */
    function deserializeBookmarkTree(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            updateProgress(`解析远端书签树：共${countBookmarks(data.bookmarkTree)}个书签`, 'info');
            return data.bookmarkTree || [];
        } catch (e) {
            updateProgress(`书签树解析失败：${e.message}`, 'error');
            return [];
        }
    }

    /**
     * 统计书签树中的书签数量（排除文件夹）
     * @param {Array} tree 书签树
     * @returns {number} 书签数量
     */
    function countBookmarks(tree) {
        let count = 0;
        for (const node of tree) {
            if (node.type === 'bookmark') {
                count++;
            } else {
                count += countBookmarks(node.children);
            }
        }
        return count;
    }

    /**
     * 递归创建文件夹和书签（Edge端）
     * @param {Array} nodes 书签节点数组
     * @param {string} parentId 父文件夹ID
     */
    async function createBookmarkTree(nodes, parentId = '') {
        const added = [];
        for (const node of nodes) {
            try {
                if (node.type === 'folder') {
                    // 创建文件夹
                    const folder = await browser.bookmarks.create({
                        title: node.title,
                        parentId: parentId
                    });
                    // 递归创建子节点
                    const childAdded = await createBookmarkTree(node.children, folder.id);
                    added.push(...childAdded);
                } else if (node.type === 'bookmark' && node.url) {
                    // 检查是否已存在
                    const existing = await browser.bookmarks.search({ url: node.url });
                    if (existing.length === 0) {
                        // 创建书签
                        await browser.bookmarks.create({
                            title: node.title,
                            url: node.url,
                            parentId: parentId
                        });
                        added.push(node);
                        updateProgress(`新增书签：${node.title}`, 'info');
                    }
                }
            } catch (e) {
                updateProgress(`创建失败：${node.title} - ${e.message}`, 'warning');
            }
        }
        return added;
    }

    /**
     * 将HTML书签解析为带文件夹的结构
     * @param {string} htmlContent HTML内容
     * @returns {Array} 书签树
     */
    function htmlToBookmarkTree(htmlContent) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            const root = [];
            let currentFolder = null;

            // 解析H3（文件夹）和A（书签）
            const nodes = doc.querySelectorAll('H3, A');
            nodes.forEach(node => {
                if (node.tagName === 'H3') {
                    // 创建文件夹
                    currentFolder = {
                        id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        title: node.textContent.trim() || '未命名文件夹',
                        type: 'folder',
                        createTime: new Date().toISOString(),
                        children: []
                    };
                    root.push(currentFolder);
                } else if (node.tagName === 'A' && currentFolder) {
                    // 添加书签到当前文件夹
                    const url = node.getAttribute('href') || '';
                    const title = node.textContent.trim() || '无标题';
                    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                        currentFolder.children.push({
                            id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            title: title,
                            type: 'bookmark',
                            url: url,
                            createTime: new Date().toISOString()
                        });
                    }
                }
            });

            // 无文件夹的书签放入默认文件夹
            if (root.length === 0) {
                const defaultFolder = {
                    id: `folder_${Date.now()}`,
                    title: '默认文件夹',
                    type: 'folder',
                    createTime: new Date().toISOString(),
                    children: []
                };
                // 提取所有A标签
                doc.querySelectorAll('A').forEach(node => {
                    const url = node.getAttribute('href') || '';
                    const title = node.textContent.trim() || '无标题';
                    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                        defaultFolder.children.push({
                            id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            title: title,
                            type: 'bookmark',
                            url: url,
                            createTime: new Date().toISOString()
                        });
                    }
                });
                root.push(defaultFolder);
            }

            updateProgress(`HTML解析完成：${countBookmarks(root)}个书签，${root.length}个文件夹`, 'success');
            return root;
        } catch (e) {
            updateProgress(`HTML解析失败：${e.message}`, 'error');
            return [];
        }
    }

    /**
     * 将书签树转换为标准HTML书签内容（保留文件夹）
     * @param {Array} bookmarkTree 书签树
     * @returns {string} HTML内容
     */
    function bookmarkTreeToHtml(bookmarkTree) {
        const now = Date.now().toString();
        // 递归生成HTML节点
        function generateHtmlNodes(nodes, level = 0) {
            let html = '';
            const indent = '    '.repeat(level);

            nodes.forEach(node => {
                if (node.type === 'folder') {
                    html += `${indent}<DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${node.title}</H3>\n`;
                    html += `${indent}<DL><p>\n`;
                    html += generateHtmlNodes(node.children, level + 1);
                    html += `${indent}</DL><p>\n`;
                } else if (node.type === 'bookmark') {
                    const addDate = new Date(node.createTime).getTime().toString();
                    html += `${indent}<DT><A HREF="${node.url}" ADD_DATE="${addDate}" LAST_MODIFIED="${addDate}">${node.title}</A>\n`;
                }
            });

            return html;
        }

        // 标准HTML模板
        return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks (${new Date().toLocaleString()})</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${generateHtmlNodes(bookmarkTree, 1)}
</DL><p>`;
    }

    // ========== 原有功能适配（增强文件夹支持） ==========
    /**
     * 读取本地书签（带文件夹结构）
     */
    function getLocalBookmarks() {
        return new Promise(async (resolve, reject) => {
            updateProgress('开始提取本地书签（含文件夹）...', 'info');

            // Edge/Chrome（完整书签树）
            if (typeof browser !== 'undefined' && browser.bookmarks) {
                try {
                    // 获取所有书签节点
                    const allNodes = await browser.bookmarks.search({});
                    // 构建完整书签树（从根节点开始）
                    const bookmarkTree = buildBookmarkTree(allNodes);
                    const totalBookmarks = countBookmarks(bookmarkTree);
                    updateProgress(`Edge书签提取完成：${totalBookmarks}个书签，${bookmarkTree.length}个顶级文件夹`, 'success');
                    resolve(bookmarkTree);
                } catch (e) {
                    updateProgress(`Edge读取失败：${e.message}（请检查书签权限）`, 'error');
                    reject(e);
                }
            }
            // Via浏览器（模拟文件夹）
            else if (window.localStorage) {
                try {
                    // 兼容Via多版本存储
                    let viaBookmarks = [];
                    const keys = ['via_bookmarks', 'bookmarks', 'via_bookmark_list'];
                    for (const key of keys) {
                        const data = localStorage.getItem(key);
                        if (data) {
                            viaBookmarks = JSON.parse(data);
                            break;
                        }
                    }

                    // 构建模拟文件夹结构
                    const bookmarkTree = [{
                        id: 'via_default_folder',
                        title: 'Via书签',
                        type: 'folder',
                        createTime: new Date().toISOString(),
                        children: viaBookmarks.filter(item =>
                            item?.url && item.url.startsWith('http')
                        ).map(item => ({
                            id: `via_${item.url.hashCode()}`,
                            title: item.name || item.title || '无标题',
                            type: 'bookmark',
                            url: item.url,
                            createTime: item.time || new Date().toISOString()
                        }))
                    }];

                    const totalBookmarks = countBookmarks(bookmarkTree);
                    updateProgress(`Via书签提取完成：${totalBookmarks}个书签`, 'success');
                    resolve(bookmarkTree);
                } catch (e) {
                    updateProgress(`Via读取失败：${e.message}`, 'error');
                    reject(e);
                }
            } else {
                updateProgress('当前浏览器不支持书签读取', 'error');
                reject(new Error('不支持的浏览器'));
            }
        });
    }

    /**
     * 选择本地HTML文件并读取
     */
    function selectLocalHtmlFile() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.html,.htm';
            input.style.display = 'none';
            document.body.appendChild(input);

            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) {
                    reject(new Error('未选择文件'));
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    document.body.removeChild(input);
                    resolve(event.target.result);
                };
                reader.onerror = (error) => {
                    document.body.removeChild(input);
                    reject(error);
                };
                reader.readAsText(file, 'UTF-8');
            };

            input.click();
        });
    }

    /**
     * 下载文件到本地
     */
    function downloadFile(content, filename, mimeType = 'text/html') {
        try {
            if (typeof GM_download !== 'undefined') {
                GM_download({
                    url: `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`,
                    name: filename,
                    saveAs: true
                });
            } else {
                const blob = new Blob([content], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            }
            updateProgress(`文件下载成功：${filename}`, 'success');
        } catch (e) {
            updateProgress(`文件下载失败：${e.message}`, 'error');
        }
    }

    /**
     * 同步到Gitee（双文件）
     */
    function syncToGitee(jsonContent, htmlContent) {
        return new Promise((resolve, reject) => {
            const token = GM_getValue(CONFIG.TOKEN_KEY, '');
            let gistId = GM_getValue(CONFIG.GIST_ID_KEY, '');

            if (!token) {
                updateProgress('请先设置Gitee Access Token', 'error');
                reject(new Error('Token未设置'));
                return;
            }

            updateProgress('正在同步到Gitee Gists...', 'info');
            const payload = {
                description: '书签同步数据（含文件夹结构）',
                public: false,
                files: {
                    [CONFIG.JSON_FILE]: { content: jsonContent },
                    [CONFIG.HTML_FILE]: { content: htmlContent }
                }
            };

            const url = gistId ? `${CONFIG.GITEE_API}/gists/${gistId}` : `${CONFIG.GITEE_API}/gists`;
            const method = gistId ? 'PATCH' : 'POST';

            GM_xmlhttpRequest({
                method: method,
                url: url,
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(payload),
                onload: (response) => {
                    if (response.status >= 200 && response.status < 300) {
                        const data = JSON.parse(response.responseText);
                        if (!gistId) {
                            GM_setValue(CONFIG.GIST_ID_KEY, data.id);
                            updateProgress(`新Gist创建成功，ID：${data.id}`, 'success');
                        }
                        updateProgress('书签成功同步到Gitee Gists（含文件夹）', 'success');
                        resolve(data);
                    } else {
                        const errorMsg = `Gitee API错误：${response.status} - ${JSON.parse(response.responseText).message || '未知错误'}`;
                        updateProgress(errorMsg, 'error');
                        reject(new Error(errorMsg));
                    }
                },
                onerror: (error) => {
                    updateProgress(`网络请求失败：${error.message}`, 'error');
                    reject(new Error(error.message));
                }
            });
        });
    }

    /**
     * 从Gitee拉取指定文件
     */
    function fetchFromGitee(fileName) {
        return new Promise((resolve, reject) => {
            const token = GM_getValue(CONFIG.TOKEN_KEY, '');
            const gistId = GM_getValue(CONFIG.GIST_ID_KEY, '');

            if (!token || !gistId) {
                updateProgress('请先完成Gitee配置（Token+Gist ID）', 'error');
                reject(new Error('配置不完整'));
                return;
            }

            updateProgress(`从Gitee拉取${fileName}文件...`, 'info');
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${CONFIG.GITEE_API}/gists/${gistId}`,
                headers: { 'Authorization': `token ${token}` },
                onload: (response) => {
                    if (response.status === 200) {
                        const data = JSON.parse(response.responseText);
                        const fileContent = data.files[fileName]?.content;
                        if (fileContent) {
                            updateProgress(`${fileName}文件拉取成功`, 'success');
                            resolve(fileContent);
                        } else {
                            updateProgress(`Gist中未找到${fileName}文件`, 'error');
                            reject(new Error('文件不存在'));
                        }
                    } else {
                        updateProgress(`拉取失败：${response.status}`, 'error');
                        reject(new Error(`HTTP ${response.status}`));
                    }
                },
                onerror: (error) => {
                    updateProgress(`网络失败：${error.message}`, 'error');
                    reject(error);
                }
            });
        });
    }

    // ========== 核心功能入口 ==========
    /**
     * 拉取远端书签到本地
     */
    async function pullBookmarks() {
        try {
            // 1. 拉取JSON书签树
            const jsonContent = await fetchFromGitee(CONFIG.JSON_FILE);
            const bookmarkTree = deserializeBookmarkTree(jsonContent);

            // 2. 检查数据
            const totalBookmarks = countBookmarks(bookmarkTree);
            if (totalBookmarks === 0) {
                updateProgress('远端无有效书签数据', 'warning');
                return;
            }

            // 3. 同步到本地（Edge创建文件夹+书签，Via仅支持书签）
            let added = [];
            if (typeof browser !== 'undefined' && browser.bookmarks) {
                // Edge端创建完整树
                added = await createBookmarkTree(bookmarkTree);
            } else if (window.localStorage) {
                // Via端扁平化存储（模拟）
                const flatBookmarks = [];
                function flattenTree(nodes) {
                    nodes.forEach(node => {
                        if (node.type === 'bookmark') flatBookmarks.push(node);
                        else flattenTree(node.children);
                    });
                }
                flattenTree(bookmarkTree);

                // 读取Via现有书签
                let existing = [];
                const keys = ['via_bookmarks', 'bookmarks'];
                let storageKey = 'via_bookmarks';
                for (const key of keys) {
                    const data = localStorage.getItem(key);
                    if (data) {
                        existing = JSON.parse(data);
                        storageKey = key;
                        break;
                    }
                }

                // 去重并添加
                const existingUrls = new Set(existing.map(bm => bm.url));
                const newBookmarks = flatBookmarks.filter(bm => !existingUrls.has(bm.url));

                existing.push(...newBookmarks.map(bm => ({
                    name: bm.title,
                    url: bm.url,
                    time: bm.createTime
                })));
                localStorage.setItem(storageKey, JSON.stringify(existing));
                added = newBookmarks;
            }

            // 4. 结果提示
            updateProgress(`✅ 拉取完成：远端${totalBookmarks}个书签，本地新增${added.length}个（去重后）`, 'success');
        } catch (e) {
            updateProgress(`❌ 拉取失败：${e.message}`, 'error');
        }
    }

    /**
     * 推送本地书签到远端
     */
    async function pushBookmarks() {
        try {
            // 1. 获取本地书签树
            const bookmarkTree = await getLocalBookmarks();
            const totalBookmarks = countBookmarks(bookmarkTree);

            // 2. 检查数据
            if (totalBookmarks === 0) {
                updateProgress('本地无有效书签可推送', 'warning');
                return;
            }

            // 3. 生成双格式内容
            const jsonContent = serializeBookmarkTree(bookmarkTree);
            const htmlContent = bookmarkTreeToHtml(bookmarkTree);

            // 4. 同步到Gitee
            await syncToGitee(jsonContent, htmlContent);
            updateProgress(`✅ 推送完成：${totalBookmarks}个书签，${bookmarkTree.length}个文件夹已同步`, 'success');
        } catch (e) {
            updateProgress(`❌ 推送失败：${e.message}`, 'error');
        }
    }

    /**
     * 导入本地HTML并同步到远端
     */
    async function importLocalHtmlToGitee() {
        try {
            updateProgress('请选择本地HTML书签文件...', 'info');
            // 1. 选择并读取HTML文件
            const htmlContent = await selectLocalHtmlFile();
            // 2. 解析为书签树
            const bookmarkTree = htmlToBookmarkTree(htmlContent);
            const totalBookmarks = countBookmarks(bookmarkTree);

            // 3. 检查数据
            if (totalBookmarks === 0) {
                updateProgress('HTML文件中未解析到有效书签', 'warning');
                return;
            }

            // 4. 生成双格式内容
            const jsonContent = serializeBookmarkTree(bookmarkTree);
            const newHtmlContent = bookmarkTreeToHtml(bookmarkTree);

            // 5. 同步到Gitee
            await syncToGitee(jsonContent, newHtmlContent);
            updateProgress(`✅ HTML导入完成：${totalBookmarks}个书签，${bookmarkTree.length}个文件夹已上传`, 'success');
        } catch (e) {
            updateProgress(`❌ HTML导入失败：${e.message}`, 'error');
        }
    }

    /**
     * 下载远端HTML书签到本地
     */
    async function downloadRemoteHtmlToLocal() {
        try {
            // 1. 拉取HTML文件
            const htmlContent = await fetchFromGitee(CONFIG.HTML_FILE);
            // 2. 下载为本地文件
            const filename = `bookmarks_${new Date().getTime()}.html`;
            downloadFile(htmlContent, filename);
            updateProgress(`✅ HTML下载完成：文件已保存为 ${filename}`, 'success');
        } catch (e) {
            updateProgress(`❌ HTML下载失败：${e.message}`, 'error');
        }
    }

    // ========== 初始化 ==========
    // 注册唯一菜单（打开控制面板）
    GM_registerMenuCommand('📖 书签同步控制面板', createControlPanel);

    // 辅助函数：字符串哈希（Via书签ID生成）
    String.prototype.hashCode = function() {
        let hash = 0;
        for (let i = 0; i < this.length; i++) {
            hash = ((hash << 5) - hash) + this.charCodeAt(i);
            hash |= 0; // 转换为32位整数
        }
        return hash.toString(36);
    };

})();