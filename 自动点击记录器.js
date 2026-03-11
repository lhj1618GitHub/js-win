// ==UserScript==
// @name         自动点击记录器
// @namespace    http://tampermonkey.net/
// @version      4.2
// @description  记录网页可点击元素，下次访问自动点击
// @author       You
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // 存储键名常量
    const STORAGE_KEY = 'auto_click_records';
    // 记录模式状态
    let isRecording = false;
    // 已记录的元素选择器
    let currentRecords = {};
    // Toast 提示实例
    let toastInstance = null;
    // 工具栏实例
    let toolbarInstance = null;
    // 记录状态专用停止按钮
    let stopRecordBtnInstance = null;

    /**
     * 初始化 - 加载存储的记录 + 注册唯一菜单
     */
    function init() {
        // 从本地存储加载记录
        const savedRecords = GM_getValue(STORAGE_KEY, '{}');
        currentRecords = JSON.parse(savedRecords);
        
        // 仅保留一个菜单项：打开控制面板
        GM_registerMenuCommand('📝 自动点击记录器 - 打开控制面板', openControlPanel);

        // 检查当前页面是否有自动点击记录
        executeAutoClick();
    }

    /**
     * 打开控制面板（唯一入口）
     */
    function openControlPanel() {
        // 如果已有工具栏则显示
        if (toolbarInstance) {
            toolbarInstance.style.display = 'flex';
            showToast('⚙️ 控制面板已显示');
            return;
        }

        // 创建工具栏容器
        createToolbar();
        showToast('⚙️ 控制面板已打开');
    }

    /**
     * 创建常规工具栏（非记录状态）
     */
    function createToolbar() {
        // 如果已有工具栏先移除
        if (toolbarInstance) toolbarInstance.remove();
        
        // 创建工具栏容器
        const toolbar = document.createElement('div');
        toolbarInstance = toolbar;
        toolbar.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            padding: 8px;
            display: flex;
            gap: 8px;
            align-items: center;
            opacity: 0.95;
            transition: opacity 0.3s;
            cursor: move;
        `;
        toolbar.title = '自动点击记录器 - 可拖拽移动位置';
        
        // 鼠标悬浮增强可见性
        toolbar.addEventListener('mouseenter', () => {
            toolbar.style.opacity = '1';
        });
        toolbar.addEventListener('mouseleave', () => {
            toolbar.style.opacity = '0.95';
        });

        // 使工具栏可拖拽
        makeDraggable(toolbar);

        // 1. 记录状态按钮（非记录状态显示开始记录）
        const recordBtn = document.createElement('button');
        recordBtn.id = 'auto-click-record-btn';
        recordBtn.innerHTML = '📝 开始记录';
        recordBtn.style.cssText = `
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            background: #409eff;
            color: white;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
        `;
        recordBtn.addEventListener('click', startRecording);
        toolbar.appendChild(recordBtn);

        // 2. 查看记录按钮
        const viewBtn = document.createElement('button');
        viewBtn.innerHTML = '📋 查看记录';
        viewBtn.style.cssText = `
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            background: #67c23a;
            color: white;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
        `;
        viewBtn.addEventListener('click', showAllRecords);
        toolbar.appendChild(viewBtn);

        // 3. 清空当前记录按钮
        const clearBtn = document.createElement('button');
        clearBtn.innerHTML = '🗑️ 清空当前';
        clearBtn.style.cssText = `
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            background: #f56c6c;
            color: white;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
        `;
        clearBtn.addEventListener('click', clearCurrentPageRecords);
        toolbar.appendChild(clearBtn);

        // 4. 隐藏按钮（替代关闭，仅隐藏不删除）
        const hideBtn = document.createElement('button');
        hideBtn.innerHTML = '×';
        hideBtn.style.cssText = `
            width: 24px;
            height: 24px;
            border: none;
            border-radius: 4px;
            background: #909399;
            color: white;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
        `;
        hideBtn.title = '隐藏控制面板（可通过脚本菜单重新打开）';
        hideBtn.addEventListener('click', () => {
            toolbar.style.display = 'none';
            showToast('⚙️ 控制面板已隐藏（可从脚本菜单重新打开）');
        });
        toolbar.appendChild(hideBtn);

        // 添加到页面
        document.body.appendChild(toolbar);

        // 记录模式状态提示
        const statusTip = document.createElement('div');
        statusTip.id = 'auto-click-recording-tip';
        statusTip.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 999999;
            background: rgba(255, 77, 77, 0.9);
            color: white;
            padding: 10px 16px;
            border-radius: 4px;
            font-size: 14px;
            display: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            pointer-events: none;
        `;
        statusTip.innerHTML = '🔴 正在记录 - 点击需要记录的元素<br/>支持：按钮/链接/复选框/下拉框等可交互元素';
        document.body.appendChild(statusTip);
    }

    /**
     * 创建记录状态专用停止按钮
     */
    function createStopRecordBtn() {
        // 移除旧的停止按钮
        if (stopRecordBtnInstance) stopRecordBtnInstance.remove();
        
        // 创建专用停止按钮
        stopRecordBtnInstance = document.createElement('button');
        stopRecordBtnInstance.id = 'auto-click-stop-record-btn';
        stopRecordBtnInstance.innerHTML = '🛑 停止记录';
        stopRecordBtnInstance.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 999999;
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            background: #ff4d4d;
            color: white;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            opacity: 0.95;
            transition: all 0.2s;
            pointer-events: auto;
        `;
        stopRecordBtnInstance.title = '点击停止记录模式';
        
        // 悬浮效果
        stopRecordBtnInstance.addEventListener('mouseenter', () => {
            stopRecordBtnInstance.style.opacity = '1';
            stopRecordBtnInstance.style.transform = 'scale(1.05)';
        });
        stopRecordBtnInstance.addEventListener('mouseleave', () => {
            stopRecordBtnInstance.style.opacity = '0.95';
            stopRecordBtnInstance.style.transform = 'scale(1)';
        });
        
        // 点击停止记录
        stopRecordBtnInstance.addEventListener('click', (e) => {
            // 阻止事件冒泡，避免被记录逻辑捕获
            e.stopPropagation();
            e.preventDefault();
            stopRecording();
        });
        
        // 使停止按钮可拖拽
        makeDraggable(stopRecordBtnInstance);
        
        document.body.appendChild(stopRecordBtnInstance);
    }

    /**
     * 使元素可拖拽
     */
    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        element.onmousedown = dragMouseDown;
        
        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // 获取鼠标初始位置
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            // 当鼠标移动时执行拖拽
            document.onmousemove = elementDrag;
        }
        
        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // 计算新位置
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // 设置元素新位置
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }
        
        function closeDragElement() {
            // 停止移动
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    /**
     * 开始记录
     */
    function startRecording() {
        if (isRecording) return;
        
        isRecording = true;
        
        // 隐藏常规工具栏
        if (toolbarInstance) {
            toolbarInstance.style.display = 'none';
        }
        
        // 创建记录状态专用停止按钮
        createStopRecordBtn();
        
        // 显示记录提示
        document.getElementById('auto-click-recording-tip').style.display = 'block';
        
        // 添加全局点击监听（使用捕获阶段，但排除停止按钮）
        document.addEventListener('click', recordClickHandler, true);
        
        showToast('✅ 开始记录 - 支持按钮/链接/复选框/下拉框等元素');
    }

    /**
     * 停止记录
     */
    function stopRecording() {
        if (!isRecording) return;
        
        isRecording = false;
        
        // 移除专用停止按钮
        if (stopRecordBtnInstance) {
            stopRecordBtnInstance.remove();
            stopRecordBtnInstance = null;
        }
        
        // 隐藏记录提示
        document.getElementById('auto-click-recording-tip').style.display = 'none';
        
        // 移除点击监听
        document.removeEventListener('click', recordClickHandler, true);
        
        // 恢复显示常规工具栏
        if (toolbarInstance) {
            toolbarInstance.style.display = 'flex';
        } else {
            createToolbar();
        }
        
        showToast('🛑 已停止记录');
    }

    /**
     * 记录点击的元素（排除停止按钮）
     */
    function recordClickHandler(e) {
        // 排除停止按钮的点击
        if (e.target.id === 'auto-click-stop-record-btn' || 
            e.target.closest('#auto-click-stop-record-btn')) {
            return;
        }

        // 阻止默认行为（避免误操作）
        e.preventDefault();
        e.stopPropagation();

        const target = e.target;
        
        // 验证是否为可点击元素
        if (!isClickableElement(target)) {
            showToast('❌ 该元素不可点击，跳过记录');
            return;
        }

        const pageKey = getPageKey();

        // 生成元素的唯一选择器
        const selector = generateUniqueSelector(target);
        if (!selector) {
            showToast('❌ 无法生成该元素的唯一选择器');
            return;
        }

        // 初始化当前页面的记录
        if (!currentRecords[pageKey]) {
            currentRecords[pageKey] = [];
        }

        // 避免重复记录
        if (!currentRecords[pageKey].includes(selector)) {
            currentRecords[pageKey].push(selector);
            // 保存到本地存储
            GM_setValue(STORAGE_KEY, JSON.stringify(currentRecords));
            showToast(`✅ 已记录元素 (${currentRecords[pageKey].length}个)`);
        } else {
            showToast('⚠️ 该元素已被记录');
        }
    }

    /**
     * 完善的可点击元素判断
     */
    function isClickableElement(element) {
        // 基础可点击元素标签
        const clickableTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL'];
        // 可点击input类型
        const clickableInputTypes = ['button', 'submit', 'reset', 'checkbox', 'radio', 'image'];
        
        // 判断标签类型
        if (clickableTags.includes(element.tagName)) {
            // 特殊处理input
            if (element.tagName === 'INPUT') {
                return clickableInputTypes.includes(element.type);
            }
            return true;
        }
        
        // 判断是否有点击事件绑定
        const computedStyle = window.getComputedStyle(element);
        const hasClickCursor = computedStyle.cursor === 'pointer';
        const hasClickHandler = element.onclick !== null || 
                               (element.getAttribute('onclick') !== null) ||
                               computedStyle.getPropertyValue('pointer-events') !== 'none';
        
        // 自定义可点击元素（有指针样式或点击事件）
        return hasClickCursor && hasClickHandler;
    }

    /**
     * 显示 Toast 提示
     */
    function showToast(message) {
        // 移除旧的 Toast
        if (toastInstance) {
            toastInstance.remove();
        }

        // 创建新 Toast
        toastInstance = document.createElement('div');
        toastInstance.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 999999;
            background: rgba(50, 50, 50, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            transition: opacity 0.3s, transform 0.3s;
            pointer-events: none;
        `;
        toastInstance.textContent = message;
        document.body.appendChild(toastInstance);

        // 3 秒后自动消失
        setTimeout(() => {
            toastInstance.style.opacity = '0';
            toastInstance.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(() => {
                toastInstance.remove();
                toastInstance = null;
            }, 300);
        }, 3000);
    }

    /**
     * 【核心修改】简化网址匹配条件 - 仅保留域名作为页面标识
     * 例如：zhuanlan.zhihu.com/p/2013766583374333496 → zhuanlan.zhihu.com/
     */
    function getPageKey() {
        // 仅获取域名，去掉所有路径和参数
        const { hostname } = window.location;
        // 返回 域名/ 格式，保持统一
        return `${hostname}/`;
    }

    /**
     * 生成元素的唯一选择器
     */
    function generateUniqueSelector(element) {
        if (element.id) {
            return `#${element.id}`;
        }

        let selector = '';
        let current = element;
        while (current && current.tagName !== 'HTML') {
            let tagName = current.tagName.toLowerCase();
            let className = current.className ? '.' + current.className.trim().replace(/\s+/g, '.') : '';
            let nthChild = '';

            // 计算当前元素在父元素中的位置
            const siblings = Array.from(current.parentElement.children);
            const sameTagSiblings = siblings.filter(s => s.tagName === current.tagName);
            if (sameTagSiblings.length > 1) {
                const index = sameTagSiblings.indexOf(current) + 1;
                nthChild = `:nth-child(${index})`;
            }

            // 拼接选择器片段
            const segment = `${tagName}${className}${nthChild}`;
            selector = segment + (selector ? ' > ' + selector : '');

            // 测试选择器是否唯一
            const testSelector = selector;
            if (document.querySelectorAll(testSelector).length === 1) {
                return testSelector;
            }

            current = current.parentElement;
        }

        return selector || null;
    }

    /**
     * 执行自动点击
     */
    function executeAutoClick() {
        const pageKey = getPageKey();
        const pageRecords = currentRecords[pageKey];

        if (!pageRecords || pageRecords.length === 0) {
            return;
        }

        // 延迟执行（等待页面完全加载）
        setTimeout(() => {
            let clickCount = 0;
            pageRecords.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        // 模拟真实点击（触发所有事件）
                        elements.forEach(el => {
                            if (el.isConnected && !el.disabled) {
                                // 针对不同元素类型执行对应操作
                                if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) {
                                    el.checked = true;
                                } else if (el.tagName === 'SELECT') {
                                    el.selectedIndex = 0; // 默认选中第一个选项
                                } else {
                                    el.click();
                                }
                                clickCount++;
                                console.log(`🤖 自动操作元素：${selector}`);
                            }
                        });
                    } else {
                        console.warn(`🤖 未找到元素：${selector}`);
                    }
                } catch (error) {
                    console.error(`🤖 操作元素失败 ${selector}：`, error);
                }
            });
            
            if (clickCount > 0) {
                showToast(`🤖 自动操作 ${clickCount} 个元素`);
            }
        }, 1000);
    }

    /**
     * 清空当前页面的记录
     */
    function clearCurrentPageRecords() {
        const pageKey = getPageKey();
        if (currentRecords[pageKey]) {
            delete currentRecords[pageKey];
            GM_setValue(STORAGE_KEY, JSON.stringify(currentRecords));
            showToast(`🗑️ 已清空【${pageKey}】的所有记录`);
        } else {
            showToast('⚠️ 当前域名暂无记录');
        }
    }

    /**
     * 删除单个记录元素
     */
    function deleteSingleRecord(pageKey, selector) {
        if (currentRecords[pageKey]) {
            currentRecords[pageKey] = currentRecords[pageKey].filter(item => item !== selector);
            // 如果该页面无记录则删除整个键
            if (currentRecords[pageKey].length === 0) {
                delete currentRecords[pageKey];
            }
            GM_setValue(STORAGE_KEY, JSON.stringify(currentRecords));
            showToast(`🗑️ 已删除元素：${selector}`);
            // 重新加载记录查看界面
            showAllRecords();
        }
    }

    /**
     * 查看所有记录（支持删除单个元素）
     */
    function showAllRecords() {
        // 移除旧的弹窗
        const oldModal = document.getElementById('auto-click-records-modal');
        if (oldModal) oldModal.remove();

        if (Object.keys(currentRecords).length === 0) {
            showToast('📋 暂无任何记录');
            return;
        }

        // 创建记录查看弹窗
        const modal = document.createElement('div');
        modal.id = 'auto-click-records-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 8px;
            width: 80%;
            max-width: 900px;
            max-height: 80%;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            overflow: auto;
        `;

        const modalHeader = document.createElement('div');
        modalHeader.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #eee;
        `;
        modalHeader.innerHTML = `<h3 style="margin:0; color:#333;">📋 所有自动点击记录（按域名分组）</h3>`;

        const closeModalBtn = document.createElement('button');
        closeModalBtn.innerHTML = '×';
        closeModalBtn.style.cssText = `
            width: 32px;
            height: 32px;
            border: none;
            border-radius: 4px;
            background: #f56c6c;
            color: white;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
        `;
        closeModalBtn.addEventListener('click', () => modal.remove());
        modalHeader.appendChild(closeModalBtn);
        modalContent.appendChild(modalHeader);

        // 构建记录列表（支持删除单个元素）
        const recordsContainer = document.createElement('div');
        recordsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 12px;
        `;

        Object.entries(currentRecords).forEach(([pageKey, selectors]) => {
            // 页面分组容器
            const pageGroup = document.createElement('div');
            pageGroup.style.cssText = `
                padding: 12px;
                border: 1px solid #eee;
                border-radius: 6px;
                background: #f9f9f9;
            `;

            // 页面标题（显示简化后的域名）
            const pageTitle = document.createElement('div');
            pageTitle.style.cssText = `
                font-weight: bold;
                color: #333;
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            pageTitle.innerHTML = `
                <span>🔗 ${pageKey}</span>
                <button class="clear-page-btn" data-page="${pageKey}" style="
                    padding: 2px 8px;
                    border: none;
                    border-radius: 3px;
                    background: #f56c6c;
                    color: white;
                    cursor: pointer;
                    font-size: 12px;
                ">清空该域名</button>
            `;
            pageGroup.appendChild(pageTitle);

            // 元素列表
            const selectorsList = document.createElement('ul');
            selectorsList.style.cssText = `
                margin: 0;
                padding-left: 20px;
                list-style: none;
            `;

            selectors.forEach((selector, i) => {
                const listItem = document.createElement('li');
                listItem.style.cssText = `
                    padding: 6px 0;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-family: monospace;
                    font-size: 12px;
                `;
                listItem.innerHTML = `
                    <span>${i + 1}. ${selector}</span>
                    <button class="delete-item-btn" data-page="${pageKey}" data-selector="${selector}" style="
                        padding: 2px 8px;
                        border: none;
                        border-radius: 3px;
                        background: #ff4d4d;
                        color: white;
                        cursor: pointer;
                        font-size: 12px;
                    ">删除</button>
                `;
                selectorsList.appendChild(listItem);
            });

            pageGroup.appendChild(selectorsList);
            recordsContainer.appendChild(pageGroup);
        });

        modalContent.appendChild(recordsContainer);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // 绑定删除单个元素事件
        document.querySelectorAll('.delete-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pageKey = e.target.dataset.page;
                const selector = e.target.dataset.selector;
                if (confirm(`确定要删除该元素记录吗？\n${selector}`)) {
                    deleteSingleRecord(pageKey, selector);
                }
            });
        });

        // 绑定清空域名记录事件
        document.querySelectorAll('.clear-page-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pageKey = e.target.dataset.page;
                if (confirm(`确定要清空【${pageKey}】的所有记录吗？`)) {
                    delete currentRecords[pageKey];
                    GM_setValue(STORAGE_KEY, JSON.stringify(currentRecords));
                    showToast(`🗑️ 已清空【${pageKey}】的记录`);
                    showAllRecords();
                }
            });
        });

        // 点击空白处关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // 初始化脚本
    window.addEventListener('load', init);
})();
