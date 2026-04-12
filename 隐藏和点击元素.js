// ==UserScript==
// @name            隐藏和点击元素
// @namespace       http://tampermonkey.net/
// @version         5.0
// @description     左键拾取、右键退出、点击标记、链接不拦截、单标签自动刷新、全局统一延时执行
// @match           *://*/*
// @grant           GM_setValue
// @grant           GM_getValue
// @grant           GM_registerMenuCommand
// @run-at          document-start
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'element_actions_v5';
    const DELAY_KEY   = 'global_action_delay';

    let ruleData      = JSON.parse(GM_getValue(STORAGE_KEY, '{}'));
    let currentHost   = location.hostname;
    let clickedElements = new Set();
    let globalDelay   = parseInt(GM_getValue(DELAY_KEY) || 1000);

    // 菜单
    GM_registerMenuCommand('🎯 拾取元素（左键记录·右键退出）', startPickMode);
    GM_registerMenuCommand('📋 管理所有规则（含全局延时）', manageAllRules);

    // ==============================================
    // 单标签页跳转自动重置
    // ==============================================
    function resetAndRun() {
        clickedElements = new Set();
        currentHost = location.hostname;
        setTimeout(runAllRules, globalDelay);
    }

    window.addEventListener('popstate', resetAndRun);
    window.addEventListener('pushstate', resetAndRun);
    window.addEventListener('replacestate', resetAndRun);
    window.addEventListener('hashchange', resetAndRun);
    window.addEventListener('load', resetAndRun);

    let oldBody = document.body;
    function watchBody() {
        if (document.body !== oldBody) {
            oldBody = document.body;
            resetAndRun();
        }
        setTimeout(watchBody, 300);
    }
    watchBody();

    // ==============================================
    // 点击标记 3 秒
    // ==============================================
    function showClickMark(el) {
        try {
            const rect = el.getBoundingClientRect();
            const mark = document.createElement('div');
            mark.style.cssText = `
                position:fixed;
                left:${rect.left + rect.width/2}px;
                top:${rect.top + rect.height/2}px;
                width:20px; height:20px;
                margin-left:-10px; margin-top:-10px;
                background:red; border-radius:50%;
                z-index:99999999; opacity:0.9;
                box-shadow:0 0 12px red;
            `;
            document.body.appendChild(mark);
            setTimeout(() => mark.remove(), 3000);
        } catch {}
    }

    // ==============================================
    // 安全点击（链接不拦截）
    // ==============================================
    function safeClick(el) {
        if (!el) return;
        try {
            if (el.tagName === 'A' && el.href) {
                window.location.href = el.href;
                return;
            }
            el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            el.click?.();
        } catch {}
    }

    // ==============================================
    // 执行所有规则（延时执行）
    // ==============================================
    function runAllRules() {
        for (const host in ruleData) {
            if (host !== currentHost) continue;
            (ruleData[host] || []).forEach(item => {
                document.querySelectorAll(item.sel).forEach(el => {
                    if (item.act === 'hide') {
                        el.style.display = 'none';
                        el.style.opacity = '0';
                        el.style.pointerEvents = 'none';
                    } else {
                        const key = `${host}_${item.sel}`;
                        if (!clickedElements.has(key)) {
                            clickedElements.add(key);
                            showClickMark(el);
                            safeClick(el);
                        }
                    }
                });
            });
        }
    }

    // ==============================================
    // ✅ 拾取模式【已彻底修复】
    // ==============================================
    function startPickMode() {
        const highlighter = document.createElement('div');
        highlighter.style.cssText = `
            position:fixed; border:2px solid #23aaff;
            background:rgba(35,170,255,0.12);
            pointer-events:none; z-index:99999999;
            border-radius:2px;
        `;
        document.body.appendChild(highlighter);

        let currentEl = null;

        // 跟随鼠标
        function onMouseMove(e) {
            currentEl = document.elementFromPoint(e.clientX, e.clientY);
            if (!currentEl) {
                highlighter.style.display = 'none';
                return;
            }
            const r = currentEl.getBoundingClientRect();
            highlighter.style.display = 'block';
            highlighter.style.left = r.left + 'px';
            highlighter.style.top = r.top + 'px';
            highlighter.style.width = r.width + 'px';
            highlighter.style.height = r.height + 'px';
        }

        // 左键：记录
        function onLeftClick(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            clean();

            const target = currentEl;
            if (!target) return;

            const selector = generateSelector(target);
            const action = confirm('选择操作：\n确定 = 自动点击\n取消 = 永久隐藏') ? 'click' : 'hide';

            if (!ruleData[currentHost]) ruleData[currentHost] = [];
            if (!ruleData[currentHost].some(x => x.sel === selector)) {
                ruleData[currentHost].push({ sel: selector, act: action });
                GM_setValue(STORAGE_KEY, JSON.stringify(ruleData));
            }
        }

        // 右键：退出
        function onRightClick(e) {
            e.preventDefault();
            clean();
        }

        function clean() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('click', onLeftClick, true);
            document.removeEventListener('contextmenu', onRightClick, true);
            highlighter.remove();
        }

        // 捕获模式绑定
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('click', onLeftClick, true);
        document.addEventListener('contextmenu', onRightClick, true);
    }

    // ==============================================
    // 生成选择器
    // ==============================================
    function generateSelector(el) {
        if (el.id) return `#${el.id}`;
        if (el.className && typeof el.className === 'string') {
            const cls = el.className.trim().split(/\s+/)[0];
            if (cls) return `.${cls}`;
        }
        return el.tagName.toLowerCase();
    }

    // ==============================================
    // 管理面板 + 全局延时设置
    // ==============================================
    function manageAllRules() {
        const old = document.getElementById('all-rule-panel');
        if (old) old.remove();

        const panel = document.createElement('div');
        panel.id = 'all-rule-panel';
        panel.style.cssText = `
            position:fixed; top:20px; right:20px;
            background:#fff; border-radius:10px;
            box-shadow:0 0 15px rgba(0,0,0,0.15);
            z-index:999999; width:380px; max-height:80vh;
            padding:16px; overflow-y:auto;
        `;

        let html = `
            <div style="font-weight:bold; margin-bottom:12px;">📋 全局规则管理</div>
            <div style="margin-bottom:10px;">
                <label>全局延时执行（毫秒）：</label>
                <input type="number" id="global-delay-input" value="${globalDelay}" style="width:100px; padding:4px;">
                <button id="save-delay" style="padding:4px 8px; margin-left:6px;">保存</button>
            </div>
            <hr style="margin:10px 0;">
        `;

        const hosts = Object.keys(ruleData);
        if (hosts.length === 0) {
            html += '<div style="color:#999;">暂无规则</div>';
        } else {
            hosts.forEach(host => {
                html += `<div style="font-size:13px; color:#666; margin:8px 0 4px;">🌐 ${host}</div>`;
                ruleData[host].forEach((item, i) => {
                    const t = item.act === 'click' ? '🖱️点击' : '🙈隐藏';
                    html += `
                    <div style="display:flex; justify-content:space-between; padding:6px 8px; background:#f7f8fa; border-radius:4px; margin-bottom:4px;">
                        <span style="font-size:12px;">${t} ${item.sel}</span>
                        <button class="del-btn" data-h="${host}" data-i="${i}" style="border:none; background:#ff5c5c; color:#fff; border-radius:3px; padding:2px 6px;">删除</button>
                    </div>`;
                });
            });
        }

        html += `<button id="close-all" style="width:100%; margin-top:12px; padding:8px; border:none; border-radius:6px; background:#f0f2f5;">关闭</button>`;
        panel.innerHTML = html;
        document.body.appendChild(panel);

        // 保存延时
        document.getElementById('save-delay').addEventListener('click', () => {
            globalDelay = parseInt(document.getElementById('global-delay-input').value) || 1000;
            GM_setValue(DELAY_KEY, globalDelay);
            alert('全局延时已保存：' + globalDelay + 'ms');
        });

        // 删除
        panel.querySelectorAll('.del-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const h = btn.dataset.h;
                const i = parseInt(btn.dataset.i);
                ruleData[h].splice(i, 1);
                if (ruleData[h].length === 0) delete ruleData[h];
                GM_setValue(STORAGE_KEY, JSON.stringify(ruleData));
                manageAllRules();
            });
        });

        document.getElementById('close-all').addEventListener('click', () => panel.remove());
    }
})();