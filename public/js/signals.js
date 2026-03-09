/**
 * Signal Dashboards — BlackHat Traffic
 *
 * Architecture:
 * - `avEngine`: Fully isolated object for Aviator logic & WebSocket.
 * - `ctEngine`: Fully isolated object for Crazy Time logic & WebSocket.
 * - `UIController`: Manages tab switching without destroying engine states.
 */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // UI CONTROLLER (Tab Management)
    // ==========================================
    const UIController = {
        activeTab: 'aviator',
        elements: {
            tabAv: document.getElementById('tabAviator'),
            tabCt: document.getElementById('tabCrazyTime'),
            viewAv: document.getElementById('aviatorView'),
            viewCt: document.getElementById('crazyTimeView'),
            tabIndicator: document.getElementById('tabIndicator')
        },

        init() {
            this.elements.tabAv?.addEventListener('click', () => this.switchTab('aviator'));
            this.elements.tabCt?.addEventListener('click', () => this.switchTab('crazyTime'));
            window.addEventListener('resize', () => this.switchTab(this.activeTab));

            // Start global clock
            setInterval(() => {
                const clock = document.getElementById('globalSyncClock');
                if (clock) clock.textContent = new Date().toISOString().split('T')[1].split('.')[0];
            }, 1000);

            // Set initial tab
            this.switchTab('aviator');
        },

        switchTab(tab) {
            if (!this.elements.tabAv || !this.elements.tabCt) return;
            this.activeTab = tab;

            if (tab === 'aviator') {
                this.elements.tabIndicator.style.left = '4px';
                this.elements.tabIndicator.style.width = `${this.elements.tabAv.offsetWidth}px`;

                this.elements.tabAv.classList.add('text-white');
                this.elements.tabAv.classList.remove('text-gray-400');
                this.elements.tabCt.classList.add('text-gray-400');
                this.elements.tabCt.classList.remove('text-white');

                this.elements.viewAv.classList.remove('hidden');
                this.elements.viewAv.style.display = 'block';
                this.elements.viewCt.classList.add('hidden');
                this.elements.viewCt.style.display = 'none';
            } else {
                const offset = (this.elements.tabAv.offsetWidth || 0) + 8;
                this.elements.tabIndicator.style.left = `${offset}px`;
                this.elements.tabIndicator.style.width = `${this.elements.tabCt.offsetWidth || 0}px`;

                this.elements.tabCt.classList.add('text-white');
                this.elements.tabCt.classList.remove('text-gray-400');
                this.elements.tabAv.classList.add('text-gray-400');
                this.elements.tabAv.classList.remove('text-white');

                this.elements.viewCt.classList.remove('hidden');
                this.elements.viewCt.style.display = 'grid';
                this.elements.viewAv.classList.add('hidden');
                this.elements.viewAv.style.display = 'none';
            }
        }
    };

    // ==========================================
    // AVIATOR ENGINE (Isolated Logic)
    // ==========================================
    const avEngine = {
        ws: null,
        isPaused: false,
        latestSignal: '',
        demoInterval: null,
        pulses: [],
        ctx: null,

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
            // Pre-fill URL
            if (this.elements.wsUrl && !this.elements.wsUrl.value.trim()) {
                this.elements.wsUrl.value = 'wss://socket.738293839.com';
            }

            // Bind Events
            this.elements.btnConn?.addEventListener('click', () => this.connect());
            this.elements.btnDisc?.addEventListener('click', () => this.disconnect());
            this.elements.btnClear?.addEventListener('click', () => this.clearSignals());
            this.elements.btnPause?.addEventListener('click', () => this.togglePause());
            this.elements.btnCopy?.addEventListener('click', () => this.copySignal());

            // Smart URL routing to Crazy Time
            if (this.elements.wsUrl) {
                const routeUrl = (e) => {
                    const val = e.target.value;
                    if (val.includes('evo-games.com') || val.includes('crazytime')) {
                        showToast('Evolution URL detected — switching to Crazy Time', 'info');
                        UIController.switchTab('crazyTime');
                        if (ctEngine.elements.wsUrl) ctEngine.elements.wsUrl.value = val;
                    }
                };
                this.elements.wsUrl.addEventListener('input', routeUrl);
                this.elements.wsUrl.addEventListener('change', routeUrl);
            }

            // Init Canvas Animation
            this.initCanvas();

            // Start Demo
            this.startDemoLoop();
        },

        logMsg(msg) {
            if (!this.elements.log) return;
            const t = new Date().toLocaleTimeString();
            const d = document.createElement('div');
            d.className = 'mb-1 pb-1 border-b border-white/5';
            d.innerHTML = `<span class="text-blue-500">[${t}]</span> ${msg}`;
            this.elements.log.prepend(d);
            if (this.elements.log.children.length > 50) this.elements.log.removeChild(this.elements.log.lastChild);
        },

        setStatus(text, isOk) {
            if (!this.elements.status) return;
            this.elements.status.textContent = text;
            this.elements.status.className = isOk
                ? 'px-3 py-1 bg-green-500/20 border border-green-500/50 text-green-400 rounded text-sm font-medium'
                : 'px-3 py-1 bg-red-500/20 border border-red-500/50 text-red-400 rounded text-sm font-medium';
        },

        connect() {
            const url = this.elements.wsUrl?.value.trim();
            if (!url) return showToast('Please enter a WebSocket URL', 'error');

            if (url.includes('evo-games.com') || url.includes('crazytime')) {
                showToast('Routing to Crazy Time engine...', 'info');
                UIController.switchTab('crazyTime');
                if (ctEngine.elements.wsUrl) ctEngine.elements.wsUrl.value = url;
                setTimeout(() => ctEngine.elements.btnConn?.click(), 400);
                return;
            }

            this.disconnect(); // Ensure clean state

            try {
                const token = this.elements.token?.value.trim() || '';
                const fullUrl = token ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : url;

                this.logMsg(`Connecting → ${url}`);
                this.setStatus('Connecting…', false);

                this.ws = new WebSocket(fullUrl);

                this.ws.onopen = () => {
                    this.logMsg('Connected to Aviator stream ✓');
                    this.setStatus('Connected', true);
                    if (this.elements.signals) this.elements.signals.innerHTML = '';
                    showToast('Aviator stream connected!', 'success');
                };

                this.ws.onmessage = (e) => {
                    if (this.isPaused) return;
                    try {
                        this.renderSignal(JSON.parse(e.data));
                    } catch {
                        this.logMsg(`Raw text: ${String(e.data).substring(0, 60)}`);
                        this.renderSignal({ type: 'text', note: e.data });
                    }
                };

                this.ws.onclose = () => {
                    this.logMsg('Connection closed.');
                    this.setStatus('Disconnected', false);
                    this.ws = null;
                };

                this.ws.onerror = () => this.logMsg('WebSocket error.');

            } catch (err) {
                this.logMsg(`Error: ${err.message}`);
                this.setStatus('Error', false);
            }
        },

        disconnect() {
            if (this.ws) {
                this.ws.close();
                this.logMsg('Manual disconnect.');
                this.ws = null;
            }
        },

        clearSignals() {
            if (this.elements.signals) {
                this.elements.signals.innerHTML = '<div class="text-center text-gray-500 py-4 text-sm h-full flex items-center justify-center">Awaiting incoming signals…</div>';
            }
            this.logMsg('Cleared signals.');
        },

        togglePause() {
            this.isPaused = !this.isPaused;
            if (this.elements.btnPause) {
                this.elements.btnPause.textContent = this.isPaused ? 'Resume' : 'Pause';
                this.elements.btnPause.className = this.isPaused
                    ? 'px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 text-yellow-500 rounded text-sm transition-colors'
                    : 'px-3 py-1 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded text-sm transition-colors';
            }
            this.logMsg(this.isPaused ? 'Feed paused.' : 'Feed resumed.');
        },

        copySignal() {
            if (this.latestSignal) {
                copyToClipboard(this.latestSignal);
                showToast('Aviator signal copied!', 'success');
            } else {
                showToast('No signal yet', 'warning');
            }
        },

        renderSignal(sig) {
            if (!this.elements.signals) return;
            const placeholder = this.elements.signals.querySelector('.text-gray-500');
            if (placeholder) placeholder.remove();

            const t = new Date((sig.ts || Date.now() / 1000) * 1000).toLocaleTimeString();
            const val = sig.value != null ? (typeof sig.value === 'number' ? sig.value.toFixed(2) : sig.value) : '--';
            const side = sig.side ? String(sig.side).toUpperCase() : (sig.type || 'SIG');
            const note = sig.note || (sig.side ? `${side} @ ${val}` : 'Signal Received');

            this.latestSignal = `${side} ${val} ${sig.note ? '— ' + sig.note : ''}`.trim();

            const el = document.createElement('div');
            el.className = 'flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg mb-2 shadow-lg';
            el.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="px-2 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded font-bold text-xs uppercase">${side}</div>
                    <div>
                        <div class="font-bold text-white text-sm">${note}</div>
                        <div class="text-gray-400 text-xs">${t}${sig.source ? ' • ' + sig.source : ''}</div>
                    </div>
                </div>
                <div class="font-mono text-emerald-400 font-bold">${val}x</div>
            `;

            this.elements.signals.prepend(el);
            if (this.elements.signals.children.length > 50) {
                this.elements.signals.removeChild(this.elements.signals.lastChild);
            }

            this.triggerPulse();
            if (this.elements.active) {
                this.elements.active.textContent = `${side} @ ${val}x`;
                this.elements.active.classList.remove('hidden');
            }
        },

        initCanvas() {
            if (!this.elements.canvas) return;
            this.ctx = this.elements.canvas.getContext('2d');
            const resize = () => {
                this.elements.canvas.width = this.elements.canvas.offsetWidth;
                this.elements.canvas.height = this.elements.canvas.offsetHeight;
            };
            window.addEventListener('resize', resize);
            resize();

            const animate = () => {
                if (!this.ctx) return;
                this.ctx.clearRect(0, 0, this.elements.canvas.width, this.elements.canvas.height);
                this.pulses = this.pulses.filter(p => p.o > 0.01);
                this.pulses.forEach(p => {
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    this.ctx.strokeStyle = `rgba(56,189,248,${p.o})`;
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                    p.r += 2;
                    p.o -= 0.01;
                });
                requestAnimationFrame(animate);
            };
            animate();
        },

        triggerPulse() {
            if (!this.elements.canvas) return;
            this.pulses.push({
                x: this.elements.canvas.width / 2,
                y: this.elements.canvas.height / 2,
                r: 0,
                o: 0.6
            });
        },

        startDemoLoop() {
            this.logMsg('[System] Aviator engine ready. Demo active.');
            this.demoInterval = setInterval(() => {
                if (this.ws) return; // Pause demo if real WS is connected
                const sides = ['cashout', 'cashout', 'auto', 'stop', 'win'];
                const s = sides[Math.floor(Math.random() * sides.length)];
                const v = parseFloat((Math.random() * 18 + 1.10).toFixed(2));
                this.renderSignal({ type: 'signal', side: s, value: v, ts: Math.floor(Date.now() / 1000), note: 'demo', source: 'cv666' });
            }, 8000);
        }
    };


    // ==========================================
    // CRAZY TIME ENGINE (Isolated Logic)
    // ==========================================
    const ctEngine = {
        ws: null,
        isConnected: false,
        isSimulating: false,
        reconAttempts: 0,
        MAX_RECON: 5,
        intervals: { pred: null, count: null, sim: null },
        state: {
            gameId: '', gameNumber: '', result: '', multiplier: '',
            status: '', bonusResult: '', winners: [], totalWinners: 0,
            totalAmount: 0, spinHistory: [], betsOpenTime: 0, resultTime: 0
        },
        roundDuration: 35000,
        predicted: '',
        latestSignal: '',

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
            this.elements.btnConn?.addEventListener('click', () => this.connect());
            this.elements.btnDisc?.addEventListener('click', () => this.disconnect());
            this.elements.btnCopy?.addEventListener('click', () => this.copySignal());

            this.logMsg('KG Time engine initialized. Starting demo stream…');
            this.startSimulation();

            // Auto-connect if URL pre-filled
            if (this.elements.wsUrl?.value.trim()) {
                setTimeout(() => this.elements.btnConn?.click(), 1500);
            }
        },

        logMsg(msg) {
            if (!this.elements.debugLog) return;
            const t = new Date().toLocaleTimeString();
            const d = document.createElement('div');
            d.className = 'mb-1 pb-1 border-b border-white/5';
            d.innerHTML = `<span class="text-purple-500">[${t}]</span> ${msg}`;
            this.elements.debugLog.prepend(d);
            if (this.elements.debugLog.children.length > 50) {
                this.elements.debugLog.removeChild(this.elements.debugLog.lastChild);
            }
        },

        setStatus(text, isOk, isErr = false) {
            if (!this.elements.connStatus) return;
            this.elements.connStatus.textContent = text;
            this.elements.connStatus.className = `mt-3 text-center text-sm font-medium ${isErr ? 'text-red-400' : isOk ? 'text-green-400' : 'text-yellow-400'}`;
        },

        connect() {
            const url = this.elements.wsUrl?.value.trim();
            if (!url) return showToast('Please enter Evolution WebSocket URL', 'error');

            const token = this.elements.token?.value.trim() || '';
            let fullUrl = url;
            if (token) {
                const sep = url.includes('?') ? '&' : '?';
                if (token.startsWith('sbmo') && !token.includes('=')) fullUrl += `${sep}EVOSESSIONID=${token}`;
                else if (!token.includes('=')) fullUrl += `${sep}token=${encodeURIComponent(token)}`;
                else fullUrl += `${sep}${token}`;
            }

            this.disconnect(); // Ensure previous is closed
            this.isSimulating = false; // Stop sim

            try {
                this.ws = new WebSocket(fullUrl);
                this.isConnected = false;
                this.reconAttempts = 0;
                this.setStatus('Connecting…', false);
                this.logMsg(`Connecting → ${url.split('?')[0]}…`);

                this.ws.onopen = () => {
                    this.isConnected = true;
                    this.isSimulating = false;
                    this.reconAttempts = 0;
                    this.setStatus('Connected (Live)', true);
                    this.logMsg('Connected to Evolution stream ✓');
                    showToast('Crazy Time connected!', 'success');

                    let channel = 'CrazyTime0000001';
                    const m = fullUrl.match(/game\/([^/]+)/);
                    if (m?.[1]) channel = m[1];
                    this.ws.send(JSON.stringify({ subscribe: { channel } }));
                };

                this.ws.onmessage = (e) => {
                    try { this.handleMessage(JSON.parse(e.data)); }
                    catch {
                        if (e.data !== 'pong' && e.data !== 'ping') {
                            this.logMsg(`Raw: ${String(e.data).slice(0, 60)}`);
                        }
                    }
                };

                this.ws.onerror = () => {
                    this.logMsg('WebSocket error.');
                    this.setStatus('Error', false, true);
                };

                this.ws.onclose = () => {
                    this.isConnected = false;
                    this.setStatus('Disconnected', false, true);
                    this.logMsg('Connection closed.');
                    if (this.intervals.pred) clearInterval(this.intervals.pred);
                    this.reconnect(fullUrl);
                };
            } catch (err) {
                this.logMsg(`Error: ${err.message}`);
                this.setStatus('Error', false, true);
            }
        },

        disconnect() {
            if (this.ws) {
                this.ws.close();
                this.logMsg('Manual disconnect.');
                this.ws = null;
            }
            if (this.intervals.pred) clearInterval(this.intervals.pred);
        },

        reconnect(url) {
            if (this.reconAttempts < this.MAX_RECON) {
                const delay = Math.min(1000 * Math.pow(2, this.reconAttempts), 30000);
                this.reconAttempts++;
                this.logMsg(`Reconnect ${this.reconAttempts}/${this.MAX_RECON} in ${delay}ms`);
                setTimeout(() => this.connect(url), delay); // Pass URL back
            } else {
                this.logMsg('Max reconnects reached. Running simulation.');
                this.startSimulation();
            }
        },

        copySignal() {
            if (this.latestSignal) {
                copyToClipboard(this.latestSignal);
                showToast('KG Time Signal Copied! ৳', 'success');
            } else {
                showToast('Awaiting next KG signal…', 'warning');
            }
        },

        startSimulation() {
            if (this.isConnected || this.isSimulating) return;
            this.isSimulating = true;
            this.setStatus('Simulation Mode (Demo)', false);
            this.logMsg('KG Time demo stream started.');

            const simData = [
                { type: 'crazytime.newGame', args: { gameId: 'DEMO-KG-001', gameNumber: '00:00:00', version: 1 } },
                { type: 'crazytime.betsOpen', args: { gameId: 'DEMO-KG-001', status: 'open' } },
                { type: 'crazytime.spinHistory', args: { results: [{ result: '2' }, { result: '1' }, { result: '2' }, { result: 'b3', details: { result: 'Tails' } }, { result: 'b1' }, { result: '5' }, { result: '1' }, { result: '10' }] } },
                { type: 'crazytime.betsClosed', args: { gameId: 'DEMO-KG-001', status: 'closed' } },
                { type: 'crazytime.result', args: { gameId: 'DEMO-KG-001', gameNumber: '00:00:00', result: '10', totalMultiplier: 10 } },
                { type: 'crazytime.gameWinners', args: { gameId: 'DEMO-KG-001', totalWinners: 5297, totalAmount: 951052.56, currency: 'BDT', winners: [{ screenName: 'Indibet_saksham', winnings: 21313.07 }, { screenName: 'CV666_Lakshmi', winnings: 17050.45 }, { screenName: 'XSFPX2834252', winnings: 16534.69 }] } },
                { type: 'crazytime.newGame', args: { gameId: 'DEMO-KG-002', gameNumber: '00:01:00', version: 3 } },
                { type: 'crazytime.betsOpen', args: { gameId: 'DEMO-KG-002', status: 'open' } },
                { type: 'crazytime.spinHistory', args: { results: [{ result: 'b4' }, { result: '2' }, { result: '1' }, { result: 'b1', details: { result: 'Blue' } }, { result: '5' }, { result: '10' }, { result: '2' }, { result: 'b2' }] } },
                { type: 'crazytime.betsClosed', args: { gameId: 'DEMO-KG-002', status: 'closed' } },
                { type: 'crazytime.result', args: { gameId: 'DEMO-KG-002', gameNumber: '00:01:00', result: 'b4' } },
                { type: 'crazytime.crazybonus.result', args: { gameId: 'DEMO-KG-002', flappers: { Top: '100x', Left: '50x', Right: '25x' } } },
                { type: 'crazytime.gameWinners', args: { gameId: 'DEMO-KG-002', totalWinners: 7812, totalAmount: 2100341.88, currency: 'BDT', winners: [{ screenName: 'BigWinner_BD', winnings: 55000.00 }, { screenName: 'CV666_Player2', winnings: 38200.00 }, { screenName: 'GhostPlayer99', winnings: 21000.00 }] } }
            ];

            let i = 0;
            const runNext = () => {
                if (this.isConnected) { this.isSimulating = false; return; }
                this.handleMessage(simData[i % simData.length]);
                i++;
                this.intervals.sim = setTimeout(runNext, 6500);
            };
            this.intervals.sim = setTimeout(runNext, 500);
        },

        handleMessage(data) {
            if (!data?.type) return;
            if (this.isSimulating && this.isConnected) {
                this.isSimulating = false;
                if (this.intervals.sim) clearTimeout(this.intervals.sim);
                this.logMsg('Live stream active — simulation stopped.');
            }
            if (data.type !== 'crazytime.spinHistory') this.logMsg(`Event: ${data.type}`);

            const now = Date.now();

            switch (data.type) {
                case 'crazytime.newGame':
                    this.state.gameId = data.args.gameId || '';
                    this.state.gameNumber = data.args.gameNumber || '';
                    this.state.status = 'New Game';
                    this.state.betsOpenTime = 0;
                    this.state.bonusResult = '';
                    this.clearBoxHighlights();
                    setTimeout(() => { if (this.state.spinHistory.length > 0) this.showEarlyPrediction(); }, 900);
                    this.updateDisplay();
                    break;

                case 'crazytime.betsOpen':
                    this.state.status = 'BETS OPEN ✅';
                    this.state.betsOpenTime = now;
                    if (this.elements.lblStatus) this.elements.lblStatus.className = 'text-green-400 font-bold mb-4 text-lg animate-pulse';
                    this.startPredLoop();
                    this.startCountdown(15);
                    this.updateDisplay();
                    break;

                case 'crazytime.betsClosed':
                    this.state.status = 'Bets Closed — Spinning';
                    if (this.elements.lblStatus) this.elements.lblStatus.className = 'text-yellow-400 font-bold mb-4 text-lg';
                    if (this.intervals.pred) clearInterval(this.intervals.pred);
                    if (this.elements.earlySig) {
                        this.elements.earlySig.innerHTML = '⏳ Wait for result…';
                        this.elements.earlySig.className = 'text-center text-yellow-400 font-bold text-xl py-2 px-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 w-full flex items-center justify-center min-h-[50px]';
                    }
                    this.updateDisplay();
                    break;

                case 'crazytime.result':
                    this.state.result = data.args.result || '';
                    this.state.multiplier = data.args.totalMultiplier || 0;
                    this.state.status = `Round Done — Result: ${this.state.result}`;
                    if (this.elements.lblStatus) this.elements.lblStatus.className = 'text-blue-400 font-bold mb-4 text-lg';
                    this.state.resultTime = now;
                    if (this.state.betsOpenTime > 0) {
                        this.roundDuration = Math.max(20000, Math.min(60000, now - this.state.betsOpenTime));
                    }
                    this.updateDisplay();
                    this.latestSignal = `🎯 [KG SIGNAL] RESULT: ${this.state.result.toUpperCase()} | Game: ${this.state.gameId}`;
                    break;

                case 'crazytime.gameWinners':
                    this.state.winners = data.args.winners || [];
                    this.state.totalWinners = data.args.totalWinners || 0;
                    this.state.totalAmount = data.args.totalAmount || 0;
                    this.updateWinners(data.args.currency || 'BDT');
                    break;

                case 'crazytime.spinHistory':
                    this.state.spinHistory = data.args.results || [];
                    this.updateHistory();
                    break;

                case 'crazytime.slot.result':
                    this.state.result = data.args.result || '';
                    this.state.multiplier = data.args.multiplier || 0;
                    this.state.status = 'Top Slot Win!';
                    this.updateDisplay();
                    break;

                case 'crazytime.crazybonus.result':
                    if (data.args.flappers) {
                        const f = data.args.flappers;
                        this.state.bonusResult = `Bonus: Top=${f.Top || '?'} Left=${f.Left || '?'} Right=${f.Right || '?'}`;
                    }
                    this.state.status = '🎉 Bonus Completed!';
                    this.updateDisplay();
                    break;
            }
        },

        updateDisplay() {
            if (this.elements.lblStatus) this.elements.lblStatus.textContent = this.state.status || '…';
            if (this.elements.lblId) this.elements.lblId.textContent = this.state.gameId || '--';
            if (this.elements.lblNum) this.elements.lblNum.textContent = this.state.gameNumber || '--';
            let res = this.state.result || '--';
            if (this.state.bonusResult) res += ` | ${this.state.bonusResult}`;
            if (this.elements.lblRes) this.elements.lblRes.textContent = res;
            if (this.elements.lblMult) this.elements.lblMult.textContent = this.state.multiplier ? `${this.state.multiplier}x` : '--';
        },

        updateWinners(currency) {
            const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            if (this.elements.totalWins) this.elements.totalWins.textContent = `Active: ${fmt(this.state.totalWinners)} Players`;
            if (this.elements.totalAmt) this.elements.totalAmt.textContent = `Pool: ৳ ${fmt(Math.round(this.state.totalAmount))} ${currency}`;

            if (!this.elements.winList) return;
            const tops = this.state.winners.slice(0, 10);
            if (!tops.length) {
                this.elements.winList.innerHTML = '<li class="p-4 text-gray-600 text-xs text-center italic">Observing next round payouts…</li>';
                return;
            }
            const rankCls = ['rank-1', 'rank-2', 'rank-3'];
            this.elements.winList.innerHTML = tops.map((w, i) => `
                <li class="flex justify-between items-center p-2 bg-gradient-to-r from-white/5 to-transparent rounded-lg border border-white/5 hover:border-white/20 transition-all">
                    <div class="flex items-center gap-3">
                        <div class="rank-badge ${rankCls[i] || 'bg-white/5 border border-white/10 text-gray-400'} text-[10px] font-black">${i + 1}</div>
                        <span class="text-white text-xs font-semibold truncate w-24">${w.screenName || 'Ghost'}</span>
                    </div>
                    <div class="text-right">
                        <span class="text-emerald-400 font-bold text-xs">৳ ${fmt(Math.round(w.winnings))}</span>
                        <span class="block text-[8px] text-gray-500 uppercase">${currency}</span>
                    </div>
                </li>
            `).join('');
        },

        updateHistory() {
            if (!this.state.spinHistory.length || !this.elements.histDiv) return;
            const colors = {
                '1': 'bg-blue-500', '2': 'bg-yellow-500', '5': 'bg-pink-500', '10': 'bg-purple-500',
                'b1': 'bg-red-500 ring-2 ring-red-400', 'b2': 'bg-emerald-500 ring-2 ring-emerald-400',
                'b3': 'bg-fuchsia-500 ring-2 ring-fuchsia-400', 'b4': 'bg-rose-500 ring-2 ring-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.8)]'
            };
            const labels = { b1: 'CF', b2: 'CH', b3: 'PA', b4: 'CT' };
            this.elements.histDiv.innerHTML = this.state.spinHistory.slice(0, 15).map(item => {
                const v = item.result;
                return `<div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-md ${colors[v] || 'bg-gray-600'}" title="${v}">${labels[v] || v}</div>`;
            }).join('');
        },

        clearBoxHighlights() {
            if (!this.elements.signalBoxes) return;
            this.elements.signalBoxes.querySelectorAll('div').forEach(el => el.classList.remove('ct-signal-active'));
        },

        activateBox(signal) {
            this.clearBoxHighlights();
            const el = document.getElementById('ct-sig-' + signal);
            if (el) el.classList.add('ct-signal-active');
        },

        startCountdown(secs) {
            if (!this.elements.timerCont || !this.elements.timerVal) return;
            if (this.intervals.count) clearInterval(this.intervals.count);
            this.elements.timerCont.classList.remove('hidden');
            this.elements.timerCont.classList.add('flex');
            let rem = secs;
            this.elements.timerVal.textContent = rem.toFixed(1) + 's';
            this.intervals.count = setInterval(() => {
                rem -= 0.1;
                if (rem <= 0) {
                    clearInterval(this.intervals.count);
                    this.elements.timerCont.classList.add('hidden');
                } else {
                    this.elements.timerVal.textContent = Math.max(0, rem).toFixed(1) + 's';
                }
            }, 100);
        },

        analyzePatterns(hist) {
            if (hist.length < 3) return { mostLikely: null };
            const last3 = hist.slice(-3).map(r => r.result);
            const nums = ['1', '2', '5', '10'], bons = ['b1', 'b2', 'b3', 'b4'];
            if (last3.filter(r => nums.includes(r)).length >= 2 && !last3.some(r => bons.includes(r))) return { mostLikely: 'b1' };
            if (last3.filter(r => bons.includes(r)).length >= 2 && !last3.some(r => nums.includes(r))) return { mostLikely: '2' };
            const l2 = hist.slice(-2).map(r => r.result);
            if (l2[0] === l2[1]) {
                const diff = nums.concat(bons).filter(r => r !== l2[0]);
                return { mostLikely: diff[Math.floor(Math.random() * diff.length)] };
            }
            return { mostLikely: null };
        },

        predict() {
            if (!this.state.spinHistory.length || !this.state.betsOpenTime) return;
            const probs = { '1': .28, '2': .26, '5': .13, '10': .07, 'b1': .13, 'b2': .07, 'b3': .04, 'b4': .02 };
            const rc = {};
            const recent = this.state.spinHistory.slice(-10);
            recent.forEach((r, i) => {
                const w = i + 1;
                rc[r.result] = (rc[r.result] || 0) + w * (probs[r.result] || 0.1);
            });
            const pat = this.analyzePatterns(recent);
            if (pat.mostLikely) rc[pat.mostLikely] = (rc[pat.mostLikely] || 0) + 15;

            let best = '', bestN = 0;
            for (const k in rc) { if (rc[k] > bestN) { bestN = rc[k]; best = k; } }

            const conf = Math.min(95, (bestN / recent.length * 100)).toFixed(1);
            const confCls = conf > 80 ? 'text-emerald-400' : conf > 60 ? 'text-yellow-400' : 'text-blue-400';
            const remaining = Math.max(0, this.roundDuration - (Date.now() - this.state.betsOpenTime));

            if (best) {
                this.predicted = best;
                this.latestSignal = `🔮 [KG SIGNAL] NEXT: ${this.predicted.toUpperCase()}`;
                this.activateBox(this.predicted);

                if (this.elements.predStatus) {
                    this.elements.predStatus.innerHTML = `Prediction: <span class="text-white">${this.predicted.toUpperCase()}</span> (Confidence: <span class="${confCls}">${conf}%</span>)`;
                }
                if (this.elements.earlySig) {
                    const sec = Math.floor(remaining / 1000);
                    this.elements.earlySig.innerHTML = `
                        <div class="flex flex-col items-center">
                            <div class="flex items-center gap-3 mb-2">
                                <span class="text-3xl">🔮</span>
                                <span class="text-2xl text-emerald-400 font-bold">${this.predicted.toUpperCase()}</span>
                                ${remaining > 5000 ? `<span class="text-xs text-white/30 font-mono">(${sec}s)</span>` : ''}
                            </div>
                            <div class="text-[12px] text-emerald-400 font-bold">🎯 NEXT ROUND: BET ON ${this.predicted.toUpperCase()} — ৳ BDT</div>
                        </div>`;
                    this.elements.earlySig.className = 'text-center font-bold py-4 px-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 w-full flex items-center justify-center min-h-[90px] shadow-[0_0_30px_rgba(16,185,129,0.2)]';
                }
            }
        },

        showEarlyPrediction() {
            if (!this.state.spinHistory.length) return;
            const probs = { '1': .28, '2': .26, '5': .13, '10': .07, 'b1': .13, 'b2': .07, 'b3': .04, 'b4': .02 };
            const rc = {};
            const recent = this.state.spinHistory.slice(-10);
            recent.forEach((r, i) => { const w = i + 1; rc[r.result] = (rc[r.result] || 0) + w * (probs[r.result] || 0.1); });
            const pat = this.analyzePatterns(recent);
            if (pat.mostLikely) rc[pat.mostLikely] = (rc[pat.mostLikely] || 0) + 15;

            let best = '', bestN = 0;
            for (const k in rc) { if (rc[k] > bestN) { bestN = rc[k]; best = k; } }
            if (!best) return;

            this.predicted = best;
            this.latestSignal = `🔮 [KG EARLY SIGNAL] NEXT: ${this.predicted.toUpperCase()}`;
            this.activateBox(this.predicted);
            const conf = Math.min(95, (bestN / recent.length * 100)).toFixed(1);

            if (this.elements.predStatus) {
                this.elements.predStatus.innerHTML = `Early Prediction: <span class="text-white font-bold">${this.predicted.toUpperCase()}</span> (Conf: <span class="text-emerald-400">${conf}%</span>)`;
            }
            if (this.elements.earlySig) {
                this.elements.earlySig.innerHTML = `🔮 EARLY TARGET: ${this.predicted.toUpperCase()} — ৳ BDT`;
                this.elements.earlySig.className = 'text-center text-blue-400 font-bold text-2xl py-2 px-4 rounded-xl bg-blue-500/10 border border-blue-500/20 w-full flex items-center justify-center min-h-[50px]';
            }
        },

        startPredLoop() {
            if (this.intervals.pred) clearInterval(this.intervals.pred);
            this.predict();
            this.intervals.pred = setInterval(() => this.predict(), 5000);
        }
    };

    // ==========================================
    // INITIALIZATION
    // ==========================================
    UIController.init();
    avEngine.init();
    ctEngine.init();

});
