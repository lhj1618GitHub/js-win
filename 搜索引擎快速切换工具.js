// ==UserScript==
// @name         搜索引擎快速切换工具
// @namespace    https://github.com/js-win
// @version      2.0.0
// @description  在搜索引擎之间快速切换搜索关键词，支持自定义搜索引擎管理
// @author       lhj1618
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @icon         https://img.icons8.com/color/96/000000/search--v1.png
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';
    
    // 默认搜索引擎配置
    const defaultEngines = [
        { id: 'google', name: 'Google', url: 'https://www.google.com/search?q={query}', icon: '🔍' },
        { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q={query}', icon: '🔍' },
        { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd={query}', icon: '🇨🇳' },
        { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={query}', icon: '🦆' },
        { id: 'github', name: 'GitHub', url: 'https://github.com/search?q={query}&type=repositories', icon: '🐙' },
        { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/results?search_query={query}', icon: '📺' }
    ];
    
    // 常见搜索引擎的关键词参数映射
    const searchParamMap = {
        'google.com': 'q',
        'bing.com': 'q',
        'baidu.com': 'wd',
        'duckduckgo.com': 'q',
        'github.com': 'q',
        'youtube.com': 'search_query',
        'search.yahoo.com': 'p',
        'yandex.ru': 'text',
        'ask.com': 'q',
        'search.naver.com': 'query',
        'so.com': 'q',
        'sogou.com': 'query'
    };
    
    // 搜索引擎域名检测
    const searchEngineDomains = [
        'google.com',
        'bing.com',
        'baidu.com',
        'duckduckgo.com',
        'github.com',
        'youtube.com',
        'search.yahoo.com',
        'yandex.ru',
        'ask.com',
        'search.naver.com',
        'so.com',
        'sogou.com',
        'yandex.com',
        'yahoo.com',
        'aol.com',
        'wolframalpha.com',
        'ecosia.org',
        'qwant.com',
        'swisscows.com',
        'startpage.com',
        'metager.org',
        'searx.be',
        'mojeek.com',
        'gibiru.com',
        'yep.com',
        'brave.com',
        'you.com',
        'phind.com',
        'perplexity.ai',
        'metacrawler.com',
        'dogpile.com',
        'webcrawler.com',
        'info.com',
        'lycos.com',
        'excite.com',
        'altavista.com',
        'hotbot.com',
        'alltheweb.com',
        'gigablast.com',
        'entireweb.com',
        'search.com',
        'ixquick.com',
        'sputnik.ru',
        'rambler.ru',
        'mail.ru',
        'go.mail.ru',
        'nigma.ru',
        'aport.ru',
        'webalta.ru',
        'turtle.ru',
        'zapmeta.com',
        'searchlock.com',
        'search-22.com',
        'mywebsearch.com',
        'websearch.com',
        'search-results.com',
        'infospace.com',
        'info.com',
        'clusty.com',
        'mamma.com',
        'zuula.com',
        'zapmeta.nl',
        'ixquick.com',
        'startpage.com',
        'metager.de',
        'suchmaschine.com',
        'suchnase.de',
        'fireball.de',
        'abacho.de',
        'bellnet.de',
        'suchmaschinen.com',
        'suchnase.ch',
        'search.ch',
        'bluewin.ch',
        'search.orange.fr',
        'search.free.fr',
        'search.voila.fr',
        'search.libero.it',
        'search.alice.it',
        'search.virgilio.it',
        'search.tiscali.it',
        'search.wanadoo.fr',
        'search.aol.com',
        'search.msn.com',
        'search.netscape.com',
        'search.compuserve.com',
        'search.myway.com',
        'search.centrum.cz',
        'search.seznam.cz',
        'search.atlas.cz',
        'search.najdi.si',
        'search.si',
        'search.bg',
        'search.dir.bg',
        'search.abv.bg',
        'search.orbit.bg',
        'search.rambler.ru',
        'search.yandex.ru',
        'search.yandex.com',
        'search.yandex.com.tr',
        'search.yandex.com.ua',
        'search.yandex.kz',
        'search.yandex.by',
        'search.yandex.ua',
        'search.naver.com',
        'search.daum.net',
        'search.nate.com',
        'search.paran.com',
        'search.zum.com',
        'search.empas.com',
        'search.google.com',
        'search.bing.com',
        'search.baidu.com',
        'search.so.com',
        'search.sogou.com',
        'search.soso.com',
        'search.360.cn',
        'search.sm.cn',
        'search.sina.com.cn',
        'search.hao123.com',
        'search.114la.com',
        'search.jike.com',
        'search.pcbeta.com',
        'search.chinaz.com',
        'search.csdn.net',
        'search.oschina.net',
        'search.iteye.com',
        'search.cnblogs.com',
        'search.jd.com',
        'search.taobao.com',
        'search.tmall.com',
        'search.1688.com',
        'search.alibaba.com',
        'search.amazon.com',
        'search.ebay.com',
        'search.walmart.com',
        'search.target.com',
        'search.bestbuy.com',
        'search.newegg.com',
        'search.overstock.com',
        'search.zappos.com',
        'search.asos.com',
        'search.zalando.com',
        'search.yoox.com',
        'search.net-a-porter.com',
        'search.farfetch.com',
        'search.ssense.com',
        'search.matchesfashion.com',
        'search.mytheresa.com',
        'search.luisaviaroma.com',
        'search.24s.com',
        'search.selfridges.com',
        'search.harrods.com',
        'search.liberty.co.uk',
        'search.davidjones.com.au',
        'search.myer.com.au',
        'search.harveynorman.com.au',
        'search.thegoodguys.com.au',
        'search.jbhifi.com.au',
        'search.officeworks.com.au',
        'search.bunnings.com.au',
        'search.kmart.com.au',
        'search.bigw.com.au',
        'search.target.com.au',
        'search.woolworths.com.au',
        'search.coles.com.au',
        'search.aldi.com.au',
        'search.iga.com.au',
        'search.foodland.com.au',
        'search.rarewares.com',
        'search.sourceforge.net',
        'search.github.com',
        'search.gitlab.com',
        'search.bitbucket.org',
        'search.stackoverflow.com',
        'search.stackexchange.com',
        'search.quora.com',
        'search.reddit.com',
        'search.medium.com',
        'search.dev.to',
        'search.hashnode.com',
        'search.freecodecamp.org',
        'search.codepen.io',
        'search.jsfiddle.net',
        'search.codesandbox.io',
        'search.repl.it',
        'search.glitch.com',
        'search.netlify.com',
        'search.vercel.com',
        'search.heroku.com',
        'search.aws.amazon.com',
        'search.cloud.google.com',
        'search.azure.com',
        'search.digitalocean.com',
        'search.linode.com',
        'search.vultr.com',
        'search.ovh.com',
        'search.hetzner.com',
        'search.contabo.com',
        'search.leaseweb.com',
        'search.serverastra.com',
        'search.ramnode.com',
        'search.buyvm.net',
        'search.psychz.net',
        'search.dedipath.com',
        'search.reliablesite.net',
        'search.choopa.com',
        'search.iweb.com',
        'search.ovh.co.uk',
        'search.kamatera.com',
        'search.vpsdime.com',
        'search.hostwinds.com',
        'search.bluehost.com',
        'search.hostgator.com',
        'search.godaddy.com',
        'search.namecheap.com',
        'search.siteground.com',
        'search.dreamhost.com',
        'search.a2hosting.com',
        'search.inmotionhosting.com',
        'search.hostinger.com',
        'search.interserver.net',
        'search.fastcomet.com',
        'search.scalahosting.com',
        'search.knownhost.com',
        'search.liquidweb.com',
        'search.wpxhosting.com',
        'search.nexcess.net',
        'search.kinsta.com',
        'search.pagely.com',
        'search.pantheon.io',
        'search.wpengine.com',
        'search.cloudways.com',
        'search.flywheel.com',
        'search.getshifter.io',
        'search.strattic.com',
        'search.shifter.io',
        'search.wpshifter.com',
        'search.wordpress.com',
        'search.wix.com',
        'search.squarespace.com',
        'search.weebly.com',
        'search.shopify.com',
        'search.bigcartel.com',
        'search.ecwid.com',
        'search.selz.com',
        'search.bigcommerce.com',
        'search.volusion.com',
        'search.3dcart.com',
        'search.shopaccino.com',
        'search.woocommerce.com',
        'search.magento.com',
        'search.prestashop.com',
        'search.opencart.com',
        'search.oscommerce.com',
        'search.zen-cart.com',
        'search.cubecart.com',
        'search.x-cart.com',
        'search.cs-cart.com',
        'search.shopware.com',
        'search.oxid-esales.com',
        'search.xt-commerce.com',
        'search.gambio.de',
        'search.modified-shop.org',
        'search.xtc-modified.org',
        'search.xtc-modified.de',
        'search.xtc-modified.com',
        'search.xtc-modified.net',
        'search.xtc-modified.net'
    ];
    
    // 检查当前页面是否为搜索引擎页面
    function isCurrentPageSearchEngine() {
        const url = window.location.href;
        const hostname = window.location.hostname.replace('www.', '');
        
        // 检查是否匹配已知的搜索引擎域名
        for (const domain of searchEngineDomains) {
            if (hostname.includes(domain) || url.includes(domain)) {
                return true;
            }
        }
        
        // 检查是否包含搜索参数
        const urlObj = new URL(url);
        const commonParams = ['q', 'query', 'search', 'keyword', 'wd', 'p'];
        for (const param of commonParams) {
            if (urlObj.searchParams.has(param)) {
                return true;
            }
        }
        
        // 检查页面是否有搜索框
        const searchInputs = [
            'input[type="search"]',
            'input[name*="search"]',
            'input[name*="q"]',
            'input[name*="query"]',
            '.search-input',
            '#search',
            '.search',
            '[role="search"]'
        ];
        
        for (const selector of searchInputs) {
            if (document.querySelector(selector)) {
                return true;
            }
        }
        
        return false;
    }
    
    // 从当前页面URL提取搜索关键词
    function extractSearchKeywordFromPage() {
        const url = window.location.href;
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace('www.', '');
        
        // 检查是否匹配已知的搜索引擎
        for (const [domain, param] of Object.entries(searchParamMap)) {
            if (hostname.includes(domain) || url.includes(domain)) {
                const keyword = urlObj.searchParams.get(param);
                if (keyword && keyword.trim()) {
                    return decodeURIComponent(keyword.trim());
                }
            }
        }
        
        // 通用关键词提取：尝试常见的搜索参数
        const commonParams = ['q', 'query', 'search', 'keyword', 'wd', 'p'];
        for (const param of commonParams) {
            const keyword = urlObj.searchParams.get(param);
            if (keyword && keyword.trim()) {
                return decodeURIComponent(keyword.trim());
            }
        }
        
        // 尝试从搜索框获取
        const searchInputs = [
            'input[type="search"]',
            'input[name*="search"]',
            'input[name*="q"]',
            'input[name*="query"]',
            'input[placeholder*="搜索"]',
            'input[placeholder*="search"]',
            '.search-input',
            '#search',
            '.search',
            '[role="search"] input'
        ];
        
        for (const selector of searchInputs) {
            const inputs = document.querySelectorAll(selector);
            for (const input of inputs) {
                if (input.value && input.value.trim()) {
                    return input.value.trim();
                }
            }
        }
        
        return '';
    }
    
    // 获取当前页面搜索引擎
    function getCurrentPageEngine() {
        const url = window.location.href;
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace('www.', '');
        
        // 检查是否匹配已知的搜索引擎
        for (const [domain, param] of Object.entries(searchParamMap)) {
            if (hostname.includes(domain) || url.includes(domain)) {
                const keyword = urlObj.searchParams.get(param);
                if (keyword) {
                    // 提取基础URL，移除搜索参数
                    const baseUrl = urlObj.origin + urlObj.pathname;
                    const searchParams = new URLSearchParams(urlObj.search);
                    searchParams.delete(param);
                    const remainingParams = searchParams.toString();
                    const urlSeparator = remainingParams ? '&' : '?';
                    
                    return { 
                        name: getEngineNameByDomain(domain), 
                        url: baseUrl + (urlObj.search ? '?' + remainingParams + urlSeparator : '?') + param + '={query}',
                        icon: '🔍'
                    };
                }
            }
        }
        
        return null;
    }
    
    // 根据域名获取搜索引擎名称
    function getEngineNameByDomain(domain) {
        const domainMap = {
            'google.com': 'Google',
            'bing.com': 'Bing',
            'baidu.com': '百度',
            'duckduckgo.com': 'DuckDuckGo',
            'github.com': 'GitHub',
            'youtube.com': 'YouTube',
            'search.yahoo.com': 'Yahoo',
            'yandex.ru': 'Yandex',
            'ask.com': 'Ask',
            'search.naver.com': 'Naver',
            'so.com': '360搜索',
            'sogou.com': '搜狗'
        };
        
        return domainMap[domain] || domain;
    }
    
    // 获取或初始化搜索引擎列表
    function getEngines() {
        const savedEngines = GM_getValue('searchEngines');
        return savedEngines ? JSON.parse(savedEngines) : defaultEngines;
    }
    
    // 保存搜索引擎列表
    function saveEngines(engines) {
        GM_setValue('searchEngines', JSON.stringify(engines));
    }
    
    // 主应用类
    class SearchEngineSwitcher {
        constructor() {
            this.engines = getEngines();
            this.isVisible = false;
            this.isDragging = false;
            this.dragOffset = { x: 0, y: 0 };
            this.currentSearchText = '';
            this.hideTimeout = null;
            this.currentEngine = this.engines[0];
            this.currentPageEngine = getCurrentPageEngine();
            this.isSearchEnginePage = isCurrentPageSearchEngine();
            this.showToggleBtn = this.isSearchEnginePage; // 初始状态
            this.toggleState = 'default'; // 状态: 'default', 'show', 'hide'
            this.init();
        }
        
        init() {
            this.createStyles();
            this.createUI();
            this.bindEvents();
            this.positionPanel();
            this.updateButtonVisibility();
        }
        
        createStyles() {
            const css = `
                .ses-container {
                    position: fixed;
                    z-index: 2147483647;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                    transition: all 0.3s ease;
                }
                
                .ses-toggle-btn-wrapper {
                    position: relative;
                    width: 40px;
                    height: 40px;
                }
                
                .ses-toggle-btn {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    transition: all 0.3s ease;
                    opacity: 0.1;
                }
                
                .ses-toggle-btn.show {
                    opacity: 1;
                }
                
                .ses-toggle-btn.hide {
                    display: none;
                }
                
                .ses-toggle-btn:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
                    opacity: 1;
                }
                
                .ses-panel {
                    position: absolute;
                    width: 280px;
                    background: #1e1e2e;
                    border-radius: 10px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
                    overflow: hidden;
                    opacity: 0;
                    transform: translateY(10px) scale(0.95);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    pointer-events: none;
                    z-index: 2147483646;
                }
                
                .ses-panel.show {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                    pointer-events: auto;
                }
                
                .ses-header {
                    padding: 12px 16px;
                    background: #2a2a3c;
                    border-bottom: 1px solid #3a3a4c;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .ses-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #e2e8f0;
                    margin: 0;
                }
                
                .ses-close-btn {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    font-size: 18px;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: background 0.2s;
                }
                
                .ses-close-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                
                .ses-content {
                    padding: 12px 16px;
                }
                
                .ses-search-input {
                    width: 100%;
                    padding: 10px;
                    background: #2a2a3c;
                    border: 2px solid #3a3a4c;
                    border-radius: 8px;
                    color: #e2e8f0;
                    font-size: 13px;
                    margin-bottom: 12px;
                    box-sizing: border-box;
                    transition: border-color 0.2s;
                }
                
                .ses-search-input:focus {
                    outline: none;
                    border-color: #667eea;
                }
                
                .ses-search-input::placeholder {
                    color: #94a3b8;
                }
                
                .ses-engines-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin-bottom: 12px;
                }
                
                .ses-engine-btn {
                    background: #2a2a3c;
                    border: 1px solid #3a3a4c;
                    border-radius: 6px;
                    padding: 8px 4px;
                    color: #e2e8f0;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.2s;
                    font-size: 11px;
                }
                
                .ses-engine-btn:hover {
                    background: #3a3a4c;
                    transform: translateY(-1px);
                }
                
                .ses-engine-btn.active {
                    background: rgba(102, 126, 234, 0.2);
                    border-color: #667eea;
                }
                
                .ses-engine-icon {
                    font-size: 16px;
                }
                
                .ses-action-buttons {
                    display: flex;
                    gap: 8px;
                }
                
                .ses-action-btn {
                    flex: 1;
                    padding: 8px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 12px;
                    transition: background 0.2s;
                }
                
                .ses-action-btn.primary {
                    background: #667eea;
                    color: white;
                }
                
                .ses-action-btn.primary:hover {
                    background: #5a6fd8;
                }
                
                .ses-action-btn.secondary {
                    background: #3a3a4c;
                    color: #e2e8f0;
                }
                
                .ses-action-btn.secondary:hover {
                    background: #4a4a5c;
                }
                
                .ses-action-btn.success {
                    background: #10b981;
                    color: white;
                }
                
                .ses-action-btn.success:hover {
                    background: #0da271;
                }
                
                .ses-manage-panel {
                    display: none;
                }
                
                .ses-manage-panel.show {
                    display: block;
                }
                
                .ses-manage-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }
                
                .ses-engine-list {
                    max-height: 200px;
                    overflow-y: auto;
                    margin-bottom: 12px;
                }
                
                .ses-engine-item {
                    display: flex;
                    align-items: center;
                    padding: 8px;
                    background: #2a2a3c;
                    border-radius: 6px;
                    margin-bottom: 6px;
                }
                
                .ses-engine-info {
                    flex: 1;
                    margin-left: 8px;
                }
                
                .ses-engine-name {
                    color: #e2e8f0;
                    font-weight: 500;
                    font-size: 12px;
                }
                
                .ses-engine-url {
                    color: #94a3b8;
                    font-size: 10px;
                    word-break: break-all;
                }
                
                .ses-engine-actions {
                    display: flex;
                    gap: 4px;
                }
                
                .ses-icon-btn {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }
                
                .ses-icon-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                
                .ses-add-form {
                    background: #2a2a3c;
                    padding: 12px;
                    border-radius: 6px;
                    margin-top: 12px;
                }
                
                .ses-form-group {
                    margin-bottom: 8px;
                }
                
                .ses-form-label {
                    display: block;
                    color: #94a3b8;
                    font-size: 11px;
                    margin-bottom: 3px;
                }
                
                .ses-form-input {
                    width: 100%;
                    padding: 6px;
                    background: #1e1e2e;
                    border: 1px solid #3a3a4c;
                    border-radius: 4px;
                    color: #e2e8f0;
                    font-size: 12px;
                    box-sizing: border-box;
                }
                
                .ses-drag-handle-bar {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 24px;
                    cursor: move;
                    background: rgba(255, 255, 255, 0.05);
                }
                
                .ses-current-engine-info {
                    font-size: 11px;
                    color: #94a3b8;
                    margin-bottom: 8px;
                    padding: 6px 8px;
                    background: rgba(102, 126, 234, 0.1);
                    border-radius: 4px;
                    display: none;
                }
                
                .ses-current-engine-info.show {
                    display: block;
                }
                
                .ses-sort-hint {
                    font-size: 10px;
                    color: #94a3b8;
                    margin-bottom: 8px;
                    text-align: center;
                }
            `;
            
            GM_addStyle(css);
        }
        
        createUI() {
            this.container = document.createElement('div');
            this.container.className = 'ses-container';
            
            // 创建浮动按钮包装器
            this.toggleWrapper = document.createElement('div');
            this.toggleWrapper.className = 'ses-toggle-btn-wrapper';
            
            // 创建浮动按钮
            this.toggleBtn = document.createElement('button');
            this.toggleBtn.className = 'ses-toggle-btn';
            this.toggleBtn.innerHTML = '🔍';
            this.toggleBtn.title = '搜索引擎切换工具 (鼠标悬停显示)';
            
            this.toggleWrapper.appendChild(this.toggleBtn);
            this.container.appendChild(this.toggleWrapper);
            
            // 创建面板
            this.panel = document.createElement('div');
            this.panel.className = 'ses-panel';
            
            this.panel.innerHTML = `
                <div class="ses-drag-handle-bar"></div>
                <div class="ses-header">
                    <h3 class="ses-title">搜索引擎切换</h3>
                    <button class="ses-close-btn" title="关闭">×</button>
                </div>
                <div class="ses-content">
                    <!-- 搜索界面 -->
                    <div class="ses-search-interface">
                        <input type="text" class="ses-search-input" placeholder="输入搜索关键词..." />
                        <div class="ses-current-engine-info" id="ses-current-engine-info" style="display:none;">
                            当前页面搜索引擎: <span id="ses-current-engine-name"></span>
                        </div>
                        <div class="ses-engines-grid" id="ses-engines-container"></div>
                        <div class="ses-action-buttons">
                            <button class="ses-action-btn success" id="ses-add-current-engine">添加当前引擎</button>
                            <button class="ses-action-btn secondary" id="ses-manage-toggle">管理引擎</button>
                        </div>
                    </div>
                    
                    <!-- 管理界面 -->
                    <div class="ses-manage-panel" id="ses-manage-panel">
                        <div class="ses-manage-header">
                            <h4 style="margin:0;color:#e2e8f0;font-size:13px;">管理搜索引擎</h4>
                            <button class="ses-action-btn secondary" id="ses-back-to-search">返回搜索</button>
                        </div>
                        <div class="ses-sort-hint" id="ses-sort-hint">拖动项目可调整顺序</div>
                        <div class="ses-engine-list" id="ses-engine-list"></div>
                        <div class="ses-add-form">
                            <h4 style="margin:0 0 8px 0;color:#e2e8f0;font-size:12px;">添加新搜索引擎</h4>
                            <div class="ses-form-group">
                                <label class="ses-form-label">名称</label>
                                <input type="text" class="ses-form-input" id="ses-new-name" placeholder="例如: Google" />
                            </div>
                            <div class="ses-form-group">
                                <label class="ses-form-label">搜索URL</label>
                                <input type="text" class="ses-form-input" id="ses-new-url" placeholder="https://example.com/search?q={query}" />
                                <small style="color:#94a3b8;font-size:10px;display:block;margin-top:3px;">使用 {query} 作为关键词占位符</small>
                            </div>
                            <div class="ses-form-group">
                                <label class="ses-form-label">图标(可选)</label>
                                <input type="text" class="ses-form-input" id="ses-new-icon" placeholder="🔍" />
                            </div>
                            <button class="ses-action-btn primary" id="ses-add-engine" style="width:100%;margin-top:6px;padding:6px;">添加引擎</button>
                        </div>
                    </div>
                </div>
            `;
            
            this.container.appendChild(this.panel);
            document.body.appendChild(this.container);
            
            this.searchInput = this.panel.querySelector('.ses-search-input');
            this.enginesContainer = this.panel.querySelector('#ses-engines-container');
            this.engineList = this.panel.querySelector('#ses-engine-list');
            this.managePanel = this.panel.querySelector('#ses-manage-panel');
            this.currentEngineInfo = this.panel.querySelector('#ses-current-engine-info');
            this.currentEngineName = this.panel.querySelector('#ses-current-engine-name');
            this.sortHint = this.panel.querySelector('#ses-sort-hint');
            this.currentEngine = this.engines[0];
            
            this.renderEngines();
            this.renderEngineList();
        }
        
        bindEvents() {
            // 鼠标悬停显示/隐藏面板
            this.toggleBtn.addEventListener('mouseenter', () => this.showPanel());
            this.toggleBtn.addEventListener('mouseleave', (e) => {
                if (!this.panel.matches(':hover')) {
                    this.scheduleHide();
                }
            });
            
            this.panel.addEventListener('mouseenter', () => this.cancelHide());
            this.panel.addEventListener('mouseleave', (e) => {
                if (!this.toggleBtn.matches(':hover')) {
                    this.scheduleHide();
                }
            });
            
            this.panel.querySelector('.ses-close-btn').addEventListener('click', () => this.hidePanel());
            
            this.searchInput.addEventListener('keyup', (e) => {
                this.currentSearchText = e.target.value;
                if (e.key === 'Enter' && this.currentSearchText.trim()) {
                    this.performSearch(this.currentEngine);
                }
            });
            
            this.searchInput.addEventListener('input', (e) => {
                this.currentSearchText = e.target.value;
            });
            
            this.panel.querySelector('#ses-add-current-engine').addEventListener('click', () => {
                this.addCurrentPageEngine();
            });
            
            this.panel.querySelector('#ses-manage-toggle').addEventListener('click', () => {
                this.showManagePanel();
            });
            
            this.panel.querySelector('#ses-back-to-search').addEventListener('click', () => {
                this.showSearchPanel();
            });
            
            this.panel.querySelector('#ses-add-engine').addEventListener('click', () => {
                this.addNewEngine();
            });
            
            const dragHandle = this.panel.querySelector('.ses-drag-handle-bar');
            dragHandle.addEventListener('mousedown', (e) => this.startDrag(e));
            document.addEventListener('mousemove', (e) => this.onDrag(e));
            document.addEventListener('mouseup', () => this.stopDrag());
            
            // 鼠标离开面板时隐藏面板
            this.panel.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    if (!this.toggleBtn.matches(':hover')) {
                        this.scheduleHide();
                    }
                }, 100);
            });
        }
        
        updateButtonVisibility() {
            if (this.toggleState === 'default') {
                if (this.isSearchEnginePage) {
                    this.toggleBtn.className = 'ses-toggle-btn';
                } else {
                    this.toggleBtn.className = 'ses-toggle-btn hide';
                }
            } else if (this.toggleState === 'show') {
                this.toggleBtn.className = 'ses-toggle-btn';
            } else if (this.toggleState === 'hide') {
                this.toggleBtn.className = 'ses-toggle-btn hide';
            }
        }
        
        scheduleHide() {
            this.hideTimeout = setTimeout(() => {
                if (!this.isDragging) {
                    this.hidePanel();
                }
            }, 200);
        }
        
        cancelHide() {
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
            }
        }
        
        startDrag(e) {
            e.preventDefault();
            this.isDragging = true;
            this.cancelHide();
            const rect = this.container.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            this.container.style.cursor = 'grabbing';
        }
        
        onDrag(e) {
            if (!this.isDragging) return;
            
            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;
            
            this.container.style.left = `${x}px`;
            this.container.style.top = `${y}px`;
        }
        
        stopDrag() {
            this.isDragging = false;
            this.container.style.cursor = '';
            setTimeout(() => {
                if (!this.toggleBtn.matches(':hover') && !this.panel.matches(':hover')) {
                    this.scheduleHide();
                }
            }, 100);
        }
        
        positionPanel() {
            // 浮动按钮定位在窗口顶部居中
            this.container.style.left = '50%';
            this.container.style.top = '20px';
            this.container.style.transform = 'translateX(-50%)';
            
            // 设置面板在按钮下方显示
            const btnRect = this.toggleBtn.getBoundingClientRect();
            this.panel.style.left = `${-this.panel.offsetWidth / 2 + btnRect.width / 2}px`;
            this.panel.style.top = `${btnRect.height + 10}px`;
        }
        
        togglePanel() {
            if (this.isVisible) {
                this.hidePanel();
            } else {
                this.showPanel();
            }
        }
        
        showPanel() {
            this.cancelHide();
            this.isVisible = true;
            this.panel.classList.add('show');
            
            this.autoFillCurrentKeyword();
            this.checkCurrentPageEngine();
            
            setTimeout(() => this.searchInput.focus(), 50);
        }
        
        autoFillCurrentKeyword() {
            const keyword = extractSearchKeywordFromPage();
            if (keyword && keyword.trim()) {
                this.searchInput.value = keyword;
                this.currentSearchText = keyword;
            }
        }
        
        checkCurrentPageEngine() {
            this.currentPageEngine = getCurrentPageEngine();
            if (this.currentPageEngine) {
                this.currentEngineName.textContent = this.currentPageEngine.name;
                this.currentEngineInfo.style.display = 'block';
            } else {
                this.currentEngineInfo.style.display = 'none';
            }
        }
        
        hidePanel() {
            this.isVisible = false;
            this.panel.classList.remove('show');
            this.currentEngineInfo.style.display = 'none';
            this.showSearchPanel();
        }
        
        showManagePanel() {
            this.panel.querySelector('.ses-search-interface').style.display = 'none';
            this.managePanel.classList.add('show');
            this.renderEngineList();
        }
        
        showSearchPanel() {
            this.panel.querySelector('.ses-search-interface').style.display = 'block';
            this.managePanel.classList.remove('show');
        }
        
        renderEngines() {
            this.enginesContainer.innerHTML = '';
            
            this.engines.forEach(engine => {
                const btn = document.createElement('button');
                btn.className = 'ses-engine-btn';
                if (engine.id === this.currentEngine.id) {
                    btn.classList.add('active');
                }
                
                btn.innerHTML = `
                    <span class="ses-engine-icon">${engine.icon || '🔍'}</span>
                    <span>${engine.name}</span>
                `;
                
                btn.addEventListener('click', () => {
                    this.currentEngine = engine;
                    this.renderEngines();
                    this.performSearch(engine);
                });
                
                this.enginesContainer.appendChild(btn);
            });
        }
        
        renderEngineList() {
            this.engineList.innerHTML = '';
            
            this.engines.forEach((engine, index) => {
                const item = document.createElement('div');
                item.className = 'ses-engine-item';
                item.draggable = true;
                item.dataset.index = index;
                
                item.innerHTML = `
                    <span class="ses-drag-handle" title="拖动排序" style="cursor:move;">☰</span>
                    <span class="ses-engine-icon">${engine.icon || '🔍'}</span>
                    <div class="ses-engine-info">
                        <div class="ses-engine-name">${engine.name}</div>
                        <div class="ses-engine-url">${engine.url}</div>
                    </div>
                    <div class="ses-engine-actions">
                        <button class="ses-icon-btn" title="设为默认" data-action="set-default" data-index="${index}">⭐</button>
                        <button class="ses-icon-btn" title="编辑" data-action="edit" data-index="${index}">✏️</button>
                        <button class="ses-icon-btn" title="删除" data-action="delete" data-index="${index}">🗑️</button>
                    </div>
                `;
                
                // 拖拽排序事件
                item.addEventListener('dragstart', (e) => this.onDragStart(e, index));
                item.addEventListener('dragover', (e) => this.onDragOver(e, index));
                item.addEventListener('dragleave', () => this.onDragLeave(index));
                item.addEventListener('drop', (e) => this.onDrop(e, index));
                item.addEventListener('dragend', () => this.onDragEnd());
                
                this.engineList.appendChild(item);
            });
            
            this.engineList.querySelectorAll('.ses-icon-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    const index = parseInt(btn.dataset.index);
                    
                    switch (action) {
                        case 'set-default':
                            this.setDefaultEngine(index);
                            break;
                        case 'edit':
                            this.editEngine(index);
                            break;
                        case 'delete':
                            this.deleteEngine(index);
                            break;
                    }
                });
            });
        }
        
        onDragStart(e, index) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index.toString());
            e.target.classList.add('dragging');
        }
        
        onDragOver(e, index) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const target = e.target.closest('.ses-engine-item');
            if (target && !target.classList.contains('drag-over')) {
                target.classList.add('drag-over');
            }
        }
        
        onDragLeave(index) {
            const target = document.querySelector('.ses-engine-item[data-index="' + index + '"]');
            if (target) {
                target.classList.remove('drag-over');
            }
        }
        
        onDrop(e, index) {
            e.preventDefault();
            e.stopPropagation();
            
            const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
            if (draggedIndex !== index) {
                this.reorderEngines(draggedIndex, index);
            }
            
            const target = document.querySelector('.ses-engine-item[data-index="' + index + '"]');
            if (target) {
                target.classList.remove('drag-over');
            }
        }
        
        onDragEnd() {
            document.querySelectorAll('.ses-engine-item').forEach(item => {
                item.classList.remove('dragging');
                item.classList.remove('drag-over');
            });
        }
        
        reorderEngines(fromIndex, toIndex) {
            const engine = this.engines[fromIndex];
            this.engines.splice(fromIndex, 1);
            this.engines.splice(toIndex, 0, engine);
            saveEngines(this.engines);
            this.renderEngineList();
        }
        
        setDefaultEngine(index) {
            const engine = this.engines[index];
            this.engines.splice(index, 1);
            this.engines.unshift(engine);
            this.currentEngine = engine;
            saveEngines(this.engines);
            this.renderEngines();
            this.renderEngineList();
        }
        
        editEngine(index) {
            const engine = this.engines[index];
            const newName = prompt('输入新名称:', engine.name);
            if (newName) {
                const newUrl = prompt('输入新URL:', engine.url);
                if (newUrl) {
                    if (!newUrl.includes('{query}')) {
                        alert('URL中必须包含 {query} 作为关键词占位符');
                        return;
                    }
                    const newIcon = prompt('输入新图标(可选):', engine.icon);
                    engine.name = newName;
                    engine.url = newUrl;
                    if (newIcon) engine.icon = newIcon;
                    saveEngines(this.engines);
                    this.renderEngines();
                    this.renderEngineList();
                }
            }
        }
        
        deleteEngine(index) {
            if (confirm('确定要删除这个搜索引擎吗？')) {
                this.engines.splice(index, 1);
                if (this.engines.length === 0) {
                    this.engines = [...defaultEngines];
                }
                if (this.currentEngine.id === this.engines[index]?.id) {
                    this.currentEngine = this.engines[0];
                }
                saveEngines(this.engines);
                this.renderEngines();
                this.renderEngineList();
            }
        }
        
        addNewEngine() {
            const name = document.getElementById('ses-new-name').value.trim();
            const url = document.getElementById('ses-new-url').value.trim();
            const icon = document.getElementById('ses-new-icon').value.trim();
            
            if (!name || !url) {
                alert('请填写名称和URL');
                return;
            }
            
            if (!url.includes('{query}')) {
                alert('URL中必须包含 {query} 作为关键词占位符');
                return;
            }
            
            const newEngine = {
                id: 'custom_' + Date.now(),
                name: name,
                url: url,
                icon: icon || '🔍'
            };
            
            this.engines.push(newEngine);
            saveEngines(this.engines);
            
            document.getElementById('ses-new-name').value = '';
            document.getElementById('ses-new-url').value = '';
            document.getElementById('ses-new-icon').value = '';
            
            this.renderEngineList();
            this.renderEngines();
            alert('搜索引擎已添加！');
        }
        
        addCurrentPageEngine() {
            if (!this.currentPageEngine) {
                alert('未检测到当前页面的搜索引擎');
                return;
            }
            
            const existingEngine = this.engines.find(engine => 
                engine.url.replace('{query}', '') === this.currentPageEngine.url.replace('{query}', '')
            );
            
            if (existingEngine) {
                alert(`搜索引擎 "${this.currentPageEngine.name}" 已存在`);
                return;
            }
            
            const newEngine = {
                id: 'current_' + Date.now(),
                name: this.currentPageEngine.name + ' (当前)',
                url: this.currentPageEngine.url,
                icon: this.currentPageEngine.icon || '🔍'
            };
            
            this.engines.push(newEngine);
            saveEngines(this.engines);
            
            this.renderEngines();
            this.renderEngineList();
            alert(`已添加搜索引擎: ${newEngine.name}`);
        }
        
        performSearch(engine) {
            let query = this.currentSearchText.trim();
            
            if (!query) {
                query = extractSearchKeywordFromPage();
                if (query && query.trim()) {
                    this.searchInput.value = query;
                    this.currentSearchText = query;
                }
            }
            
            if (!query) {
                this.searchInput.focus();
                return;
            }
            
            if (!engine.url.includes('{query}')) {
                alert('搜索引擎URL格式错误，缺少{query}占位符');
                console.error('搜索引擎URL缺少{query}占位符:', engine.url);
                return;
            }
            
            const encodedQuery = encodeURIComponent(query);
            const searchUrl = engine.url.replace('{query}', encodedQuery);
            window.open(searchUrl, '_blank');
            this.hidePanel();
        }
    }
    
    // 初始化应用
    window.addEventListener('load', () => {
        setTimeout(() => {
            try {
                new SearchEngineSwitcher();
                console.log('搜索引擎切换工具已加载');
            } catch (error) {
                console.error('搜索引擎切换工具加载失败:', error);
            }
        }, 1000);
    });
    
    // 创建油猴菜单命令
    GM_registerMenuCommand('🔄 重置为默认引擎', () => {
        if (confirm('确定要重置为默认搜索引擎列表吗？')) {
            GM_setValue('searchEngines', JSON.stringify(defaultEngines));
            alert('已重置为默认搜索引擎列表！');
        }
    });
    
    GM_registerMenuCommand('👁️ 显示浮动按钮', () => {
        const app = new SearchEngineSwitcher();
        app.toggleState = 'show';
        app.updateButtonVisibility();
    });
    
    GM_registerMenuCommand('👁️ 隐藏浮动按钮', () => {
        const app = new SearchEngineSwitcher();
        app.toggleState = 'hide';
        app.updateButtonVisibility();
    });
    
})();
