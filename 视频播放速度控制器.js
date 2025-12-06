// ==UserScript==
// @name         视频播放速度控制器
// @namespace    https://github.com/your-namespace
// @version      2.3.0
// @description  自动控制网页视频播放速度，支持多视频，点击速度指示器切换预设速度
// @author       VideoSpeedController
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @license      MIT
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 配置存储
    const CONFIG = {
        defaultSpeed: 1.5,
        minSpeed: 0.1,
        maxSpeed: 16.0,
        step: 0.1,
        storageKey: 'videoSpeedConfig',
        autoApplySpeed: true,
        videoDetectionInterval: 1000, // 视频检测间隔（毫秒）
        presetSpeeds: [0.75, 1.0, 1.5, 2.0], // 点击循环切换的速度预设
        indicatorDisplayDuration: 0, // 指示器显示时间（毫秒），0表示一直显示
        indicatorPosition: 'left', // 指示器位置：'left'（左侧垂直居中），'top-left'（左上角）
        showSpeedBadge: true, // 是否显示速度徽章
        enableAutoSpeed: true, // 是否启用自动速度控制
        indicatorOpacity: 0.7, // 指示器默认透明度
        indicatorHoverOpacity: 0.9, // 鼠标悬停时的透明度
        indicatorMinOpacity: 0.4 // 最小透明度
    };

    // 当前状态
    let state = {
        videos: new Map(),
        globalSpeed: GM_getValue(CONFIG.storageKey, CONFIG.defaultSpeed) || CONFIG.defaultSpeed,
        detectionInterval: null,
        indicators: new Map(), // 存储视频与其指示器的映射
        speedPresetIndex: 0, // 当前预设速度索引
        isHoveringIndicator: false // 是否正在悬停在指示器上
    };

    // 样式定义
    const STYLES = `
        .video-speed-indicator {
            position: absolute;
            left: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 13px;
            font-weight: 600;
            z-index: 10000;
            pointer-events: auto;
            cursor: pointer;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            opacity: ${CONFIG.indicatorOpacity};
            transition: all 0.2s ease;
            user-select: none;
            min-width: 60px;
            text-align: center;
            white-space: nowrap;
        }

        .video-speed-indicator:hover {
            opacity: ${CONFIG.indicatorHoverOpacity};
            background: rgba(0, 0, 0, 0.9);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            transform: translateY(-50%) scale(1.05);
        }

        .video-speed-indicator:active {
            transform: translateY(-50%) scale(0.95);
            opacity: 0.9;
        }

        .video-speed-indicator.speed-075x {
            background: rgba(66, 133, 244, 0.7);
            border-color: rgba(66, 133, 244, 0.5);
        }

        .video-speed-indicator.speed-075x:hover {
            background: rgba(66, 133, 244, 0.9);
        }

        .video-speed-indicator.speed-10x {
            background: rgba(52, 168, 83, 0.7);
            border-color: rgba(52, 168, 83, 0.5);
        }

        .video-speed-indicator.speed-10x:hover {
            background: rgba(52, 168, 83, 0.9);
        }

        .video-speed-indicator.speed-15x {
            background: rgba(251, 188, 4, 0.7);
            border-color: rgba(251, 188, 4, 0.5);
        }

        .video-speed-indicator.speed-15x:hover {
            background: rgba(251, 188, 4, 0.9);
        }

        .video-speed-indicator.speed-20x {
            background: rgba(234, 67, 53, 0.7);
            border-color: rgba(234, 67, 53, 0.5);
        }

        .video-speed-indicator.speed-20x:hover {
            background: rgba(234, 67, 53, 0.9);
        }

        .video-speed-indicator.speed-custom {
            background: rgba(123, 31, 162, 0.7);
            border-color: rgba(123, 31, 162, 0.5);
        }

        .video-speed-indicator.speed-custom:hover {
            background: rgba(123, 31, 162, 0.9);
        }

        /* 小屏幕适应 */
        @media (max-width: 768px) {
            .video-speed-indicator {
                padding: 6px 10px;
                font-size: 12px;
                min-width: 50px;
                left: 5px;
                opacity: ${CONFIG.indicatorOpacity};
            }
            
            .video-speed-indicator:hover {
                opacity: ${CONFIG.indicatorHoverOpacity};
            }
        }

        /* 极小屏幕隐藏指示器文本，只显示图标或缩写 */
        @media (max-width: 480px) {
            .video-speed-indicator {
                padding: 4px 6px;
                font-size: 11px;
                min-width: 40px;
                border-radius: 4px;
                opacity: ${CONFIG.indicatorOpacity};
            }
            
            .video-speed-indicator:hover {
                min-width: 60px;
                font-size: 12px;
                opacity: ${CONFIG.indicatorHoverOpacity};
            }
        }

        /* 视频播放时降低透明度 */
        .video-speed-indicator.video-playing {
            opacity: ${CONFIG.indicatorMinOpacity};
        }

        .video-speed-indicator.video-playing:hover {
            opacity: ${CONFIG.indicatorHoverOpacity};
        }

        /* 视频悬停时提高透明度 */
        video:hover + .video-speed-indicator,
        iframe:hover + .video-speed-indicator,
        video:hover ~ .video-speed-indicator,
        iframe:hover ~ .video-speed-indicator {
            opacity: ${CONFIG.indicatorHoverOpacity} !important;
        }

        .video-speed-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: rgba(26, 26, 26, 0.95);
            color: white;
            border-left: 4px solid #4a9eff;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            z-index: 1000000;
            animation: speedNotificationSlideIn 0.3s ease, speedNotificationFadeOut 0.3s ease 2.7s forwards;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }

        /* 针对弹幕网站的特殊样式 - 提高透明度 */
        .bilibili-player .video-speed-indicator,
        .bpx-player-container .video-speed-indicator,
        [class*="danmaku"] .video-speed-indicator,
        [class*="danmu"] .video-speed-indicator {
            z-index: 10001 !important; /* 确保在弹幕之上 */
            background: rgba(0, 0, 0, 0.7) !important;
            border: 2px solid rgba(255, 255, 255, 0.3) !important;
        }

        /* 针对YouTube的特殊样式 */
        .ytp-chrome-bottom .video-speed-indicator,
        .html5-video-player .video-speed-indicator {
            z-index: 9999 !important;
        }

        /* 隐藏时的样式 */
        .video-speed-indicator.hidden {
            opacity: 0;
            pointer-events: none;
            transform: translateY(-50%) scale(0.8);
        }

        .video-speed-indicator.fade-out {
            animation: indicatorFadeOut 0.3s ease forwards;
        }

        @keyframes speedNotificationSlideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        @keyframes speedNotificationFadeOut {
            to { opacity: 0; transform: translateX(20px); }
        }

        @keyframes indicatorFadeOut {
            to { opacity: 0; transform: translateY(-50%) scale(0.8); }
        }
    `;

    // 添加样式到页面
    GM_addStyle(STYLES);

    // 工具函数
    const utils = {
        // 显示通知
        showNotification(message, duration = 3000) {
            // 移除已有的通知
            const existingNotification = document.querySelector('.video-speed-notification');
            if (existingNotification) {
                existingNotification.remove();
            }
            
            const notification = document.createElement('div');
            notification.className = 'video-speed-notification';
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, duration);
        },

        // 生成随机ID
        generateId() {
            return Math.random().toString(36).substr(2, 9);
        },

        // 获取视频名称
        getVideoName(video) {
            if (video.id) return `#${video.id}`;
            if (video.src) {
                const src = video.src.split('/').pop();
                if (src.length > 20) return src.substring(0, 20) + '...';
                return src;
            }
            if (video.title) return video.title;
            if (video.ariaLabel) return video.ariaLabel;
            if (video.getAttribute('title')) return video.getAttribute('title');
            
            // 从父元素查找可能的描述
            const parent = video.parentElement;
            if (parent) {
                const title = parent.querySelector('video[title], [title]');
                if (title) return title.title;
            }
            
            return '视频';
        },

        // 限制数值范围
        clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        },

        // 格式化速度值
        formatSpeed(speed) {
            return `${speed.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}x`;
        },

        // 获取速度对应的CSS类名
        getSpeedClass(speed) {
            if (Math.abs(speed - 0.75) < 0.01) return 'speed-075x';
            if (Math.abs(speed - 1.0) < 0.01) return 'speed-10x';
            if (Math.abs(speed - 1.5) < 0.01) return 'speed-15x';
            if (Math.abs(speed - 2.0) < 0.01) return 'speed-20x';
            return 'speed-custom';
        },

        // 检查元素是否为视频元素
        isVideoElement(element) {
            if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
            
            // 标准video元素
            if (element.tagName === 'VIDEO') return true;
            
            // 检查iframe中的视频
            if (element.tagName === 'IFRAME') {
                const src = (element.src || '').toLowerCase();
                return src.includes('youtube.com') || 
                       src.includes('youtube-nocookie.com') ||
                       src.includes('youtu.be') ||
                       src.includes('vimeo.com') ||
                       src.includes('bilibili.com') ||
                       src.includes('player.twitch.tv') ||
                       src.includes('twitch.tv') ||
                       src.includes('dailymotion.com') ||
                       src.includes('netflix.com') ||
                       src.includes('hulu.com') ||
                       src.includes('disneyplus.com') ||
                       src.includes('hbomax.com') ||
                       src.includes('amazon.com') ||
                       src.includes('primevideo.com');
            }
            
            // 检查其他可能的视频容器
            if (element.hasAttribute('data-video') || 
                element.hasAttribute('data-player') ||
                element.classList.contains('video') ||
                element.classList.contains('player') ||
                element.classList.contains('vp') ||
                element.classList.contains('jw') ||
                element.classList.contains('video-js') ||
                element.classList.contains('vjs-') ||
                element.classList.contains('html5-video-player') ||
                element.classList.contains('ytp-') ||
                element.getAttribute('data-youtube-id')) {
                return true;
            }
            
            // 检查具有视频属性的元素
            if (element.hasAttribute('poster') || 
                element.hasAttribute('preload') ||
                element.hasAttribute('playsinline') ||
                element.hasAttribute('webkit-playsinline') ||
                element.hasAttribute('controls')) {
                return true;
            }
            
            return false;
        },

        // 查找页面中所有可能的视频元素
        findAllVideoElements() {
            const videos = new Set();
            
            // 查找标准video元素
            document.querySelectorAll('video').forEach(video => videos.add(video));
            
            // 查找iframe中的视频
            const videoSelectors = [
                'iframe',
                'object',
                'embed',
                '[data-video]',
                '[data-player]',
                '.video',
                '.player',
                '.vp',
                '.jw',
                '.video-js',
                '[class*="vjs-"]',
                '.html5-video-player',
                '[class*="ytp-"]',
                '[data-youtube-id]',
                'video[poster]',
                'video[controls]',
                '[data-component="video-player"]',
                '[role="video"]',
                '[aria-label*="video"]',
                '[aria-label*="player"]'
            ];
            
            videoSelectors.forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach(element => {
                        if (utils.isVideoElement(element)) {
                            videos.add(element);
                        }
                    });
                } catch (e) {
                    // 忽略无效的选择器
                }
            });
            
            return Array.from(videos);
        },

        // 获取下一个预设速度
        getNextPresetSpeed(currentSpeed) {
            const presets = CONFIG.presetSpeeds;
            const currentIndex = presets.findIndex(speed => Math.abs(speed - currentSpeed) < 0.01);
            
            if (currentIndex >= 0) {
                // 当前速度是预设值，切换到下一个
                return presets[(currentIndex + 1) % presets.length];
            } else {
                // 当前速度不是预设值，切换到第一个预设值
                return presets[0];
            }
        },

        // 检查是否在弹幕网站
        isDanmakuSite() {
            const hostname = window.location.hostname;
            return hostname.includes('bilibili.com') || 
                   hostname.includes('acfun.cn') || 
                   hostname.includes('niconico.jp') ||
                   hostname.includes('nicovideo.jp');
        }
    };

    // 视频管理类
    class VideoManager {
        constructor() {
            this.observer = null;
            this.videoIndicators = new Map();
        }

        // 初始化
        init() {
            this.setupObserver();
            this.processExistingVideos();
            this.applyGlobalSpeed();
            this.startDetectionLoop();
        }

        // 设置MutationObserver监听新视频
        setupObserver() {
            this.observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    // 处理新增的节点
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.checkElementForVideos(node);
                        }
                    });
                    
                    // 处理属性变化（如src变化）
                    if (mutation.type === 'attributes' && 
                        (mutation.attributeName === 'src' || mutation.attributeName === 'data-src')) {
                        this.checkElementForVideos(mutation.target);
                    }
                });
            });

            this.observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['src', 'data-src', 'poster', 'controls']
            });
        }

        // 检查元素及其子元素中的视频
        checkElementForVideos(element) {
            if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
            
            // 检查元素本身是否是视频
            if (utils.isVideoElement(element)) {
                this.processVideo(element);
            }
            
            // 检查子元素中的视频
            if (element.querySelectorAll) {
                const selectors = [
                    'video',
                    'iframe',
                    'object',
                    'embed',
                    '[data-video]',
                    '[data-player]',
                    '.video',
                    '.player',
                    '.video-js',
                    '.html5-video-player',
                    '[class*="vjs-"]',
                    '[data-youtube-id]'
                ];
                
                selectors.forEach(selector => {
                    try {
                        element.querySelectorAll(selector).forEach(video => {
                            if (utils.isVideoElement(video)) {
                                this.processVideo(video);
                            }
                        });
                    } catch (e) {
                        // 忽略无效的选择器
                    }
                });
            }
        }

        // 开始检测循环
        startDetectionLoop() {
            if (state.detectionInterval) {
                clearInterval(state.detectionInterval);
            }
            
            state.detectionInterval = setInterval(() => {
                this.processExistingVideos();
            }, CONFIG.videoDetectionInterval);
        }

        // 处理已存在的视频
        processExistingVideos() {
            const videos = utils.findAllVideoElements();
            videos.forEach(video => {
                this.processVideo(video);
            });
        }

        // 处理单个视频
        processVideo(video) {
            if (!video || state.videos.has(video)) return;
            
            try {
                const videoId = utils.generateId();
                const initialSpeed = state.globalSpeed;
                
                // 设置初始速度
                if (video.tagName === 'VIDEO') {
                    if (video.playbackRate !== undefined) {
                        video.playbackRate = initialSpeed;
                    }
                }
                
                // 存储视频信息
                state.videos.set(video, {
                    id: videoId,
                    name: utils.getVideoName(video),
                    currentSpeed: initialSpeed,
                    element: video
                });
                
                // 为视频添加速度指示器
                this.addVideoIndicator(video, initialSpeed);
                
                // 监听视频移除
                this.setupRemovalObserver(video);
                
                // 监听视频速度变化
                this.setupSpeedChangeListener(video);
                
                // 监听视频可见性变化
                this.setupVisibilityObserver(video);
                
                // 监听视频播放状态
                this.setupPlaybackListener(video);
                
            } catch (error) {
                console.warn('[Video Speed Controller] 无法处理视频元素:', error, video);
            }
        }
        
        // 设置视频移除监听
        setupRemovalObserver(video) {
            const removeObserver = new MutationObserver(() => {
                if (!document.body.contains(video) && 
                    !document.documentElement.contains(video) && 
                    !video.isConnected) {
                    this.removeVideo(video);
                    removeObserver.disconnect();
                }
            });
            
            if (video.parentNode) {
                removeObserver.observe(video.parentNode, { childList: true });
            }
        }
        
        // 设置视频速度变化监听
        setupSpeedChangeListener(video) {
            if (video.tagName === 'VIDEO' && video.addEventListener) {
                const handleRateChange = () => {
                    if (!state.videos.has(video)) return;
                    
                    const info = state.videos.get(video);
                    if (info && Math.abs(info.currentSpeed - video.playbackRate) > 0.01) {
                        info.currentSpeed = video.playbackRate;
                        this.updateVideoIndicator(video, video.playbackRate);
                    }
                };
                
                video.addEventListener('ratechange', handleRateChange);
                
                // 存储监听器以便清理
                if (!video.__videoSpeedListeners) {
                    video.__videoSpeedListeners = [];
                }
                video.__videoSpeedListeners.push({
                    type: 'ratechange',
                    handler: handleRateChange
                });
            }
        }
        
        // 设置视频可见性监听
        setupVisibilityObserver(video) {
            if (typeof IntersectionObserver !== 'undefined') {
                const visibilityObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            // 视频进入视口，确保指示器显示
                            this.updateVideoIndicatorPosition(video);
                        } else {
                            // 视频离开视口，可以隐藏指示器
                            this.hideVideoIndicator(video);
                        }
                    });
                }, { threshold: 0.1 });
                
                visibilityObserver.observe(video);
                
                // 存储observer以便清理
                if (!video.__videoSpeedObservers) {
                    video.__videoSpeedObservers = [];
                }
                video.__videoSpeedObservers.push(visibilityObserver);
            }
        }
        
        // 设置视频播放状态监听
        setupPlaybackListener(video) {
            if (video.tagName === 'VIDEO' && video.addEventListener) {
                const handlePlay = () => {
                    this.onVideoPlay(video);
                };
                
                const handlePause = () => {
                    this.onVideoPause(video);
                };
                
                video.addEventListener('play', handlePlay);
                video.addEventListener('pause', handlePause);
                
                // 存储监听器以便清理
                if (!video.__videoSpeedListeners) {
                    video.__videoSpeedListeners = [];
                }
                video.__videoSpeedListeners.push(
                    { type: 'play', handler: handlePlay },
                    { type: 'pause', handler: handlePause }
                );
            }
        }
        
        // 视频播放时降低指示器透明度
        onVideoPlay(video) {
            const indicator = this.videoIndicators.get(video);
            if (indicator) {
                // 视频播放时降低透明度
                indicator.classList.add('video-playing');
                indicator.style.opacity = CONFIG.indicatorMinOpacity.toString();
            }
        }
        
        // 视频暂停时恢复指示器透明度
        onVideoPause(video) {
            const indicator = this.videoIndicators.get(video);
            if (indicator) {
                // 视频暂停时恢复透明度
                indicator.classList.remove('video-playing');
                if (!state.isHoveringIndicator) {
                    indicator.style.opacity = CONFIG.indicatorOpacity.toString();
                }
            }
        }

        // 添加视频速度指示器
        addVideoIndicator(video, speed) {
            if (this.videoIndicators.has(video)) {
                this.removeVideoIndicator(video);
            }
            
            const indicator = this.createVideoIndicator(video, speed);
            if (!indicator) return;
            
            this.videoIndicators.set(video, indicator);
            
            // 添加鼠标事件
            indicator.addEventListener('mouseenter', () => {
                state.isHoveringIndicator = true;
                indicator.style.opacity = CONFIG.indicatorHoverOpacity.toString();
            });
            
            indicator.addEventListener('mouseleave', () => {
                state.isHoveringIndicator = false;
                // 检查视频是否正在播放
                if (video.tagName === 'VIDEO' && !video.paused) {
                    indicator.style.opacity = CONFIG.indicatorMinOpacity.toString();
                } else {
                    indicator.style.opacity = CONFIG.indicatorOpacity.toString();
                }
            });
            
            // 添加点击事件
            indicator.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.toggleVideoSpeed(video);
            });
            
            // 添加右键菜单事件
            indicator.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showSpeedMenu(video, e);
            });
            
            // 更新指示器位置
            this.updateVideoIndicatorPosition(video);
            
            // 如果需要自动隐藏
            if (CONFIG.indicatorDisplayDuration > 0) {
                this.scheduleIndicatorHide(indicator);
            }
        }
        
        // 创建视频速度指示器
        createVideoIndicator(video, speed) {
            if (!video.parentNode) return null;
            
            const indicator = document.createElement('div');
            indicator.className = `video-speed-indicator ${utils.getSpeedClass(speed)}`;
            indicator.textContent = utils.formatSpeed(speed);
            indicator.title = '点击切换速度 (右键更多选项)';
            indicator.dataset.videoId = state.videos.get(video)?.id || '';
            
            // 设置指示器位置
            this.setIndicatorPosition(indicator, video);
            
            // 确保视频容器有定位
            const container = video.parentNode;
            if (getComputedStyle(container).position === 'static') {
                container.style.position = 'relative';
            }
            
            // 确保指示器是第一个子元素，以便显示在顶部
            if (container.firstChild) {
                container.insertBefore(indicator, container.firstChild);
            } else {
                container.appendChild(indicator);
            }
            
            return indicator;
        }
        
        // 设置指示器位置
        setIndicatorPosition(indicator, video) {
            if (!indicator || !video) return;
            
            if (CONFIG.indicatorPosition === 'left') {
                // 左侧垂直居中
                indicator.style.left = '8px';
                indicator.style.right = 'auto'; // 确保不使用右侧位置
                indicator.style.top = '50%';
                indicator.style.bottom = 'auto'; // 确保不使用底部位置
                indicator.style.transform = 'translateY(-50%)';
            } else {
                // 左上角
                indicator.style.left = '8px';
                indicator.style.right = 'auto';
                indicator.style.top = '8px';
                indicator.style.bottom = 'auto';
                indicator.style.transform = 'none';
            }
            
            // 确保指示器在最顶层
            indicator.style.zIndex = '10000';
            
            // 对于弹幕网站，提高z-index以确保不被弹幕覆盖
            if (utils.isDanmakuSite()) {
                indicator.style.zIndex = '10001';
            }
        }
        
        // 更新视频指示器位置
        updateVideoIndicatorPosition(video) {
            const indicator = this.videoIndicators.get(video);
            if (!indicator || !video.parentNode) return;
            
            const rect = video.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                indicator.style.display = 'block';
                
                // 重新设置位置
                this.setIndicatorPosition(indicator, video);
                
                // 对于特别小的视频，隐藏指示器
                if (rect.width < 100 || rect.height < 60) {
                    indicator.style.opacity = '0.4';
                } else if (video.tagName === 'VIDEO' && !video.paused && !state.isHoveringIndicator) {
                    // 视频播放中且没有悬停，使用最小透明度
                    indicator.style.opacity = CONFIG.indicatorMinOpacity.toString();
                } else if (!state.isHoveringIndicator) {
                    // 没有悬停，使用默认透明度
                    indicator.style.opacity = CONFIG.indicatorOpacity.toString();
                } else {
                    // 悬停中，使用悬停透明度
                    indicator.style.opacity = CONFIG.indicatorHoverOpacity.toString();
                }
                
                // 确保z-index足够高
                indicator.style.zIndex = '10000';
                
                // 对于弹幕网站，提高z-index
                if (utils.isDanmakuSite()) {
                    indicator.style.zIndex = '10001';
                }
            } else {
                indicator.style.display = 'none';
            }
        }
        
        // 隐藏视频指示器
        hideVideoIndicator(video) {
            const indicator = this.videoIndicators.get(video);
            if (!indicator) return;
            
            if (CONFIG.indicatorDisplayDuration > 0) {
                indicator.classList.add('hidden');
            }
        }
        
        // 显示视频指示器
        showVideoIndicator(video) {
            const indicator = this.videoIndicators.get(video);
            if (!indicator) return;
            
            indicator.classList.remove('hidden');
            this.updateVideoIndicatorPosition(video);
        }
        
        // 计划隐藏指示器
        scheduleIndicatorHide(indicator) {
            if (indicator._hideTimeout) {
                clearTimeout(indicator._hideTimeout);
            }
            
            // 鼠标移入时取消隐藏
            indicator.addEventListener('mouseenter', () => {
                if (indicator._hideTimeout) {
                    clearTimeout(indicator._hideTimeout);
                }
            });
            
            // 鼠标移出时重新计划隐藏
            indicator.addEventListener('mouseleave', () => {
                this.scheduleIndicatorHide(indicator);
            });
            
            // 设置隐藏定时器
            indicator._hideTimeout = setTimeout(() => {
                if (indicator && indicator.style) {
                    indicator.classList.add('fade-out');
                    
                    // 完全隐藏后移除
                    setTimeout(() => {
                        if (indicator && indicator.parentNode) {
                            indicator.style.display = 'none';
                        }
                    }, 300);
                }
            }, CONFIG.indicatorDisplayDuration);
        }
        
        // 显示指示器
        showIndicator(indicator) {
            if (!indicator) return;
            
            indicator.style.opacity = CONFIG.indicatorOpacity.toString();
            indicator.style.pointerEvents = 'auto';
            indicator.style.display = 'block';
            indicator.classList.remove('fade-out', 'hidden');
            
            // 重新计划隐藏
            if (CONFIG.indicatorDisplayDuration > 0) {
                this.scheduleIndicatorHide(indicator);
            }
        }

        // 更新视频指示器
        updateVideoIndicator(video, speed) {
            const indicator = this.videoIndicators.get(video);
            if (!indicator) return;
            
            indicator.textContent = utils.formatSpeed(speed);
            indicator.className = `video-speed-indicator ${utils.getSpeedClass(speed)}`;
            
            // 重新设置位置
            this.setIndicatorPosition(indicator, video);
            
            // 确保指示器可见
            this.showIndicator(indicator);
        }

        // 移除视频指示器
        removeVideoIndicator(video) {
            const indicator = this.videoIndicators.get(video);
            if (indicator && indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
            this.videoIndicators.delete(video);
        }

        // 移除视频
        removeVideo(video) {
            this.removeVideoIndicator(video);
            
            // 清理监听器
            if (video.__videoSpeedListeners) {
                video.__videoSpeedListeners.forEach(listener => {
                    video.removeEventListener(listener.type, listener.handler);
                });
                delete video.__videoSpeedListeners;
            }
            
            // 清理观察者
            if (video.__videoSpeedObservers) {
                video.__videoSpeedObservers.forEach(observer => {
                    observer.disconnect();
                });
                delete video.__videoSpeedObservers;
            }
            
            state.videos.delete(video);
        }

        // 切换视频速度
        toggleVideoSpeed(video) {
            if (!state.videos.has(video)) return;
            
            const info = state.videos.get(video);
            const currentSpeed = info.currentSpeed;
            const newSpeed = utils.getNextPresetSpeed(currentSpeed);
            
            this.setVideoSpeed(video, newSpeed);
            
            // 显示通知
            const videoName = utils.getVideoName(video);
            utils.showNotification(`视频 ${videoName.length > 20 ? videoName.substring(0, 20) + '...' : videoName} 速度已设置为 ${utils.formatSpeed(newSpeed)}`);
        }
        
        // 显示速度菜单
        showSpeedMenu(video, event) {
            event.preventDefault();
            
            const info = state.videos.get(video);
            if (!info) return;
            
            // 创建菜单
            const menu = document.createElement('div');
            menu.style.cssText = `
                position: fixed;
                top: ${event.clientY}px;
                left: ${event.clientX}px;
                background: rgba(26, 26, 26, 0.95);
                color: white;
                border: 1px solid rgba(68, 68, 68, 0.7);
                border-radius: 8px;
                padding: 8px 0;
                min-width: 120px;
                z-index: 100000;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            `;
            
            // 添加预设速度选项
            CONFIG.presetSpeeds.forEach(speed => {
                const menuItem = document.createElement('div');
                menuItem.textContent = `${utils.formatSpeed(speed)}`;
                menuItem.style.cssText = `
                    padding: 8px 16px;
                    color: white;
                    cursor: pointer;
                    font-size: 13px;
                    transition: background 0.2s;
                `;
                menuItem.onmouseenter = () => {
                    menuItem.style.background = 'rgba(74, 158, 255, 0.3)';
                };
                menuItem.onmouseleave = () => {
                    menuItem.style.background = 'transparent';
                };
                menuItem.onclick = (e) => {
                    e.stopPropagation();
                    this.setVideoSpeed(video, speed);
                    const videoName = utils.getVideoName(video);
                    utils.showNotification(`视频 ${videoName.length > 20 ? videoName.substring(0, 20) + '...' : videoName} 速度已设置为 ${utils.formatSpeed(speed)}`);
                    document.body.removeChild(menu);
                };
                menu.appendChild(menuItem);
            });
            
            // 添加自定义速度选项
            const customItem = document.createElement('div');
            customItem.textContent = '自定义速度...';
            customItem.style.cssText = `
                padding: 8px 16px;
                color: #4a9eff;
                cursor: pointer;
                font-size: 13px;
                border-top: 1px solid rgba(68, 68, 68, 0.5);
                margin-top: 8px;
                transition: background 0.2s;
            `;
            customItem.onmouseenter = () => {
                customItem.style.background = 'rgba(74, 158, 255, 0.3)';
            };
            customItem.onmouseleave = () => {
                customItem.style.background = 'transparent';
            };
            customItem.onclick = (e) => {
                e.stopPropagation();
                const speed = parseFloat(prompt('请输入播放速度 (0.1 - 16.0):', info.currentSpeed.toFixed(2)));
                if (!isNaN(speed) && speed >= CONFIG.minSpeed && speed <= CONFIG.maxSpeed) {
                    this.setVideoSpeed(video, speed);
                    const videoName = utils.getVideoName(video);
                    utils.showNotification(`视频 ${videoName.length > 20 ? videoName.substring(0, 20) + '...' : videoName} 速度已设置为 ${utils.formatSpeed(speed)}`);
                } else if (speed !== null) {
                    alert('请输入有效的速度值 (0.1 - 16.0)');
                }
                document.body.removeChild(menu);
            };
            menu.appendChild(customItem);
            
            // 添加到页面
            document.body.appendChild(menu);
            
            // 点击其他地方关闭菜单
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    document.body.removeChild(menu);
                    document.removeEventListener('click', closeMenu);
                    document.removeEventListener('contextmenu', closeMenu);
                }
            };
            
            setTimeout(() => {
                document.addEventListener('click', closeMenu);
                document.addEventListener('contextmenu', closeMenu);
            }, 0);
            
            // 确保菜单在可视区域内
            const rect = menu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                menu.style.left = `${window.innerWidth - rect.width - 10}px`;
            }
            if (rect.bottom > window.innerHeight) {
                menu.style.top = `${window.innerHeight - rect.height - 10}px`;
            }
        }

        // 设置视频速度
        setVideoSpeed(video, speed) {
            if (!video) return;
            
            speed = utils.clamp(speed, CONFIG.minSpeed, CONFIG.maxSpeed);
            
            try {
                // 设置标准video元素的速度
                if (video.tagName === 'VIDEO' && video.playbackRate !== undefined) {
                    video.playbackRate = speed;
                }
                
                // 尝试设置其他类型视频的速度
                this.setCustomVideoSpeed(video, speed);
                
                // 更新状态
                const info = state.videos.get(video);
                if (info) {
                    info.currentSpeed = speed;
                    this.updateVideoIndicator(video, speed);
                }
                
                // 保存到存储
                if (CONFIG.autoApplySpeed) {
                    state.globalSpeed = speed;
                    GM_setValue(CONFIG.storageKey, speed);
                }
                
            } catch (error) {
                console.warn('[Video Speed Controller] 无法设置视频速度:', error, video);
            }
        }
        
        // 设置自定义视频速度
        setCustomVideoSpeed(video, speed) {
            // 尝试多种方法设置速度
            const methods = [
                () => { if (video.playbackRate !== undefined) video.playbackRate = speed; },
                () => { if (video.defaultPlaybackRate !== undefined) video.defaultPlaybackRate = speed; },
                // YouTube
                () => { 
                    if (video.tagName === 'IFRAME' && video.src.includes('youtube')) {
                        try {
                            const iframeDoc = video.contentDocument || video.contentWindow.document;
                            const ytVideo = iframeDoc.querySelector('video');
                            if (ytVideo) ytVideo.playbackRate = speed;
                        } catch (e) {}
                    }
                },
                // 通用方法
                () => {
                    if (video.setPlaybackRate) video.setPlaybackRate(speed);
                    if (video.playbackrate) video.playbackrate = speed;
                    if (video.playBackRate) video.playBackRate = speed;
                }
            ];
            
            for (const method of methods) {
                try {
                    method();
                } catch (e) {}
            }
        }

        // 应用全局速度
        applyGlobalSpeed() {
            state.videos.forEach((info, video) => {
                this.setVideoSpeed(video, state.globalSpeed);
            });
        }

        // 获取视频统计
        getStats() {
            const videos = Array.from(state.videos.values());
            return {
                total: videos.length,
                avgSpeed: videos.length > 0 
                    ? videos.reduce((sum, info) => sum + info.currentSpeed, 0) / videos.length
                    : 0
            };
        }

        // 获取所有视频
        getAllVideos() {
            return Array.from(state.videos.entries());
        }

        // 清除所有视频指示器
        clearAllIndicators() {
            this.videoIndicators.forEach((indicator, video) => {
                if (indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            });
            this.videoIndicators.clear();
        }
        
        // 更新所有指示器位置
        updateAllIndicatorPositions() {
            this.videoIndicators.forEach((indicator, video) => {
                this.updateVideoIndicatorPosition(video);
            });
        }
    }

    // 初始化
    const videoManager = new VideoManager();

    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        console.log('视频速度控制器已加载');
        
        // 初始化视频管理器
        videoManager.init();
        
        // 监听窗口大小变化，更新指示器位置
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                videoManager.updateAllIndicatorPositions();
            }, 250);
        });
        
        // 监听滚动，更新指示器位置
        window.addEventListener('scroll', () => {
            videoManager.updateAllIndicatorPositions();
        });
        
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                setTimeout(() => {
                    videoManager.updateAllIndicatorPositions();
                }, 100);
            }
        });
        
        // 显示加载通知
        utils.showNotification('视频速度控制器已激活，点击视频左侧的速度指示器切换速度');
    }

    // 全局函数供控制台调试
    window.videoSpeedController = {
        setSpeed: (speed) => {
            state.globalSpeed = speed;
            videoManager.applyGlobalSpeed();
            GM_setValue(CONFIG.storageKey, speed);
            utils.showNotification(`已设置全局速度为 ${utils.formatSpeed(speed)}`);
        },
        getState: () => ({ 
            ...state,
            videoCount: state.videos.size,
            videos: Array.from(state.videos.entries()).map(([video, info]) => ({
                id: info.id,
                name: info.name,
                speed: info.currentSpeed,
                element: video
            }))
        }),
        toggleAll: () => {
            const videos = Array.from(state.videos.keys());
            videos.forEach(video => {
                videoManager.toggleVideoSpeed(video);
            });
        },
        scanVideos: () => {
            videoManager.processExistingVideos();
            const count = state.videos.size;
            utils.showNotification(`已扫描到 ${count} 个视频`);
            return count;
        },
        clearIndicators: () => {
            videoManager.clearAllIndicators();
            utils.showNotification('已清除所有速度指示器');
        },
        showIndicators: () => {
            videoManager.videoIndicators.forEach((indicator, video) => {
                videoManager.showIndicator(indicator);
            });
            utils.showNotification('已显示所有速度指示器');
        },
        setPresetSpeeds: (speeds) => {
            if (Array.isArray(speeds) && speeds.length > 0) {
                CONFIG.presetSpeeds = speeds.map(s => parseFloat(s)).filter(s => !isNaN(s) && s >= CONFIG.minSpeed && s <= CONFIG.maxSpeed);
                if (CONFIG.presetSpeeds.length > 0) {
                    utils.showNotification(`预设速度已更新: ${CONFIG.presetSpeeds.map(s => utils.formatSpeed(s)).join(', ')}`);
                }
            }
        },
        setIndicatorOpacity: (opacity) => {
            if (opacity >= 0 && opacity <= 1) {
                CONFIG.indicatorOpacity = opacity;
                videoManager.updateAllIndicatorPositions();
                utils.showNotification(`指示器透明度已设置为 ${opacity}`);
            } else {
                utils.showNotification('透明度必须在0到1之间');
            }
        }
    };

})();
