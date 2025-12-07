// ==UserScript==
// @name         视频播放速度控制器 v3
// @namespace    https://github.com/tencent
// @version      1.2
// @description  修复点击暂停问题，优化事件处理，快捷设置视频播放速度
// @author       腾讯元宝
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 配置
    const CONFIG = {
        defaultSpeed: 1.5,          // 默认速度
        speedOptions: [0.75, 1, 1.5, 2],  // 循环切换速度
        storageKey: 'videoSpeedCustomSpeeds',
        indicator: {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            textColor: '#ffffff',
            bgColor: 'rgba(0, 0, 0, 0.3)',  // 半透明背景
            padding: '4px 8px',
            borderRadius: '4px',
            zIndex: 2147483647  // 最大z-index值
        }
    };

    // 状态管理
    const state = {
        currentSpeed: CONFIG.defaultSpeed,
        videoMap: new Map(),  // video元素 -> 指示器元素
        videoSpeedMap: new Map(),  // 记录各个视频的速度状态
        observer: null,
        customSpeeds: JSON.parse(localStorage.getItem(CONFIG.storageKey) || '[]'),
        initialized: false,
        isSettingSpeed: false,  // 防止重复设置
        clickTimeout: null
    };

    // 主功能类
    class VideoSpeedController {
        constructor() {
            this.init();
        }

        // 初始化
        init() {
            if (state.initialized) return;
            
            // 设置默认速度
            this.setGlobalSpeed(CONFIG.defaultSpeed);
            
            // 监听页面加载完成
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.onPageReady());
            } else {
                this.onPageReady();
            }
            
            // 监听页面变化
            this.setupSPASupport();
            
            // 添加全局样式
            this.addGlobalStyles();
            
            state.initialized = true;
        }

        // 页面准备就绪
        onPageReady() {
            // 查找并处理现有视频
            this.processExistingVideos();
            
            // 设置DOM观察器
            this.setupMutationObserver();
            
            // 监听页面可见性变化
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    setTimeout(() => this.processExistingVideos(), 100);
                }
            });
        }

        // 处理现有视频元素
        processExistingVideos() {
            const videos = document.querySelectorAll('video');
            videos.forEach(video => this.addVideoController(video));
            
            // 清理无效的视频条目
            this.cleanupInvalidVideos();
        }

        // 清理无效的视频条目
        cleanupInvalidVideos() {
            for (const [video, indicator] of state.videoMap.entries()) {
                if (!this.isVideoValid(video)) {
                    this.removeVideoController(video);
                }
            }
        }

        // 添加视频控制器
        addVideoController(video) {
            if (state.videoMap.has(video) || !this.isVideoValid(video)) {
                return;
            }

            // 恢复保存的速度（如果有的话）
            const savedSpeed = state.videoSpeedMap.get(video.src) || state.currentSpeed;
            
            // 应用速度到视频
            this.applySpeedToVideo(video, savedSpeed);
            
            // 创建速度指示器
            this.createSpeedIndicator(video);
            
            // 监听视频属性变化
            this.watchVideoChanges(video);
        }

        // 检查视频是否有效
        isVideoValid(video) {
            if (!video || video.tagName !== 'VIDEO') return false;
            
            // 检查视频是否在DOM中
            if (!document.contains(video)) return false;
            
            // 检查视频是否可见
            const style = window.getComputedStyle(video);
            if (style.display === 'none' || style.visibility === 'hidden') {
                return false;
            }
            
            return true;
        }

        // 应用速度到视频
        applySpeedToVideo(video, speed) {
            if (state.isSettingSpeed) return;
            
            try {
                state.isSettingSpeed = true;
                video.playbackRate = speed;
                video.defaultPlaybackRate = speed;
                
                // 保存这个视频的速度
                if (video.src) {
                    state.videoSpeedMap.set(video.src, speed);
                }
                
                // 如果视频正在播放，确保不会暂停
                if (!video.paused) {
                    const currentTime = video.currentTime;
                    video.play().then(() => {
                        video.currentTime = currentTime;
                    }).catch(() => {
                        // 忽略播放错误
                    });
                }
                
                // 更新全局状态
                state.currentSpeed = speed;
            } catch (error) {
                console.warn('设置视频速度失败:', error);
            } finally {
                setTimeout(() => {
                    state.isSettingSpeed = false;
                }, 10);
            }
        }

        // 创建速度指示器
        createSpeedIndicator(video) {
            // 检查是否已存在指示器
            if (state.videoMap.has(video)) {
                return;
            }
            
            // 创建指示器容器
            const indicator = document.createElement('div');
            indicator.className = 'video-speed-indicator';
            indicator.dataset.videoId = this.getVideoId(video);
            
            // 设置样式
            Object.assign(indicator.style, {
                position: 'absolute',
                left: '10px',
                top: '10px',
                fontSize: CONFIG.indicator.fontSize,
                fontFamily: CONFIG.indicator.fontFamily,
                color: CONFIG.indicator.textColor,
                backgroundColor: CONFIG.indicator.bgColor,
                padding: CONFIG.indicator.padding,
                borderRadius: CONFIG.indicator.borderRadius,
                zIndex: CONFIG.indicator.zIndex.toString(),
                cursor: 'pointer',
                userSelect: 'none',
                opacity: '0.9',
                transition: 'opacity 0.3s, transform 0.2s',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                pointerEvents: 'auto',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                touchAction: 'none'  // 防止触摸事件
            });

            // 更新显示内容
            this.updateIndicatorText(indicator, state.currentSpeed);
            
            // 获取视频容器
            const container = this.getVideoContainer(video);
            if (!container) return;
            
            // 设置容器样式
            this.setupContainerStyle(container);
            
            // 添加到容器
            container.appendChild(indicator);
            state.videoMap.set(video, indicator);
            
            // 事件监听
            this.bindIndicatorEvents(indicator, video);
            
            // 悬停效果
            this.setupHoverEffects(indicator);
            
            // 初始定位
            this.positionIndicator(indicator, container);
        }

        // 获取视频容器
        getVideoContainer(video) {
            // 尝试找到最近的定位容器
            let container = video.parentElement;
            let maxDepth = 5; // 限制查找深度
            
            while (container && maxDepth-- > 0) {
                const style = window.getComputedStyle(container);
                if (style.position !== 'static' || 
                    style.display === 'flex' || 
                    style.display === 'grid' ||
                    container.clientWidth > video.clientWidth * 0.8) {
                    return container;
                }
                container = container.parentElement;
            }
            
            return video.parentElement;
        }

        // 设置容器样式
        setupContainerStyle(container) {
            if (!container) return;
            
            const style = window.getComputedStyle(container);
            if (style.position === 'static') {
                container.style.position = 'relative';
            }
        }

        // 定位指示器
        positionIndicator(indicator, container) {
            if (!indicator || !container) return;
            
            // 确保指示器不会超出容器边界
            const containerRect = container.getBoundingClientRect();
            const indicatorRect = indicator.getBoundingClientRect();
            
            if (containerRect.width > 0 && containerRect.height > 0) {
                // 计算最佳位置
                const left = Math.min(10, containerRect.width - indicatorRect.width - 10);
                const top = Math.min(10, containerRect.height - indicatorRect.height - 10);
                
                indicator.style.left = `${Math.max(5, left)}px`;
                indicator.style.top = `${Math.max(5, top)}px`;
            }
        }

        // 绑定指示器事件
        bindIndicatorEvents(indicator, video) {
            // 清除已有的事件监听器
            indicator._clickHandler = (e) => this.handleIndicatorClick(e, video);
            indicator._contextMenuHandler = (e) => this.handleIndicatorContextMenu(e, video);
            indicator._mouseDownHandler = (e) => this.handleIndicatorMouseDown(e);
            indicator._doubleClickHandler = (e) => this.handleIndicatorDoubleClick(e);
            
            // 添加事件监听器
            indicator.addEventListener('click', indicator._clickHandler, true);  // 使用捕获阶段
            indicator.addEventListener('contextmenu', indicator._contextMenuHandler, true);
            indicator.addEventListener('mousedown', indicator._mouseDownHandler, true);
            indicator.addEventListener('dblclick', indicator._doubleClickHandler, true);
        }

        // 处理指示器点击
        handleIndicatorClick(e, video) {
            e.stopImmediatePropagation();
            e.stopPropagation();
            e.preventDefault();
            
            // 清除之前的超时
            if (state.clickTimeout) {
                clearTimeout(state.clickTimeout);
                state.clickTimeout = null;
            }
            
            // 延迟执行，避免与双击冲突
            state.clickTimeout = setTimeout(() => {
                this.cycleSpeed(video);
            }, 300);
        }

        // 处理指示器右键菜单
        handleIndicatorContextMenu(e, video) {
            e.stopImmediatePropagation();
            e.stopPropagation();
            e.preventDefault();
            
            this.showCustomSpeedDialog(video);
            return false;
        }

        // 处理指示器鼠标按下
        handleIndicatorMouseDown(e) {
            e.stopImmediatePropagation();
            e.stopPropagation();
            e.preventDefault();
            
            // 阻止文本选择
            if (e.button === 0) {  // 左键
                e.preventDefault();
            }
        }

        // 处理指示器双击
        handleIndicatorDoubleClick(e) {
            e.stopImmediatePropagation();
            e.stopPropagation();
            e.preventDefault();
            
            // 清除单击的超时
            if (state.clickTimeout) {
                clearTimeout(state.clickTimeout);
                state.clickTimeout = null;
            }
            
            this.setGlobalSpeed(CONFIG.defaultSpeed);
        }

        // 设置悬停效果
        setupHoverEffects(indicator) {
            indicator._mouseEnterHandler = () => {
                indicator.style.opacity = '1';
                indicator.style.transform = 'scale(1.1)';
            };
            
            indicator._mouseLeaveHandler = () => {
                indicator.style.opacity = '0.9';
                indicator.style.transform = 'scale(1)';
            };
            
            indicator.addEventListener('mouseenter', indicator._mouseEnterHandler);
            indicator.addEventListener('mouseleave', indicator._mouseLeaveHandler);
        }

        // 循环切换速度
        cycleSpeed(video) {
            const currentIndex = CONFIG.speedOptions.indexOf(state.currentSpeed);
            const nextIndex = (currentIndex + 1) % CONFIG.speedOptions.length;
            const newSpeed = CONFIG.speedOptions[nextIndex];
            
            this.setGlobalSpeed(newSpeed, video);
        }

        // 设置全局速度
        setGlobalSpeed(speed, sourceVideo = null) {
            // 如果正在设置速度，则跳过
            if (state.isSettingSpeed) return;
            
            state.currentSpeed = speed;
            
            // 应用到所有视频
            for (const [video] of state.videoMap.entries()) {
                // 如果是源视频触发，确保先处理它
                if (video === sourceVideo) {
                    this.applySpeedToVideo(video, speed);
                } else {
                    setTimeout(() => {
                        this.applySpeedToVideo(video, speed);
                    }, 0);
                }
            }
            
            // 更新所有指示器
            this.updateAllIndicators();
        }

        // 更新所有指示器
        updateAllIndicators() {
            for (const [video, indicator] of state.videoMap.entries()) {
                if (indicator && indicator.isConnected) {
                    this.updateIndicatorText(indicator, state.currentSpeed);
                } else {
                    // 移除无效的指示器
                    state.videoMap.delete(video);
                }
            }
        }

        // 更新指示器文本
        updateIndicatorText(indicator, speed) {
            indicator.textContent = `${speed.toFixed(2)}x`;
            indicator.title = `当前: ${speed.toFixed(2)}倍速\n左键点击切换: ${CONFIG.speedOptions.join(' → ')}\n右键自定义速度\n双击重置为${CONFIG.defaultSpeed}x`;
        }

        // 显示自定义速度对话框
        showCustomSpeedDialog(video) {
            const speed = prompt(
                '请输入自定义播放速度 (0.1 - 16):\n\n' +
                '预设速度: ' + CONFIG.speedOptions.join(', ') + '\n' +
                '历史自定义: ' + (state.customSpeeds.slice(-5).join(', ') || '无'),
                state.currentSpeed.toString()
            );
            
            if (speed !== null) {
                const newSpeed = parseFloat(speed);
                if (!isNaN(newSpeed) && newSpeed >= 0.1 && newSpeed <= 16) {
                    this.setGlobalSpeed(newSpeed, video);
                    
                    // 保存到自定义历史
                    if (!state.customSpeeds.includes(newSpeed)) {
                        state.customSpeeds.push(newSpeed);
                        if (state.customSpeeds.length > 10) {
                            state.customSpeeds.shift();
                        }
                        localStorage.setItem(CONFIG.storageKey, JSON.stringify(state.customSpeeds));
                    }
                } else {
                    alert('请输入有效的速度值 (0.1 - 16)');
                }
            }
        }

        // 设置DOM变化观察器
        setupMutationObserver() {
            if (state.observer) {
                state.observer.disconnect();
            }

            state.observer = new MutationObserver((mutations) => {
                let shouldProcess = false;
                
                for (const mutation of mutations) {
                    // 检查新增节点
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName === 'VIDEO') {
                                shouldProcess = true;
                            } else if (node.querySelectorAll) {
                                const videos = node.querySelectorAll('video');
                                if (videos.length > 0) {
                                    shouldProcess = true;
                                }
                            }
                        }
                    }
                    
                    // 检查属性变化
                    if (mutation.type === 'attributes' && 
                        mutation.target.tagName === 'VIDEO') {
                        shouldProcess = true;
                    }
                }
                
                if (shouldProcess) {
                    // 延迟处理，确保DOM完全更新
                    setTimeout(() => this.processExistingVideos(), 100);
                }
            });

            // 开始观察
            state.observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['src', 'style', 'class']
            });
        }

        // 监听视频变化
        watchVideoChanges(video) {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'attributes') {
                        // 视频属性变化，重新定位指示器
                        const indicator = state.videoMap.get(video);
                        if (indicator) {
                            const container = this.getVideoContainer(video);
                            if (container) {
                                this.positionIndicator(indicator, container);
                            }
                        }
                        
                        // 如果是src变化，保持速度
                        if (mutation.attributeName === 'src') {
                            const savedSpeed = state.videoSpeedMap.get(video.src) || state.currentSpeed;
                            setTimeout(() => {
                                this.applySpeedToVideo(video, savedSpeed);
                            }, 100);
                        }
                    }
                }
            });

            observer.observe(video, {
                attributes: true,
                attributeFilter: ['src', 'width', 'height', 'style', 'class']
            });
            
            // 存储观察器
            video._speedControllerObserver = observer;
        }

        // 移除视频控制器
        removeVideoController(video) {
            const indicator = state.videoMap.get(video);
            if (indicator) {
                // 移除事件监听器
                if (indicator._clickHandler) {
                    indicator.removeEventListener('click', indicator._clickHandler, true);
                }
                if (indicator._contextMenuHandler) {
                    indicator.removeEventListener('contextmenu', indicator._contextMenuHandler, true);
                }
                if (indicator._mouseDownHandler) {
                    indicator.removeEventListener('mousedown', indicator._mouseDownHandler, true);
                }
                if (indicator._doubleClickHandler) {
                    indicator.removeEventListener('dblclick', indicator._doubleClickHandler, true);
                }
                if (indicator._mouseEnterHandler) {
                    indicator.removeEventListener('mouseenter', indicator._mouseEnterHandler);
                }
                if (indicator._mouseLeaveHandler) {
                    indicator.removeEventListener('mouseleave', indicator._mouseLeaveHandler);
                }
                
                // 移除指示器元素
                if (indicator.parentElement) {
                    indicator.parentElement.removeChild(indicator);
                }
            }
            
            // 清理观察器
            if (video._speedControllerObserver) {
                video._speedControllerObserver.disconnect();
                delete video._speedControllerObserver;
            }
            
            // 从映射中移除
            state.videoMap.delete(video);
        }

        // 生成视频ID
        getVideoId(video) {
            if (!video.dataset.speedControllerId) {
                video.dataset.speedControllerId = 'video_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            }
            return video.dataset.speedControllerId;
        }

        // 设置SPA应用支持
        setupSPASupport() {
            // 监听history变化
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;

            if (originalPushState) {
                history.pushState = function(...args) {
                    originalPushState.apply(this, args);
                    window.dispatchEvent(new Event('locationchange'));
                };
            }

            if (originalReplaceState) {
                history.replaceState = function(...args) {
                    originalReplaceState.apply(this, args);
                    window.dispatchEvent(new Event('locationchange'));
                };
            }

            window.addEventListener('popstate', () => {
                window.dispatchEvent(new Event('locationchange'));
            });

            // 页面变化时重新处理视频
            window.addEventListener('locationchange', () => {
                // 延迟重新处理
                setTimeout(() => {
                    this.processExistingVideos();
                }, 1500);
            });
        }

        // 添加全局样式
        addGlobalStyles() {
            const style = document.createElement('style');
            style.textContent = `
                .video-speed-indicator {
                    position: absolute !important;
                    z-index: ${CONFIG.indicator.zIndex} !important;
                    pointer-events: auto !important;
                }
                
                .video-speed-indicator:hover {
                    opacity: 1 !important;
                    transform: scale(1.1) !important;
                }
                
                /* 防止指示器遮挡视频控制 */
                video::-webkit-media-controls {
                    z-index: 999998 !important;
                }
                
                /* 确保指示器不会影响视频点击 */
                .video-speed-indicator:active {
                    transform: scale(0.95) !important;
                }
            `;
            
            if (!document.querySelector('#video-speed-controller-styles')) {
                style.id = 'video-speed-controller-styles';
                document.head.appendChild(style);
            }
        }
    }

    // 初始化控制器
    const initController = () => {
        if (!window.videoSpeedControllerInstance) {
            window.videoSpeedControllerInstance = new VideoSpeedController();
            
            // 导出到全局，方便调试
            window.videoSpeedController = {
                getCurrentSpeed: () => state.currentSpeed,
                setSpeed: (speed) => window.videoSpeedControllerInstance.setGlobalSpeed(speed),
                getCustomSpeeds: () => [...state.customSpeeds],
                refresh: () => window.videoSpeedControllerInstance.processExistingVideos(),
                getVideoCount: () => state.videoMap.size
            };
        }
    };

    // 延迟初始化，确保页面完全加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initController);
    } else {
        // 如果页面已加载，延迟一点以确保动态内容
        setTimeout(initController, 1000);
    }

    // 也监听window.load事件
    window.addEventListener('load', initController);

    console.log('视频速度控制器 v1.2 已加载，默认速度: ' + CONFIG.defaultSpeed + 'x');
})();
