// ==UserScript==
// @name         自动-点击隐藏
// @namespace    http://tampermonkey.net
// @version      6.5
// @description  链接自动跳转不拦截+每条单独提示+顺序执行+延时可调+域名通配编辑
// @author       You
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// ==/UserScript==
(function() {
    'use strict';
    const STORAGE_KEY = 'auto_click_records';
    const DELAY_STORAGE_KEY = 'auto_click_delay';
    let isRecording = false;
    let currentRecords = {};
    let pageDelays = {};
    let toastInstance = null;
    let toolbarInstance = null;
    let stopRecordBtnInstance = null;
    let highlightBox = null;
    let lastHighlightElement = null;

    // 高亮框
    function createHighlightBox() {
        if (highlightBox) return;
        highlightBox = document.createElement('div');
        highlightBox.style.cssText = `
            position: absolute;
            border: 2px solid #ff4d4d;
            background: rgba(255,77,77,0.15);
            pointer-events: none;
            z-index: 9999999;
            display: none;
            transition: all 0.1s ease;
        `;
        document.body.appendChild(highlightBox);
    }
    function startHighlightFollow() {
        if (!isRecording) return;
        createHighlightBox();
        document.addEventListener('mousemove', highlightHandler);
    }
    function stopHighlightFollow() {
        document.removeEventListener('mousemove', highlightHandler);
        if (highlightBox) highlightBox.style.display = 'none';
        lastHighlightElement = null;
    }
    function highlightHandler(e) {
        if (!isRecording) return;
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el === lastHighlightElement) return;
        lastHighlightElement = el;
        if (!isClickableElement(el)) {
            highlightBox.style.display = 'none';
            return;
        }
        const rect = el.getBoundingClientRect();
        highlightBox.style.left = rect.left + window.scrollX + 'px';
        highlightBox.style.top = rect.top + window.scrollY + 'px';
        highlightBox.style.width = rect.width + 'px';
        highlightBox.style.height = rect.height + 'px';
        highlightBox.style.display = 'block';
    }

    // 初始化
    function init() {
        currentRecords = JSON.parse(GM_getValue(STORAGE_KEY, '{}'));
        pageDelays = JSON.parse(GM_getValue(DELAY_STORAGE_KEY, '{}'));
        GM_registerMenuCommand('📝打开控制面板', openControlPanel);
        executeAutoAction();
    }

    // 打开面板
    function openControlPanel() {
        if (toolbarInstance) {
            toolbarInstance.style.display = 'flex';
            showToast('⚙️ 控制面板已显示');
            return;
        }
        createToolbar();
        showToast('⚙️ 控制面板已打开');
    }

    // 工具栏
    function createToolbar() {
        if (toolbarInstance) toolbarInstance.remove();
        const toolbar = document.createElement('div');
        toolbarInstance = toolbar;
        toolbar.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 999999;
            background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            padding: 8px; display: flex; gap: 8px; align-items: center;
            opacity: 0.95; transition: opacity 0.3s; cursor: move;
        `;
        makeDraggable(toolbar);
        const btnRecord = document.createElement('button');
        btnRecord.innerHTML = '📝 开始记录';
        btnRecord.style.cssText = 'padding:6px 12px;border:none;border-radius:4px;background:#409eff;color:white;cursor:pointer;font-size:12px;';
        btnRecord.addEventListener('click', startRecording);
        toolbar.appendChild(btnRecord);
        const btnView = document.createElement('button');
        btnView.innerHTML = '📋 查看记录';
        btnView.style.cssText = 'padding:6px 12px;border:none;border-radius:4px;background:#67c23a;color:white;cursor:pointer;font-size:12px;';
        btnView.addEventListener('click', showAllRecords);
        toolbar.appendChild(btnView);
        const btnHide = document.createElement('button');
        btnHide.innerHTML = '×';
        btnHide.style.cssText = 'width:24px;height:24px;border:none;border-radius:4px;background:#909399;color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;';
        btnHide.addEventListener('click', () => { toolbar.style.display = 'none'; showToast('面板已隐藏'); });
        toolbar.appendChild(btnHide);
        document.body.appendChild(toolbar);
        const tip = document.createElement('div');
        tip.id = 'auto-click-recording-tip';
        tip.style.cssText = `
            position: fixed; bottom:20px; left:20px; z-index:999999;
            background:rgba(255,77,77,0.9); color:white; padding:10px 16px; border-radius:4px;
            font-size:14px; display:none; box-shadow:0 2px 8px rgba(0,0,0,0.2); pointer-events:none;
        `;
        tip.innerHTML = '🔴 正在记录 - 点击目标，选择【点击】或【隐藏】';
        document.body.appendChild(tip);
    }

    // 停止按钮
    function createStopRecordBtn() {
        if (stopRecordBtnInstance) stopRecordBtnInstance.remove();
        stopRecordBtnInstance = document.createElement('button');
        stopRecordBtnInstance.id = 'auto-click-stop-record-btn';
        stopRecordBtnInstance.innerHTML = '🛑 停止记录';
        stopRecordBtnInstance.style.cssText = `
            position: fixed; top:20px; left:20px; z-index:999999;
            padding:10px 20px; border:none; border-radius:8px; background:#ff4d4d; color:white;
            font-size:14px; box-shadow:0 4px 12px rgba(0,0,0,0.2); opacity:0.95; transition:all 0.2s;
        `;
        stopRecordBtnInstance.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); stopRecording(); });
        makeDraggable(stopRecordBtnInstance);
        document.body.appendChild(stopRecordBtnInstance);
    }

    // 拖拽
    function makeDraggable(el) {
        let p1=0,p2=0,p3=0,p4=0;
        el.onmousedown = e => {
            e.preventDefault(); p3 = e.clientX; p4 = e.clientY;
            document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
            document.onmousemove = e => {
                e.preventDefault(); p1 = p3 - e.clientX; p2 = p4 - e.clientY; p3 = e.clientX; p4 = e.clientY;
                el.style.top = (el.offsetTop - p2) + 'px'; el.style.left = (el.offsetLeft - p1) + 'px';
            };
        };
    }

    // 开始记录
    function startRecording() {
        if (isRecording) return;
        isRecording = true;
        if (toolbarInstance) toolbarInstance.style.display = 'none';
        createStopRecordBtn();
        document.getElementById('auto-click-recording-tip').style.display = 'block';
        document.addEventListener('click', recordClickHandler, true);
        startHighlightFollow();
        showToast('✅ 开始记录');
    }

    // 停止记录
    function stopRecording() {
        if (!isRecording) return;
        isRecording = false;
        if (stopRecordBtnInstance) { stopRecordBtnInstance.remove(); stopRecordBtnInstance = null; }
        document.getElementById('auto-click-recording-tip').style.display = 'none';
        document.removeEventListener('click', recordClickHandler, true);
        stopHighlightFollow();
        if (toolbarInstance) toolbarInstance.style.display = 'flex'; else createToolbar();
        showToast('🛑 已停止记录');
    }

    // 记录点击
    function recordClickHandler(e) {
        if (e.target.closest('#auto-click-stop-record-btn')) return;
        e.preventDefault(); e.stopPropagation();
        const target = e.target;
        if (!isClickableElement(target)) { showToast('❌ 不可点击，跳过'); return; }
        const selector = generateUniqueSelector(target);
        if (!selector) { showToast('❌ 无法生成选择器'); return; }
        const pageKey = getPageKey();
        const action = confirm('选择操作：\n确定=自动点击\n取消=自动隐藏') ? 'click' : 'hide';
        if (!currentRecords[pageKey]) currentRecords[pageKey] = [];
        const exists = currentRecords[pageKey].some(item => item.selector === selector);
        if (exists) { showToast('⚠️ 已记录'); return; }
        currentRecords[pageKey].push({ selector, action });
        GM_setValue(STORAGE_KEY, JSON.stringify(currentRecords));
        showToast(`✅ 已记录：${action === 'click' ? '【点击】' : '【隐藏】'}`);
    }

    // 可点击判断
    function isClickableElement(el) {
        const tags = ['BUTTON','A','INPUT','SELECT','TEXTAREA','LABEL'];
        const inputTypes = ['button','submit','reset','checkbox','radio','image'];
        if (tags.includes(el.tagName)) {
            if (el.tagName === 'INPUT') return inputTypes.includes(el.type);
            return true;
        }
        const style = getComputedStyle(el);
        return style.cursor === 'pointer' && (el.onclick || el.getAttribute('onclick') || style.pointerEvents !== 'none');
    }

    // 单条提示
    function showToast(msg) {
        if (toastInstance) toastInstance.remove();
        toastInstance = document.createElement('div');
        toastInstance.style.cssText = `
            position: fixed; top:80px; left:50%; transform:translateX(-50%); z-index:999999;
            background:rgba(50,50,50,0.9); color:white; padding:8px 16px; border-radius:4px;
            font-size:14px; box-shadow:0 2px 10px rgba(0,0,0,0.3); transition:all 0.3s; pointer-events:none;
        `;
        toastInstance.textContent = msg;
        document.body.appendChild(toastInstance);
        setTimeout(() => {
            toastInstance.style.opacity = '0';
            setTimeout(() => { toastInstance.remove(); toastInstance = null; }, 300);
        }, 1800);
    }

    // 设置延时
    function setPageDelay(pageKey) {
        const current = pageDelays[pageKey] || 0;
        const res = prompt(`设置【${pageKey}】执行间隔（毫秒）\n1000 = 1秒`, current);
        if (res === null) return;
        const ms = parseInt(res) || 0;
        pageDelays[pageKey] = ms;
        GM_setValue(DELAY_STORAGE_KEY, JSON.stringify(pageDelays));
        showToast(`✅ 已设置间隔：${ms}ms`);
        showAllRecords();
    }

    // 路径规则
    function getPageKey() {
        let url = window.location.href;
        url = url.replace(/\/$/, '');
        const queryMatch = url.match(/^(.*\?[^&=]+)/);
        if (queryMatch) return queryMatch[1] + '*';
        const hashMatch = url.match(/^(.*#\w+)\..*/);
        if (hashMatch) return hashMatch[1] + '.*';
        return url;
    }

    // 选择器生成
    function generateUniqueSelector(el) {
        if (el.id) return '#' + el.id;
        let sel = '';
        let cur = el;
        while (cur && cur.tagName !== 'HTML') {
            const tag = cur.tagName.toLowerCase();
            const cls = cur.className ? '.' + cur.className.trim().replace(/\s+/g, '.') : '';
            let nth = '';
            const sibs = Array.from(cur.parentElement.children);
            const same = sibs.filter(s => s.tagName === cur.tagName);
            if (same.length > 1) nth = `:nth-child(${same.indexOf(cur)+1})`;
            sel = tag + cls + nth + (sel ? ' > ' + sel : '');
            if (document.querySelectorAll(sel).length === 1) return sel;
            cur = cur.parentElement;
        }
        return sel || null;
    }

    // ====================== ✅ 新增：修改页面Key（域名通配） ======================
    function renamePageKey(oldKey) {
        const newKey = prompt('修改页面匹配规则（支持*通配）', oldKey);
        if (!newKey || newKey === oldKey) return;

        // 转移记录
        if (currentRecords[oldKey]) {
            currentRecords[newKey] = currentRecords[oldKey];
            delete currentRecords[oldKey];
        }
        // 转移延时
        if (pageDelays[oldKey] !== undefined) {
            pageDelays[newKey] = pageDelays[oldKey];
            delete pageDelays[oldKey];
        }

        GM_setValue(STORAGE_KEY, JSON.stringify(currentRecords));
        GM_setValue(DELAY_STORAGE_KEY, JSON.stringify(pageDelays));
        showToast('✅ 已修改匹配规则：' + newKey);
        showAllRecords();
    }

    // ====================== ✅ 终极修复：链接永不拦截 ======================
    async function executeAutoAction() {
        const pageKey = getPageKey();
        const delay = pageDelays[pageKey] || 0;

        // 支持通配匹配
        let matchedList = null;
        let matchedKey = null;

        for (const key in currentRecords) {
            if (wildcardMatch(pageKey, key)) {
                matchedList = currentRecords[key];
                matchedKey = key;
                break;
            }
        }
        if (!matchedList) return;

        await new Promise(r => setTimeout(r, 1000));
        for (let i = 0; i < matchedList.length; i++) {
            const item = matchedList[i];
            const index = i + 1;
            let success = false;
            try {
                const elements = document.querySelectorAll(item.selector);
                if (!elements || elements.length === 0) {
                    showToast(`⏭️ 第 ${index} 条 已跳过`);
                    await sleep(delay);
                    continue;
                }
                elements.forEach(el => {
                    if (!el.isConnected) return;
                    if (item.action === 'click') {
                        if (el.tagName === 'A' && el.href) {
                            window.location.href = el.href;
                        }
                        else if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) {
                            el.checked = true;
                        } else if (el.tagName === 'SELECT') {
                            el.selectedIndex = 0;
                        } else {
                            el.click();
                        }
                    } else if (item.action === 'hide') {
                        el.style.display = 'none';
                        el.style.visibility = 'hidden';
                        el.style.opacity = '0';
                    }
                });
                success = true;
            } catch (e) {}
            if (success) {
                showToast(`✅ 第 ${index} 条 执行成功`);
            } else {
                showToast(`⏭️ 第 ${index} 条 已跳过`);
            }
            if (i < matchedList.length - 1 && delay > 0) {
                await sleep(delay);
            }
        }
    }

    // 通配符匹配 *
    function wildcardMatch(str, rule) {
        const escaped = rule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        return new RegExp(`^${escaped}$`).test(str);
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // 清空路径
    function clearCurrentPageRecords(pageKey) {
        if (currentRecords[pageKey]) {
            delete currentRecords[pageKey];
            GM_setValue(STORAGE_KEY, JSON.stringify(currentRecords));
            showToast('🗑️ 已清空该路径');
            showAllRecords();
        }
    }

    // 删除单条
    function deleteSingleRecord(pageKey, selector) {
        if (!currentRecords[pageKey]) return;
        currentRecords[pageKey] = currentRecords[pageKey].filter(x => x.selector !== selector);
        if (currentRecords[pageKey].length === 0) delete currentRecords[pageKey];
        GM_setValue(STORAGE_KEY, JSON.stringify(currentRecords));
        showToast('🗑️ 已删除');
        showAllRecords();
    }

    // 调序
    function moveRecord(pageKey, selector, direction) {
        const list = currentRecords[pageKey];
        if (!list || list.length < 2) return;
        const index = list.findIndex(x => x.selector === selector);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === list.length - 1) return;
        const target = direction === 'up' ? index - 1 : index + 1;
        [list[index], list[target]] = [list[target], list[index]];
        GM_setValue(STORAGE_KEY, JSON.stringify(currentRecords));
        showToast(`✔️ 已${direction === 'up' ? '上移' : '下移'}`);
        showAllRecords();
    }

    // 记录列表（新增点击域名修改）
    function showAllRecords() {
        const old = document.getElementById('auto-click-records-modal');
        if (old) old.remove();
        if (Object.keys(currentRecords).length === 0) { showToast('📋 暂无记录'); return; }
        const modal = document.createElement('div');
        modal.id = 'auto-click-records-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:999999;display:flex;align-items:center;justify-content:center;';
        const box = document.createElement('div');
        box.style.cssText = 'background:white;border-radius:8px;width:80%;max-width:900px;max-height:80%;padding:20px;overflow:auto;box-shadow:0 4px 20px rgba(0,0,0,0.2);';
        const head = document.createElement('div');
        head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #eee;';
        head.innerHTML = '<h3 style="margin:0;">📋 顺序执行记录</h3>';
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = 'width:32px;height:32px;border:none;border-radius:4px;background:#f56c6c;color:white;cursor:pointer;';
        closeBtn.addEventListener('click', () => modal.remove());
        head.appendChild(closeBtn);
        box.appendChild(head);
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
        Object.entries(currentRecords).forEach(([pageKey, items]) => {
            const group = document.createElement('div');
            group.style.cssText = 'padding:12px;border:1px solid #eee;border-radius:6px;background:#f9f9f9;';
            const title = document.createElement('div');
            title.style.cssText = 'font-weight:bold;margin-bottom:8px;display:flex;justify-content:space-between;gap:6px;';

            // ========== 域名可点击修改 ==========
            const left = document.createElement('span');
            left.textContent = `🔗 ${pageKey} (间隔:${pageDelays[pageKey]||0}ms)`;
            left.style.cursor = 'pointer';
            left.style.color = '#409eff';
            left.title = '点击可修改匹配规则（支持*通配）';
            left.addEventListener('click', () => renamePageKey(pageKey));

            const btnGroup = document.createElement('div');
            btnGroup.style.display = 'flex';
            btnGroup.style.gap = '4px';
            const btnDelay = document.createElement('button');
            btnDelay.textContent = '⏱️延时';
            btnDelay.style.cssText = 'padding:2px 6px;border:none;border-radius:3px;background:#9062f0;color:white;cursor:pointer;font-size:12px;';
            btnDelay.addEventListener('click', () => setPageDelay(pageKey));
            const btnClear = document.createElement('button');
            btnClear.textContent = '清空该路径';
            btnClear.style.cssText = 'padding:2px 6px;border:none;border-radius:3px;background:#f56c6c;color:white;cursor:pointer;font-size:12px;';
            btnClear.addEventListener('click', () => {
                if(confirm('确定清空？')) clearCurrentPageRecords(pageKey);
            });
            btnGroup.appendChild(btnDelay);
            btnGroup.appendChild(btnClear);
            title.appendChild(left);
            title.appendChild(btnGroup);
            group.appendChild(title);
            const ul = document.createElement('ul');
            ul.style.cssText = 'margin:0;padding:0;list-style:none;';
            items.forEach((item, i) => {
                const li = document.createElement('li');
                li.style.cssText = 'padding:6px 0;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;font-family:monospace;font-size:12px;';
                const info = document.createElement('span');
                info.style.width = '70%';
                info.textContent = `${i+1}. ${item.action === 'click' ? '🔵【点击】' : '🟡【隐藏】'} ${item.selector}`;
                const btns = document.createElement('div');
                btns.style.display = 'flex';
                btns.style.gap = '4px';
                const up = document.createElement('button');
                up.textContent = '↑';
                up.style.cssText = 'width:22px;height:22px;border:none;border-radius:3px;background:#409eff;color:white;cursor:pointer;';
                up.addEventListener('click', () => moveRecord(pageKey, item.selector, 'up'));
                const down = document.createElement('button');
                down.textContent = '↓';
                down.style.cssText = 'width:22px;height:22px;border:none;border-radius:3px;background:#409eff;color:white;cursor:pointer;';
                down.addEventListener('click', () => moveRecord(pageKey, item.selector, 'down'));
                const del = document.createElement('button');
                del.textContent = '删';
                del.style.cssText = 'width:28px;height:22px;border:none;border-radius:3px;background:#ff4d4d;color:white;cursor:pointer;';
                del.addEventListener('click', () => { if (confirm('确定删除？')) deleteSingleRecord(pageKey, item.selector); });
                btns.append(up, down, del);
                li.append(info, btns);
                ul.appendChild(li);
            });
            group.appendChild(ul);
            wrap.appendChild(group);
        });
        box.appendChild(wrap);
        modal.appendChild(box);
        document.body.appendChild(modal);
    }

    window.addEventListener('load', init);
})();