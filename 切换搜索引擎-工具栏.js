// ==UserScript==
// @name:zh-CN   切换搜索引擎-工具栏
// @name         Search Bar
// @author       lhj1618
// @version      1.5.1
// @description  适用于手机X浏览器，可读取X浏览器的搜索引擎设置，支持隐藏搜索引擎
// @match        *://*/*
// @run-at       document-end
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_EX_getSearchEngines
// ==/UserScript==
(function () {
    'use strict';
    const STORAGE_KEY = 'quick_search_bar_fixed_final';
    const queryParams = ["q", "wd", "word", "keyword", "text", "query", "p", "key"];
    // 滚动控制变量
    let lastScrollTop = 0;
    let toolbarHost = null;
    let toolbarVisible = true;
    // 稳定 ID
    function stableId(name, host) {
        let str = (name || '') + '|' + (host || '');
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
        }
        return 'se_' + Math.abs(hash).toString(36);
    }
    // 默认引擎
    const defaultEngines = [
        { name:'百度',host:'baidu.com',url:'https://www.baidu.com/s?word=%keywords%' },
        { name:'Bing',host:'bing.com',url:'https://www.bing.com/search?q=%keywords%' },
        { name:'Gitcode',host:'gitcode.com',url:'https://gitcode.com/search?q=%keywords%' },
        { name:'Gitee',host:'gitee.com',url:'https://so.gitee.com/?q=%keywords%' },
        { name:'Github',host:'github.com',url:'https://github.com/search?q=%keywords%' },
    ];
    // 读取 XBrowser 引擎
    let rawEngines = [];
    if (typeof GM_EX_getSearchEngines === 'function') {
        try {
            const list = JSON.parse(GM_EX_getSearchEngines());
            if (Array.isArray(list) && list.length > 0) {
                rawEngines = list.map(e => ({
                    name: e.name || '未知',
                    host: e.host || '',
                    url:  e.url  || ''
                }));
            }
        } catch (e) {}
    }
    if (rawEngines.length === 0) rawEngines = defaultEngines;
    // 读取保存设置
    const saved = GM_getValue(STORAGE_KEY) || { hidden: [] };
    const hiddenSet = new Set(saved.hidden || []);
    // 合并并生成稳定 ID
    const searchEngines = rawEngines.map(engine => {
        const id = stableId(engine.name, engine.host);
        return {
            id,
            name: engine.name,
            host: engine.host,
            url: engine.url,
            visible: !hiddenSet.has(id)
        };
    });

    function saveSettings() {
        GM_setValue(STORAGE_KEY, {
            hidden: searchEngines.filter(e => !e.visible).map(e => e.id)
        });
    }
    GM_registerMenuCommand("管理搜索引擎", showManager);

    function showManager() {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(8px);z-index:2147483647;display:flex;justify-content:center;align-items:center;';
        const box = document.createElement('div');
        box.style.cssText = 'background:#fff;border-radius:16px;width:90%;max-width:500px;max-height:85vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4);display:flex;flex-direction:column;';
        box.innerHTML = `
            <div style="padding:24px 24px 16px;border-bottom:1px solid #f0f0f0;">
                <h2 style="margin:0;font-size:20px;font-weight:600;color:#1a1a1a;">管理搜索引擎</h2>
                <p style="margin:8px 0 0;color:#666;font-size:14px;">点击方框显示/隐藏搜索引擎</p>
            </div>
            <div id="list" style="flex:1;overflow-y:auto;padding:0 24px 16px;"></div>
            <div style="padding:16px 24px;background:#f8f9fa;border-top:1px solid #f0f0f0;display:flex;justify-content:flex-end;gap:12px;">
                <button id="cancel" style="padding:10px 20px;border:1px solid #d0d7de;background:#fff;border-radius:8px;cursor:pointer;">取消</button>
                <button id="save" style="padding:10px 20px;background:#007aff;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">保存</button>
            </div>`;
        modal.appendChild(box);
        document.body.appendChild(modal);
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        box.querySelector('#cancel').onclick = () => modal.remove();
        box.querySelector('#save').onclick = () => {
            saveSettings();
            modal.remove();
            location.reload();
        };
        renderList(box.querySelector('#list'));
    }
    function renderList(container) {
        container.innerHTML = '';
        searchEngines.forEach((engine) => {
            const item = document.createElement('div');
            item.style.cssText = 'all:unset;display:flex;align-items:center;padding:14px 16px;background:#fff;border:1px solid #e1e4e8;border-radius:12px;margin:12px 0;box-sizing:border-box;';
            item.innerHTML = `
                <div style="flex:1;">
                    <div style="font-weight:600;font-size:15px;${!engine.visible?'opacity:0.5;':''}">${engine.name}</div>
                    <div style="font-size:13px;color:#57606a;margin-top:2px;">${engine.host}</div>
                </div>
                <label style="cursor:pointer;margin-left:12px;">
                    <input type="checkbox" ${engine.visible?'checked':''} style="position:absolute;opacity:0;">
                    <span style="display:inline-block;width:26px;height:26px;border:2px solid ${engine.visible?'#007aff':'#ccc'};border-radius:7px;background:${engine.visible?'#007aff':'#fff'};position:relative;transition:all .2s;">
                        <svg style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(${engine.visible?1:0});width:16px;height:16px;color:#fff;transition:all .2s;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><path d="M5 13l4 4L19 7"/></svg>
                    </span>
                </label>`;
            container.appendChild(item);
            item.querySelector('label').onclick = e => {
                e.preventDefault();
                engine.visible = !engine.visible;
                renderList(container);
            };
        });
    }
    function getCurrentInfo() {
        const url = location.href;
        const host = location.host;
        for (const e of searchEngines) {
            if (host.includes(e.host)) {
                for (const p of queryParams) {
                    const match = url.match(new RegExp('[?&]' + p + '=([^&]+)'));
                    if (match) {
                        const queryParam = match[1].split('&')[0];
                        return { engine: e, rawQuery: queryParam };
                    }
                }
            }
        }
        return null;
    }
    // 滚动控制函数
    function handleScroll() {
        if (!toolbarHost) return;

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollingDown = scrollTop > lastScrollTop;

        const scrollThreshold = 10;

        if (scrollingDown && scrollTop - lastScrollTop > scrollThreshold) {
            if (toolbarVisible) {
                toolbarHost.style.transform = 'translateY(100%)';
                toolbarVisible = false;
            }
        } else if (!scrollingDown && lastScrollTop - scrollTop > scrollThreshold) {
            if (!toolbarVisible) {
                toolbarHost.style.transform = 'translateY(0)';
                toolbarVisible = true;
            }
        }

        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }
    function createToolbar(info) {
        const { engine: currentEngine, rawQuery } = info;
        toolbarHost = document.createElement('div');
        toolbarHost.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;z-index:9999999;font-family:-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;transform:translateY(0);transition:transform 0.3s ease;';
        const shadow = toolbarHost.attachShadow({mode: 'open'});
        const style = document.createElement('style');
        style.textContent = `
            .toolbar-content{
                display:flex;
                width:100%;
                box-sizing:border-box;
                overflow-x:auto;
                overflow-y:hidden;
                background:rgba(255,255,255,0.95);
                border-top:1px solid rgba(224,224,224,0.8);
                height:48px;
                padding:0 8px;
                align-items:center;
                white-space:nowrap;
                backdrop-filter:blur(20px);
                box-shadow:0 -2px 20px rgba(0,0,0,0.08);
            }
            .toolbar-content::-webkit-scrollbar{display:none;}

            a{
                display:inline-flex;
                align-items:center;
                justify-content:center;
                padding:6px 14px;
                margin:0 4px;
                border-radius:8px;
                text-decoration:none;
                font-weight:500;
                font-size:14px;
                min-width:fit-content;
                transition:all .3s;
                background:#ffffff;
                border:1px solid #c0c0c0;
                color:#000;
                box-shadow:0 1px 3px rgba(0,0,0,0.08);
                height:32px;
                line-height:1;
                box-sizing:border-box;
            }
            a:hover{
                background:#f5f5f5;
                border-color:#999;
                transform:translateY(-1px);
                box-shadow:0 3px 8px rgba(0,0,0,0.1);
            }
            a.active{
                color:#007aff !important;
                background:#fff !important;
                border:1px solid #007aff !important;
                font-weight:600;
                transform:translateY(-1px);
            }

            .manage-btn{
                display:inline-flex;
                align-items:center;
                justify-content:center;
                width:32px;
                height:32px;
                margin:0 4px;
                color:#666;
                cursor:pointer;
                font-weight:500;
                border-radius:8px;
                background:rgba(248,249,250,0.9);
                border:1px solid #c0c0c0;
                transition:all .3s;
                font-size:16px;
            }
            .manage-btn:hover{
                background:#f5f5f5;
                border-color:#999;
                transform:translateY(-1px);
                box-shadow:0 3px 8px rgba(0,0,0,0.1);
                color:#333;
            }

            .separator{
                height:20px;
                width:1px;
                background:#e0e0e0;
                margin:0 12px;
                opacity:0.6;
            }

            a:focus, .manage-btn:focus, button:focus {
                outline: none !important;
                box-shadow: none !important;
            }

            @media(max-width:768px){
                .toolbar-content{height:44px;}
                a,.manage-btn{
                    height:30px;
                    padding:5px 12px;
                }
            }
            @media(max-width:480px){
                .toolbar-content{height:40px;}
                a{
                    height:28px;
                    padding:4px 10px;
                    font-size:13px;
                }
                .manage-btn{
                    width:28px;
                    height:28px;
                    font-size:14px;
                }
            }
        `;
        shadow.appendChild(style);
        const content = document.createElement('div');
        content.className = 'toolbar-content';
        searchEngines.filter(e => e.visible).forEach(engine => {
            const a = document.createElement('a');
            a.textContent = engine.name;
            a.href = engine.url.replace('%keywords%', rawQuery);
            a.target = '_blank';
            if (currentEngine && engine.id === currentEngine.id) a.classList.add('active');
            a.onclick = e => { e.preventDefault(); window.open(a.href, '_blank'); };
            content.appendChild(a);
        });
        const sep = document.createElement('div');
        sep.className = 'separator';
        content.appendChild(sep);

        // 纯文本齿轮图标按钮
        const btn = document.createElement('div');
        btn.className = 'manage-btn';
        btn.textContent = '⚙️';
        btn.title = '管理搜索引擎';
        btn.onclick = showManager;
        content.appendChild(btn);

        shadow.appendChild(content);
        document.body.appendChild(toolbarHost);
        document.body.style.paddingBottom = '55px';
        lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        window.addEventListener('scroll', handleScroll, { passive: true });
    }
    const info = getCurrentInfo();
    if (info) createToolbar(info);
})();