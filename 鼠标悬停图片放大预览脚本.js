// ==UserScript==
// @name        鼠标悬停图片放大预览（优化版）
// @namespace    https://greasyfork.org.cn/zh-CN/
// @match       *://*/*
// @version     1.0.0
// @author      lhj1618
// @license     MIT
// @run-at      document-idle
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @description 鼠标悬停图片1秒后显示放大预览，优化性能减少资源占用
// ==/UserScript==

(function() {
    'use strict';

    console.log("优化版鼠标悬停图片放大预览脚本已加载");
    
    // 配置常量
    const CONFIG = {
        HOVER_DELAY: 1000, // 悬停延时(毫秒)
        PREVIEW_PADDING: 20, // 预览框边距
        PREVIEW_Z_INDEX: 9999999998, // 预览框层级
        THROTTLE_DELAY: 100, // 节流延时(毫秒)
        DEBOUNCE_DELAY: 300 // 防抖延时(毫秒)
    };

    // 状态变量
    let isEnabled = GM_getValue("isEnabled", true);
    let previewVisible = false;
    let currentHoverTimer = null;
    let lastMoveTime = 0;
    let currentElement = null;
    let currentImageSrc = null;
    
    // 初始化
    init();
    
    /**
     * 初始化函数
     */
    function init() {
        setupPreviewBox();
        setupEventListeners();
        setupMenuCommands();
        console.log("脚本初始化完成");
    }
    
    /**
     * 设置预览框
     */
    function setupPreviewBox() {
        if ($('#dashixiong_preview').length === 0) {
            $(document.body).prepend(
                '<div id="dashixiong_preview" style="' +
                'display:none;' +
                'pointer-events:none;' +
                'padding:0;' +
                'margin:0;' +
                'left:0;' +
                'top:0;' +
                'background-color:transparent;' +
                'position:fixed;' +
                'z-index:' + CONFIG.PREVIEW_Z_INDEX + ';' +
                '"></div>'
            );
        }
    }
    
    /**
     * 设置事件监听器
     */
    function setupEventListeners() {
        // 合并所有元素类型的事件监听
        const elementTypes = ['img', 'a', 'picture', 'span', 'li', 'video', 'div'];
        const selector = elementTypes.join(', ');
        
        // 使用事件委托，提高性能
        $(document).on({
            mouseenter: handleMouseEnter,
            mousemove: throttle(handleMouseMove, CONFIG.THROTTLE_DELAY),
            mouseleave: handleMouseLeave
        }, selector);
        
        // 添加键盘快捷键监听
        $(document).on('keyup', handleKeyUp);
        
        console.log("事件监听器设置完成");
    }
    
    /**
     * 节流函数，减少事件触发频率
     */
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    /**
     * 防抖函数，防止频繁触发
     */
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
    
    /**
     * 处理鼠标进入事件
     */
    function handleMouseEnter(e) {
        if (!isEnabled) return;
        
        clearHoverTimer();
        currentElement = e.target;
        
        const imgSrc = getImageSourceFromElement(currentElement);
        if (imgSrc) {
            console.log("检测到图片元素，开始延时");
            currentHoverTimer = setTimeout(() => {
                showImagePreview(e, imgSrc);
            }, CONFIG.HOVER_DELAY);
        }
    }
    
    /**
     * 处理鼠标移动事件
     */
    function handleMouseMove(e) {
        if (!isEnabled || !previewVisible) return;
        
        updatePreviewPosition(e);
    }
    
    /**
     * 处理鼠标离开事件
     */
    function handleMouseLeave(e) {
        clearHoverTimer();
        currentElement = null;
        
        if (previewVisible) {
            hidePreview();
        }
    }
    
    /**
     * 处理键盘事件
     */
    function handleKeyUp(e) {
        if (e.key === 'Alt') {
            toggleEnabled();
        }
    }
    
    /**
     * 清除悬停计时器
     */
    function clearHoverTimer() {
        if (currentHoverTimer) {
            clearTimeout(currentHoverTimer);
            currentHoverTimer = null;
        }
    }
    
    /**
     * 从元素获取图片源
     */
    function getImageSourceFromElement(element) {
        // 检查img标签
        if (element.tagName.toLowerCase() === 'img' && element.src) {
            return element.src;
        }
        
        // 检查背景图片
        const bgImage = window.getComputedStyle(element).backgroundImage;
        if (bgImage && bgImage !== 'none') {
            const match = bgImage.match(/url\(["']?(.*?)["']?\)/);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        // 检查子元素中的图片
        const childImgs = element.querySelectorAll('img');
        for (let img of childImgs) {
            if (img.src) {
                return img.src;
            }
        }
        
        // 对于div元素，检查兄弟元素
        if (element.tagName.toLowerCase() === 'div') {
            const siblingImgSrc = getSiblingImageSource(element);
            if (siblingImgSrc) {
                return siblingImgSrc;
            }
        }
        
        return null;
    }
    
    /**
     * 获取兄弟元素中的图片源
     */
    function getSiblingImageSource(element) {
        const siblings = [
            element.previousElementSibling,
            element.nextElementSibling
        ];
        
        for (let sibling of siblings) {
            if (sibling) {
                const imgSrc = getImageSourceFromElement(sibling);
                if (imgSrc) {
                    return imgSrc;
                }
            }
        }
        
        return null;
    }
    
    /**
     * 显示图片预览
     */
    function showImagePreview(e, imgSrc) {
        if (!imgSrc) return;
        
        const processedSrc = processImageUrl(imgSrc);
        currentImageSrc = processedSrc;
        
        // 预加载图片获取尺寸
        preloadImage(processedSrc, (width, height) => {
            if (width && height) {
                displayPreview(e, processedSrc, width, height);
                previewVisible = true;
            }
        });
    }
    
    /**
     * 处理图片URL
     */
    function processImageUrl(imgSrc) {
        let url = imgSrc;
        const hostname = window.location.hostname;
        
        // 微博图片处理
        if (/weibo\.com/i.test(hostname) && /\/orj360\//i.test(url)) {
            url = url.replace(/orj360/i, 'mw2000');
        }
        // 淘宝/天猫图片处理
        else if (/(taobao|tmall)\.com/i.test(hostname)) {
            url = url.replace(/_(\d+)x(\d+)\.jpg_.webp/i, '')
                     .replace(/_(\d+)x(\d+)q(90|75|50)(s50)?\.jpg_.webp/i, '')
                     .replace(/_q(90|75)\.jpg/i, '')
                     .replace(/_(\d+)x(\d+)\.jpg/i, '');
        }
        // B站图片处理
        else if (/bilibili\.com/i.test(hostname)) {
            url = url.replace(/(\.(jpg|jpeg|png|gif|bmp|tiff|psd|ico|svg|webp|heif|heic))@.*$/i, '$1');
        }
        
        // 通用处理：移除URL参数和尺寸后缀
        url = url.replace(/(\.(jpg|jpeg|png|gif|bmp|tiff|psd|ico|svg|webp|heif|heic))\?.*$/i, '$1')
                 .replace(/(\.(jpg|jpeg|png|gif|bmp|tiff|psd|ico|svg|webp|heif|heic))_.*$/i, '$1');
        
        return url;
    }
    
    /**
     * 预加载图片获取尺寸
     */
    function preloadImage(src, callback) {
        const img = new Image();
        img.onload = function() {
            callback(this.width, this.height);
        };
        img.onerror = function() {
            callback(0, 0);
        };
        img.src = src;
    }
    
    /**
     * 显示预览
     */
    function displayPreview(e, imgSrc, width, height) {
        const $preview = $('#dashixiong_preview');
        
        // 清空并设置图片
        $preview.empty().append($('<img>', {
            src: imgSrc,
            css: {
                maxWidth: 'none',
                maxHeight: 'none',
                display: 'block'
            }
        }));
        
        // 调整图片尺寸
        adjustImageSize(width, height);
        
        // 更新位置并显示
        updatePreviewPosition(e);
        $preview.stop(true, false).show();
    }
    
    /**
     * 调整图片尺寸以适应屏幕
     */
    function adjustImageSize(originalWidth, originalHeight) {
        const $preview = $('#dashixiong_preview');
        const $img = $preview.find('img');
        const windowWidth = $(window).width();
        const windowHeight = $(window).height();
        
        let newWidth = originalWidth;
        let newHeight = originalHeight;
        
        // 如果图片超出屏幕，按比例缩放
        if (originalWidth > windowWidth || originalHeight > windowHeight) {
            const widthRatio = windowWidth / originalWidth;
            const heightRatio = windowHeight / originalHeight;
            const scaleRatio = Math.min(widthRatio, heightRatio);
            
            newWidth = originalWidth * scaleRatio;
            newHeight = originalHeight * scaleRatio;
        }
        
        $img.css({
            width: newWidth + 'px',
            height: newHeight + 'px'
        });
    }
    
    /**
     * 更新预览位置
     */
    function updatePreviewPosition(e) {
        const $preview = $('#dashixiong_preview');
        if (!$preview.is(':visible')) return;
        
        const $img = $preview.find('img');
        const imgWidth = $img.outerWidth();
        const imgHeight = $img.outerHeight();
        const windowWidth = $(window).width();
        const windowHeight = $(window).height();
        
        let posX = e.clientX + CONFIG.PREVIEW_PADDING;
        let posY = e.clientY + CONFIG.PREVIEW_PADDING;
        
        // 水平方向调整
        if (posX + imgWidth > windowWidth) {
            posX = e.clientX - imgWidth - CONFIG.PREVIEW_PADDING;
            if (posX < 0) posX = windowWidth - imgWidth - CONFIG.PREVIEW_PADDING;
        }
        
        // 垂直方向调整
        if (posY + imgHeight > windowHeight) {
            posY = e.clientY - imgHeight - CONFIG.PREVIEW_PADDING;
            if (posY < 0) posY = windowHeight - imgHeight - CONFIG.PREVIEW_PADDING;
        }
        
        // 确保位置在可视区域内
        posX = Math.max(CONFIG.PREVIEW_PADDING, Math.min(posX, windowWidth - imgWidth - CONFIG.PREVIEW_PADDING));
        posY = Math.max(CONFIG.PREVIEW_PADDING, Math.min(posY, windowHeight - imgHeight - CONFIG.PREVIEW_PADDING));
        
        $preview.css({
            left: posX + 'px',
            top: posY + 'px'
        });
    }
    
    /**
     * 隐藏预览
     */
    function hidePreview() {
        $('#dashixiong_preview').stop(true, false).hide();
        previewVisible = false;
        currentImageSrc = null;
    }
    
    /**
     * 设置菜单命令
     */
    function setupMenuCommands() {
        GM_registerMenuCommand("切换放大功能开关", toggleEnabled);
    }
    
    /**
     * 切换启用状态
     */
    function toggleEnabled() {
        isEnabled = !isEnabled;
        GM_setValue("isEnabled", isEnabled);
        
        if (isEnabled) {
            showToast("放大功能已启用");
        } else {
            showToast("放大功能已禁用");
            hidePreview();
            clearHoverTimer();
        }
    }
    
    /**
     * 显示提示消息
     */
    function showToast(message, duration = 3000) {
        const toast = $('<div>', {
            text: message,
            css: {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '4px',
                zIndex: 9999999999,
                fontSize: '16px',
                maxWidth: '80%',
                textAlign: 'center',
                pointerEvents: 'none',
                transition: 'opacity 0.3s ease'
            }
        });
        
        $(document.body).append(toast);
        
        setTimeout(() => {
            toast.css('opacity', '0');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
})();
