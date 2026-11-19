// ==UserScript==
// @name         Torn Ultimate Optimizer (All-in-One)
// @namespace    TornExtensions
// @version      12.0
// @description  Torn 终极提速优化：页面内置设置面板(支持中英双语)、战斗模型零下载、战斗HUD面板、赛车Canvas屏蔽、极速动画、SVG修复、Crime极简、字体本地平滑映射
// @author       Merged & Refactored
// @match        https://www.torn.com/*
// @run-at       document-start
// @grant        none
// @updateURL    	https://github.com/raichuq/mytornjs/raw/refs/heads/main/TUO.user.js
// @downloadURL  	https://github.com/raichuq/mytornjs/raw/refs/heads/main/TUO.user.js
// ==/UserScript==

(function() {
    'use strict';

    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);

    // ==========================================
    // [前置补丁] 修复 Torn 官方的 SVG 点击报错 Bug
    // ==========================================
    const svgProto = win.SVGAnimatedString && win.SVGAnimatedString.prototype;
    if (svgProto && !svgProto.includes) {
        svgProto.includes = function(search, start) {
            return (this.baseVal || '').includes(search, start);
        };
    }

    // ==========================================
    // 1. 配置管理 (基于游戏页面原生 localStorage，无需油猴插件参与)
    // ==========================================
    const DEFAULT_CONFIG = {
        disableGlobalAnimations: true,
        optimizeCrimePage:       true,
        optimizeRacingPage:      true,
        blockAttackModels:       true,
        showBattleInfoPanel:     true,
        optimizeFont:            true,
        language:                'en' // 默认英文，可选 'zh'
    };

    function getSetting(key, defaultVal) {
        try {
            const localVal = win.localStorage.getItem('TUO_' + key);
            if (localVal !== null) return JSON.parse(localVal);
        } catch(e) {}
        return defaultVal;
    }

    function setSetting(key, val) {
        try {
            win.localStorage.setItem('TUO_' + key, JSON.stringify(val));
        } catch(e) {}
    }

    const config = {};
    Object.keys(DEFAULT_CONFIG).forEach(key => {
        config[key] = getSetting(key, DEFAULT_CONFIG[key]);
    });

    function injectCSS(cssText, id) {
        const style = document.createElement('style');
        if (id) style.id = id;
        style.textContent = cssText;
        (document.head || document.documentElement).appendChild(style);
        return style;
    }

    const currentUrl = win.location.href;
    const isPreferencesPage = currentUrl.includes('preferences.php');
    const isCrimePage = currentUrl.includes('sid=crimes');
    const isAttackPage = currentUrl.includes('sid=attack');
    const isRacingPage = currentUrl.includes('sid=racing');

    // ==========================================
    // 2. 游戏设置页面内嵌面板 (preferences.php#tab=settings)
    // ==========================================
    if (isPreferencesPage) {
        const I18N = {
            en: {
                btnText: "⚙️ Torn Ultimate Optimizer Settings",
                title: "Torn Ultimate Optimizer Settings",
                version: "v12.0",
                notice: "⚠️ Changes saved. Refresh page to take effect.",
                close: "Close",
                reload: "Refresh Now",
                features: {
                    disableGlobalAnimations: {
                        title: "Global Ultra-Fast Animations",
                        desc: "Accelerates CSS animations across the entire site to 0.001s, eliminating unnecessary waiting."
                    },
                    optimizeCrimePage: {
                        title: "Crime Page Streamlined Mode",
                        desc: "Hides crime banners and animations, automatically expands stats panel."
                    },
                    optimizeRacingPage: {
                        title: "Racing Page Minimal Mode",
                        desc: "Hides race canvas and track scrolling effects to free GPU resources."
                    },
                    blockAttackModels: {
                        title: "Block Attack Models & Gear Images",
                        desc: "True zero-download blocking for character models and gear on attack pages."
                    },
                    showBattleInfoPanel: {
                        title: "Battle Info HUD Panel",
                        desc: "Displays color-coded armor and weapon perk stats on attack screen."
                    },
                    optimizeFont: {
                        title: "Local Font Fallback Mapping",
                        desc: "Maps external fonts to local system fonts (Roboto/Arial) to prevent invisible text."
                    }
                }
            },
            zh: {
                btnText: "⚙️ TUO 终极提速优化设置",
                title: "Torn 终极提速优化 (TUO) 设置",
                version: "v12.0",
                notice: "⚠️ 配置已修改，刷新页面后生效。",
                close: "关闭",
                reload: "立即刷新",
                features: {
                    disableGlobalAnimations: {
                        title: "全局极速动画 (压制 CSS 动画)",
                        desc: "将全站 CSS 动画时长缩短至 0.001s，消除冗长等待。"
                    },
                    optimizeCrimePage: {
                        title: "Crime 页面极简模式",
                        desc: "隐藏犯罪横幅与多余动效，自动展开属性面板。"
                    },
                    optimizeRacingPage: {
                        title: "Racing 页面极简模式 (屏蔽画布)",
                        desc: "隐藏赛车渲染画布和滚动特效层，显著减轻 GPU 负担防卡顿。"
                    },
                    blockAttackModels: {
                        title: "进攻页面模型与贴图零下载拦截",
                        desc: "在战斗界面从底层阻断角色模型与装备贴图下载（零网络流量）。"
                    },
                    showBattleInfoPanel: {
                        title: "战斗装备与武器技能面板 (HUD)",
                        desc: "在角色模型位置以 HUD 面板展示防具装备分级及武器加成特性。"
                    },
                    optimizeFont: {
                        title: "字体本地平滑映射",
                        desc: "将外部字体平滑替换为系统本地字体，杜绝字体阻断后出现隐形文字。"
                    }
                }
            }
        };

        function showSettingsModal() {
            let activeLang = getSetting('language', 'en');
            let hasChanged = false;

            const existing = document.getElementById('tuo-modal-overlay');
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.id = 'tuo-modal-overlay';
            overlay.style.cssText = `
                position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75);
                z-index: 2147483647; display: flex; align-items: center; justify-content: center;
                backdrop-filter: blur(3px); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            `;

            function render() {
                const t = I18N[activeLang];
                overlay.innerHTML = `
                    <div style="width: 520px; max-width: 92vw; background: #222; border: 1px solid #444; border-radius: 8px; box-shadow: 0 12px 36px rgba(0,0,0,0.85); color: #e0e0e0; overflow: hidden; display: flex; flex-direction: column;">
                        <!-- 头部 -->
                        <div style="background: #181818; padding: 14px 18px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 18px;">⚙️</span>
                                <span style="font-size: 15px; font-weight: 600; color: #fff;">${t.title}</span>
                                <span style="font-size: 11px; background: #333; color: #888; padding: 2px 6px; border-radius: 4px;">${t.version}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <select id="tuo-lang-select" style="background: #2a2a2a; color: #ccc; border: 1px solid #444; border-radius: 4px; padding: 3px 6px; font-size: 12px; cursor: pointer;">
                                    <option value="en" ${activeLang === 'en' ? 'selected' : ''}>English</option>
                                    <option value="zh" ${activeLang === 'zh' ? 'selected' : ''}>简体中文</option>
                                </select>
                                <button id="tuo-close-x" style="background: none; border: none; color: #888; font-size: 20px; cursor: pointer; line-height: 1; padding: 0 4px;">&times;</button>
                            </div>
                        </div>

                        <!-- 提示条 (修改后显示) -->
                        <div id="tuo-notice-banner" style="${hasChanged ? 'display: block;' : 'display: none;'} background: #332700; color: #ffd54f; border-bottom: 1px solid #554000; padding: 8px 18px; font-size: 12px; font-weight: 500;">
                            ${t.notice}
                        </div>

                        <!-- 功能开关列表 -->
                        <div style="padding: 14px 18px; max-height: 65vh; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;">
                            ${Object.keys(t.features).map(key => {
                                const feat = t.features[key];
                                const isChecked = getSetting(key, DEFAULT_CONFIG[key]);
                                return `
                                    <div style="background: #2a2a2a; border: 1px solid #383838; border-radius: 6px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                                        <div style="flex: 1;">
                                            <div style="font-size: 13px; font-weight: 600; color: #f0f0f0; margin-bottom: 3px;">${feat.title}</div>
                                            <div style="font-size: 11px; color: #999; line-height: 1.3;">${feat.desc}</div>
                                        </div>
                                        <label style="position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; cursor: pointer;">
                                            <input type="checkbox" data-feat="${key}" ${isChecked ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                                            <span style="position: absolute; inset: 0; background-color: ${isChecked ? '#4caf50' : '#555'}; transition: .2s; border-radius: 24px;">
                                                <span style="position: absolute; height: 18px; width: 18px; left: ${isChecked ? '22px' : '4px'}; bottom: 3px; background-color: white; transition: .2s; border-radius: 50%;"></span>
                                            </span>
                                        </label>
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        <!-- 底部操作按钮 -->
                        <div style="background: #181818; padding: 12px 18px; border-top: 1px solid #333; display: flex; justify-content: flex-end; gap: 10px;">
                            <button id="tuo-btn-reload" style="background: #388e3c; color: #fff; border: none; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;">${t.reload}</button>
                            <button id="tuo-btn-close" style="background: #3a3a3a; color: #ddd; border: 1px solid #555; padding: 6px 14px; border-radius: 4px; font-size: 12px; cursor: pointer;">${t.close}</button>
                        </div>
                    </div>
                `;

                // 语言切换
                overlay.querySelector('#tuo-lang-select').addEventListener('change', (e) => {
                    activeLang = e.target.value;
                    setSetting('language', activeLang);
                    render();
                    const pageBtn = document.getElementById('tuo-open-settings-btn');
                    if (pageBtn && I18N[activeLang]) {
                        pageBtn.textContent = I18N[activeLang].btnText;
                    }
                });

                // 开关切换事件
                overlay.querySelectorAll('input[type="checkbox"][data-feat]').forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const featKey = e.target.getAttribute('data-feat');
                        setSetting(featKey, e.target.checked);
                        hasChanged = true;
                        render();
                    });
                });

                // 关闭与刷新按钮
                overlay.querySelector('#tuo-close-x').addEventListener('click', () => overlay.remove());
                overlay.querySelector('#tuo-btn-close').addEventListener('click', () => overlay.remove());
                overlay.querySelector('#tuo-btn-reload').addEventListener('click', () => win.location.reload());
            }

            render();
            document.body.appendChild(overlay);

            // 点击背景区域关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.remove();
            });
        }

        // 定时轮询确保按钮注入在 update setting 按钮下方（应对 SPA 选项卡切换）
        const injectSettingsButton = () => {
            const updateBtn = document.querySelector('#step_settings');
            if (!updateBtn) return;

            const btnWrap = updateBtn.closest('.btn-wrap') || updateBtn.parentElement;
            if (!btnWrap) return;

            if (document.getElementById('tuo-settings-btn-wrap')) return;

            const lang = getSetting('language', 'en');
            const labelText = I18N[lang] ? I18N[lang].btnText : I18N.en.btnText;

            const container = document.createElement('div');
            container.id = 'tuo-settings-btn-wrap';
            container.style.cssText = 'margin-top: 15px; display: block; clear: both;';
            container.innerHTML = `
                <div class="btn-wrap silver">
                    <span class="btn">
                        <button type="button" class="torn-btn btn-big" id="tuo-open-settings-btn" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                            ${labelText}
                        </button>
                    </span>
                </div>
            `;

            container.querySelector('#tuo-open-settings-btn').addEventListener('click', (e) => {
                e.preventDefault();
                showSettingsModal();
            });

            btnWrap.parentNode.insertBefore(container, btnWrap.nextSibling);
        };

        setInterval(injectSettingsButton, 500);
        win.addEventListener('hashchange', injectSettingsButton);
    }

    // ==========================================
    // 3. 进攻页面：模型与贴图“零下载”拦截器 (仅作用于战斗页面)
    // ==========================================
    if (config.blockAttackModels && isAttackPage) {
        // 样式隐藏：只隐藏模型贴图与防具层，保留外层容器以供战斗信息面板精准定位展示
        injectCSS(`
            div[class*='armoursWrap___'],
            div[class*='model___'] > img,
            img[class*='bodyImage___'] {
                display: none !important;
            }
            div[class*='modelWrap___'] {
                min-height: 280px !important;
            }
        `, 'torn-attack-ui-blocker');

        // 匹配战斗中人物模型、装备、发型与背景图
        const ATTACK_ASSET_PATTERNS = [
            '/images/v2/attack/models/',
            '/getImage.php',
            '/images/v2/user_model/',
            '/images/v2/token_shop/attacking/',
            '/images/v2/items/model-items/',
            '/images/v2/items/backgrounds/'
        ];

        function isAttackModelAsset(url) {
            if (!url || typeof url !== 'string') return false;
            return ATTACK_ASSET_PATTERNS.some(p => url.includes(p));
        }

        // 1x1 透明空白 Gif，用于替换拦截的图片，确保 onload 瞬间完成且产生 0 字节网络流量
        const BLANK_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

        // 核心拦截 1：拦截 HTMLImageElement.src (new Image() 及 <img>.src 赋值)
        const contexts = [win];
        if (typeof window !== 'undefined' && window !== win) contexts.push(window);

        contexts.forEach(ctx => {
            if (!ctx.HTMLImageElement) return;

            const imgProto = ctx.HTMLImageElement.prototype;
            const origSrcDesc = Object.getOwnPropertyDescriptor(imgProto, 'src');
            if (origSrcDesc && origSrcDesc.set) {
                Object.defineProperty(imgProto, 'src', {
                    set: function(val) {
                        if (typeof val === 'string' && isAttackModelAsset(val)) {
                            return origSrcDesc.set.call(this, BLANK_GIF);
                        }
                        return origSrcDesc.set.call(this, val);
                    },
                    get: origSrcDesc.get,
                    configurable: true,
                    enumerable: true
                });
            }

            const origSrcsetDesc = Object.getOwnPropertyDescriptor(imgProto, 'srcset');
            if (origSrcsetDesc && origSrcsetDesc.set) {
                Object.defineProperty(imgProto, 'srcset', {
                    set: function(val) {
                        if (typeof val === 'string' && isAttackModelAsset(val)) {
                            return origSrcsetDesc.set.call(this, '');
                        }
                        return origSrcsetDesc.set.call(this, val);
                    },
                    get: origSrcsetDesc.get,
                    configurable: true,
                    enumerable: true
                });
            }

            // 核心拦截 2：拦截 HTMLSourceElement.srcset (<picture> 标签)
            if (ctx.HTMLSourceElement) {
                const sourceProto = ctx.HTMLSourceElement.prototype;
                const origSourceSrcset = Object.getOwnPropertyDescriptor(sourceProto, 'srcset');
                if (origSourceSrcset && origSourceSrcset.set) {
                    Object.defineProperty(sourceProto, 'srcset', {
                        set: function(val) {
                            if (typeof val === 'string' && isAttackModelAsset(val)) {
                                return origSourceSrcset.set.call(this, '');
                            }
                            return origSourceSrcset.set.call(this, val);
                        },
                        get: origSourceSrcset.get,
                        configurable: true,
                        enumerable: true
                    });
                }
            }

            // 核心拦截 3：拦截 setAttribute('src', ...)
            if (ctx.Element) {
                const elemProto = ctx.Element.prototype;
                const origSetAttr = elemProto.setAttribute;
                elemProto.setAttribute = function(name, val) {
                    if (typeof val === 'string') {
                        const lower = name.toLowerCase();
                        if (lower === 'src' && isAttackModelAsset(val)) {
                            return origSetAttr.call(this, name, BLANK_GIF);
                        }
                        if (lower === 'srcset' && isAttackModelAsset(val)) {
                            return origSetAttr.call(this, name, '');
                        }
                    }
                    return origSetAttr.apply(this, arguments);
                };
            }

            // 核心拦截 4：拦截 fetch 和 XMLHttpRequest
            if (ctx.fetch) {
                const origFetch = ctx.fetch;
                ctx.fetch = async function(...args) {
                    const url = args[0] instanceof Request ? args[0].url : args[0];
                    if (isAttackModelAsset(url)) {
                        return Promise.reject(new TypeError('Blocked by TUO'));
                    }
                    return origFetch.apply(this, args);
                };
            }

            if (ctx.XMLHttpRequest) {
                const origOpen = ctx.XMLHttpRequest.prototype.open;
                ctx.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                    if (isAttackModelAsset(url)) {
                        this.send = function() {
                            Object.defineProperty(this, 'readyState', { value: 4 });
                            Object.defineProperty(this, 'status', { value: 0 });
                            this.dispatchEvent(new Event('error'));
                        };
                        return;
                    }
                    return origOpen.call(this, method, url, ...rest);
                };
            }
        });
    }

    // ==========================================
    // 4. 进攻页面：战斗信息面板 (Battle Info Panel 集成)
    // ==========================================
    if (config.showBattleInfoPanel && isAttackPage) {
        function getArmorColor(name) {
            if (!name) return '#ffffff';
            // 橙色 (#ff8000): EOD
            if (name.includes("EOD")) return '#ff8000';
            // 紫色 (#a335ee): Vanguard, Sentinel, Delta, M'aol, Marauder
            const purpleKeywords = ["Vanguard", "Sentinel", "Delta", "M'aol", "Marauder"];
            if (purpleKeywords.some(keyword => name.includes(keyword))) return '#a335ee';
            // 蓝色 (#0070dd): Assault, Riot
            const blueKeywords = ["Assault", "Riot"];
            if (blueKeywords.some(keyword => name.includes(keyword))) return '#0070dd';
            // 绿色 (#1eff00): Dune
            if (name.includes("Dune")) return '#1eff00';
            return '#ffffff';
        }

        function extractArmor(map) {
            const areas = map.querySelectorAll('area');
            const list = {};
            areas.forEach(area => {
                const slot = area.getAttribute('alt');
                const item = area.getAttribute('title');
                if (slot && item) list[slot] = item;
            });
            return list;
        }

        function extractWeapons(modelNode) {
            const weapons = {};
            let playerRoot = modelNode.parentElement;
            while (playerRoot && playerRoot.parentElement && playerRoot.tagName !== 'BODY' && !playerRoot.querySelector('[class*="topMarker"]')) {
                playerRoot = playerRoot.parentElement;
            }
            if (!playerRoot) return {};

            const slots = [
                { key: 'Primary', label: 'Primary' },
                { key: 'Secondary', label: 'Secondary' },
                { key: 'Melee', label: 'Melee' }
            ];

            slots.forEach(slotType => {
                const markers = Array.from(playerRoot.querySelectorAll('[class*="markerText"]'));
                const targetMarker = markers.find(el => el.textContent.trim() === slotType.key);

                if (targetMarker) {
                    const markerContainer = targetMarker.closest('[class*="topMarker"]');
                    if (markerContainer) {
                        const bonusPropsDiv = markerContainer.nextElementSibling;
                        if (bonusPropsDiv && bonusPropsDiv.innerHTML.includes('bonus-attachment')) {
                            const skills = bonusPropsDiv.querySelectorAll('i[class*="bonus-attachment-"]');
                            const skillTexts = [];
                            skills.forEach(skill => {
                                const title = skill.getAttribute('data-bonus-attachment-title');
                                const desc = skill.getAttribute('data-bonus-attachment-description');
                                if (title) {
                                    const valueMatch = desc ? desc.match(/(\d+(\.\d+)?%|x\d+(\.\d+)?)/) : null;
                                    const valueStr = valueMatch ? ` <span style="color:#00ff00; font-size:0.9em;">(${valueMatch[0]})</span>` : '';
                                    skillTexts.push(title + valueStr);
                                }
                            });
                            if (skillTexts.length > 0) {
                                weapons[slotType.label] = skillTexts.join('<br>');
                            }
                        }
                    }
                }
            });
            return weapons;
        }

        function showPanel(container, armorList, weaponList) {
            const parentElement = container.parentElement;
            if (!parentElement) return;

            if (win.getComputedStyle(parentElement).position === 'static') {
                parentElement.style.position = 'relative';
            }

            let displayDiv = parentElement.querySelector('.custom-info-panel');
            if (!displayDiv) {
                displayDiv = document.createElement('div');
                displayDiv.className = 'custom-info-panel';
                displayDiv.style.cssText = `
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    left: 10px;
                    background-color: rgba(0, 0, 0, 0.9);
                    color: #ffffff;
                    padding: 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    z-index: 2147483647 !important;
                    pointer-events: none;
                    border: 1px solid #666;
                    box-shadow: 3px 3px 10px rgba(0,0,0,0.7);
                    min-width: 180px;
                    line-height: 1.4;
                    font-family: Arial, sans-serif;
                `;
                parentElement.appendChild(displayDiv);
            }

            let html = '<table style="border-collapse: collapse; width: 100%;">';

            // --- 1. Armor 部分 ---
            const armorOrder = ['Helmet', 'Chest', 'Gloves', 'Pants', 'Boots'];
            html += '<tr><th colspan="2" style="text-align:left; border-bottom:1px solid #555; padding:4px 0; color:#4caf50; font-weight:bold; text-transform:uppercase;">Armor</th></tr>';

            armorOrder.forEach(slot => {
                const rawName = armorList[slot];
                let itemHtml = '';
                if (rawName) {
                    const color = getArmorColor(rawName);
                    itemHtml = `<span style="color: ${color}; font-weight: bold;">${rawName}</span>`;
                } else {
                    itemHtml = '<span style="color:#666; font-style:italic;">N/A</span>';
                }
                html += `
                    <tr>
                        <td style="padding: 2px 10px 2px 0; color: #aaa; vertical-align: top;">${slot}</td>
                        <td style="padding: 2px 0 2px 0; text-align: right;">${itemHtml}</td>
                    </tr>
                `;
            });

            // --- 2. Weapons 部分 ---
            if (weaponList !== null) {
                html += '<tr><td colspan="2" style="height:8px;"></td></tr>';
                html += '<tr><th colspan="2" style="text-align:left; border-bottom:1px solid #555; padding:4px 0; color:#ff5722; font-weight:bold; text-transform:uppercase;">Weapons</th></tr>';

                const weaponOrder = ['Primary', 'Secondary', 'Melee'];
                weaponOrder.forEach(slot => {
                    const itemText = weaponList[slot] ? weaponList[slot] : '<span style="color:#666; font-style:italic;">N/A</span>';
                    html += `
                        <tr>
                            <td style="padding: 4px 10px 4px 0; color: #ddd; vertical-align: top; white-space:nowrap;">${slot}</td>
                            <td style="padding: 4px 0 4px 0; text-align: right; color: #fff;">${itemText}</td>
                        </tr>
                    `;
                });
            }

            html += '</table>';
            displayDiv.innerHTML = html;
        }

        const pollBattleInfo = () => {
            const allModels = document.querySelectorAll('div[class*="model___"]');
            const isMobileOrSingleMode = allModels.length === 1;

            allModels.forEach(modelContainer => {
                const mapElement = modelContainer.querySelector('map');
                const hasMap = !!mapElement;
                const processed = modelContainer.getAttribute('data-info-processed');

                // 首次处理，或之前无 map 时再次更新（等待 React 异步挂载 map）
                if (!processed || (processed === 'no-map' && hasMap)) {
                    const armorData = hasMap ? extractArmor(mapElement) : {};
                    let weaponData = null;
                    if (!isMobileOrSingleMode) {
                        weaponData = extractWeapons(modelContainer);
                    }

                    // 提取到防具数据或武器数据后渲染面板
                    if (hasMap || (weaponData && Object.keys(weaponData).length > 0)) {
                        showPanel(modelContainer, armorData, weaponData);
                        modelContainer.setAttribute('data-info-processed', hasMap ? 'true' : 'no-map');
                    }
                }
            });
        };

        const battleInfoTimer = setInterval(pollBattleInfo, 500);

        // 页面卸载或导航时自动清除定时器
        win.addEventListener('beforeunload', () => clearInterval(battleInfoTimer), { once: true });
    }

    // ==========================================
    // 5. 其它独立功能模块执行
    // ==========================================

    // 字体映射：仅作本地映射（网络阻断由 uBlock Origin 的 $font 规则全权负责，移除高开销 MutationObserver）
    if (config.optimizeFont) {
        const localFontStack = `local('Roboto Condensed'), local('Arial Narrow'), local('Arial'), local('Helvetica Neue'), local('sans-serif'), local('system-ui')`;
        injectCSS(`
            @font-face { font-family: 'Fjalla One'; src: ${localFontStack}; font-weight: 400; font-style: normal; font-display: swap; }
            @font-face { font-family: 'Fjalla One'; src: ${localFontStack}; font-weight: 500; font-style: normal; font-display: swap; }
            @font-face { font-family: 'Fjalla One'; src: ${localFontStack}; font-weight: 700; font-style: normal; font-display: swap; }
            @font-face { font-family: 'Audiowide'; src: ${localFontStack}; font-style: normal; font-display: swap; }
            @font-face { font-family: 'visitor1'; src: ${localFontStack}; font-style: normal; font-display: swap; }
        `, 'torn-font-optimizer');
    }

    // 全局极速动画
    if (config.disableGlobalAnimations) {
        injectCSS(`
            *, *::before, *::after {
                animation-duration: 0.001s !important;
                animation-delay: 0s !important;
                animation-iteration-count: 1 !important;
            }
        `, 'torn-disable-animations');
    }

    // Racing 页面极简模式 (隐藏画布和背景滚动)
    if (config.optimizeRacingPage && isRacingPage) {
        injectCSS(`
            canvas#raceCanvas {
                display: none !important;
                visibility: hidden !important;
            }
            div.img-track.t-scroll {
                display: none !important;
            }
        `, 'torn-racing-fast-optimizer');
    }

    // Crime 页面极简模式
    if (config.optimizeCrimePage && isCrimePage) {
        injectCSS(`
            [class*="bannerWrapper___"] { display: none !important; content-visibility: hidden !important; }
            [class*="linesAnimation___"], [class*="forStrongForward___"], [class*="forSoftForward___"] {
                display: none !important;
            }
        `, 'torn-crime-fast-optimizer');

        const tryExpandStats = () => {
            const button = document.querySelector('[class*="toggleStatsPanelButton___"]');
            if (button) {
                if (button.getAttribute('aria-expanded') !== 'true') button.click();
                return true;
            }
            return false;
        };

        const triggerExpand = () => {
            if (tryExpandStats()) return;
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if (tryExpandStats() || attempts > 30) clearInterval(interval);
            }, 100);
        };

        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', triggerExpand);
        else triggerExpand();

        win.addEventListener('hashchange', triggerExpand);

        const originalPushState = win.history.pushState;
        win.history.pushState = function() {
            originalPushState.apply(this, arguments);
            triggerExpand();
        };
        const originalReplaceState = win.history.replaceState;
        win.history.replaceState = function() {
            originalReplaceState.apply(this, arguments);
            triggerExpand();
        };
    }

})();
