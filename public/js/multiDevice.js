/**
 * Multi-Device Campaign Preview Logic
 * Consolidates 'Ultimate Multi-Device', 'Real Link Loading', and 'Smart User-Agent'
 */

document.addEventListener('DOMContentLoaded', () => {
    // State
    const mdState = {
        urls: [],
        autoTrafficActive: false,
        trafficRate: 100,
        pattern: 'organic',
        intervalParams: null,
        stats: { visitors: 0, clicks: 0 }
    };

    // Elements
    const el = {
        targetUrl: document.getElementById('mdTargetUrl'),
        campaignTitle: document.getElementById('mdCampaignTitle'),
        addBtn: document.getElementById('mdAddUrlBtn'),

        autoToggle: document.getElementById('mdAutoTrafficToggle'),
        trafficRate: document.getElementById('mdTrafficRate'),
        rateDisplay: document.getElementById('mdRateDisplay'),
        trafficPattern: document.getElementById('mdTrafficPattern'),
        statusText: document.getElementById('mdStatusText'),
        barContainer: document.getElementById('mdTrafficBarContainer'),

        simAllBtn: document.getElementById('mdSimulateAllBtn'),
        optBtn: document.getElementById('mdOptimizeBtn'),
        clearBtn: document.getElementById('mdClearBtn'),

        statVis: document.getElementById('mdStatVisitors'),
        statClk: document.getElementById('mdStatClicks'),
        statCtr: document.getElementById('mdStatCtr'),
        statDev: document.getElementById('mdStatDevices'),
        headerCount: document.getElementById('mdActiveUrlCount'),
        headerViews: document.getElementById('mdTotalViews'),

        urlList: document.getElementById('mdUrlList')
    };

    // Device configs
    const devices = {
        desktop: { el: document.getElementById('screenDesktop'), st: document.getElementById('statusDesktop'), iframe: document.getElementById('iframeDesktop') },
        tablet: { el: document.getElementById('screenTablet'), st: document.getElementById('statusTablet'), iframe: document.getElementById('iframeTablet') },
        android: { el: document.getElementById('screenAndroid'), st: document.getElementById('statusAndroid'), iframe: document.getElementById('iframeAndroid') },
        iphone: { el: document.getElementById('screenIphone'), st: document.getElementById('statusIphone'), iframe: document.getElementById('iframeIphone') }
    };

    // 1. Add URL
    el.addBtn.addEventListener('click', () => {
        let url = el.targetUrl.value.trim();
        if (!url) {
            if (typeof showToast !== 'undefined') showToast('Please enter a target URL', 'error');
            return;
        }
        if (!url.startsWith('http')) url = 'https://' + url;

        const title = el.campaignTitle.value.trim() || new URL(url).hostname;

        // Tier limit for URLs (devices)
        if (typeof userTier !== 'undefined' && (userTier === 'free' || userTier === 'pro')) {
            if (mdState.urls.length >= 3) {
                return showToast(`Your ${userTier.charAt(0).toUpperCase() + userTier.slice(1)} plan is limited to 3 devices. Upgrade to Ultimate for unlimited!`, 'warning');
            }
        }

        const newEntry = {
            id: Date.now().toString(),
            url,
            title,
            visitors: 0,
            clicks: 0,
            ctr: 0,
            devices: { desktop: 0, tablet: 0, android: 0, iphone: 0 }
        };

        mdState.urls.push(newEntry);
        el.targetUrl.value = '';
        el.campaignTitle.value = '';

        if (typeof showToast !== 'undefined') showToast('Campaign URL added successfully', 'success');
        mdUpdateView();

        // Immediate load into all iframes when a URL is added
        Object.keys(devices).forEach((devKey) => {
            const dev = devices[devKey];
            if (dev.iframe) {
                dev.iframe.src = url;
                dev.iframe.classList.remove('opacity-0');
                dev.iframe.classList.add('opacity-100');
                // Hide the icon
                const icon = dev.el.querySelector('i');
                if (icon) icon.classList.add('opacity-0');

                dev.st.textContent = 'Active Load';
                dev.st.className = 'absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap shadow-[0_0_10px_rgba(16,185,129,0.5)] z-10';
            }
        });
    });

    // 2. Traffic Controls
    el.trafficRate.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        mdState.trafficRate = val;
        if (el.rateDisplay) {
            el.rateDisplay.textContent = val + ' /hr';
        }
    });

    el.trafficPattern.addEventListener('change', (e) => {
        mdState.pattern = e.target.value;
    });

    el.autoToggle.addEventListener('change', (e) => {
        mdState.autoTrafficActive = e.target.checked;

        if (mdState.autoTrafficActive) {
            if (mdState.urls.length === 0) {
                el.autoToggle.checked = false;
                mdState.autoTrafficActive = false;
                if (typeof showToast !== 'undefined') showToast('Add at least one URL first', 'warning');
                return;
            }

            el.statusText.textContent = 'Auto Traffic Engine Running...';
            el.statusText.className = 'text-[10px] text-center text-emerald-400 font-bold mb-2';
            el.barContainer.classList.remove('hidden');

            mdStartAutoTraffic();
            if (typeof showToast !== 'undefined') showToast('Auto Traffic Generation Started', 'success');
        } else {
            el.statusText.textContent = 'System Idle - Waiting for URLs';
            el.statusText.className = 'text-[10px] text-center text-gray-500 font-medium mb-2';
            el.barContainer.classList.add('hidden');

            clearInterval(mdState.intervalParams);
            if (typeof showToast !== 'undefined') showToast('Auto Traffic Generation Stopped', 'info');
        }
    });

    // 3. Actions
    el.clearBtn.addEventListener('click', () => {
        mdState.urls = [];
        mdState.stats = { visitors: 0, clicks: 0 };
        if (mdState.autoTrafficActive) el.autoToggle.checked = false;
        clearInterval(mdState.intervalParams);

        // Reset iframes
        Object.keys(devices).forEach(k => {
            const d = devices[k];
            if (d.iframe) {
                d.iframe.src = 'about:blank';
                d.iframe.classList.add('opacity-0');
                d.iframe.classList.remove('opacity-100');
            }
            const icon = d.el.querySelector('i');
            if (icon) icon.classList.remove('opacity-0');
            d.st.textContent = 'Idle';
            d.st.className = 'absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-500/20 border border-gray-500/50 text-gray-300 text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap z-10';
        });

        mdUpdateView();
        if (typeof showToast !== 'undefined') showToast('All campaigns cleared', 'info');
    });

    el.simAllBtn.addEventListener('click', () => {
        if (!mdState.urls.length) {
            if (typeof showToast !== 'undefined') showToast('Add URLs first', 'warning');
            return;
        }

        mdState.urls.forEach(u => {
            Object.keys(devices).forEach((dev, idx) => {
                setTimeout(() => mdSimulateHit(dev, u.id), idx * 300);
            });
        });
        if (typeof showToast !== 'undefined') showToast('Forced visits queued', 'success');
    });

    el.optBtn.addEventListener('click', () => {
        if (!mdState.urls.length) {
            if (typeof showToast !== 'undefined') showToast('Add URLs first', 'warning');
            return;
        }

        if (typeof showToast !== 'undefined') showToast('AI Optimizing CTR across active devices...', 'info');
        mdState.urls.forEach(u => {
            u.clicks += Math.floor(Math.random() * 5) + 2;
            u.visitors += Math.floor(Math.random() * 10) + 5;
        });

        setTimeout(() => {
            mdUpdateView();
            if (typeof showToast !== 'undefined') showToast('Optimization Complete', 'success');
        }, 1500);
    });

    // Core Logic
    function mdStartAutoTraffic() {
        if (mdState.intervalParams) clearInterval(mdState.intervalParams);

        mdState.intervalParams = setInterval(() => {
            if (!mdState.urls.length || !mdState.autoTrafficActive) return;

            // Calc hits needed per interval based on rate/hr
            let baseRate = mdState.trafficRate / 3600; // hits per sec
            baseRate *= 2; // interval runs every 2s

            if (mdState.pattern === 'viral') baseRate *= 3;
            else if (mdState.pattern === 'random') baseRate *= (Math.random() * 2);

            const hits = Math.max(1, Math.round(baseRate));

            for (let i = 0; i < hits; i++) {
                const randomUrl = mdState.urls[Math.floor(Math.random() * mdState.urls.length)];
                const devs = Object.keys(devices);
                const randomDev = devs[Math.floor(Math.random() * devs.length)];

                mdSimulateHit(randomDev, randomUrl.id, false); // false = quiet mode
            }

            mdUpdateView();

        }, 2000);
    }

    function mdSimulateHit(deviceType, urlId, flashUi = true) {
        const urlObj = mdState.urls.find(u => u.id === urlId);
        if (!urlObj) return;

        urlObj.visitors++;
        urlObj.devices[deviceType]++;
        if (Math.random() > 0.8) urlObj.clicks++; // 20% natural CTR base

        mdState.stats.visitors++;
        if (Math.random() > 0.8) mdState.stats.clicks++;

        const devEl = devices[deviceType];

        if (flashUi) {
            // Flash screen bg
            devEl.el.classList.add('device-screen-active');

            // Flash status badge
            devEl.st.textContent = 'Routing...';
            devEl.st.className = 'absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap shadow-[0_0_10px_rgba(234,179,8,0.5)] z-10 transition-colors';

            // Show iframe, hide icon
            const icon = devEl.el.querySelector('i');
            if (icon) icon.classList.add('opacity-0');
            if (devEl.iframe) {
                devEl.iframe.src = urlObj.url;
                devEl.iframe.classList.remove('opacity-0');
                devEl.iframe.classList.add('opacity-100');
            }

            setTimeout(() => {
                devEl.st.textContent = 'Active Hit';
                devEl.st.className = 'absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap shadow-[0_0_10px_rgba(16,185,129,0.5)] z-10 transition-colors';
            }, 800);

            setTimeout(() => {
                devEl.el.classList.remove('device-screen-active');
                devEl.st.textContent = 'Idle';
                devEl.st.className = 'absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-500/20 border border-gray-500/50 text-gray-300 text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap z-10 transition-colors';
                mdUpdateView();
            }, 4000);
        }
    }

    function mdUpdateView() {
        const format = (n) => typeof formatNumber !== 'undefined' ? formatNumber(n) : n;
        // Stats Calc
        let totalVs = mdState.urls.reduce((acc, curr) => acc + curr.visitors, 0);
        let totalCs = mdState.urls.reduce((acc, curr) => acc + curr.clicks, 0);
        let avgCtr = totalVs > 0 ? ((totalCs / totalVs) * 100).toFixed(1) : 0;

        el.statVis.textContent = formatNumber(totalVs);
        el.headerViews.textContent = formatNumber(totalVs);
        el.statClk.textContent = formatNumber(totalCs);
        el.statCtr.textContent = avgCtr + '%';

        let devsActive = new Set();
        mdState.urls.forEach(u => {
            Object.keys(u.devices).forEach(k => { if (u.devices[k] > 0) devsActive.add(k); });
        });
        el.statDev.textContent = devsActive.size;
        el.headerCount.textContent = mdState.urls.length;

        // Render List
        if (mdState.urls.length === 0) {
            el.urlList.innerHTML = '<div class="text-center py-8 text-gray-500 text-sm border border-dashed border-white/10 rounded-xl">No URLs added. Add a URL to begin simulation.</div>';
            return;
        }

        el.urlList.innerHTML = mdState.urls.map(u => {
            const uCtr = u.visitors > 0 ? ((u.clicks / u.visitors) * 100).toFixed(1) : 0;
            return `
                <div class="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors flex flex-col md:flex-row justify-between items-center gap-4">
                  <div class="flex-1 min-w-0 w-full">
                    <div class="font-bold text-white mb-1 truncate">${u.title} <span class="text-xs font-normal text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded ml-2">ID: ${u.id.slice(-4)}</span></div>
                    <div class="text-xs text-gray-500 truncate" title="${u.url}">${u.url}</div>
                  </div>
                  
                  <div class="flex gap-4 shrink-0 font-mono text-sm">
                    <div class="text-center">
                      <div class="text-[10px] text-gray-500">VISITS</div>
                      <div class="font-bold text-white">${format(u.visitors)}</div>
                    </div>
                    <div class="text-center">
                      <div class="text-[10px] text-gray-500">CLICKS</div>
                      <div class="font-bold text-blue-400">${format(u.clicks)}</div>
                    </div>
                    <div class="text-center">
                      <div class="text-[10px] text-gray-500">CTR</div>
                      <div class="font-bold text-emerald-400">${uCtr}%</div>
                    </div>
                  </div>
                  
                  <div class="shrink-0 flex gap-1">
                    <button onclick="document.dispatchEvent(new CustomEvent('md-delete', {detail: '${u.id}'}))" class="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><i class="fas fa-times"></i></button>
                  </div>
                </div>
            `;
        }).join('');
    }

    // Handle global delete event dispatched from HTML strings
    document.addEventListener('md-delete', (e) => {
        mdState.urls = mdState.urls.filter(u => u.id !== e.detail);
        if (mdState.urls.length === 0 && mdState.autoTrafficActive) el.autoToggle.click();
        mdUpdateView();
        showToast('Campaign removed', 'info');
    });

});
