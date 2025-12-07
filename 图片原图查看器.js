// ==UserScript==
// @name         原图查看器
// @namespace    https://github.com/
// @version      1.6
// @description  鼠标悬停图片2秒后显示原图，修复了背景设置和计算函数
// @author       Yuanbao
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 配置项
    const CONFIG = {
        hoverDelay: 2000,      // 悬停延迟时间（毫秒）
        imageTypes: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif'], // 支持的图片类型
        excludeSelectors: ['video', 'canvas', 'svg:not(img)'], // 排除的元素选择器
        maxWidthPercentage: 0.85,  // 最大宽度占窗口百分比
        maxHeightPercentage: 0.85,  // 最大高度占窗口百分比
        minWidthPercentage: 0.2,   // 最小宽度占窗口百分比
        minHeightPercentage: 0.2,  // 最小高度占窗口百分比
        zIndex: 99999,         // 预览层z-index
        showImageInfo: true,   // 是否显示图片信息
        enableZoom: true,      // 是否允许图片缩放
        enableResize: true,    // 是否启用窗口调整大小自适应
        maintainAspectRatio: true, // 是否保持原始宽高比
        animationDuration: 200, // 动画时长（毫秒）
        padding: 40,           // 窗口内边距
        minPreviewSize: 100,   // 预览图最小尺寸
        maxPreviewSize: 1200,  // 预览图最大尺寸
        backgroundColor: '#000000', // 背景颜色（深黑色）
        backgroundOpacity: 0.95,    // 背景透明度
        positionMode: 'center',     // 位置模式：center（居中）
        transparentBgType: 'checkerboard', // 透明背景显示类型
        containerBgColor: '#333333' // 图片容器背景色（深灰色）
    };

    // 工具函数：获取元素的实际图片URL
    function getImageUrl(element) {
        if (element.tagName === 'IMG') {
            // 优先使用 data-original, data-src, 然后才是 src
            return element.dataset.original || 
                   element.dataset.src || 
                   element.getAttribute('data-src') || 
                   element.src;
        } else if (element.style.backgroundImage) {
            // 处理背景图
            const match = element.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
            return match ? match[1] : null;
        } else if (element.hasAttribute('data-bg')) {
            // 处理 data-bg 属性
            return element.getAttribute('data-bg');
        } else if (element.style.background) {
            // 处理 background 属性
            const match = element.style.background.match(/url\(['"]?(.*?)['"]?\)/);
            return match ? match[1] : null;
        }
        return null;
    }

    // 工具函数：检查URL是否为图片
    function isImageUrl(url) {
        if (!url) return false;
        
        // 移除查询参数和片段
        const cleanUrl = url.split('?')[0].split('#')[0];
        const extension = cleanUrl.split('.').pop().toLowerCase();
        
        return CONFIG.imageTypes.includes(extension);
    }

    // 工具函数：检查元素是否应排除
    function isElementExcluded(element) {
        const selectors = CONFIG.excludeSelectors.join(', ');
        if (element.matches(selectors)) return true;
        
        // 检查父元素
        let parent = element.parentElement;
        while (parent && parent !== document.body) {
            if (parent.matches(selectors)) return true;
            parent = parent.parentElement;
        }
        
        return false;
    }

    // 计算图片最佳显示尺寸，确保完全在窗口内
    function calculateBestSize(imgWidth, imgHeight, maxWidth, maxHeight, minWidth, minHeight) {
        if (imgWidth <= 0 || imgHeight <= 0) {
            return { 
                width: Math.max(minWidth, CONFIG.minPreviewSize), 
                height: Math.max(minHeight, CONFIG.minPreviewSize) 
            };
        }
        
        const aspectRatio = imgWidth / imgHeight;
        
        // 计算基于宽度的最大高度
        let displayWidth = Math.min(imgWidth, maxWidth);
        let displayHeight = displayWidth / aspectRatio;
        
        // 如果高度超过限制，重新计算基于高度的宽度
        if (displayHeight > maxHeight) {
            displayHeight = Math.min(imgHeight, maxHeight);
            displayWidth = displayHeight * aspectRatio;
        }
        
        // 确保尺寸不小于最小值
        if (displayWidth < minWidth) {
            displayWidth = Math.max(minWidth, CONFIG.minPreviewSize);
            if (CONFIG.maintainAspectRatio) {
                displayHeight = displayWidth / aspectRatio;
                // 检查高度是否超过限制
                if (displayHeight > maxHeight) {
                    displayHeight = maxHeight;
                    displayWidth = displayHeight * aspectRatio;
                }
            }
        }
        
        if (displayHeight < minHeight) {
            displayHeight = Math.max(minHeight, CONFIG.minPreviewSize);
            if (CONFIG.maintainAspectRatio) {
                displayWidth = displayHeight * aspectRatio;
                // 检查宽度是否超过限制
                if (displayWidth > maxWidth) {
                    displayWidth = maxWidth;
                    displayHeight = displayWidth / aspectRatio;
                }
            }
        }
        
        // 确保不超过最大值
        displayWidth = Math.min(displayWidth, maxWidth, CONFIG.maxPreviewSize);
        displayHeight = Math.min(displayHeight, maxHeight, CONFIG.maxPreviewSize);
        
        // 最终检查，确保尺寸是合理的
        displayWidth = Math.max(Math.round(displayWidth), CONFIG.minPreviewSize);
        displayHeight = Math.max(Math.round(displayHeight), CONFIG.minPreviewSize);
        
        return {
            width: displayWidth,
            height: displayHeight
        };
    }

    // 创建透明背景
    function createTransparentBackground() {
        const svg = `
            <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="transparent-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <rect width="10" height="10" fill="#cccccc"/>
                        <rect x="10" y="0" width="10" height="10" fill="#ffffff"/>
                        <rect x="0" y="10" width="10" height="10" fill="#ffffff"/>
                        <rect x="10" y="10" width="10" height="10" fill="#cccccc"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#transparent-grid)"/>
            </svg>
        `;
        
        return `url("data:image/svg+xml;base64,${btoa(svg)}")`;
    }

    // 预览图管理器
    class ImagePreview {
        constructor() {
            this.preview = null;
            this.timer = null;
            this.currentElement = null;
            this.isLoading = false;
            this.originalImageSize = { width: 0, height: 0 };
            this.currentScale = 1;
            this.imageElement = null;
            this.imageContainer = null;
            this.windowResizeTimeout = null;
            this.init();
        }

        init() {
            this.createPreviewElement();
            this.bindEvents();
            this.setupResizeObserver();
        }

        createPreviewElement() {
            this.preview = document.createElement('div');
            this.preview.id = 'yuanbao-image-preview';
            this.preview.style.cssText = `
                position: fixed;
                display: none;
                z-index: ${CONFIG.zIndex};
                background: ${CONFIG.backgroundColor};
                opacity: ${CONFIG.backgroundOpacity};
                border-radius: 12px;
                padding: 15px;
                box-shadow: 0 8px 40px rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: opacity ${CONFIG.animationDuration}ms ease, 
                            transform ${CONFIG.animationDuration}ms ease;
                transform-origin: center;
                overflow: visible;
                box-sizing: border-box;
                pointer-events: auto;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%) scale(0.95);
            `;

            this.imageContainer = document.createElement('div');
            this.imageContainer.id = 'yuanbao-image-container';
            
            // 检查并设置图片容器背景
            let containerBackground = CONFIG.containerBgColor; // 默认使用深灰色
            
            if (CONFIG.transparentBgType === 'checkerboard') {
                containerBackground = createTransparentBackground();
            } else if (CONFIG.transparentBgType === 'solid') {
                containerBackground = 'rgba(240, 240, 240, 0.5)'; // 浅灰色半透明背景
            } else if (CONFIG.transparentBgType === 'none') {
                containerBackground = 'transparent';
            }
            
            this.imageContainer.style.cssText = `
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: visible;
                border-radius: 6px;
                box-sizing: border-box;
                transition: width ${CONFIG.animationDuration}ms ease, 
                            height ${CONFIG.animationDuration}ms ease;
                max-width: 100vw;
                max-height: 100vh;
                background: ${containerBackground};
                background-size: 20px 20px;
                background-repeat: repeat;
            `;

            this.imageElement = document.createElement('img');
            this.imageElement.id = 'yuanbao-preview-image';
            this.imageElement.style.cssText = `
                display: block;
                border-radius: 4px;
                object-fit: contain;
                transition: transform ${CONFIG.animationDuration}ms ease;
                transform-origin: center center;
                will-change: transform;
                max-width: 100%;
                max-height: 100%;
                width: auto;
                height: auto;
                background: transparent;
            `;

            const loading = document.createElement('div');
            loading.id = 'yuanbao-preview-loading';
            loading.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: rgba(255, 255, 255, 0.9);
                font-size: 14px;
                font-family: Arial, sans-serif;
                display: none;
                background: rgba(0, 0, 0, 0.8);
                padding: 12px 24px;
                border-radius: 20px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                z-index: 3;
            `;
            loading.textContent = '加载中...';

            const imageInfo = document.createElement('div');
            imageInfo.id = 'yuanbao-preview-info';
            imageInfo.style.cssText = `
                position: absolute;
                bottom: 12px;
                left: 12px;
                right: 12px;
                background: rgba(0, 0, 0, 0.8);
                color: rgba(255, 255, 255, 0.9);
                font-size: 12px;
                font-family: Arial, sans-serif;
                padding: 8px 12px;
                border-radius: 6px;
                display: none;
                text-align: center;
                backdrop-filter: blur(4px);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                z-index: 3;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            `;

            const closeBtn = document.createElement('div');
            closeBtn.id = 'yuanbao-preview-close';
            closeBtn.style.cssText = `
                position: absolute;
                top: 12px;
                right: 12px;
                width: 30px;
                height: 30px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 20px;
                font-weight: bold;
                line-height: 1;
                opacity: 0.8;
                transition: opacity 0.2s, transform 0.2s, background 0.2s;
                z-index: 3;
            `;
            closeBtn.textContent = '×';
            closeBtn.title = '关闭 (ESC)';
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.opacity = '1';
                closeBtn.style.transform = 'scale(1.1)';
                closeBtn.style.background = 'rgba(0, 0, 0, 0.9)';
            });
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.opacity = '0.8';
                closeBtn.style.transform = 'scale(1)';
                closeBtn.style.background = 'rgba(0, 0, 0, 0.8)';
            });

            const zoomControls = document.createElement('div');
            zoomControls.id = 'yuanbao-zoom-controls';
            zoomControls.style.cssText = `
                position: absolute;
                bottom: 12px;
                right: 12px;
                display: flex;
                gap: 8px;
                opacity: 0;
                transition: opacity 0.3s;
                z-index: 3;
            `;

            const zoomInBtn = document.createElement('button');
            zoomInBtn.textContent = '+';
            zoomInBtn.style.cssText = `
                background: rgba(0, 0, 0, 0.8);
                color: white;
                border: none;
                width: 34px;
                height: 34px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 18px;
                display: ${CONFIG.enableZoom ? 'flex' : 'none'};
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(4px);
                transition: all 0.2s;
            `;
            zoomInBtn.title = '放大 (鼠标滚轮向上)';
            zoomInBtn.addEventListener('mouseenter', () => {
                zoomInBtn.style.background = 'rgba(0, 0, 0, 0.95)';
                zoomInBtn.style.transform = 'scale(1.1)';
            });
            zoomInBtn.addEventListener('mouseleave', () => {
                zoomInBtn.style.background = 'rgba(0, 0, 0, 0.8)';
                zoomInBtn.style.transform = 'scale(1)';
            });

            const zoomOutBtn = document.createElement('button');
            zoomOutBtn.textContent = '−';
            zoomOutBtn.style.cssText = `
                background: rgba(0, 0, 0, 0.8);
                color: white;
                border: none;
                width: 34px;
                height: 34px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 18px;
                display: ${CONFIG.enableZoom ? 'flex' : 'none'};
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(4px);
                transition: all 0.2s;
            `;
            zoomOutBtn.title = '缩小 (鼠标滚轮向下)';
            zoomOutBtn.addEventListener('mouseenter', () => {
                zoomOutBtn.style.background = 'rgba(0, 0, 0, 0.95)';
                zoomOutBtn.style.transform = 'scale(1.1)';
            });
            zoomOutBtn.addEventListener('mouseleave', () => {
                zoomOutBtn.style.background = 'rgba(0, 0, 0, 0.8)';
                zoomOutBtn.style.transform = 'scale(1)';
            });

            const resetBtn = document.createElement('button');
            resetBtn.textContent = '⟲';
            resetBtn.style.cssText = `
                background: rgba(0, 0, 0, 0.8);
                color: white;
                border: none;
                width: 34px;
                height: 34px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 18px;
                display: ${CONFIG.enableZoom ? 'flex' : 'none'};
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(4px);
                transition: all 0.2s;
            `;
            resetBtn.title = '重置缩放';
            resetBtn.addEventListener('mouseenter', () => {
                resetBtn.style.background = 'rgba(0, 0, 0, 0.95)';
                resetBtn.style.transform = 'scale(1.1)';
            });
            resetBtn.addEventListener('mouseleave', () => {
                resetBtn.style.background = 'rgba(0, 0, 0, 0.8)';
                resetBtn.style.transform = 'scale(1)';
            });

            zoomControls.appendChild(resetBtn);
            zoomControls.appendChild(zoomOutBtn);
            zoomControls.appendChild(zoomInBtn);

            this.imageContainer.appendChild(this.imageElement);
            this.imageContainer.appendChild(loading);
            this.imageContainer.appendChild(imageInfo);
            this.imageContainer.appendChild(closeBtn);
            this.imageContainer.appendChild(zoomControls);
            this.preview.appendChild(this.imageContainer);
            document.body.appendChild(this.preview);

            // 添加鼠标事件
            this.imageContainer.addEventListener('mouseenter', () => {
                if (CONFIG.enableZoom) {
                    zoomControls.style.opacity = '1';
                }
            });

            this.imageContainer.addEventListener('mouseleave', () => {
                if (CONFIG.enableZoom) {
                    zoomControls.style.opacity = '0';
                }
            });

            // 绑定缩放按钮事件
            zoomInBtn.addEventListener('click', () => {
                this.currentScale = Math.min(this.currentScale + 0.2, 3);
                this.updateImageTransform();
            });

            zoomOutBtn.addEventListener('click', () => {
                this.currentScale = Math.max(this.currentScale - 0.2, 0.5);
                this.updateImageTransform();
            });

            resetBtn.addEventListener('click', () => {
                this.currentScale = 1;
                this.updateImageTransform();
            });

            // 鼠标滚轮缩放
            this.imageContainer.addEventListener('wheel', (e) => {
                if (!CONFIG.enableZoom) return;
                
                e.preventDefault();
                if (e.deltaY < 0) {
                    // 向上滚动，放大
                    this.currentScale = Math.min(this.currentScale + 0.1, 3);
                } else {
                    // 向下滚动，缩小
                    this.currentScale = Math.max(this.currentScale - 0.1, 0.5);
                }
                this.updateImageTransform();
            });
        }

        setupResizeObserver() {
            if (CONFIG.enableResize) {
                // 监听窗口大小变化
                window.addEventListener('resize', () => {
                    if (this.windowResizeTimeout) {
                        clearTimeout(this.windowResizeTimeout);
                    }
                    this.windowResizeTimeout = setTimeout(() => {
                        if (this.currentElement && this.preview.style.display !== 'none') {
                            this.adjustPreviewSizeAndPosition();
                        }
                    }, 150); // 防抖处理
                });
            }
        }

        adjustPreviewSizeAndPosition() {
            if (!this.currentElement || !this.originalImageSize.width || !this.originalImageSize.height) {
                return;
            }
            
            const imageSize = this.calculateOptimalSize();
            this.applyImageSize(imageSize);
        }

        calculateOptimalSize() {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // 计算基于窗口的最大尺寸
            const maxWidth = Math.max(
                Math.floor(viewportWidth * CONFIG.maxWidthPercentage) - CONFIG.padding * 2,
                CONFIG.minPreviewSize
            );
            const maxHeight = Math.max(
                Math.floor(viewportHeight * CONFIG.maxHeightPercentage) - CONFIG.padding * 2,
                CONFIG.minPreviewSize
            );
            const minWidth = Math.max(
                Math.floor(viewportWidth * CONFIG.minWidthPercentage),
                CONFIG.minPreviewSize
            );
            const minHeight = Math.max(
                Math.floor(viewportHeight * CONFIG.minHeightPercentage),
                CONFIG.minPreviewSize
            );
            
            return calculateBestSize(
                this.originalImageSize.width,
                this.originalImageSize.height,
                maxWidth,
                maxHeight,
                minWidth,
                minHeight
            );
        }

        applyImageSize(size) {
            if (!size || !this.imageContainer || !this.imageElement) return;
            
            // 设置容器和图片尺寸
            this.imageContainer.style.width = `${size.width}px`;
            this.imageContainer.style.height = `${size.height}px`;
            this.imageElement.style.width = `${size.width}px`;
            this.imageElement.style.height = `${size.height}px`;
            
            // 更新缩放变换
            this.updateImageTransform();
        }

        updateImageTransform() {
            if (this.imageElement) {
                this.imageElement.style.transform = `scale(${this.currentScale})`;
            }
        }

        bindEvents() {
            // 鼠标移动时清除定时器
            document.addEventListener('mousemove', (e) => {
                this.clearTimer();
                
                const element = e.target;
                if (!this.isValidElement(element)) {
                    this.hide();
                    return;
                }

                this.currentElement = element;
                this.startTimer();
            });

            // 点击预览图关闭
            this.preview.addEventListener('click', (e) => {
                if (e.target.id === 'yuanbao-preview-close' || e.target === this.preview) {
                    this.hide();
                }
            });

            // ESC键关闭
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hide();
                }
            });

            // 防止图片点击事件冒泡
            this.imageElement.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        isValidElement(element) {
            if (!element) return false;
            if (isElementExcluded(element)) return false;
            
            const url = getImageUrl(element);
            if (!url || !isImageUrl(url)) return false;
            
            return true;
        }

        startTimer() {
            this.clearTimer();
            this.timer = setTimeout(() => {
                this.showPreview();
            }, CONFIG.hoverDelay);
        }

        clearTimer() {
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
        }

        async showPreview() {
            if (!this.currentElement) return;
            
            const originalUrl = getImageUrl(this.currentElement);
            if (!originalUrl) return;
            
            this.isLoading = true;
            this.showLoading();
            
            try {
                const img = await this.loadImage(originalUrl);
                this.originalImageSize = {
                    width: img.naturalWidth || img.width,
                    height: img.naturalHeight || img.height
                };
                
                this.adjustPreviewSizeAndPosition();
                this.showImage(originalUrl);
            } catch (error) {
                console.warn('加载图片失败:', error);
                this.showError('图片加载失败');
            } finally {
                this.isLoading = false;
                this.hideLoading();
            }
        }

        loadImage(url) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('图片加载失败'));
                img.crossOrigin = 'anonymous';
                img.src = url;
            });
        }

        showLoading() {
            const loading = this.preview.querySelector('#yuanbao-preview-loading');
            if (loading) {
                loading.style.display = 'block';
            }
        }

        hideLoading() {
            const loading = this.preview.querySelector('#yuanbao-preview-loading');
            if (loading) {
                loading.style.display = 'none';
            }
        }

        showError(message) {
            const imageInfo = this.preview.querySelector('#yuanbao-preview-info');
            if (imageInfo) {
                imageInfo.textContent = message;
                imageInfo.style.display = 'block';
                imageInfo.style.background = 'rgba(255, 50, 50, 0.8)';
            }
        }

        showImage(originalUrl) {
            const imageInfo = this.preview.querySelector('#yuanbao-preview-info');
            
            // 重置缩放
            this.currentScale = 1;
            this.updateImageTransform();
            
            // 设置图片
            this.imageElement.src = originalUrl;
            this.imageElement.alt = this.currentElement.alt || '原图预览';
            
            // 显示图片信息
            if (CONFIG.showImageInfo) {
                const fileName = originalUrl.split('/').pop().split('?')[0];
                const fileType = fileName.split('.').pop().toUpperCase();
                imageInfo.textContent = `${fileName} | ${this.originalImageSize.width}×${this.originalImageSize.height} | ${fileType}`;
                imageInfo.style.display = 'block';
                imageInfo.style.background = 'rgba(0, 0, 0, 0.8)';
            }
            
            this.preview.style.display = 'flex';
            this.preview.style.alignItems = 'center';
            this.preview.style.justifyContent = 'center';
            this.preview.style.opacity = '0';
            this.preview.style.transform = 'translate(-50%, -50%) scale(0.95)';
            
            // 淡入和缩放效果
            requestAnimationFrame(() => {
                this.preview.style.opacity = '1';
                this.preview.style.transform = 'translate(-50%, -50%) scale(1)';
            });
        }

        hide() {
            this.clearTimer();
            this.currentElement = null;
            this.currentScale = 1;
            
            if (this.preview) {
                this.preview.style.opacity = '0';
                this.preview.style.transform = 'translate(-50%, -50%) scale(0.95)';
                setTimeout(() => {
                    this.preview.style.display = 'none';
                }, CONFIG.animationDuration);
            }
        }
    }

    // 初始化
    let previewManager = null;
    
    function initScript() {
        if (previewManager) return;
        
        // 检查是否已存在预览元素
        if (document.getElementById('yuanbao-image-preview')) {
            document.getElementById('yuanbao-image-preview').remove();
        }
        
        previewManager = new ImagePreview();
        console.log('原图查看器修复版已加载');
    }

    // 等待DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScript);
    } else {
        initScript();
    }

    // 导出到全局，方便调试
    window.YuanbaoImagePreview = {
        getInstance: () => previewManager,
        config: CONFIG,
        // 提供切换背景类型的方法
        setTransparentBgType: function(type) {
            if (['checkerboard', 'solid', 'none'].includes(type)) {
                CONFIG.transparentBgType = type;
                console.log(`透明背景类型已切换为: ${type}`);
                
                // 重新设置图片容器背景
                const imageContainer = document.getElementById('yuanbao-image-container');
                if (imageContainer) {
                    let containerBackground = CONFIG.containerBgColor; // 默认使用深灰色
                    
                    if (CONFIG.transparentBgType === 'checkerboard') {
                        containerBackground = createTransparentBackground();
                    } else if (CONFIG.transparentBgType === 'solid') {
                        containerBackground = 'rgba(240, 240, 240, 0.5)'; // 浅灰色半透明背景
                    } else if (CONFIG.transparentBgType === 'none') {
                        containerBackground = 'transparent';
                    }
                    
                    imageContainer.style.background = containerBackground;
                }
            }
        },
        // 提供设置容器背景色的方法
        setContainerBgColor: function(color) {
            CONFIG.containerBgColor = color;
            const imageContainer = document.getElementById('yuanbao-image-container');
            if (imageContainer && CONFIG.transparentBgType !== 'checkerboard' && CONFIG.transparentBgType !== 'solid') {
                imageContainer.style.background = color;
            }
        }
    };
})();
