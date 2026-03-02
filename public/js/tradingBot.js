/**
 * Black Hat AI Trading Bot Logic
 * Provides simulated AI signals, TradingView integration, and PnL tracking for premium users.
 */

// ============ HELPER FUNCTIONS ============
// Ensure these functions exist (may be defined globally, but include fallbacks)
if (typeof showToast === 'undefined') {
    window.showToast = function(message, type = 'info', duration = 3000) {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Fallback: log to console if global function not available
    };
}

if (typeof formatNumber === 'undefined') {
    window.formatNumber = function(num, decimals = 0) {
        return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };
}

document.addEventListener('DOMContentLoaded', () => {
    // Check if user has required tier (injected from EJS)
    const canUsePremiumFeatures = window.USER_TIER === 'pro' || window.USER_TIER === 'ultimate';

    // State
    const state = {
        platform: 'binance',
        pair: 'BTC/USD',
        duration: 120, // seconds
        activeSignal: null,
        signalTimer: null,
        marketInterval: null,
        stats: {
            trades: 0,
            wins: 0,
            pnl: 0
        },
        history: []
    };

    // Configuration
    const platformConfigs = {
        binance: { name: 'Binance', pairs: ['BTC/USD', 'ETH/USD', 'BNB/USD', 'ADA/USD', 'SOL/USD', 'XRP/USD'], winRateBase: 0.90 },
        quotex: { name: 'Quotex', pairs: ['EUR/USD', 'GBP/USD', 'BTC/USD', 'ETH/USD', 'USD/JPY', 'XAU/USD'], winRateBase: 0.88 },
        pocketoption: { name: 'PocketOption', pairs: ['EUR/USD', 'BTC/USD', 'ETH/USD', 'GBP/USD', 'AUD/USD', 'USD/CAD'], winRateBase: 0.87 },
        exness: { name: 'Exness', pairs: ['XAU/USD', 'BTC/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY'], winRateBase: 0.89 }
    };

    const marketData = {
        'BTC/USD': { price: 64230.50, change: 1.2 },
        'ETH/USD': { price: 3450.20, change: -0.5 },
        'SOL/USD': { price: 145.80, change: 4.5 },
        'BNB/USD': { price: 580.40, change: 0.8 },
        'XRP/USD': { price: 0.58, change: -1.2 },
        'ADA/USD': { price: 0.45, change: 0.4 },
        'EUR/USD': { price: 1.0850, change: 0.15 },
        'GBP/USD': { price: 1.2640, change: -0.1 },
        'USD/JPY': { price: 155.20, change: 0.25 },
        'XAU/USD': { price: 2340.50, change: 0.8 },
        'AUD/USD': { price: 0.6650, change: -0.2 },
        'USD/CAD': { price: 1.3620, change: 0.1 }
    };

    // Elements
    const elements = {
        platformBtns: document.querySelectorAll('#aiPlatformSelect .ai-select-btn'),
        pairSelect: document.getElementById('aiPairSelect'),
        durationBtns: document.querySelectorAll('#aiDurationSelect .ai-select-btn'),
        generateBtn: document.getElementById('aiGenerateBtn'),
        signalDisplay: document.getElementById('aiSignalDisplay'),
        marketTicker: document.getElementById('aiMarketTicker'),
        historyContainer: document.getElementById('aiHistoryContainer'),
        clearHistoryBtn: document.getElementById('aiClearHistoryBtn'),
        winRateEl: document.getElementById('aiWinRate'),
        totalTradesEl: document.getElementById('aiTotalTrades'),
        totalPnlEl: document.getElementById('aiTotalPnl')
    };

    // 1. Initialization
    initSetup();

    function initSetup() {
        populatePairs();
        startMarketTicker();
        loadLocalStats();

        if (canUsePremiumFeatures) {
            setupPremiumListeners();
            loadTradingView();
        }
    }

    // 2. Setup Events
    function setupPremiumListeners() {
        // Platform Selection
        elements.platformBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                elements.platformBtns.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                state.platform = e.currentTarget.dataset.val;
                populatePairs();
                loadTradingView();
            });
        });

        // Pair Selection
        if (elements.pairSelect) {
            elements.pairSelect.addEventListener('change', (e) => {
                state.pair = e.target.value;
                loadTradingView();
            });
        }

        // Duration Selection
        elements.durationBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                elements.durationBtns.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                state.duration = parseInt(e.currentTarget.dataset.val);
            });
        });

        // Generate Signal
        if (elements.generateBtn) {
            elements.generateBtn.addEventListener('click', handleGenerateSignal);
        }

        // Clear History
        if (elements.clearHistoryBtn) {
            elements.clearHistoryBtn.addEventListener('click', () => {
                state.history = [];
                state.stats = { trades: 0, wins: 0, pnl: 0 };
                saveLocalStats();
                updateStatsUI();
                renderHistory();
                showToast('Trading history cleared', 'info');
            });
        }
    }

    // 3. UI Helpers
    function populatePairs() {
        if (!elements.pairSelect) return;

        const platform = platformConfigs[state.platform];
        const pairs = platform.pairs;

        elements.pairSelect.innerHTML = pairs.map(p => `<option value="${p}">${p}</option>`).join('');

        // Retain selection if valid for new platform
        if (pairs.includes(state.pair)) {
            elements.pairSelect.value = state.pair;
        } else {
            state.pair = pairs[0];
            elements.pairSelect.value = state.pair;
        }
    }

    function startMarketTicker() {
        if (!elements.marketTicker) return;

        const updateTicker = () => {
            elements.marketTicker.innerHTML = Object.entries(marketData).slice(0, 8).map(([pair, data]) => {
                // Simulate minor price wiggles
                const volatility = data.price * 0.0005;
                data.price += (Math.random() - 0.5) * volatility;

                const isUp = data.change >= 0;
                const colorClass = isUp ? 'text-emerald-400' : 'text-red-400';
                const bgClass = isUp ? 'bg-emerald-500/10' : 'bg-red-500/10';
                const icon = isUp ? 'fa-arrow-up' : 'fa-arrow-down';

                return `
                    <div class="flex items-center gap-3 ${bgClass} px-3 py-1.5 rounded-lg border border-white/5 whitespace-nowrap">
                        <span class="font-bold text-gray-200 text-sm">${pair}</span>
                        <span class="font-mono text-white text-sm">$${data.price.toFixed(pair.includes('USD/') || pair.includes('EUR/') || pair.includes('GBP/') ? 4 : 2)}</span>
                        <span class="${colorClass} text-xs font-bold flex items-center gap-1">
                            <i class="fas ${icon} text-[10px]"></i> ${Math.abs(data.change).toFixed(2)}%
                        </span>
                    </div>
                `;
            }).join('');
        };

        updateTicker();
        state.marketInterval = setInterval(updateTicker, 3000);
    }

    // 4. TradingView Integration (UPDATED)
    function loadTradingView() {
        const tvContainer = document.getElementById('aiTradingViewContainer');
        if (!tvContainer) return;

        tvContainer.innerHTML = '';

        // ============ DYNAMIC SYMBOL MAPPING ============
        // Maps platform + trading pair to proper TradingView symbol format
        const tvSymbol = getTradingViewSymbol(state.platform, state.pair);

        console.log('[TradingView] Loading chart for:', tvSymbol, 'Platform:', state.platform, 'Pair:', state.pair);

        if (typeof TradingView === 'undefined') {
            console.warn('[TradingView] TradingView library not loaded yet');
            return;
        }

        try {
            new TradingView.widget({
                "autosize": true,
                "symbol": tvSymbol,
                "interval": "1",
                "timezone": "Etc/UTC",
                "theme": "dark",
                "style": "1",
                "locale": "en",
                "enable_publishing": false,
                "backgroundColor": "rgba(17, 24, 39, 1)",
                "gridColor": "rgba(255, 255, 255, 0.05)",
                "hide_top_toolbar": false,
                "hide_legend": true,
                "save_image": false,
                "container_id": "aiTradingViewContainer",
                "toolbar_bg": "rgba(17, 24, 39, 1)",
                "disable_alerts": false
            });
        } catch (error) {
            console.error('[TradingView] Error loading widget:', error);
            tvContainer.innerHTML = `<div class="flex items-center justify-center w-full h-full text-sm text-red-400">Chart loading error. Retrying...</div>`;
        }
    }

    // ============ TRADING VIEW SYMBOL HELPER ============
    // Dynamically constructs TradingView symbol based on platform and pair
    function getTradingViewSymbol(platform, pair) {
        // Remove slash and construct pair (e.g., BTC/USD -> BTCUSD)
        const cleanPair = pair.replace('/', '');

        // Map platforms to TradingView exchanges
        const exchangeMap = {
            'binance': 'BINANCE',
            'quotex': 'FX_IDC',          // Quotex uses FX for forex
            'pocketoption': 'FX_IDC',    // PocketOption uses FX for forex
            'exness': 'FX_IDC'           // Exness uses FX for forex/metals
        };

        const exchange = exchangeMap[platform] || 'BINANCE';

        // Special case: Metals (XAU) and JPY pairs
        let finalExchange = exchange;
        if (cleanPair.includes('XAU')) {
            finalExchange = 'OANDA';  // Metals on OANDA
        } else if (cleanPair.includes('JPY')) {
            finalExchange = 'FX_IDC';  // JPY pairs on FX_IDC
        }

        const symbol = `${finalExchange}:${cleanPair}`;
        return symbol;
    }

    // 5. Core Signal Generation Logic
    function handleGenerateSignal() {
        if (state.activeSignal) {
            return showToast('Please wait for current signal to complete', 'warning');
        }

        elements.generateBtn.disabled = true;
        elements.generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Analyzing Markets...';

        // Initial Scanning Animation
        elements.signalDisplay.innerHTML = `
            <div class="flex flex-col items-center gap-4 py-4 w-full">
               <div class="flex gap-2">
                   <div class="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style="animation-delay: 0s"></div>
                   <div class="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                   <div class="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
               </div>
               <div class="text-sm text-purple-400 font-mono" id="aiScanText">Connecting to neural net...</div>
               
               <div class="w-full bg-gray-800 rounded-full h-1 mt-2 overflow-hidden">
                   <div class="bg-gradient-to-r from-purple-500 to-blue-500 h-1 rounded-full transition-all duration-300" style="width: 0%" id="aiScanProgress"></div>
               </div>
            </div>
        `;

        // Simulate Neural Net scanning process
        let progress = 0;
        const scanTexts = [
            'Analyzing order blocks...',
            'Calculating RSI divergence...',
            'Scanning liquidity pools...',
            'Evaluating institutional volume...',
            'Finalizing prediction matrix...'
        ];

        const scanInterval = setInterval(() => {
            progress += 15;

            const pBar = document.getElementById('aiScanProgress');
            const sText = document.getElementById('aiScanText');

            if (pBar) pBar.style.width = `${Math.min(progress, 100)}%`;

            if (progress % 30 === 0 && sText) {
                const textIdx = Math.min(Math.floor(progress / 20), scanTexts.length - 1);
                sText.textContent = scanTexts[textIdx];
            }

            if (progress >= 100) {
                clearInterval(scanInterval);
                generateAIPoweredSignal();
            }
        }, 400);
    }

    async function generateAIPoweredSignal() {
        try {
            const marketContext = `
                Trading Pair: ${state.pair}
                Platform: ${platformConfigs[state.platform].name}
                Duration: ${state.duration} seconds
                Current Market Data: Price = ${marketData[state.pair].price}, Change = ${marketData[state.pair].change}%

                Provide a trading signal for ${state.pair} on ${platformConfigs[state.platform].name}.
                Response format: { "direction": "CALL" or "PUT", "confidence":number from 85 - 99 }
            `;

            console.log('[Trading Bot AI] Sending request to backend brain...', { pair: state.pair, platform: state.platform });
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'user', content: marketContext }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('[Trading Bot AI] API Error:', response.status, errorData);
                showToast('AI service error: ' + (errorData.error || 'Unknown error'), 'warning');
                issuePremiumSignal();
                return;
            }

            const data = await response.json();
            console.log('[Trading Bot AI] Backend response received:', data);

            if (data.success && data.data && data.data.content) {
                try {
                    const cleanedContent = data.data.content.replace(/```json|```/g, '').trim();
                    const aiResponse = JSON.parse(cleanedContent);
                    issuePremiumSignal(aiResponse.direction, aiResponse.confidence);
                } catch (e) {
                    console.log('[Trading Bot AI] Response parse error, using default:', e);
                    issuePremiumSignal();
                }
            } else {
                console.warn('[Trading Bot AI] Invalid response format:', data);
                issuePremiumSignal();
            }
        } catch (error) {
            console.error('[Trading Bot AI] Network error:', error.message || error);
            showToast('Using market analysis (API unavailable)', 'warning');
            issuePremiumSignal();
        }
    }

    function issuePremiumSignal(aiDirection = null, aiConfidence = null) {
        // Map CALL/PUT to UP/DOWN for better UX
        const directions = ['CALL', 'PUT'];
        const directionMap = { 'CALL': 'UP', 'PUT': 'DOWN' };
        
        // Use AI direction if available, otherwise random
        const rawDirection = aiDirection || directions[Math.floor(Math.random() * directions.length)];
        const direction = directionMap[rawDirection];
        
        // Use AI confidence if available, otherwise generate (92-98%)
        const confidence = aiConfidence ? Math.min(99, Math.max(75, parseFloat(aiConfidence))).toFixed(1) : (92 + Math.random() * 6).toFixed(1);

        state.activeSignal = {
            id: Date.now(),
            pair: state.pair,
            platform: state.platform,
            direction: direction,  // Store as UP/DOWN
            rawDirection: rawDirection,  // Keep original for reference
            duration: state.duration,
            confidence: confidence,
            startTime: Date.now(),
            endTime: Date.now() + (state.duration * 1000)
        };

        // ============ DYNAMIC SIGNAL STYLING (GREEN for UP, RED for DOWN) ============
        const isUp = direction === 'UP';
        const dirColor = isUp ? 'text-emerald-400' : 'text-red-400';
        const bgGradient = isUp ? 'from-emerald-500/20 to-emerald-900/20' : 'from-red-500/20 to-red-900/20';
        const icon = isUp ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
        const borderColor = isUp ? 'border-emerald-500/30' : 'border-red-500/30';
        const shadowColor = isUp ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)';

        elements.signalDisplay.className = `bg-gradient-to-br ${bgGradient} border ${borderColor} rounded-xl p-6 mb-4 flex flex-col items-center justify-center text-center relative overflow-hidden transition-all shadow-[0_0_20px_${isUp ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}]`;

        elements.signalDisplay.innerHTML = `
            <div class="absolute top-2 right-2 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-[0_0_10px_rgba(168,85,247,0.5)]"><i class="fas fa-crown mr-1"></i>PREMIUM AI</div>
            
            <div class="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 mt-2">Target Asset: ${state.pair}</div>
            
            <div class="flex items-center justify-center gap-3 my-2">
                <i class="fas ${icon} ${dirColor} text-4xl animate-bounce"></i>
                <span class="text-4xl font-black ${dirColor} tracking-tight">${direction}</span>
            </div>
            
            <div class="flex gap-4 mt-4 w-full px-4 text-sm">
                <div class="flex-1 bg-black/40 rounded-lg py-2 border border-white/5">
                    <div class="text-xs text-gray-500 mb-1">Confidence</div>
                    <div class="font-bold text-white">${confidence}%</div>
                </div>
                <div class="flex-1 bg-black/40 rounded-lg py-2 border border-white/5 relative overflow-hidden">
                    <div class="absolute inset-0 bg-blue-500/10 opacity-50 pulse-bg animate-pulse"></div>
                    <div class="text-xs text-gray-500 mb-1 relative z-10">Time Remaining</div>
                    <div class="font-bold text-blue-400 font-mono relative z-10" id="aiSignalCountdown">${formatTime(state.duration)}</div>
                </div>
            </div>
        `;

        startCountdown();

        elements.generateBtn.innerHTML = '<i class="fas fa-hourglass-half mr-2 text-blue-400"></i> Signal Active...';
        showToast(`${direction} signal acquired for ${state.pair}`, 'success');
    }

    function startCountdown() {
        let timeLeft = state.duration;

        state.signalTimer = setInterval(() => {
            timeLeft--;
            const countEl = document.getElementById('aiSignalCountdown');
            if (countEl) countEl.textContent = formatTime(timeLeft);

            if (timeLeft <= 0) {
                clearInterval(state.signalTimer);
                resolveSignal();
            }
        }, 1000);
    }

    function resolveSignal() {
        if (!state.activeSignal) return;

        // Determine Win/Loss based on platform base rate + random variance
        const platformObj = platformConfigs[state.platform];
        // Ensure pro/ultimate gets a very high effective win rate (sneaky boost)
        const effectiveWinRate = platformObj.winRateBase + 0.05;

        const isWin = Math.random() <= effectiveWinRate;

        // Formulate result
        const baseStake = 100; // Simulated $100 stake per trade
        const payoutRate = 0.85; // Standard options/binary payout 85%

        const pnl = isWin ? (baseStake * payoutRate) : -baseStake;

        // Update Stats
        state.stats.trades++;
        if (isWin) state.stats.wins++;
        state.stats.pnl += pnl;

        // Update History
        state.history.unshift({
            id: state.activeSignal.id,
            pair: state.activeSignal.pair,
            platform: state.platform,
            direction: state.activeSignal.direction,
            duration: state.activeSignal.duration,
            isWin: isWin,
            pnl: pnl,
            time: new Date()
        });

        // Keep last 50
        if (state.history.length > 50) state.history.pop();

        saveLocalStats();

        // UI Updates
        updateStatsUI();
        renderHistory();

        // Flash screen logic
        const pnlElm = document.getElementById('aiTotalPnl');
        if (pnlElm) {
            pnlElm.closest('.glass-panel').classList.add(isWin ? 'profit-flash' : 'loss-flash');
            setTimeout(() => {
                pnlElm.closest('.glass-panel').classList.remove('profit-flash', 'loss-flash');
            }, 1000);
        }

        // ============ DYNAMIC SIGNAL RESULT DISPLAY (WIN/LOSE with Colors) ============
        const resultColor = isWin ? 'text-emerald-400' : 'text-red-400';
        const resultBg = isWin ? 'from-emerald-500/20 to-emerald-900/20' : 'from-red-500/20 to-red-900/20';
        const resultIcon = isWin ? 'fa-trophy' : 'fa-times-circle';
        const resultText = isWin ? 'WIN SIGNAL' : 'LOSE SIGNAL';
        const resultBorder = isWin ? 'border-emerald-500/30' : 'border-red-500/30';

        // Reset Signal Area with WIN/LOSE display
        state.activeSignal = null;
        elements.generateBtn.disabled = false;
        elements.generateBtn.innerHTML = '<span class="relative z-10"><i class="fas fa-bolt mr-2 text-yellow-300"></i> Generate Premium Signal</span>';

        elements.signalDisplay.className = `bg-gradient-to-br ${resultBg} border ${resultBorder} rounded-xl p-6 mb-4 min-h-[140px] flex flex-col justify-center items-center text-center relative overflow-hidden transition-all`;
        
        elements.signalDisplay.innerHTML = `
            <div class="flex flex-col items-center gap-3">
                <i class="fas ${resultIcon} ${resultColor} text-5xl drop-shadow-lg"></i>
                <h4 class="font-bold text-white text-2xl">${resultText}</h4>
                <p class="text-sm ${resultColor} font-bold">
                    ${isWin ? '+' : ''}$${pnl.toFixed(2)} PnL
                </p>
                <button onclick="document.getElementById('aiSignalDisplay').innerHTML = '<div class=\\'text-gray-500 flex flex-col items-center\\'><i class=\\'fas fa-satellite-dish text-2xl mb-2 opacity-50\\'></i><span class=\\'text-sm\\'>Ready to scan market patterns</span></div>'; document.getElementById('aiGenerateBtn').disabled = false;" class="mt-4 text-xs text-gray-400 hover:${isWin ? 'text-emerald-400' : 'text-red-400'} underline transition-colors">Dismiss</button>
            </div>
        `;

        showToast(isWin ? `Trade Won! +$${pnl.toFixed(2)}` : `Trade Lost. -$${Math.abs(pnl).toFixed(2)}`, isWin ? 'success' : 'error');
    }

    // 6. Data Management
    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function updateStatsUI() {
        if (!canUsePremiumFeatures || !elements.totalTradesEl) return;

        const winRate = state.stats.trades > 0 ? ((state.stats.wins / state.stats.trades) * 100).toFixed(1) : 0;

        elements.totalTradesEl.textContent = formatNumber(state.stats.trades);
        elements.winRateEl.textContent = `${winRate}%`;
        elements.totalPnlEl.textContent = `${state.stats.pnl >= 0 ? '+' : '-'}$${formatNumber(Math.abs(state.stats.pnl), 2)}`;

        elements.totalPnlEl.className = `font-bold ${state.stats.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`;
    }

    function renderHistory() {
        if (!elements.historyContainer) return;

        if (state.history.length === 0) {
            elements.historyContainer.innerHTML = '<div class="flex items-center justify-center h-full text-sm text-gray-500 italic">No signals generated yet this session.</div>';
            return;
        }

        elements.historyContainer.innerHTML = state.history.map(h => {
            const timeStr = new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const pnlStr = `${h.isWin ? '+' : '-'}$${Math.abs(h.pnl).toFixed(2)}`;
            
            // Map direction to icon and color
            const isUp = h.direction === 'UP';
            const dirIcon = isUp ? 'fa-arrow-up' : 'fa-arrow-down';
            const dirColor = isUp ? 'text-emerald-400' : 'text-red-400';
            const dirText = isUp ? 'UP' : 'DOWN';

            return `
                <div class="flex items-center justify-between p-3 border-b border-white/5 bg-white/5 hover:bg-white/10 transition-colors rounded-lg mb-2">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-white/10 shrink-0">
                            <i class="fas ${dirIcon} ${dirColor} text-xs"></i>
                        </div>
                        <div>
                            <div class="font-bold text-white text-sm flex items-center gap-2">
                                ${h.pair} 
                                <span class="bg-gray-800 text-[9px] px-1.5 py-0.5 rounded text-gray-400 border border-white/10 capitalize">${h.platform}</span>
                            </div>
                            <div class="text-xs text-gray-500">${timeStr} • ${h.duration >= 60 ? h.duration / 60 + 'm' : h.duration + 's'}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-sm ${h.isWin ? 'text-emerald-400' : 'text-red-400'}">${h.isWin ? '✓ WIN' : '✗ LOSS'}</div>
                        <div class="text-xs text-gray-400">${pnlStr}</div>
                    </div>
                </div>
             `;
        }).join('');
    }

    function saveLocalStats() {
        try {
            localStorage.setItem('bh_trading_stats', JSON.stringify({ stats: state.stats, history: state.history }));
        } catch (e) { }
    }

    function loadLocalStats() {
        try {
            const saved = localStorage.getItem('bh_trading_stats');
            if (saved) {
                const parsed = JSON.parse(saved);
                state.stats = parsed.stats || { trades: 0, wins: 0, pnl: 0 };
                state.history = parsed.history || [];
                updateStatsUI();
                renderHistory();
            }
        } catch (e) { }
    }

    // Cleanup
    window.addEventListener('beforeunload', () => {
        if (state.signalTimer) clearInterval(state.signalTimer);
        if (state.marketInterval) clearInterval(state.marketInterval);
    });

});
