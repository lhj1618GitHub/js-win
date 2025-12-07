// ==UserScript==
// @name        鼠标悬停图片放大预览（增强版）
// @namespace    https://greasyfork.org.cn/zh-CN/users/724782-caogen1207
// @match       *://*/*
// @version     5.04
// @author      大师兄
// @license     MIT
// @run-at      document-idle
// @require     https://code.jquery.com/jquery-3.6.0.min.js
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @description 鼠标悬停图片1秒后显示放大预览，支持更多图片属性和元素类型
// ==/UserScript==

(function() {
    'use strict';

    console.log("增强版鼠标悬停图片放大预览脚本已加载");
    
    // 配置常量
    const CONFIG = {
        HOVER_DELAY: 1000,           // 悬停延时(毫秒)
        PREVIEW_PADDING: 20,         // 预览框边距
        PREVIEW_Z_INDEX: 9999999998, // 预览框层级
        THROTTLE_DELAY: 100,         // 节流延时(毫秒)
        MIN_IMAGE_SIZE: 50,          // 最小图片尺寸(像素)
        MAX_IMAGE_SIZE: 4096,        // 最大预览尺寸(像素)
        BACKGROUND_SCALE: 0.8,       // 背景图片缩放比例
        IMAGE_SCAN_DEPTH: 3,         // 元素子级搜索深度
        DETECTION_RADIUS: 50         // 图片检测半径(像素)
    };

    // 状态变量
    let isEnabled = GM_getValue("isEnabled", true);
    let previewVisible = false;
    let currentHoverTimer = null;
    let lastMousePosition = { x: 0, y: 0 };
    let detectedElements = new WeakMap(); // 缓存已检测的元素
    
    // 初始化
    init();
    
    /**
     * 初始化函数
     */
    function init() {
        setupStyles();
        setupPreviewBox();
        setupEventListeners();
        setupMenuCommands();
        console.log("脚本初始化完成，支持更多图片属性检测");
    }
    
    /**
     * 设置样式
     */
    function setupStyles() {
        GM_addStyle(`
            .image-preview-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.3);
                z-index: 9999999997;
                display: none;
                pointer-events: none;
            }
            
            .image-hover-highlight {
                outline: 2px dashed #4CAF50 !important;
                outline-offset: 2px !important;
                transition: outline 0.2s ease !important;
            }
        `);
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
                'border: 2px solid #fff;' +
                'box-shadow: 0 4px 20px rgba(0,0,0,0.3);' +
                'border-radius: 4px;' +
                'overflow: hidden;' +
                '"></div>'
            );
            
            // 添加放大镜效果
            $(document.body).prepend('<div class="image-preview-overlay"></div>');
        }
    }
    
    /**
     * 设置事件监听器
     */
    function setupEventListeners() {
        // 使用更全面的选择器
        const elementTypes = [
            'img', 'a', 'picture', 'span', 'li', 'video', 'div',
            'figure', 'section', 'article', 'aside', 'main', 'header',
            'footer', 'nav', 'button', 'td', 'th', 'svg', 'canvas',
            'input[type="image"]', 'object', 'embed', 'iframe'
        ];
        const selector = elementTypes.join(', ');
        
        // 使用事件委托
        $(document).on({
            mouseenter: handleMouseEnter,
            mousemove: throttle(handleMouseMove, CONFIG.THROTTLE_DELAY),
            mouseleave: handleMouseLeave
        }, selector);
        
        // 监听动态添加的元素
        setupMutationObserver();
        
        // 键盘快捷键
        $(document).on('keyup', handleKeyUp);
        
        console.log("事件监听器设置完成，支持更多元素类型");
    }
    
    /**
     * 设置突变观察器监听动态内容
     */
    function setupMutationObserver() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    console.log("检测到动态添加的内容");
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * 节流函数
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
     * 处理鼠标进入事件
     */
    function handleMouseEnter(e) {
        if (!isEnabled) return;
        
        clearHoverTimer();
        lastMousePosition = { x: e.clientX, y: e.clientY };
        
        // 使用缓存检测
        let imgInfo = null;
        if (detectedElements.has(e.target)) {
            imgInfo = detectedElements.get(e.target);
        } else {
            imgInfo = deepDetectImageSource(e.target, e.clientX, e.clientY);
            detectedElements.set(e.target, imgInfo);
        }
        
        if (imgInfo && imgInfo.src) {
            console.log("检测到图片元素，开始延时", imgInfo);
            
            // 添加高亮效果
            $(e.target).addClass('image-hover-highlight');
            
            currentHoverTimer = setTimeout(() => {
                showImagePreview(e, imgInfo);
            }, CONFIG.HOVER_DELAY);
        }
    }
    
    /**
     * 深度检测图片源
     */
    function deepDetectImageSource(element, mouseX, mouseY) {
        const detectionResult = {
            src: null,
            type: null,
            element: element,
            isBackground: false,
            rect: element.getBoundingClientRect()
        };
        
        // 1. 检查元素本身是否是图片
        if (element.tagName) {
            const tagName = element.tagName.toLowerCase();
            
            // img标签
            if (tagName === 'img' && element.src) {
                detectionResult.src = element.src;
                detectionResult.type = 'img';
                detectionResult.width = element.naturalWidth || element.width;
                detectionResult.height = element.naturalHeight || element.height;
                return detectionResult;
            }
            
            // input[type="image"]
            if (tagName === 'input' && element.type === 'image' && element.src) {
                detectionResult.src = element.src;
                detectionResult.type = 'input-image';
                return detectionResult;
            }
            
            // svg元素
            if (tagName === 'svg') {
                const svgSrc = detectSVGImage(element);
                if (svgSrc) {
                    detectionResult.src = svgSrc;
                    detectionResult.type = 'svg';
                    return detectionResult;
                }
            }
            
            // canvas元素
            if (tagName === 'canvas') {
                const canvasData = element.toDataURL?.('image/png');
                if (canvasData) {
                    detectionResult.src = canvasData;
                    detectionResult.type = 'canvas';
                    return detectionResult;
                }
            }
            
            // object/embed元素
            if ((tagName === 'object' || tagName === 'embed') && element.data) {
                if (element.data.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
                    detectionResult.src = element.data;
                    detectionResult.type = tagName;
                    return detectionResult;
                }
            }
            
            // iframe元素
            if (tagName === 'iframe') {
                const iframeSrc = detectIframeImage(element);
                if (iframeSrc) {
                    detectionResult.src = iframeSrc;
                    detectionResult.type = 'iframe';
                    return detectionResult;
                }
            }
            
            // video元素
            if (tagName === 'video' && element.poster) {
                detectionResult.src = element.poster;
                detectionResult.type = 'video-poster';
                return detectionResult;
            }
        }
        
        // 2. 检查CSS背景图片
        const backgroundImage = detectBackgroundImage(element);
        if (backgroundImage) {
            detectionResult.src = backgroundImage;
            detectionResult.type = 'background';
            detectionResult.isBackground = true;
            return detectionResult;
        }
        
        // 3. 检查内联样式背景
        const inlineBg = detectInlineBackground(element);
        if (inlineBg) {
            detectionResult.src = inlineBg;
            detectionResult.type = 'inline-background';
            detectionResult.isBackground = true;
            return detectionResult;
        }
        
        // 4. 检查data属性
        const dataSrc = detectDataAttributes(element);
        if (dataSrc) {
            detectionResult.src = dataSrc;
            detectionResult.type = 'data-attribute';
            return detectionResult;
        }
        
        // 5. 检查附近元素
        const nearbyImage = detectNearbyImages(element, mouseX, mouseY);
        if (nearbyImage) {
            return nearbyImage;
        }
        
        // 6. 检查子元素
        const childImage = detectChildImages(element, 0);
        if (childImage) {
            return childImage;
        }
        
        return null;
    }
    
    /**
     * 检测背景图片
     */
    function detectBackgroundImage(element) {
        try {
            const computedStyle = window.getComputedStyle(element);
            const bgImage = computedStyle.backgroundImage;
            
            if (bgImage && bgImage !== 'none') {
                const matches = bgImage.match(/url\(["']?([^"')]+)["']?\)/g);
                if (matches && matches.length > 0) {
                    // 取第一个背景图
                    const firstBg = matches[0];
                    const urlMatch = firstBg.match(/url\(["']?([^"')]+)["']?\)/);
                    if (urlMatch && urlMatch[1]) {
                        return urlMatch[1];
                    }
                }
            }
        } catch (e) {
            console.warn("检测背景图片时出错:", e);
        }
        return null;
    }
    
    /**
     * 检测内联样式背景
     */
    function detectInlineBackground(element) {
        if (element.style && element.style.backgroundImage) {
            const bgImage = element.style.backgroundImage;
            if (bgImage && bgImage !== 'none') {
                const urlMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
                if (urlMatch && urlMatch[1]) {
                    return urlMatch[1];
                }
            }
        }
        return null;
    }
    
    /**
     * 检测data属性
     */
    function detectDataAttributes(element) {
        const dataAttrs = ['data-src', 'data-original', 'data-lazy-src', 'data-srcset', 'data-url'];
        
        for (const attr of dataAttrs) {
            if (element.hasAttribute(attr)) {
                const value = element.getAttribute(attr);
                if (value && isImageUrl(value)) {
                    return extractFirstImageFromSrcSet(value);
                }
            }
        }
        
        // 检查所有data-*属性
        for (const attr of element.attributes) {
            if (attr.name.startsWith('data-') && isImageUrl(attr.value)) {
                return extractFirstImageFromSrcSet(attr.value);
            }
        }
        
        return null;
    }
    
    /**
     * 检测附近图片
     */
    function detectNearbyImages(element, mouseX, mouseY) {
        const elements = document.elementsFromPoint(mouseX, mouseY);
        
        for (const el of elements) {
            if (el === element) continue;
            
            const rect = el.getBoundingClientRect();
            const distance = Math.sqrt(
                Math.pow(mouseX - (rect.left + rect.width / 2), 2) +
                Math.pow(mouseY - (rect.top + rect.height / 2), 2)
            );
            
            if (distance <= CONFIG.DETECTION_RADIUS) {
                const imgInfo = deepDetectImageSource(el, mouseX, mouseY);
                if (imgInfo && imgInfo.src) {
                    return imgInfo;
                }
            }
        }
        
        return null;
    }
    
    /**
     * 检测子元素图片
     */
    function detectChildImages(element, depth) {
        if (depth >= CONFIG.IMAGE_SCAN_DEPTH) return null;
        
        const children = element.children;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            
            // 递归检测
            const childImgInfo = deepDetectImageSource(child, 0, 0);
            if (childImgInfo && childImgInfo.src) {
                return childImgInfo;
            }
            
            // 深度搜索
            const deepChild = detectChildImages(child, depth + 1);
            if (deepChild) {
                return deepChild;
            }
        }
        
        return null;
    }
    
    /**
     * 检测SVG图片
     */
    function detectSVGImage(svgElement) {
        // 检查SVG内的image元素
        const imageElements = svgElement.querySelectorAll('image');
        for (const img of imageElements) {
            if (img.getAttribute('xlink:href')) {
                return img.getAttribute('xlink:href');
            }
            if (img.getAttribute('href')) {
                return img.getAttribute('href');
            }
        }
        
        // 检查SVG本身是否可以作为图片
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        if (svgString.length < 10000) { // 限制大小
            return 'data:image/svg+xml;base64,' + btoa(svgString);
        }
        
        return null;
    }
    
    /**
     * 检测iframe内的图片
     */
    function detectIframeImage(iframe) {
        try {
            if (iframe.contentDocument) {
                const images = iframe.contentDocument.querySelectorAll('img');
                for (const img of images) {
                    if (img.src && isImageUrl(img.src)) {
                        return img.src;
                    }
                }
            }
        } catch (e) {
            // 跨域限制
        }
        return null;
    }
    
    /**
     * 检查是否为图片URL
     */
    function isImageUrl(url) {
        if (!url) return false;
        
        // 排除常见非图片URL
        if (url.startsWith('javascript:') || 
            url.startsWith('mailto:') || 
            url.startsWith('tel:') ||
            url.startsWith('#') ||
            url.trim() === '') {
            return false;
        }
        
        // 检查图片扩展名
        const imageExtensions = [
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg',
            'tiff', 'tif', 'ico', 'jfif', 'pjpeg', 'pjp',
            'avif', 'apng', 'heic', 'heif'
        ];
        
        const urlLower = url.toLowerCase();
        const extensionMatch = urlLower.match(/\.([a-z0-9]{2,5})(?:[?#]|$)/);
        
        if (extensionMatch) {
            const ext = extensionMatch[1];
            if (imageExtensions.includes(ext)) {
                return true;
            }
        }
        
        // 检查data URL
        if (urlLower.startsWith('data:image/')) {
            return true;
        }
        
        // 检查常见图片路径模式
        const imagePatterns = [
            /\/images?\//i,
            /\/img\//i,
            /\/pictures?\//i,
            /\/photos?\//i,
            /\/gallery\//i,
            /\/uploads?\//i,
            /\/media\//i,
            /\/assets\//i,
            /thumbnail/i,
            /preview/i,
            /image/i
        ];
        
        for (const pattern of imagePatterns) {
            if (pattern.test(url)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 从srcset中提取第一个图片
     */
    function extractFirstImageFromSrcSet(srcset) {
        if (!srcset) return null;
        
        const parts = srcset.split(',').map(part => part.trim());
        for (const part of parts) {
            const urlMatch = part.match(/^([^\s]+)(?:\s+.*)?$/);
            if (urlMatch) {
                const url = urlMatch[1];
                if (isImageUrl(url)) {
                    return url;
                }
            }
        }
        
        return null;
    }
    
    /**
     * 处理鼠标移动事件
     */
    function handleMouseMove(e) {
        if (!isEnabled || !previewVisible) return;
        
        lastMousePosition = { x: e.clientX, y: e.clientY };
        updatePreviewPosition(e);
    }
    
    /**
     * 处理鼠标离开事件
     */
    function handleMouseLeave(e) {
        clearHoverTimer();
        $(e.target).removeClass('image-hover-highlight');
        
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
     * 显示图片预览
     */
    function showImagePreview(e, imgInfo) {
        if (!imgInfo || !imgInfo.src) return;
        
        const processedSrc = processImageUrl(imgInfo.src, imgInfo.type);
        
        // 预加载图片
        preloadImage(processedSrc, (width, height) => {
            if (width && height) {
                displayPreview(e, processedSrc, width, height, imgInfo);
                previewVisible = true;
            }
        });
    }
    
    /**
     * 处理图片URL
     */
    function processImageUrl(imgSrc, imgType) {
        if (!imgSrc) return imgSrc;
        
        // 处理data URL
        if (imgSrc.startsWith('data:')) {
            return imgSrc;
        }
        
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
        // 知乎图片处理
        else if (/zhihu\.com/i.test(hostname)) {
            url = url.replace(/_\w+\.(jpg|jpeg|png|gif|webp)$/i, '_r.jpg');
        }
        // 豆瓣图片处理
        else if (/douban\.com/i.test(hostname)) {
            url = url.replace(/\/s(\w+)\//, '/l/');
        }
        
        // 通用处理
        url = url.replace(/(\.(jpg|jpeg|png|gif|bmp|tiff|psd|ico|svg|webp|heif|heic))\?.*$/i, '$1')
                 .replace(/(\.(jpg|jpeg|png|gif|bmp|tiff|psd|ico|svg|webp|heif|heic))_.*$/i, '$1')
                 .replace(/(\?.*)$/, ''); // 移除查询参数
        
        return url;
    }
    
    /**
     * 预加载图片
     */
    function preloadImage(src, callback) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = function() {
            callback(this.naturalWidth, this.naturalHeight);
        };
        
        img.onerror = function() {
            console.warn("图片加载失败:", src);
            callback(0, 0);
        };
        
        // 设置超时
        setTimeout(() => {
            if (!img.complete) {
                console.warn("图片加载超时:", src);
                callback(0, 0);
            }
        }, 5000);
        
        img.src = src;
    }
    
    /**
     * 显示预览
     */
    function displayPreview(e, imgSrc, width, height, imgInfo) {
        const $preview = $('#dashixiong_preview');
        
        // 清空并设置图片
        $preview.empty().append($('<img>', {
            src: imgSrc,
            css: {
                maxWidth: 'none',
                maxHeight: 'none',
                display: 'block',
                width: 'auto',
                height: 'auto'
            },
            onload: function() {
                adjustImageSize(width, height, imgInfo);
                updatePreviewPosition(e);
                $preview.stop(true, false).show();
            }
        }));
        
        // 显示半透明覆盖层
        $('.image-preview-overlay').show();
    }
    
    /**
     * 调整图片尺寸
     */
    function adjustImageSize(originalWidth, originalHeight, imgInfo) {
        const $preview = $('#dashixiong_preview');
        const $img = $preview.find('img');
        const windowWidth = $(window).width();
        const windowHeight = $(window).height();
        
        let newWidth = originalWidth;
        let newHeight = originalHeight;
        
        // 限制最小尺寸
        if (originalWidth < CONFIG.MIN_IMAGE_SIZE || originalHeight < CONFIG.MIN_IMAGE_SIZE) {
            newWidth = Math.max(originalWidth, CONFIG.MIN_IMAGE_SIZE);
            newHeight = Math.max(originalHeight, CONFIG.MIN_IMAGE_SIZE);
        }
        
        // 限制最大尺寸
        if (originalWidth > CONFIG.MAX_IMAGE_SIZE || originalHeight > CONFIG.MAX_IMAGE_SIZE) {
            const scale = Math.min(
                CONFIG.MAX_IMAGE_SIZE / originalWidth,
                CONFIG.MAX_IMAGE_SIZE / originalHeight
            );
            newWidth = originalWidth * scale;
            newHeight = originalHeight * scale;
        }
        
        // 背景图片缩放
        if (imgInfo && imgInfo.isBackground) {
            newWidth *= CONFIG.BACKGROUND_SCALE;
            newHeight *= CONFIG.BACKGROUND_SCALE;
        }
        
        // 适应窗口
        if (newWidth > windowWidth || newHeight > windowHeight) {
            const widthScale = windowWidth / newWidth;
            const heightScale = windowHeight / newHeight;
            const scale = Math.min(widthScale, heightScale) * 0.8; // 80%的窗口大小
            
            newWidth *= scale;
            newHeight *= scale;
        }
        
        $img.css({
            width: newWidth + 'px',
            height: 'auto'
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
        
        const mouseX = e ? e.clientX : lastMousePosition.x;
        const mouseY = e ? e.clientY : lastMousePosition.y;
        
        // 计算位置
        let posX = mouseX + CONFIG.PREVIEW_PADDING;
        let posY = mouseY + CONFIG.PREVIEW_PADDING;
        
        // 水平方向调整
        if (posX + imgWidth > windowWidth) {
            posX = mouseX - imgWidth - CONFIG.PREVIEW_PADDING;
        }
        
        // 垂直方向调整
        if (posY + imgHeight > windowHeight) {
            posY = mouseY - imgHeight - CONFIG.PREVIEW_PADDING;
        }
        
        // 边界检查
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
        $('.image-preview-overlay').hide();
        previewVisible = false;
    }
    
    /**
     * 设置菜单命令
     */
    function setupMenuCommands() {
        GM_registerMenuCommand("切换放大功能开关", toggleEnabled);
        GM_registerMenuCommand("清除检测缓存", clearDetectionCache);
    }
    
    /**
     * 清除检测缓存
     */
    function clearDetectionCache() {
        detectedElements = new WeakMap();
        showToast("检测缓存已清除");
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
        const existingToast = $('.image-preview-toast');
        if (existingToast.length) {
            existingToast.remove();
        }
        
        const toast = $('<div>', {
            text: message,
            addClass: 'image-preview-toast',
            css: {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                zIndex: 9999999999,
                fontSize: '16px',
                fontWeight: 'bold',
                maxWidth: '80%',
                textAlign: 'center',
                pointerEvents: 'none',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)'
            }
        });
        
        $(document.body).append(toast);
        
        // 淡入效果
        toast.hide().fadeIn(200);
        
        setTimeout(() => {
            toast.fadeOut(300, function() {
                $(this).remove();
            });
        }, duration);
    }
})();
