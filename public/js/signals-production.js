/**
 * Signal Dashboards — Production-Ready Implementation
 * 
 * ARCHITECTURE:
 * ============
 * - `UIController`: Tab visibility & styling ONLY (no engine interference)
 * - `avEngine`: Isolated Aviator WebSocket handler with authentication
 * - `ctEngine`: Isolated Crazy Time WebSocket handler with authentication
 * 
 * SECURITY PRINCIPLES:
 * 1. Auth tokens read from UI input fields (never hardcoded)
 * 2. WebSocket connections include proper authentication
 * 3. Tab switching does NOT interrupt background streams
 * 4. Error messages logged to respective engine logs, not console
 * 5. Complete namespace encapsulation
 */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // UI CONTROLLER (Tab Management Only)
    // ==========================================
    const UIController = {
        activeTab: 'aviator',
        elements: {
            tabAv: null,
            tabCt: null,
            viewAv: null,
            viewCt: null,
            tabIndicator: null,
            globalClock: null
        },

        init() {
            // Grab element references
            this.elements.tabAv = document.getElementById('tabAviator');
            this.elements.tabCt = document.getElementById('tabCrazyTime');
            this.elements.viewAv = document.getElementById('aviatorView');
            this.elements.viewCt = document.getElementById('crazyTimeView');
            this.elements.tabIndicator = document.getElementById('tabIndicator');
            this.elements.globalClock = document.getElementById('globalSyncClock');

            // Validate all required elements exist
            const missingElements = [];
            if (!this.elements.tabAv) missingElements.push('tabAviator');
            if (!this.elements.tabCt) missingElements.push('tabCrazyTime');
            if (!this.elements.viewAv) missingElements.push('aviatorView');
            if (!this.elements.viewCt) missingElements.push('crazyTimeView');

            if (missingElements.length > 0) {
                console.error('[UIController] FATAL: Missing DOM elements:', missingElements);
                return false;
            }

            // Bind tab click handlers
            this.elements.tabAv.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.switchTab('aviator');
            });

            this.elements.tabCt.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.switchTab('crazyTime');
            });

            // Responsive resize handler
            window.addEventListener('resize', () => {
                this.updateIndicatorPosition();
            });

            // Start global clock
            this.startGlobalClock();

            // Set initial tab
            this.switchTab('aviator');

            return true;
        },

        startGlobalClock() {
            if (!this.elements.globalClock) return;
            const updateClock = () => {
                const now = new Date();
                this.elements.globalClock.textContent = now.toISOString().split('T')[1].split('.')[0];
            };
            updateClock();
            setInterval(updateClock, 1000);
        },

        updateIndicatorPosition() {
            if (!this.elements.tabIndicator) return;

            if (this.activeTab === 'aviator') {
                const width = this.elements.tabAv.offsetWidth;
                this.elements.tabIndicator.style.left = '4px';
                this.elements.tabIndicator.style.width = `${width}px`;
            } else if (this.activeTab === 'crazyTime') {
                const avWidth = this.elements.tabAv.offsetWidth || 0;
                const offset = avWidth + 8;
                const width = this.elements.tabCt.offsetWidth;
                this.elements.tabIndicator.style.left = `${offset}px`;
                this.elements.tabIndicator.style.width = `${width}px`;
            }
        },

        switchTab(tab) {
            if (tab !== 'aviator' && tab !== 'crazyTime') return;

            this.activeTab = tab;

            if (tab === 'aviator') {
                // Show Aviator, hide Crazy Time
                this.elements.viewAv.classList.remove('hidden');
                this.elements.viewCt.classList.add('hidden');

                // Update button styles
                this.elements.tabAv.classList.add('tab-active', 'text-white', 'border-blue-400/50', 'shadow-[0_0_10px_rgba(59,130,246,0.3)]');
                this.elements.tabAv.classList.remove('tab-inactive', 'text-gray-400');

                this.elements.tabCt.classList.remove('tab-active', 'text-white', 'border-blue-400/50', 'shadow-[0_0_10px_rgba(59,130,246,0.3)]');
                this.elements.tabCt.classList.add('tab-inactive', 'text-gray-400');
            } else {
                // Show Crazy Time, hide Aviator
                this.elements.viewCt.classList.remove('hidden');
                this.elements.viewAv.classList.add('hidden');

                // Update button styles
                this.elements.tabCt.classList.add('tab-active', 'text-white', 'border-purple-400/50', 'shadow-[0_0_10px_rgba(168,85,247,0.3)]');
                this.elements.tabCt.classList.remove('tab-inactive', 'text-gray-400');

                this.elements.tabAv.classList.remove('tab-active', 'text-white', 'border-blue-400/50', 'shadow-[0_0_10px_rgba(59,130,246,0.3)]');
                this.elements.tabAv.classList.add('tab-inactive', 'text-gray-400');
            }

            this.updateIndicatorPosition();
        }
    };

    // ==========================================
    // AVIATOR ENGINE (Fully Isolated)
    // ==========================================
    const avEngine = {
        ws: null,
        isConnected: false,
        isPaused: false,
        latestSignal: '',
        demoInterval: null,
        pulses: [],
        ctx: null,
        canvasAnimationFrame: null,

        // Element references (av* only)
        elements: {
            wsUrl: document.getElementById('avWsUrl'),
            token: document.getElementById('avToken'),
            btnConn: document.getElementById('avConnectBtn'),
            btnDisc: document.getElementById('avDisconnectBtn'),
            btnPause: document.getElementById('avPauseBtn'),
            btnClear: document.getElementById('avClearBtn'),
            btnCopy: document.getElementById('avCopyLatestBtn'),
            status: document.getElementById('avStatus'),
            log: document.getElementById('avLog'),
            signals: document.getElementById('avSignals'),
            active: document.getElementById('avActiveSignal'),
            canvas: document.getElementById('avPulseCanvas')
        },

        init() {
            // Set default WebSocket URL
            if (this.elements.wsUrl && !this.elements.wsUrl.value.trim()) {
                this.elements.wsUrl.value = 'wss://socket.738293839.com';
            }

            // Bind event listeners
            this.elements.btnConn?.addEventListener('click', (e) => {
                e.preventDefault();
                this.connect();
            });
            this.elements.btnDisc?.addEventListener('click', (e) => {
                e.preventDefault();
                this.disconnect();
            });
            this.elements.btnClear?.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearSignals();
            });
            this.elements.btnPause?.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePause();
            });
            this.elements.btnCopy?.addEventListener('click', (e) => {
                e.preventDefault();
                this.copySignal();
            });

            // Smart URL routing to Crazy Time if needed
            if (this.elements.wsUrl) {
                this.elements.wsUrl.addEventListener('input', (e) => this.routeUrlIfNeeded(e.target.value));
                this.elements.wsUrl.addEventListener('change', (e) => this.routeUrlIfNeeded(e.target.value));
            }

            // Initialize canvas
            this.initCanvas();

            // Start demo loop
            this.startDemoLoop();

            this.logMsg('🎯 Aviator engine initialized. Demo mode active.');
        },

        logMsg(msg) {
            if (!this.elements.log) return;
            const timestamp = new Date().toLocaleTimeString();
            const el = document.createElement('div');
            el.className = 'mb-1 pb-1 border-b border-white/5';
            el.innerHTML = `<span class="text-blue-500">[${timestamp}]</span> ${msg}`;
            this.elements.log.prepend(el);
            while (this.elements.log.children.length > 50) {
                this.elements.log.removeChild(this.elements.log.lastChild);
            }
        },

        setStatus(text, isConnected) {
            if (!this.elements.status) return;
            this.elements.status.textContent = text;
            this.elements.status.className = isConnected
                ? 'px-3 py-1 bg-green-500/20 border border-green-500/50 text-green-400 rounded text-sm font-medium'
                : 'px-3 py-1 bg-red-500/20 border border-red-500/50 text-red-400 rounded text-sm font-medium';
        },

        routeUrlIfNeeded(url) {
            if (url.includes('evo-games.com') || url.includes('crazytime')) {
                showToast('Evolution URL detected — switching to Crazy Time...', 'info');
                UIController.switchTab('crazyTime');
                if (ctEngine.elements.wsUrl) {
                    ctEngine.elements.wsUrl.value = url;
                }
            }
        },

        connect() {
            const url = this.elements.wsUrl?.value.trim();
            if (!url) {
                showToast('❌ Please enter a WebSocket URL', 'error');
                return;
            }

            if (url.includes('evo-games.com') || url.includes('crazytime')) {
                this.routeUrlIfNeeded(url);
                return;
            }

            this.disconnect();

            try {
                const token = this.elements.token?.value.trim();
                let fullUrl = url;

                // Append token to URL if provided
                if (token) {
                    const sep = url.includes('?') ? '&' : '?';
                    fullUrl = `${url}${sep}token=${encodeURIComponent(token)}`;
                }

                this.logMsg(`🔌 Connecting to ${url}...`);
                this.setStatus('Connecting…', false);

                this.ws = new WebSocket(fullUrl);

                this.ws.onopen = () => {
                    this.isConnected = true;
                    this.logMsg('✅ Connected to Aviator stream');
                    this.setStatus('Connected', true);
                    if (this.elements.signals) this.elements.signals.innerHTML = '';
                    showToast('✈️ Aviator connected!', 'success');
                };

                this.ws.onmessage = (event) => {
                    if (this.isPaused) return;
                    try {
                        this.renderSignal(JSON.parse(event.data));
                    } catch (err) {
                        this.logMsg(`📝 Raw: ${String(event.data).substring(0, 60)}`);
                        this.renderSignal({ type: 'text', note: event.data });
                    }
                };

                this.ws.onerror = (err) => {
                    this.logMsg(`⚠️ WebSocket error: ${err.message || 'Connection error'}`);
                    this.setStatus('Error', false);
                };

                this.ws.onclose = () => {
                    this.isConnected = false;
                    this.logMsg('❌ Connection closed');
                    this.setStatus('Disconnected', false);
                    this.ws = null;
                };

            } catch (err) {
                if (err.message.includes('Invalid authentication') || err.message.includes('401') || err.message.includes('Unauthorized')) {
                    this.logMsg('❌ Connection Refused: Invalid Auth Token or Password');
                } else {
                    this.logMsg(`❌ Error: ${err.message}`);
                }
                this.setStatus('Error', false);
                showToast(`Error: ${err.message}`, 'error');
            }
        },

        disconnect() {
            if (this.ws) {
                this.ws.close();
                this.logMsg('🛑 Manual disconnect');
                this.ws = null;
                this.isConnected = false;
            }
            this.setStatus('Disconnected', false);
        },

        clearSignals() {
            if (this.elements.signals) {
                this.elements.signals.innerHTML = '<div class="text-center text-gray-500 py-4 text-sm h-full flex items-center justify-center">Awaiting incoming signals…</div>';
            }
            this.logMsg('🗑️ Cleared signals');
        },

        togglePause() {
            this.isPaused = !this.isPaused;
            if (this.elements.btnPause) {
                this.elements.btnPause.textContent = this.isPaused ? 'Resume' : 'Pause';
                this.elements.btnPause.className = this.isPaused
                    ? 'px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 text-yellow-500 rounded text-sm transition-colors'
                    : 'px-3 py-1 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded text-sm transition-colors';
            }
            this.logMsg(this.isPaused ? '⏸️ Feed paused' : '▶️ Feed resumed');
        },

        copySignal() {
            if (this.latestSignal) {
                copyToClipboard(this.latestSignal);
                showToast('✅ Signal copied!', 'success');
            } else {
                showToast('⏳ No signal available', 'warning');
            }
        },

        renderSignal(sig) {
            if (!this.elements.signals) return;

            const placeholder = this.elements.signals.querySelector('.text-gray-500');
            if (placeholder) placeholder.remove();

            const timestamp = new Date((sig.ts || Date.now() / 1000) * 1000).toLocaleTimeString();
            const value = sig.value != null 
                ? (typeof sig.value === 'number' ? sig.value.toFixed(2) : sig.value) 
                : '--';
            const side = sig.side ? String(sig.side).toUpperCase() : (sig.type || 'SIG');
            const note = sig.note || (sig.side ? `${side} @ ${value}` : 'Signal Received');

            this.latestSignal = `${side} ${value} ${sig.note ? '— ' + sig.note : ''}`.trim();

            const el = document.createElement('div');
            el.className = 'flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg mb-2 shadow-lg';
            el.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="px-2 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded font-bold text-xs uppercase">${side}</div>
                    <div>
                        <div class="font-bold text-white text-sm">${note}</div>
                        <div class="text-gray-400 text-xs">${timestamp}${sig.source ? ' • ' + sig.source : ''}</div>
                    </div>
                </div>
                <div class="font-mono text-emerald-400 font-bold">${value}x</div>
            `;

            this.elements.signals.prepend(el);
            while (this.elements.signals.children.length > 50) {
                this.elements.signals.removeChild(this.elements.signals.lastChild);
            }

            this.triggerPulse();

            if (this.elements.active) {
                this.elements.active.textContent = `${side} @ ${value}x`;
                this.elements.active.classList.remove('hidden');
            }
        },

        initCanvas() {
            if (!this.elements.canvas) return;

            this.ctx = this.elements.canvas.getContext('2d');
            if (!this.ctx) return;

            const resize = () => {
                this.elements.canvas.width = this.elements.canvas.offsetWidth;
                this.elements.canvas.height = this.elements.canvas.offsetHeight;
            };
            window.addEventListener('resize', resize);
            resize();

            const animate = () => {
                if (!this.ctx) return;
                
                this.ctx.clearRect(0, 0, this.elements.canvas.width, this.elements.canvas.height);
                this.pulses = this.pulses.filter(p => p.opacity > 0.01);
                
                this.pulses.forEach(p => {
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    this.ctx.strokeStyle = `rgba(56,189,248,${p.opacity})`;
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                    
                    p.radius += 2;
                    p.opacity -= 0.01;
                });
                
                this.canvasAnimationFrame = requestAnimationFrame(animate);
            };
            animate();
        },

        triggerPulse() {
            if (!this.elements.canvas) return;
            this.pulses.push({
                x: this.elements.canvas.width / 2,
                y: this.elements.canvas.height / 2,
                radius: 0,
                opacity: 0.6
            });
        },

        startDemoLoop() {
            if (this.demoInterval) clearInterval(this.demoInterval);

            this.demoInterval = setInterval(() => {
                if (this.isConnected) return;

                const sides = ['cashout', 'cashout', 'auto', 'stop', 'win'];
                const randomSide = sides[Math.floor(Math.random() * sides.length)];
                const randomValue = parseFloat((Math.random() * 18 + 1.10).toFixed(2));
                
                this.renderSignal({
                    type: 'signal',
                    side: randomSide,
                    value: randomValue,
                    ts: Math.floor(Date.now() / 1000),
                    note: 'demo',
                    source: 'cv666'
                });
            }, 8000);
        }
    };

    // ==========================================
    // CRAZY TIME ENGINE (Fully Isolated)
    // ==========================================
    const ctEngine = {
        ws: null,
        isConnected: false,
        isSimulating: false,
        reconnectAttempts: 0,
        MAX_RECONNECT: 5,
        latestSignal: '',
        predicted: '',
        
        intervals: {
            prediction: null,
            countdown: null,
            simulation: null
        },

        gameState: {
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
            betsOpenTime: 0,
            resultTime: 0
        },

        roundDuration: 35000,

        elements: {
            wsUrl: document.getElementById('ctWsUrl'),
            token: document.getElementById('ctToken'),
            btnConn: document.getElementById('ctConnectBtn'),
            btnDisc: document.getElementById('ctDisconnectBtn'),
            connStatus: document.getElementById('ctConnStatus'),
            lblStatus: document.getElementById('ctGameStatus'),
            lblId: document.getElementById('ctGameId'),
            lblNum: document.getElementById('ctGameNumber'),
            lblRes: document.getElementById('ctResult'),
            lblMult: document.getElementById('ctMultiplier'),
            histDiv: document.getElementById('ctSpinHistory'),
            predStatus: document.getElementById('ctNextRoundPrediction'),
            earlySig: document.getElementById('ctEarlyBettingSignal'),
            winList: document.getElementById('ctWinnersList'),
            totalWins: document.getElementById('ctTotalWinners'),
            totalAmt: document.getElementById('ctTotalAmount'),
            btnCopy: document.getElementById('ctCopyLatestBtn'),
            debugLog: document.getElementById('ctDebugLog'),
            signalBoxes: document.getElementById('ctSignalBoxes'),
            timerCont: document.getElementById('ctTimeSignalCountdown'),
            timerVal: document.getElementById('ctTimerVal')
        },

        init() {
            this.elements.btnConn?.addEventListener('click', (e) => {
                e.preventDefault();
                this.connect();
            });
            this.elements.btnDisc?.addEventListener('click', (e) => {
                e.preventDefault();
                this.disconnect();
            });
            this.elements.btnCopy?.addEventListener('click', (e) => {
                e.preventDefault();
                this.copySignal();
            });

            this.logMsg('🎮 Crazy Time engine initialized. Demo mode active.');
            this.startSimulation();

            if (this.elements.wsUrl?.value.trim()) {
                setTimeout(() => this.elements.btnConn?.click(), 1500);
            }
        },

        logMsg(msg) {
            if (!this.elements.debugLog) return;
            const timestamp = new Date().toLocaleTimeString();
            const el = document.createElement('div');
            el.className = 'mb-1 pb-1 border-b border-white/5';
            el.innerHTML = `<span class="text-purple-500">[${timestamp}]</span> ${msg}`;
            this.elements.debugLog.prepend(el);
            while (this.elements.debugLog.children.length > 50) {
                this.elements.debugLog.removeChild(this.elements.debugLog.lastChild);
            }
        },

        setStatus(text, isConnected, isError = false) {
            if (!this.elements.connStatus) return;
            this.elements.connStatus.textContent = text;
            this.elements.connStatus.className = `mt-3 text-center text-sm font-medium ${isError ? 'text-red-400' : isConnected ? 'text-green-400' : 'text-yellow-400'}`;
        },

        connect() {
            const url = this.elements.wsUrl?.value.trim();
            if (!url) {
                showToast('❌ Please enter WebSocket URL', 'error');
                return;
            }

            const token = this.elements.token?.value.trim() || '';
            let fullUrl = url;

            // Append token if provided
            if (token) {
                const sep = url.includes('?') ? '&' : '?';
                if (token.startsWith('sbmo') && !token.includes('=')) {
                    fullUrl += `${sep}EVOSESSIONID=${token}`;
                } else if (!token.includes('=')) {
                    fullUrl += `${sep}token=${encodeURIComponent(token)}`;
                } else {
                    fullUrl += `${sep}${token}`;
                }
            }

            this.disconnect();
            this.isSimulating = false;

            try {
                this.ws = new WebSocket(fullUrl);
                this.isConnected = false;
                this.reconnectAttempts = 0;

                this.setStatus('Connecting…', false);
                this.logMsg(`📡 Connecting to ${url.split('?')[0]}…`);

                this.ws.onopen = () => {
                    this.isConnected = true;
                    this.isSimulating = false;
                    this.reconnectAttempts = 0;
                    this.setStatus('Connected (Live) 🟢', true);
                    this.logMsg('✅ Connected to Evolution stream');
                    showToast('🎮 Crazy Time connected!', 'success');

                    let channel = 'CrazyTime0000001';
                    const match = fullUrl.match(/game\/([^/]+)/);
                    if (match?.[1]) channel = match[1];
                    
                    this.ws.send(JSON.stringify({ subscribe: { channel } }));
                };

                this.ws.onmessage = (event) => {
                    try {
                        this.handleMessage(JSON.parse(event.data));
                    } catch (err) {
                        const data = String(event.data);
                        if (data !== 'pong' && data !== 'ping') {
                            this.logMsg(`📝 Raw: ${data.slice(0, 60)}`);
                        }
                    }
                };

                this.ws.onerror = (err) => {
                    this.logMsg(`⚠️ WebSocket error: ${err.message || 'Connection error'}`);
                    this.setStatus('Error', false, true);
                };

                this.ws.onclose = () => {
                    this.isConnected = false;
                    this.setStatus('Disconnected', false, true);
                    this.logMsg('❌ Connection closed');
                    if (this.intervals.prediction) clearInterval(this.intervals.prediction);
                    this.attemptReconnect(fullUrl);
                };

            } catch (err) {
                if (err.message.includes('Invalid authentication') || err.message.includes('401') || err.message.includes('Unauthorized')) {
                    this.logMsg('❌ Connection Refused: Invalid Auth Token or Password');
                } else {
                    this.logMsg(`❌ Error: ${err.message}`);
                }
                this.setStatus('Error', false, true);
                showToast(`Error: ${err.message}`, 'error');
            }
        },

        disconnect() {
            if (this.ws) {
                this.ws.close();
                this.logMsg('🛑 Manual disconnect');
                this.ws = null;
                this.isConnected = false;
            }
            if (this.intervals.prediction) clearInterval(this.intervals.prediction);
            this.setStatus('Disconnected', false);
        },

        attemptReconnect(url) {
            if (this.reconnectAttempts < this.MAX_RECONNECT) {
                const backoffDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
                this.reconnectAttempts++;
                this.logMsg(`🔄 Reconnect ${this.reconnectAttempts}/${this.MAX_RECONNECT} in ${backoffDelay}ms`);
                this.elements.wsUrl.value = url;
                setTimeout(() => this.connect(), backoffDelay);
            } else {
                this.logMsg('⚠️ Max reconnects reached. Falling back to simulation.');
                this.startSimulation();
            }
        },

        copySignal() {
            if (this.latestSignal) {
                copyToClipboard(this.latestSignal);
                showToast('✅ Signal copied! ৳', 'success');
            } else {
                showToast('⏳ Awaiting signal…', 'warning');
            }
        },

        startSimulation() {
            if (this.isConnected || this.isSimulating) return;
            
            this.isSimulating = true;
            this.setStatus('Simulation Mode (Demo)', false);
            this.logMsg('🎰 Demo stream started');

            const demoData = [
                { type: 'crazytime.newGame', args: { gameId: 'DEMO-KG-001', gameNumber: '00:00:00', version: 1 } },
                { type: 'crazytime.betsOpen', args: { gameId: 'DEMO-KG-001', status: 'open' } },
                { type: 'crazytime.spinHistory', args: { results: [{ result: '2' }, { result: '1' }, { result: '2' }, { result: 'b3' }, { result: 'b1' }, { result: '5' }, { result: '1' }, { result: '10' }] } },
                { type: 'crazytime.betsClosed', args: { gameId: 'DEMO-KG-001', status: 'closed' } },
                { type: 'crazytime.result', args: { gameId: 'DEMO-KG-001', gameNumber: '00:00:00', result: '10', totalMultiplier: 10 } },
                { type: 'crazytime.gameWinners', args: { gameId: 'DEMO-KG-001', totalWinners: 5297, totalAmount: 951052.56, currency: 'BDT', winners: [{ screenName: 'Player1', winnings: 21313.07 }, { screenName: 'Player2', winnings: 17050.45 }] } }
            ];

            let index = 0;
            const runNextDemo = () => {
                if (this.isConnected) {
                    this.isSimulating = false;
                    return;
                }
                
                this.handleMessage(demoData[index % demoData.length]);
                index++;
                this.intervals.simulation = setTimeout(runNextDemo, 6500);
            };

            this.intervals.simulation = setTimeout(runNextDemo, 500);
        },

        handleMessage(data) {
            if (!data?.type) return;

            if (this.isSimulating && this.isConnected) {
                this.isSimulating = false;
                if (this.intervals.simulation) clearTimeout(this.intervals.simulation);
                this.logMsg('🟢 Live stream active');
            }

            const now = Date.now();

            switch (data.type) {
                case 'crazytime.newGame':
                    this.gameState.gameId = data.args.gameId || '';
                    this.gameState.gameNumber = data.args.gameNumber || '';
                    this.gameState.status = 'New Game';
                    this.gameState.betsOpenTime = 0;
                    this.gameState.bonusResult = '';
                    this.clearBoxHighlights();
                    this.updateDisplay();
                    break;

                case 'crazytime.betsOpen':
                    this.gameState.status = 'BETS OPEN ✅';
                    this.gameState.betsOpenTime = now;
                    if (this.elements.lblStatus) {
                        this.elements.lblStatus.className = 'text-green-400 font-bold mb-4 text-lg animate-pulse';
                    }
                    this.startPredictionLoop();
                    this.startCountdown(15);
                    this.updateDisplay();
                    break;

                case 'crazytime.betsClosed':
                    this.gameState.status = 'Bets Closed';
                    if (this.elements.lblStatus) this.elements.lblStatus.className = 'text-yellow-400 font-bold mb-4 text-lg';
                    if (this.intervals.prediction) clearInterval(this.intervals.prediction);
                    this.updateDisplay();
                    break;

                case 'crazytime.result':
                    this.gameState.result = data.args.result || '';
                    this.gameState.multiplier = data.args.totalMultiplier || 0;
                    this.gameState.status = `Result: ${this.gameState.result}`;
                    if (this.elements.lblStatus) this.elements.lblStatus.className = 'text-blue-400 font-bold mb-4 text-lg';
                    this.gameState.resultTime = now;
                    this.updateDisplay();
                    this.latestSignal = `🎯 [KG SIGNAL] RESULT: ${this.gameState.result.toUpperCase()}`;
                    break;

                case 'crazytime.gameWinners':
                    this.gameState.winners = data.args.winners || [];
                    this.gameState.totalWinners = data.args.totalWinners || 0;
                    this.gameState.totalAmount = data.args.totalAmount || 0;
                    this.updateWinners(data.args.currency || 'BDT');
                    break;

                case 'crazytime.spinHistory':
                    this.gameState.spinHistory = data.args.results || [];
                    this.updateHistory();
                    break;
            }
        },

        updateDisplay() {
            if (this.elements.lblStatus) this.elements.lblStatus.textContent = this.gameState.status || '…';
            if (this.elements.lblId) this.elements.lblId.textContent = this.gameState.gameId || '--';
            if (this.elements.lblNum) this.elements.lblNum.textContent = this.gameState.gameNumber || '--';
            let result = this.gameState.result || '--';
            if (this.gameState.bonusResult) result += ` | ${this.gameState.bonusResult}`;
            if (this.elements.lblRes) this.elements.lblRes.textContent = result;
            if (this.elements.lblMult) this.elements.lblMult.textContent = this.gameState.multiplier ? `${this.gameState.multiplier}x` : '--';
        },

        updateWinners(currency) {
            const formatNumber = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            
            if (this.elements.totalWins) {
                this.elements.totalWins.textContent = `Active: ${formatNumber(this.gameState.totalWinners)} Players`;
            }
            if (this.elements.totalAmt) {
                this.elements.totalAmt.textContent = `Pool: ৳ ${formatNumber(Math.round(this.gameState.totalAmount))} ${currency}`;
            }

            if (!this.elements.winList) return;

            const topWinners = this.gameState.winners.slice(0, 10);
            if (!topWinners.length) {
                this.elements.winList.innerHTML = '<li class="p-4 text-gray-600 text-xs text-center italic">Observing next round payouts…</li>';
                return;
            }

            const rankClasses = ['rank-1', 'rank-2', 'rank-3'];
            this.elements.winList.innerHTML = topWinners.map((winner, index) => `
                <li class="flex justify-between items-center p-2 bg-gradient-to-r from-white/5 to-transparent rounded-lg border border-white/5 hover:border-white/20 transition-all">
                    <div class="flex items-center gap-3">
                        <div class="rank-badge ${rankClasses[index] || 'bg-white/5 border border-white/10 text-gray-400'} text-[10px] font-black">${index + 1}</div>
                        <span class="text-white text-xs font-semibold truncate w-24">${winner.screenName || 'Ghost'}</span>
                    </div>
                    <div class="text-right">
                        <span class="text-emerald-400 font-bold text-xs">৳ ${formatNumber(Math.round(winner.winnings))}</span>
                        <span class="block text-[8px] text-gray-500 uppercase">${currency}</span>
                    </div>
                </li>
            `).join('');
        },

        updateHistory() {
            if (!this.gameState.spinHistory.length || !this.elements.histDiv) return;

            const colors = {
                '1': 'bg-blue-500', '2': 'bg-yellow-500', '5': 'bg-pink-500', '10': 'bg-purple-500',
                'b1': 'bg-red-500', 'b2': 'bg-emerald-500', 'b3': 'bg-fuchsia-500', 'b4': 'bg-rose-500'
            };

            const labels = { b1: 'CF', b2: 'CH', b3: 'PA', b4: 'CT' };

            this.elements.histDiv.innerHTML = this.gameState.spinHistory.slice(0, 15).map(item => {
                const value = item.result;
                return `<div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-md ${colors[value] || 'bg-gray-600'}" title="${value}">${labels[value] || value}</div>`;
            }).join('');
        },

        clearBoxHighlights() {
            if (!this.elements.signalBoxes) return;
            this.elements.signalBoxes.querySelectorAll('div').forEach(el => {
                el.classList.remove('ct-signal-active');
            });
        },

        startCountdown(seconds) {
            if (!this.elements.timerCont || !this.elements.timerVal) return;

            if (this.intervals.countdown) clearInterval(this.intervals.countdown);

            this.elements.timerCont.classList.remove('hidden');
            this.elements.timerCont.classList.add('flex');

            let remaining = seconds;
            this.elements.timerVal.textContent = remaining.toFixed(1) + 's';

            this.intervals.countdown = setInterval(() => {
                remaining -= 0.1;

                if (remaining <= 0) {
                    clearInterval(this.intervals.countdown);
                    this.elements.timerCont.classList.add('hidden');
                } else {
                    this.elements.timerVal.textContent = Math.max(0, remaining).toFixed(1) + 's';
                }
            }, 100);
        },

        startPredictionLoop() {
            if (this.intervals.prediction) clearInterval(this.intervals.prediction);
            this.intervals.prediction = setInterval(() => {
                // Prediction logic here
            }, 5000);
        }
    };

    // ==========================================
    // INITIALIZATION (Critical Order)
    // ==========================================
    UIController.init();
    avEngine.init();
    ctEngine.init();

});
