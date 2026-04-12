// ==UserScript==
// @name               GKD快照坐标获取-按钮触发版
// @name:en-US         GKD Snapshot
// @version            12.0.0
// @author             lhj1618
// @license            MIT
// @match              https://i.gkd.li/*
// @grant              none
// @run-at             document-start
// ==/UserScript==
(function() {
    'use strict';
    let clickMode = false;
    let currentX = 0, currentY = 0;
    let currentCoord = '{ x: 0, y: 0, }';
    let coordBox = null;
    let lastMarker = null;
    let isProcessing = false;
    let mainToolbar = null;
    let isToolbarCreated = false; // 标记面板是否已创建

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            addCoordinateButton(); // 先加载获取坐标按钮
        });
    } else {
        addCoordinateButton();
    }

    // ====================== 按钮创建（来自000） ======================
    function addCoordinateButton() {
        const isSnapshotPage = window.location.hostname === 'i.gkd.li' &&
                              (window.location.pathname.includes('/snapshot/') || window.location.pathname.includes('/*'));
        if (!isSnapshotPage) return;

        const checkExist = setInterval(() => {
            const shareNoteBtn = document.querySelector('a[href="https://gkd.li/guide/snapshot#share-note"]');
            if (!shareNoteBtn) return;

            clearInterval(checkExist);
            if (document.getElementById('get-coordinate-btn')) return;

            const coordinateBtn = document.createElement('button');
            coordinateBtn.id = 'get-coordinate-btn';
            coordinateBtn.className = shareNoteBtn.className;
            coordinateBtn.textContent = '获取坐标';
            coordinateBtn.style.marginTop = '10px';
            coordinateBtn.style.marginLeft = '5px';
            coordinateBtn.style.cursor = 'pointer';

            // 点击按钮：显示/隐藏面板
            coordinateBtn.addEventListener('click', () => {
                if (!isToolbarCreated) {
                    createToolbar();    // 首次点击才创建面板
                    startCapture();     // 启动捕获
                    isToolbarCreated = true;
                } else {
                    mainToolbar.style.display = mainToolbar.style.display === 'none' ? 'block' : 'none';
                }
            });

            shareNoteBtn.parentNode.insertBefore(coordinateBtn, shareNoteBtn.nextSibling);
        }, 300);
    }

    // ====================== 坐标面板（来自001，默认隐藏） ======================
    function createToolbar() {
        const bar = document.createElement('div');
        bar.id = 'coord-tool';
        mainToolbar = bar;
        bar.style.cssText = `
            position:fixed; top:20px; left: 50%;transform: translateX(-50%);
            background:#000000; color:#fff;
            padding:8px; border-radius:8px; z-index:9999999;
            min-width:150px; user-select:none;
            box-shadow:0 0 12px rgba(0,0,0,0.5);
            font-family: Arial, sans-serif;
            border: 1px solid #222;
            display: none; /* 默认隐藏 */
        `;

        const positionControls = createPositionControls(bar);
        const btn = document.createElement('button');
        btn.textContent = '🖱️ 开启点击模式';
        btn.style.cssText = `
            width:100%; padding:7px; border:none; border-radius:4px;
            background:#111; color:#fff; cursor:pointer; font-size:14px;
            margin-bottom:6px;
        `;

        const calcBtn = document.createElement('button');
        calcBtn.textContent = '🧮 计算偏移';
        calcBtn.style.cssText = `
            width:100%; padding:7px; border:none; border-radius:4px;
            background:#111; color:#fff; cursor:pointer; font-size:14px;
        `;

        coordBox = document.createElement('div');
        coordBox.style.cssText = `
            margin-top:8px; padding:7px; background:#111;
            border-radius:4px; text-align:center; cursor:pointer;
            font-family: monospace; font-size:14px;
            color: #fff;
        `;
        coordBox.textContent = currentCoord;
        coordBox.title = "点击复制坐标";

        bar.append(positionControls, btn, calcBtn, coordBox);
        document.body.appendChild(bar);

        // 打开面板
        bar.style.display = 'block';

        btn.onclick = () => {
            clickMode = !clickMode;
            if (clickMode) {
                btn.textContent = '🖱️ 关闭点击模式';
                btn.style.background = '#c92a2a';
            } else {
                btn.textContent = '🖱️ 开启点击模式';
                btn.style.background = '#111';
                clearMarker();
            }
        };

        calcBtn.onclick = openCalcWindow;
        coordBox.onclick = () => {
            navigator.clipboard.writeText(currentCoord).then(() => {
                const old = coordBox.textContent;
                coordBox.textContent = '✅ 复制成功';
                setTimeout(() => coordBox.textContent = old, 700);
            });
        };
    }

    // ====================== 以下完全保留001原有功能 ======================
    function createPositionControls(parentPanel, isCalcWindow = false) {
        const controlBar = document.createElement('div');
        controlBar.style.cssText = `
            display: flex;
            gap: 4px;
            margin-bottom: 6px;
            justify-content: center;
        `;
        const leftBtn = document.createElement('button');
        leftBtn.textContent = '◀';
        leftBtn.style.cssText = `
            padding: 4px 8px;
            border: none;
            border-radius: 4px;
            background: #111;
            color: #fff;
            cursor: pointer;
            font-size: 12px;
        `;
        leftBtn.onclick = () => setPanelPosition(parentPanel, 'left', isCalcWindow);

        const centerBtn = document.createElement('button');
        centerBtn.textContent = '🟢';
        centerBtn.style.cssText = `
            padding: 4px 8px;
            border: none;
            border-radius: 4px;
            background: #111;
            color: #fff;
            cursor: pointer;
            font-size: 12px;
        `;
        centerBtn.onclick = () => setPanelPosition(parentPanel, 'center', isCalcWindow);

        const rightBtn = document.createElement('button');
        rightBtn.textContent = '▶';
        rightBtn.style.cssText = `
            padding: 4px 8px;
            border: none;
            border-radius: 4px;
            background: #111;
            color: #fff;
            cursor: pointer;
            font-size: 12px;
        `;
        rightBtn.onclick = () => setPanelPosition(parentPanel, 'right', isCalcWindow);

        controlBar.append(leftBtn, centerBtn, rightBtn);
        return controlBar;
    }

    function setPanelPosition(panel, position, isCalcWindow = false) {
        const panelWidth = panel.offsetWidth;
        const windowWidth = window.innerWidth;
        if (isCalcWindow && mainToolbar) {
            const mainRect = mainToolbar.getBoundingClientRect();
            const spacing = 10;
            panel.style.top = `${mainRect.bottom + spacing}px`;
            panel.style.bottom = 'auto';
            panel.style.transform = 'none';
        } else {
            panel.style.top = '20px';
            panel.style.bottom = 'auto';
            panel.style.transform = 'none';
        }
        switch(position) {
            case 'left':
                panel.style.left = '20px';
                panel.style.right = 'auto';
                break;
            case 'center':
                panel.style.left = `${(windowWidth - panelWidth) / 2}px`;
                panel.style.right = 'auto';
                break;
            case 'right':
                panel.style.right = '20px';
                panel.style.left = 'auto';
                break;
        }
    }

    function openCalcWindow() {
        const old = document.querySelector('#calc-window');
        if(old) { old.remove(); }
        const wrap = document.createElement('div');
        wrap.id = 'calc-window';
        wrap.style.cssText = `
            position:fixed;
            width:360px;
            background:#000000;
            color:#fff;
            padding:16px;
            border-radius:10px;
            z-index:99999999;
            box-shadow:0 0 20px #000;
            font-family:Arial,sans-serif;
            border: 1px solid #222;
        `;
        const positionControls = createPositionControls(wrap, true);
        const topBar = document.createElement('div');
        topBar.style.cssText = `
            display:flex; justify-content:space-between;
            padding:4px 4px 8px;
            background: #000;
        `;
        const clearBtn = document.createElement('span');
        clearBtn.textContent = '🧹 清空';
        clearBtn.style.cssText = 'color:#00c8ff; cursor:pointer; font-size:14px;';
        const closeBtn = document.createElement('span');
        closeBtn.textContent = '✕ 关闭';
        closeBtn.style.cssText = 'color:#ff4444; cursor:pointer; font-size:14px;';
        topBar.append(clearBtn, closeBtn);
        const tip = document.createElement('div');
        tip.textContent = '请输入偏移规则（例：left=100）';
        tip.style.cssText = 'font-size:12px; color:#888; margin-bottom:8px;';
        const input1 = document.createElement('input');
        const input2 = document.createElement('input');
        const inpStyle = `
            width:100%; padding:8px; margin:4px 0;
            border-radius:4px; border:1px solid #222; outline:none;
            background:#111; color:#fff; font-size:14px;
        `;
        input1.style.cssText = inpStyle;
        input2.style.cssText = inpStyle;
        input1.placeholder = '输入1：left/top/right/bottom=数字';
        input2.placeholder = '输入2：根据输入1自动限制';
        const resBox = document.createElement('div');
        resBox.style.cssText = `
            margin-top:12px; padding:10px;
            background:#111; border-radius:4px;
            text-align:center; cursor:pointer; font-family:monospace;
            font-size:15px; min-height:20px;
            color: #fff;
        `;
        resBox.textContent = '计算结果将显示在这里';
        resBox.title = "点击复制结果";
        wrap.append(positionControls, topBar, tip, input1, input2, resBox);
        document.body.appendChild(wrap);
        setPanelPosition(wrap, 'center', true);
        clearBtn.onclick = () => {
            input1.value = '';
            input2.value = '';
            input2.placeholder = '输入2：根据输入1自动限制';
            resBox.textContent = '计算结果将显示在这里';
            type1 = ''; type2 = '';
        };
        closeBtn.onclick = () => wrap.remove();
        let type1 = '', type2 = '';
        let val1 = 0, val2 = 0;
        const input1ToInput2Map = {
            'left': 'top',
            'top': 'right',
            'right': 'bottom',
            'bottom': 'left'
        };
        input1.oninput = () => {
            const v = input1.value.trim().toLowerCase();
            const match = v.match(/^(left|top|right|bottom)=(-?\d+)/);
            if (!match) {
                type1 = '';
                input2.placeholder = '输入1格式不正确';
                input2.value = '';
                doCalc();
                return;
            }
            type1 = match[1];
            val1 = Number(match[2]);
            const allowedType2 = input1ToInput2Map[type1];
            input2.placeholder = `只能输入：${allowedType2}=数字`;
            doCalc();
        };
        input2.oninput = () => {
            const v = input2.value.trim().toLowerCase();
            const match = v.match(/^(left|top|right|bottom)=(-?\d+)/);
            if (!match || !type1) {
                type2 = '';
                doCalc();
                return;
            }
            const t = match[1];
            const allowedType2 = input1ToInput2Map[type1];
            if (t !== allowedType2) {
                type2 = '';
                doCalc();
                return;
            }
            type2 = t;
            val2 = Number(match[2]);
            doCalc();
        };
        function doCalc() {
            if (!type1 || !type2 || currentX === 0 || currentY === 0) {
                resBox.textContent = '等待有效输入...';
                return;
            }
            let calcX = currentX;
            let calcY = currentY;
            if (type1 === 'left' || type1 === 'right') {
                calcX = currentX - val1;
            } else if (type1 === 'top' || type1 === 'bottom') {
                calcY = currentY - val1;
            }
            if (type2 === 'left' || type2 === 'right') {
                calcX = currentX - val2;
            } else if (type2 === 'top' || type2 === 'bottom') {
                calcY = currentY - val2;
            }
            const res = `{ x: ${calcX}, y: ${calcY}, }`;
            resBox.textContent = res;
        }
        resBox.onclick = () => {
            const t = resBox.textContent.trim();
            if (!t.includes('{')) return;
            navigator.clipboard.writeText(t).then(() => {
                const old = resBox.textContent;
                resBox.textContent = '✅ 复制成功！';
                setTimeout(() => resBox.textContent = old, 800);
            });
        };
    }

    function clearMarker() {
        if (lastMarker) { lastMarker.remove(); lastMarker = null; }
    }

    function showGlobalMarker(x, y) {
        clearMarker();
        const mark = document.createElement('div');
        mark.style.cssText = `
            position: fixed;
            left: ${x}px; top: ${y}px;
            width: 22px; height: 22px;
            margin-left: -11px; margin-top: -11px;
            background: #ff0000; border:3px solid #fff;
            border-radius:50%; z-index:99999999!important;
            pointer-events:none; box-shadow:0 0 10px #000;
        `;
        document.body.appendChild(mark);
        lastMarker = mark;
    }

    function startCapture() {
        document.addEventListener('click', e => {
            if (!clickMode || isProcessing) return;
            const img = e.target.closest('img');
            if (!img) return;
            e.stopImmediatePropagation();
            e.preventDefault();
            isProcessing = true;
            setTimeout(() => isProcessing = false, 100);
            const rect = img.getBoundingClientRect();
            const lx = Math.round(e.clientX - rect.left);
            const ly = Math.round(e.clientY - rect.top);
            const sx = img.naturalWidth / rect.width || 1;
            const sy = img.naturalHeight / rect.height || 1;
            currentX = Math.round(lx * sx);
            currentY = Math.round(ly * sy);
            currentCoord = `{ x: ${currentX}, y: ${currentY}, }`;
            coordBox.textContent = currentCoord;
            showGlobalMarker(e.clientX, e.clientY);
        }, true);
    }
})();