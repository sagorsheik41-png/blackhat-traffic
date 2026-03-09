/**
 * Signal Dashboards Logic
 * Handles real-time websocket connections for Aviator (generic data) and Crazy Time (Evolution APIs)
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- UI Tabs ---
    const elements = {
        tabAv: document.getElementById('tabAviator'),
        tabCt: document.getElementById('tabCrazyTime'),
        viewAv: document.getElementById('aviatorView'),
        viewCt: document.getElementById('crazyTimeView'),
        tabIndicator: document.getElementById('tabIndicator')
    };

    let activeTab = 'aviator'; // Default to Aviator
    let engineStates = {
        aviator: { isRunning: false, ws: null, intervals: [] },
        crazyTime: { isRunning: false, ws: null, intervals: [] }
    };

    elements.tabAv.addEventListener('click', () => switchTab('aviator'));
    elements.tabCt.addEventListener('click', () => switchTab('crazyTime'));

    function switchTab(tab) {
        if (activeTab === tab) return; // Don't re-switch if already on that tab
        // Note: We do NOT pause the engines when switching — both run independently in background
        activeTab = tab;

        if (tab === 'aviator') {
            // Activate Aviator
            elements.tabIndicator.style.left = '4px';
            elements.tabIndicator.style.width = `${elements.tabAv.offsetWidth}px`;
            elements.tabAv.classList.add('text-white');
            elements.tabAv.classList.remove('text-gray-400');
            elements.tabCt.classList.add('text-gray-400');
            elements.tabCt.classList.remove('text-white');

            elements.viewAv.classList.remove('hidden');
            elements.viewAv.style.display = 'block';
            elements.viewCt.classList.add('hidden');
            elements.viewCt.style.display = 'none';
            
            resumeEngine('aviator');
            logDebug('Switched to Aviator engine', 'tab-switch');
        } else {
            // Activate Crazy Time (KG Time)
            const offset = (elements.tabAv?.offsetWidth || 0) + 8;
            elements.tabIndicator.style.left = `${offset}px`;
            elements.tabIndicator.style.width = `${elements.tabCt?.offsetWidth || 0}px`;

            elements.tabCt.classList.add('text-white');
            elements.tabCt.classList.remove('text-gray-400');
            elements.tabAv.classList.add('text-gray-400');
            elements.tabAv.classList.remove('text-white');

            elements.viewCt.classList.remove('hidden');
            elements.viewCt.style.display = 'grid'; // Critical: grid for layout
            elements.viewAv.classList.add('hidden');
            elements.viewAv.style.display = 'none';
            
            resumeEngine('crazyTime');
            logDebug('Switched to Crazy Time (KG Time) engine', 'tab-switch');
        }
    }

    function pauseEngine(engine) {
        if (engineStates[engine]) {
            engineStates[engine].isRunning = false;
            // Clear all intervals for this engine
            engineStates[engine].intervals.forEach(id => clearInterval(id));
            engineStates[engine].intervals = [];
        }
    }

    function resumeEngine(engine) {
        if (engineStates[engine]) {
            engineStates[engine].isRunning = true;
        }
    }

    function logDebug(message, source = 'debug') {
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] [${source}] ${message}`);
    }

    window.addEventListener('resize', () => {
        if (activeTab) switchTab(activeTab);
    });

    // ==========================================
    // 1. AVIATOR LOGIC
    // ==========================================
    const av = {
        wsUrl: document.getElementById('avWsUrl'),
        token: document.getElementById('avToken'),
        btnConnect: document.getElementById('avConnectBtn'),
        btnDisconnect: document.getElementById('avDisconnectBtn'),
        btnPause: document.getElementById('avPauseBtn'),
        btnClear: document.getElementById('avClearBtn'),
        btnCopy: document.getElementById('avCopyLatestBtn'),
        status: document.getElementById('avStatus'),
        log: document.getElementById('avLog'),
        signals: document.getElementById('avSignals')
    };

    let avWs = null;
    let avPaused = false;
    let avLatestSignal = '';
    
    // Track intervals for this engine
    let avIntervals = {
        pulse: null,
        clock: null
    };

    function avLogMsg(msg) {
        const time = new Date().toLocaleTimeString();
        const div = document.createElement('div');
        div.className = 'mb-1 pb-1 border-b border-white/5';
        div.innerHTML = `<span class="text-blue-500">[${time}]</span> ${msg}`;
        av.log.prepend(div);
        if (av.log.children.length > 50) av.log.removeChild(av.log.lastChild);
    }

    function avSetStatus(text, isConnected) {
        av.status.textContent = text;
        if (isConnected) {
            av.status.className = 'px-3 py-1 bg-green-500/20 border border-green-500/50 text-green-400 rounded text-sm font-medium';
        } else {
            av.status.className = 'px-3 py-1 bg-red-500/20 border border-red-500/50 text-red-400 rounded text-sm font-medium';
        }
    }

    av.btnConnect.addEventListener('click', () => {
        let url = av.wsUrl.value.trim();
        if (!url) return showToast('Please enter a WebSocket URL', 'error');

        // FORCE SWITCH if it's an Evolution URL but they click Aviator Connect
        if (url.includes('evo-games.com') || url.includes('crazytime')) {
            showToast('Auto-Routing: Redirecting to Crazy Time engine...', 'success');
            switchTab('crazyTime');
            ct.wsUrl.value = url;
            // Trigger connection on the other engine
            setTimeout(() => ct.btnConnect.click(), 500);
            return;
        }

        if (avWs) avWs.close();

        try {
            const token = av.token.value.trim();
            if (token) {
                const sep = url.includes('?') ? '&' : '?';
                url += `${sep}token=${encodeURIComponent(token)}`;
            }

            avLogMsg(`Connecting to ${url}...`);
            avSetStatus('Connecting...', false);

            avWs = new WebSocket(url);

            avWs.onopen = () => {
                avLogMsg('Connected successfully.');
                avSetStatus('Connected', true);
                av.signals.innerHTML = '';
            };

            avWs.onmessage = (e) => {
                if (avPaused) return;
                try {
                    const data = JSON.parse(e.data);
                    avRenderSignal(data);
                } catch (err) {
                    avLogMsg(`Received text: ${e.data.substring(0, 50)}`);
                    avRenderSignal({ type: 'text', note: e.data });
                }
            };

            avWs.onclose = () => {
                avLogMsg('Connection closed.');
                avSetStatus('Disconnected', false);
                avWs = null;
            };

            avWs.onerror = () => {
                avLogMsg('WebSocket error occurred.');
            };

        } catch (err) {
            avLogMsg(`Error: ${err.message}`);
            avSetStatus('Error', false);
        }
    });

    av.btnDisconnect.addEventListener('click', () => {
        if (avWs) {
            avWs.close();
            avLogMsg('Manual disconnect.');
        }
    });

    av.btnClear.addEventListener('click', () => {
        av.signals.innerHTML = '<div class="text-center text-gray-500 py-4 text-sm align-middle h-full flex items-center justify-center">Awaiting incoming signals...</div>';
        avLogMsg('Cleared signals.');
    });

    av.btnPause.addEventListener('click', () => {
        avPaused = !avPaused;
        av.btnPause.textContent = avPaused ? 'Resume' : 'Pause';
        av.btnPause.className = avPaused
            ? 'px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 hover:bg-yellow-500/30 text-yellow-500 rounded text-sm transition-colors'
            : 'px-3 py-1 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded text-sm transition-colors';
        avLogMsg(avPaused ? 'Feed paused.' : 'Feed resumed.');
    });

    // Smart URL Sensing (Enhanced)
    const senseUrl = (e) => {
        const val = e.target.value;
        if (val.includes('evo-games.com') || val.includes('crazytime')) {
            showToast('Smart Sensing: Evolution URL detected. Switching tabs...', 'info');
            switchTab('crazyTime');
            ct.wsUrl.value = val;
        }
    };
    av.wsUrl.addEventListener('input', senseUrl);
    av.wsUrl.addEventListener('paste', (e) => setTimeout(() => senseUrl(e), 10));
    av.wsUrl.addEventListener('change', senseUrl);

    // Pulse Wave Logic
    const cvs = document.getElementById('avPulseCanvas');
    const ctx = cvs.getContext('2d');
    let pulses = [];

    function resizeCanvas() {
        cvs.width = cvs.offsetWidth;
        cvs.height = cvs.offsetHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function triggerPulse() {
        pulses.push({ x: cvs.width / 2, y: cvs.height / 2, r: 0, o: 0.6 });
    }

    function animatePulse() {
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        pulses = pulses.filter(p => p.o > 0.01);
        pulses.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(56, 189, 248, ${p.o})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            p.r += 2;
            p.o -= 0.01;
        });
        requestAnimationFrame(animatePulse);
    }
    animatePulse();

    av.btnCopy.addEventListener('click', () => {
        if (avLatestSignal) {
            copyToClipboard(avLatestSignal);
        } else {
            showToast('No signal to copy yet', 'warning');
        }
    });

    function avRenderSignal(sig) {
        if (av.signals.querySelector('.text-gray-500')) av.signals.innerHTML = ''; // Remove placeholder

        const time = new Date((sig.ts || Date.now() / 1000) * 1000).toLocaleTimeString();
        const val = sig.value ? (typeof sig.value === 'number' ? sig.value.toFixed(2) : sig.value) : '--';
        const side = sig.side ? sig.side.toUpperCase() : (sig.type || 'SIG');
        const note = sig.note || (sig.side ? `${sig.side} @ ${val}` : 'Signal Received');

        avLatestSignal = `${side} ${val} ${sig.note ? '- ' + sig.note : ''}`.trim();

        const el = document.createElement('div');
        el.className = 'flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg mb-2 shadow-lg';
        el.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="px-2 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded font-bold text-xs uppercase">${side}</div>
          <div>
            <div class="font-bold text-white text-sm">${note}</div>
            <div class="text-gray-400 text-xs">${time} ${sig.source ? '• ' + sig.source : ''}</div>
          </div>
        </div>
        <div class="font-mono text-emerald-400 font-bold">${val}x</div>
      `;

        av.signals.prepend(el);
        if (av.signals.children.length > 50) av.signals.removeChild(av.signals.lastChild);
        triggerPulse();
        const activeLabel = document.getElementById('avActiveSignal');
        activeLabel.textContent = `${side} @ ${val}x`;
        activeLabel.classList.remove('hidden');
    }

    // Global Sync Clock
    function updateGlobalClock() {
        const el = document.getElementById('globalSyncClock');
        if (el) {
            el.textContent = new Date().toISOString().split('T')[1].split('.')[0];
        }
    }
    setInterval(updateGlobalClock, 1000);
    updateGlobalClock();

    // ==========================================
    // 2. CRAZY TIME LOGIC
    // ==========================================
    let ctWs = null;
    let ctCountdownInterval = null;
    let ctState = {
        gameId: '',
        gameNumber: '',
        result: '',
        multiplier: '',
        status: '',
        bonusResult: '',
        winners: [],
        totalWinners: 0,
        totalAmount: 0,
        spinHistory: [],
        lastUpdate: 0,
        betsOpenTime: 0,
        resultTime: 0
    };
    let isCtConnected = false;
    let isCtSimulating = false;
    let ctPredictionInterval = null;
    let ctRoundDuration = 35000;
    let ctPredictedSignal = '';
    let ctReconnectAttempts = 0;
    const ctMaxReconnectAttempts = 5;
    const ctMaxDebugMessages = 50;
    
    // Track intervals for this engine
    let ctIntervals = {
        prediction: null,
        countdown: null,
        pulse: null
    };

    const ct = {
        wsUrl: document.getElementById('ctWsUrl'),
        token: document.getElementById('ctToken'),
        btnConnect: document.getElementById('ctConnectBtn'),
        btnDisconnect: document.getElementById('ctDisconnectBtn'),
        status: document.getElementById('ctConnStatus'),

        lblStatus: document.getElementById('ctGameStatus'),
        lblId: document.getElementById('ctGameId'),
        lblNum: document.getElementById('ctGameNumber'),
        lblRes: document.getElementById('ctResult'),
        lblMult: document.getElementById('ctMultiplier'),

        historyDiv: document.getElementById('ctSpinHistory'),

        predStatus: document.getElementById('ctNextRoundPrediction'),
        earlySig: document.getElementById('ctEarlyBettingSignal'),

        winnersList: document.getElementById('ctWinnersList'),
        totalWinCount: document.getElementById('ctTotalWinners'),
        totalWinAmount: document.getElementById('ctTotalAmount'),
        btnCopy: document.getElementById('ctCopyLatestBtn'),
        debugLog: document.getElementById('ctDebugLog')
    };

    let ctLatestSignal = '';

    function ctLogDebug(message) {
        if (!ct.debugLog) return;
        const time = new Date().toLocaleTimeString();
        const div = document.createElement('div');
        div.className = 'mb-1 pb-1 border-b border-white/5';
        div.innerHTML = `<span class="text-purple-500">[${time}]</span> ${message}`;
        ct.debugLog.prepend(div);
        if (ct.debugLog.children.length > ctMaxDebugMessages) {
            ct.debugLog.removeChild(ct.debugLog.lastChild);
        }
    }

    function ctSetStatus(text, isConnected, isError = false) {
        ct.status.textContent = text;
        let colorClass = isConnected ? 'text-green-400' : 'text-yellow-400';
        if (isError) colorClass = 'text-red-400';
        ct.status.className = `mt-3 text-center text-sm font-medium ${colorClass}`;
    }

    // Simulated data for testing
    const ctSimulatedData = [
        { type: 'crazytime.newGame', args: { gameId: '123456789ABCDEF', gameNumber: '16:15:00', version: 1 } },
        { type: 'crazytime.betsOpen', args: { gameId: '123456789ABCDEF', status: 'open' } },
        {
            type: 'crazytime.spinHistory', args: {
                results: [
                    { result: '2' }, { result: '1' }, { result: '2' }, { result: 'b3', details: { result: 'Tails' } },
                    { result: 'b1' }, { result: '5' }, { result: '1' }, { result: '10' }
                ], newResult: false, version: 1
            }
        },
        { type: 'crazytime.betsClosed', args: { gameId: '123456789ABCDEF', status: 'closed' } },
        { type: 'crazytime.result', args: { gameId: '123456789ABCDEF', gameNumber: '16:15:00', result: '10', totalMultiplier: 10, version: 2 } },
        {
            type: 'crazytime.gameWinners', args: {
                gameId: '123456789ABCDEF', totalWinners: 5297, totalAmount: 951052.56, currency: 'BDT', winners: [
                    { screenName: 'Indibet_saksham_diwan22', winnings: 21313.07 },
                    { screenName: 'Lakshmi', winnings: 17050.45 },
                    { screenName: 'XSFPX2834252', winnings: 16534.69 }
                ]
            }
        },
        { type: 'crazytime.slot.result', args: { gameId: '123456789ABCDEF', result: 'Slot Win', multiplier: 5 } },
        { type: 'crazytime.crazybonus.result', args: { gameId: '123456789ABCDEF', flappers: { Top: '100x', Left: '50x', Right: '25x' } } }
    ];
    ct.btnConnect.addEventListener('click', () => {
        let url = ct.wsUrl.value.trim();
        if (!url) return showToast('Please enter evolution WebSocket URL', 'error');

        const token = ct.token.value.trim();
        if (token) {
            const sep = url.includes('?') ? '&' : '?';
            // SMART TOKEN DETECTION: if it starts with 'sbmo' (Evolution session) or looks like an EVO session, use EVOSESSIONID=
            if (token.startsWith('sbmo') && !token.includes('=')) {
                url += `${sep}EVOSESSIONID=${token}`;
            } else if (!token.includes('=')) {
                url += `${sep}token=${encodeURIComponent(token)}`;
            } else {
                url += `${sep}${token}`;
            }
        }

        if (ctWs && isCtConnected) {
            ctWs.close();
        }
        ctConnectWebSocket(url);
    });

    ct.btnDisconnect.addEventListener('click', () => {
        if (ctWs) {
            ctWs.close();
            ctLogDebug('Manual disconnect.');
        }
        clearInterval(ctPredictionInterval);
    });

    if (ct.btnCopy) {
        ct.btnCopy.addEventListener('click', () => {
            if (ctLatestSignal) {
                copyToClipboard(ctLatestSignal);
                showToast('KG Signal Copied!', 'success');
            } else {
                showToast('Awaiting next KG signal...', 'warning');
            }
        });
    }

    function ctConnectWebSocket(url) {
        try {
            // Start simulation super-early (1s) if connection is slow (User's KG experience)
            const simStartup = setTimeout(() => {
                if (!isCtConnected && !isCtSimulating) {
                    ctLogDebug('KG Predictive stream initializing...');
                    ctStartSimulation();
                }
            }, 1000);

            ctWs = new WebSocket(url);
            isCtConnected = false;
            ctReconnectAttempts = 0;

            ctSetStatus('Connecting...', false);
            ctLogDebug(`Attempting connection to ${url.split('?')[0]}...`);

            ctWs.onopen = () => {
                clearTimeout(simStartup);
                ctLogDebug('Connected to Evolution WebSocket server');
                isCtConnected = true;
                isCtSimulating = false;
                ctReconnectAttempts = 0;
                ctSetStatus('Connected (Live)', true);

                // CRITICAL FIX: Extract correct channel from URL to send subscribe
                let channel = 'CrazyTime0000001';
                const match = url.match(/game\/([^/]+)/);
                if (match && match[1]) {
                    channel = match[1];
                }
                const msg = JSON.stringify({ subscribe: { channel: channel } });
                ctWs.send(msg);
                ctLogDebug(`Sent subscription: ${msg}`);
                showToast('Connected to Crazy Time stream', 'success');
            };

            ctWs.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    ctHandleGameMessage(data);
                } catch (error) {
                    if (event.data !== 'pong' && event.data !== 'ping') {
                        ctLogDebug(`Text message: ${event.data.substring(0, 50)}`);
                    }
                }
            };

            ctWs.onerror = (error) => {
                ctLogDebug('WebSocket error occurred.');
                ctSetStatus('Connection error', false, true);
                // Will attempt reconnect onclose
            };

            ctWs.onclose = () => {
                ctLogDebug('Connection closed. Attempting to reconnect...');
                isCtConnected = false;
                ctSetStatus('Disconnected', false, true);
                clearInterval(ctPredictionInterval);
                ctReconnectWebSocket(url);
            };

        } catch (err) {
            ctSetStatus(`Error: ${err.message}`, false, true);
            ctLogDebug(`Error: ${err.message}`);
        }
    }

    function ctReconnectWebSocket(url) {
        if (ctReconnectAttempts < ctMaxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, ctReconnectAttempts), 30000); // Exponential backoff
            ctReconnectAttempts++;
            ctLogDebug(`Reconnect attempt ${ctReconnectAttempts}/${ctMaxReconnectAttempts} in ${delay}ms`);
            setTimeout(() => ctConnectWebSocket(url), delay);
        } else {
            ctLogDebug('Max reconnect attempts reached. Starting simulation mode...');
            ctStartSimulation();
        }
    }

    function ctStartSimulation() {
        if (!isCtConnected && !isCtSimulating) {
            isCtSimulating = true;
            ctSetStatus('Disconnected (Simulation Mode)', false);
            ctLogDebug('Starting simulation with sample data for demonstration.');

            ctSimulatedData.forEach((data, index) => {
                setTimeout(() => {
                    if (!isCtConnected) ctHandleGameMessage(data);
                }, index * 7000);
            });
            // Loop simulation
            setTimeout(() => {
                if (isCtSimulating && !isCtConnected) {
                    isCtSimulating = false;
                    ctStartSimulation();
                }
            }, ctSimulatedData.length * 7000 + 5000);
        }
    }

    function ctHandleGameMessage(data) {
        if (!data || !data.type) return;

        if (isCtSimulating && isCtConnected) {
            isCtSimulating = false;
            ctLogDebug('Real WebSocket connected, stopping simulation');
        }

        // Don't log spammy messages excessively
        if (data.type !== 'crazytime.spinHistory') {
            ctLogDebug(`Received event: ${data.type}`);
        }

        const now = Date.now();
        ctState.lastUpdate = now;

        switch (data.type) {
            case 'crazytime.newGame':
                ctState.gameId = data.args.gameId || '';
                ctState.gameNumber = data.args.gameNumber || '';
                ctState.status = 'New Game';
                ctState.betsOpenTime = 0;
                ctState.resultTime = 0;
                ctClearSignalBoxes();
                setTimeout(() => {
                    if (ctState.spinHistory.length > 0) {
                        ctShowEarlyPrediction();
                    }
                }, 1000);
                ctUpdateGameDisplay();
                break;
            case 'crazytime.betsOpen':
                ctState.status = 'BETS OPEN';
                ctState.betsOpenTime = now;
                ct.lblStatus.className = 'text-green-400 font-bold mb-4 text-lg animate-pulse';
                ctStartPredictionLoop();
                ctStartCountdown(15); // Start 15s countdown for betting phase
                ctUpdateGameDisplay();
                break;
            case 'crazytime.betsClosed':
                ctState.status = 'Bets Closed - Spinning';
                ct.lblStatus.className = 'text-yellow-400 font-bold mb-4 text-lg';
                if (ctPredictionInterval) clearInterval(ctPredictionInterval);
                ct.earlySig.innerHTML = 'Wait for result...';
                ct.earlySig.className = 'text-center text-yellow-400 font-bold text-xl py-2 px-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 w-full flex items-center justify-center min-h-[50px]';
                ctUpdateGameDisplay();
                break;
            case 'crazytime.result':
                ctState.result = data.args.result || '';
                ctState.multiplier = data.args.totalMultiplier || 0;
                ctState.status = 'Round Finished';
                ct.lblStatus.className = 'text-blue-400 font-bold mb-4 text-lg';
                ctState.resultTime = now;
                if (ctState.betsOpenTime > 0) {
                    ctRoundDuration = Math.max(20000, Math.min(60000, now - ctState.betsOpenTime));
                    ctLogDebug(`Adapted round duration to ${ctRoundDuration}ms`);
                }
                ctUpdateGameDisplay();
                break;
            case 'crazytime.gameWinners':
                ctState.winners = data.args.winners || [];
                ctState.totalWinners = data.args.totalWinners || 0;
                ctState.totalAmount = data.args.totalAmount || 0;
                ctUpdateWinnersDisplay(data.args.currency || 'USD');
                break;
            case 'crazytime.spinHistory':
                ctState.spinHistory = data.args.results || [];
                ctUpdateSpinHistory();
                break;
            case 'crazytime.slot.result':
                ctState.result = data.args.result || '';
                ctState.multiplier = data.args.multiplier || 0;
                ctState.status = 'Top Slot Win';
                ctUpdateGameDisplay();
                break;
            case 'crazytime.crazybonus.result':
                ctState.bonusResult = data.args.flappers ?
                    `Crazy Bonus: Top=${data.args.flappers.Top || 'N/A'}, Left=${data.args.flappers.Left || 'N/A'}, Right=${data.args.flappers.Right || 'N/A'}` : '';
                ctState.status = 'Bonus Completed';
                ctUpdateGameDisplay();
                break;
            case 'connection.kickout':
                ctLogDebug(`Kicked out: ${data.args.reason}. Reconnecting...`);
                if (ctWs) ctWs.close();
                // Rely on onclose event to handle reconnect
                break;
        }
    }

    function ctUpdateGameDisplay() {
        ct.lblStatus.textContent = ctState.status || 'Waiting for game data...';
        ct.lblId.textContent = ctState.gameId || '--';
        ct.lblNum.textContent = ctState.gameNumber || '--';

        let resText = ctState.result || '--';
        if (ctState.bonusResult) resText += ` | ${ctState.bonusResult}`;
        ct.lblRes.textContent = resText;

        ct.lblMult.textContent = ctState.multiplier ? ctState.multiplier + 'x' : '--';
    }

    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function ctUpdateWinnersDisplay(currency) {
        ct.totalWinCount.textContent = `Active: ${formatNumber(ctState.totalWinners)} Players`;
        ct.totalWinAmount.textContent = `Pool: ${formatNumber(Math.round(ctState.totalAmount))} ${currency}`;

        const tops = ctState.winners.slice(0, 10);
        if (tops.length === 0) {
            ct.winnersList.innerHTML = '<li class="p-4 text-gray-600 text-xs text-center italic">Observing next round payouts...</li>';
            return;
        }

        ct.winnersList.innerHTML = tops.map((w, i) => {
            const rankClass = i < 3 ? `rank-${i + 1}` : 'bg-white/5 border border-white/10 text-gray-400';
            const rankDisplay = i < 3 ? (i + 1) : (i + 1);

            return `
                <li class="flex justify-between items-center p-2 bg-gradient-to-r from-white/5 to-transparent rounded-lg border border-white/5 group hover:border-white/20 transition-all">
                    <div class="flex items-center gap-3">
                        <div class="rank-badge ${rankClass} text-[10px] font-black">${rankDisplay}</div>
                        <span class="text-white text-xs font-semibold truncate w-24">${w.screenName || 'Ghost_Player'}</span>
                    </div>
                    <div class="text-right">
                        <span class="text-emerald-400 font-bold text-xs">${formatNumber(Math.round(w.winnings))}</span>
                        <span class="block text-[8px] text-gray-500 uppercase">${currency}</span>
                    </div>
                </li>
            `;
        }).join('');
    }

    function ctUpdateSpinHistory() {
        if (!ctState.spinHistory.length) return;

        const mapColor = {
            '1': 'bg-blue-500 text-white',
            '2': 'bg-yellow-500 text-white',
            '5': 'bg-pink-500 text-white',
            '10': 'bg-purple-500 text-white',
            'b1': 'bg-red-500 text-white ring-2 ring-red-400',
            'b2': 'bg-emerald-500 text-white ring-2 ring-emerald-400',
            'b3': 'bg-fuchsia-500 text-white ring-2 ring-fuchsia-400',
            'b4': 'bg-rose-500 text-white ring-2 ring-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.8)]'
        };
        const mapText = { 'b1': 'CF', 'b2': 'CH', 'b3': 'PA', 'b4': 'CT' };

        ct.historyDiv.innerHTML = ctState.spinHistory.slice(0, 15).map(item => {
            const val = item.result;
            const color = mapColor[val] || 'bg-gray-600';
            const text = mapText[val] || val;
            return `<div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md ${color}" title="${item.details ? item.details.result : text}">${text}</div>`;
        }).join('');
    }

    function ctClearSignalBoxes() {
        document.querySelectorAll('#ctSignalBoxes > div').forEach(el => el.classList.remove('ct-signal-active'));
        ct.predStatus.textContent = 'Awaiting next phase...';
        ct.earlySig.textContent = 'Wait for next round...';
        ct.earlySig.className = 'text-center text-gray-400 font-bold text-xl py-2 px-4 rounded-xl bg-white/5 border border-white/10 w-full flex items-center justify-center min-h-[50px]';

        const timerContainer = document.getElementById('ctTimeSignalCountdown');
        if (timerContainer) timerContainer.classList.add('hidden');
        if (ctCountdownInterval) clearInterval(ctCountdownInterval);
    }

    function ctStartCountdown(seconds) {
        const container = document.getElementById('ctTimeSignalCountdown');
        const valEl = document.getElementById('ctTimerVal');
        if (!container || !valEl) return;

        if (ctCountdownInterval) clearInterval(ctCountdownInterval);

        container.classList.remove('hidden');
        container.classList.add('flex');

        let remaining = seconds;
        valEl.textContent = remaining.toFixed(1) + 's';

        ctCountdownInterval = setInterval(() => {
            remaining -= 0.1;
            if (remaining <= 0) {
                clearInterval(ctCountdownInterval);
                container.classList.add('hidden');
            } else {
                valEl.textContent = Math.max(0, remaining).toFixed(1) + 's';
            }
        }, 100);
    }

    function ctActivateSignalBox(signal) {
        document.querySelectorAll('#ctSignalBoxes > div').forEach(el => el.classList.remove('ct-signal-active'));
        const activeBox = document.getElementById('ct-sig-' + signal);
        if (activeBox) activeBox.classList.add('ct-signal-active');
    }

    function ctPredictNextSignal() {
        if (ctState.spinHistory.length > 0 && ctState.betsOpenTime > 0) {
            const resultCount = {};
            const recentHistory = ctState.spinHistory.slice(-10); // Blogger uses slice(-10) - newest at end
            const probabilities = { '1': 0.28, '2': 0.26, '5': 0.13, '10': 0.07, 'b1': 0.13, 'b2': 0.07, 'b3': 0.04, 'b4': 0.02 };

            recentHistory.forEach((result, index) => {
                // Since newest is at the end of slice(-10), index 9 is newest.
                // We want newest to have high weight.
                const weight = index + 1; // index 0 (oldest) = 1, index 9 (newest) = 10
                resultCount[result.result] = (resultCount[result.result] || 0) + weight * (probabilities[result.result] || 0.1);
            });

            const patterns = ctAnalyzePatterns(recentHistory);
            if (patterns.mostLikely) {
                resultCount[patterns.mostLikely] = (resultCount[patterns.mostLikely] || 0) + 15;
            }

            let mostFrequent = '';
            let maxCount = 0;
            for (const result in resultCount) {
                if (resultCount[result] > maxCount) {
                    maxCount = resultCount[result];
                    mostFrequent = result;
                }
            }

            const confidence = Math.min(95, (maxCount / recentHistory.length * 100)).toFixed(1);
            const confColor = confidence > 80 ? 'text-emerald-400' : (confidence > 60 ? 'text-yellow-400' : 'text-blue-400');

            const timeIntoRound = Date.now() - ctState.betsOpenTime;
            const remainingTime = Math.max(0, ctRoundDuration - timeIntoRound);
            const signalDisplayLeadTime = 15000;

            if (remainingTime > signalDisplayLeadTime && mostFrequent) {
                ctPredictedSignal = mostFrequent;
                ctLatestSignal = `🔮 [KG SIGNAL] NEXT ROUND: ${ctPredictedSignal.toUpperCase()}! (ID: ${ctState.gameId || 'LIVE'})`;

                ctActivateSignalBox(ctPredictedSignal);
                const timeToResult = Math.floor(remainingTime / 1000);

                ct.predStatus.innerHTML = `Early Signal: <span class="text-white">${ctPredictedSignal.toUpperCase()}</span> predicted (Confidence: <span class="${confColor}">${confidence}%</span>)`;
                ct.earlySig.innerHTML = `
                    <div class="flex flex-col items-center">
                        <div class="flex items-center gap-3 mb-2">
                             <span class="text-3xl">🔮</span>
                             <span class="text-2xl text-emerald-400 font-bold">${ctPredictedSignal.toUpperCase()}</span>
                             <span class="text-xs text-white/30 font-mono">(${timeToResult}s)</span>
                        </div>
                        <div class="text-[12px] text-emerald-400 font-bold tracking-tight">🔮 EARLY PREDICTION: Next round likely ${ctPredictedSignal.toUpperCase()} - Get ready!</div>
                    </div>
                `;
                ct.earlySig.className = 'text-center text-emerald-400 font-bold py-4 px-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 w-full flex items-center justify-center min-h-[90px] shadow-[0_0_30px_rgba(16,185,129,0.2)]';

            } else if (ctPredictedSignal) {
                ctActivateSignalBox(ctPredictedSignal);
                ct.predStatus.innerHTML = `Early Signal: <span class="text-white">${ctPredictedSignal.toUpperCase()}</span> predicted (Confidence: <span class="${confColor}">${confidence}%</span>)`;
                ct.earlySig.innerHTML = `
                    <div class="flex flex-col items-center">
                        <div class="text-2xl flex items-center gap-2">🎯 TARGET: ${ctPredictedSignal.toUpperCase()}</div>
                        <div class="text-[11px] text-emerald-400/80 mt-1 uppercase tracking-widest animate-pulse font-black">Locked & Ready</div>
                        <div class="mt-2 text-[12px] text-emerald-400">🔮 EARLY PREDICTION: Next round likely ${ctPredictedSignal.toUpperCase()}!</div>
                    </div>
                `;
                ct.earlySig.className = 'text-center text-emerald-400 font-bold py-4 px-6 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 w-full flex flex-col items-center justify-center min-h-[90px] shadow-[0_0_40px_rgba(16,185,129,0.4)] scale-105 transition-all duration-500';
            } else {
                ct.predStatus.textContent = 'Early Signal: Analyzing pattern streams...';
                ct.earlySig.innerHTML = '<div class="flex items-center gap-2 text-gray-400"><i class="fas fa-radar animate-spin"></i> Initializing Analysis Engine...</div>';
                ctClearSignalBoxes();
            }
        }
    }

    function ctShowEarlyPrediction() {
        if (ctState.spinHistory.length > 0) {
            ctLogDebug('Showing early prediction for next round');
            const resultCount = {};
            const recentHistory = ctState.spinHistory.slice(-10); // Match Blogger
            const probabilities = { '1': 0.28, '2': 0.26, '5': 0.13, '10': 0.07, 'b1': 0.13, 'b2': 0.07, 'b3': 0.04, 'b4': 0.02 };

            recentHistory.forEach((result, index) => {
                const weight = index + 1;
                resultCount[result.result] = (resultCount[result.result] || 0) + weight * (probabilities[result.result] || 0.1);
            });

            const patterns = ctAnalyzePatterns(recentHistory);
            if (patterns.mostLikely) {
                resultCount[patterns.mostLikely] = (resultCount[patterns.mostLikely] || 0) + 15;
            }

            let mostFrequent = '';
            let maxCount = 0;
            for (const result in resultCount) {
                if (resultCount[result] > maxCount) {
                    maxCount = resultCount[result];
                    mostFrequent = result;
                }
            }

            if (mostFrequent) {
                ctPredictedSignal = mostFrequent;
                ctLatestSignal = `🔮 [KG EARLY SIGNAL] NEXT ROUND: ${ctPredictedSignal.toUpperCase()}!`;
                ctActivateSignalBox(ctPredictedSignal);
                const confidence = Math.min(95, (maxCount / recentHistory.length * 100)).toFixed(1);

                ct.predStatus.innerHTML = `Early Predictive Flow: ${ctPredictedSignal.toUpperCase()} (Confidence: <span class="text-emerald-400 font-bold">${confidence}%</span>)`;
                ct.earlySig.innerHTML = `🔮 EARLY TARGET: ${ctPredictedSignal.toUpperCase()}`;
                ct.earlySig.className = 'text-center text-blue-400 font-bold text-2xl py-2 px-4 rounded-xl bg-blue-500/10 border border-blue-500/20 w-full flex items-center justify-center min-h-[50px] shadow-[0_0_15px_rgba(59,130,246,0.2)]';
            }
        }
    }

    function ctAnalyzePatterns(history) {
        if (history.length < 3) return { mostLikely: null };
        const last3 = history.slice(-3).map(r => r.result); // Blogger uses slice(-3)
        const numbers = ['1', '2', '5', '10'];
        const bonuses = ['b1', 'b2', 'b3', 'b4'];
        const recentNumbers = last3.filter(r => numbers.includes(r)).length;
        const recentBonuses = last3.filter(r => bonuses.includes(r)).length;

        if (recentNumbers >= 2 && recentBonuses === 0) {
            return { mostLikely: 'b1' };
        }
        if (recentBonuses >= 2 && recentNumbers === 0) {
            return { mostLikely: '2' };
        }
        const last2 = history.slice(-2).map(r => r.result); // Blogger uses slice(-2)
        if (last2[0] === last2[1]) {
            const different = numbers.concat(bonuses).filter(r => r !== last2[0]);
            return { mostLikely: different[Math.floor(Math.random() * different.length)] };
        }
        return { mostLikely: null };
    }

    function ctStartPredictionLoop() {
        if (ctPredictionInterval) clearInterval(ctPredictionInterval);
        ctPredictNextSignal(); // Call immediately
        ctPredictionInterval = setInterval(() => {
            ctPredictNextSignal();
        }, 5000); // 5 seconds interval
    }

    // --- INITIALIZATION ---
    setTimeout(() => {
        switchTab('aviator'); // Default to Aviator tab

        // Auto-start Crazy Time simulation immediately (runs in background regardless of active tab)
        ctLogDebug('Auto-starting KG Crazy Time signal stream...');
        ctStartSimulation();

        // Auto-start Aviator demo signal loop (every 8 seconds)
        avLogMsg('[System] Aviator telemetry engine initialized. Demo signals active.');
        setInterval(() => {
            if (avWs) return; // Only demo when not connected to real WS
            const sides = ['cashout', 'auto', 'stop', 'win', 'cashout'];
            const s = sides[Math.floor(Math.random() * sides.length)];
            const v = parseFloat((Math.random() * 18 + 1.2).toFixed(2));
            avRenderSignal({
                type: 'signal',
                side: s,
                value: v,
                ts: Math.floor(Date.now() / 1000),
                note: 'demo'
            });
        }, 8000);

        // Also try live Crazy Time connection if URL is already filled
        if (ct && ct.wsUrl && ct.wsUrl.value.trim()) {
            setTimeout(() => {
                ctLogDebug('Attempting live connection to Crazy Time stream...');
                ct.btnConnect.click();
            }, 2000);
        }
    }, 600);

});
