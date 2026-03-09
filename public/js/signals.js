/**
 * Signal Dashboards — BlackHat Traffic
 * Aviator  (cv666 / socket.738293839.com)
 * Crazy Time (Evolution Gaming)
 *
 * Both engines run FULLY INDEPENDENTLY.
 * Switching tabs NEVER pauses, resets, or destroys engine state.
 */

document.addEventListener('DOMContentLoaded', () => {

    // ── UI references ─────────────────────────────────────────────────────────
    const elTabAv = document.getElementById('tabAviator');
    const elTabCt = document.getElementById('tabCrazyTime');
    const elViewAv = document.getElementById('aviatorView');
    const elViewCt = document.getElementById('crazyTimeView');
    const elTabInd = document.getElementById('tabIndicator');

    let activeTab = 'aviator';

    elTabAv.addEventListener('click', () => switchTab('aviator'));
    elTabCt.addEventListener('click', () => switchTab('crazyTime'));

    // ── Tab switcher — ONLY changes visibility, NEVER touches engine state ────
    function switchTab(tab) {
        if (activeTab === tab) return;
        activeTab = tab;

        if (tab === 'aviator') {
            elTabInd.style.left = '4px';
            elTabInd.style.width = `${elTabAv.offsetWidth}px`;
            elTabAv.classList.add('text-white'); elTabAv.classList.remove('text-gray-400');
            elTabCt.classList.add('text-gray-400'); elTabCt.classList.remove('text-white');
            elViewAv.classList.remove('hidden'); elViewAv.style.display = 'block';
            elViewCt.classList.add('hidden'); elViewCt.style.display = 'none';
        } else {
            const offset = (elTabAv?.offsetWidth || 0) + 8;
            elTabInd.style.left = `${offset}px`;
            elTabInd.style.width = `${elTabCt?.offsetWidth || 0}px`;
            elTabCt.classList.add('text-white'); elTabCt.classList.remove('text-gray-400');
            elTabAv.classList.add('text-gray-400'); elTabAv.classList.remove('text-white');
            elViewCt.classList.remove('hidden'); elViewCt.style.display = 'grid';
            elViewAv.classList.add('hidden'); elViewAv.style.display = 'none';
        }
    }

    window.addEventListener('resize', () => switchTab(activeTab));

    // ── Global clock ──────────────────────────────────────────────────────────
    function updateGlobalClock() {
        const el = document.getElementById('globalSyncClock');
        if (el) el.textContent = new Date().toISOString().split('T')[1].split('.')[0];
    }
    setInterval(updateGlobalClock, 1000);
    updateGlobalClock();

    // ─────────────────────────────────────────────────────────────────────────
    //  AVIATOR ENGINE
    // ─────────────────────────────────────────────────────────────────────────
    const av = {
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
        canvas: document.getElementById('avPulseCanvas'),
    };

    // Pre-fill cv666 Aviator WebSocket URL
    if (av.wsUrl && !av.wsUrl.value.trim()) {
        av.wsUrl.value = 'wss://socket.738293839.com';
    }

    let avWs = null;
    let avPaused = false;
    let avLatestSignal = '';

    // ── Logging ───────────────────────────────────────────────────────────────
    function avLog(msg) {
        const t = new Date().toLocaleTimeString();
        const d = document.createElement('div');
        d.className = 'mb-1 pb-1 border-b border-white/5';
        d.innerHTML = `<span class="text-blue-500">[${t}]</span> ${msg}`;
        av.log.prepend(d);
        if (av.log.children.length > 60) av.log.removeChild(av.log.lastChild);
    }

    // ── Status badge ──────────────────────────────────────────────────────────
    function avSetStatus(text, ok) {
        av.status.textContent = text;
        av.status.className = ok
            ? 'px-3 py-1 bg-green-500/20 border border-green-500/50 text-green-400 rounded text-sm font-medium'
            : 'px-3 py-1 bg-red-500/20 border border-red-500/50 text-red-400 rounded text-sm font-medium';
    }

    // ── Pulse canvas ──────────────────────────────────────────────────────────
    let pulses = [];
    const ctx = av.canvas ? av.canvas.getContext('2d') : null;

    function resizeCanvas() {
        if (!av.canvas) return;
        av.canvas.width = av.canvas.offsetWidth;
        av.canvas.height = av.canvas.offsetHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function triggerPulse() {
        if (!av.canvas) return;
        pulses.push({ x: av.canvas.width / 2, y: av.canvas.height / 2, r: 0, o: 0.6 });
    }

    (function animatePulse() {
        if (ctx) {
            ctx.clearRect(0, 0, av.canvas.width, av.canvas.height);
            pulses = pulses.filter(p => p.o > 0.01);
            pulses.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(56,189,248,${p.o})`;
                ctx.lineWidth = 2;
                ctx.stroke();
                p.r += 2;
                p.o -= 0.01;
            });
        }
        requestAnimationFrame(animatePulse);
    })();

    // ── Render a signal row ───────────────────────────────────────────────────
    function avRenderSignal(sig) {
        if (av.signals.querySelector('.text-gray-500')) av.signals.innerHTML = '';

        const t = new Date((sig.ts || Date.now() / 1000) * 1000).toLocaleTimeString();
        const val = sig.value != null ? (typeof sig.value === 'number' ? sig.value.toFixed(2) : sig.value) : '--';
        const side = sig.side ? sig.side.toUpperCase() : (sig.type || 'SIG');
        const note = sig.note || (sig.side ? `${sig.side} @ ${val}` : 'Signal Received');

        avLatestSignal = `${side} ${val} ${sig.note ? '— ' + sig.note : ''}`.trim();

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
          <div class="font-mono text-emerald-400 font-bold">${val}x</div>`;

        av.signals.prepend(el);
        if (av.signals.children.length > 50) av.signals.removeChild(av.signals.lastChild);
        triggerPulse();
        if (av.active) { av.active.textContent = `${side} @ ${val}x`; av.active.classList.remove('hidden'); }
    }

    // ── WebSocket connection ──────────────────────────────────────────────────
    function avConnect() {
        let url = av.wsUrl.value.trim();
        if (!url) return showToast('Please enter a WebSocket URL', 'error');

        // Auto-route Evolution URLs to Crazy Time
        if (url.includes('evo-games.com') || url.includes('crazytime')) {
            showToast('Evolution URL detected — routing to Crazy Time engine', 'info');
            switchTab('crazyTime');
            document.getElementById('ctWsUrl').value = url;
            setTimeout(() => document.getElementById('ctConnectBtn').click(), 400);
            return;
        }

        if (avWs) avWs.close();

        try {
            const token = av.token.value.trim();
            if (token) url += (url.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;

            avLog(`Connecting → ${url}`);
            avSetStatus('Connecting…', false);

            avWs = new WebSocket(url);

            avWs.onopen = () => {
                avLog('Connected to Aviator stream ✓');
                avSetStatus('Connected', true);
                av.signals.innerHTML = '';
                showToast('Aviator stream connected!', 'success');
            };

            avWs.onmessage = e => {
                if (avPaused) return;
                try {
                    const data = JSON.parse(e.data);
                    avRenderSignal(data);
                } catch {
                    avLog(`Text: ${String(e.data).substring(0, 80)}`);
                    avRenderSignal({ type: 'text', note: e.data });
                }
            };

            avWs.onclose = () => { avLog('Connection closed.'); avSetStatus('Disconnected', false); avWs = null; };
            avWs.onerror = () => { avLog('WebSocket error.'); };

        } catch (err) {
            avLog(`Error: ${err.message}`);
            avSetStatus('Error', false);
        }
    }

    // Smart URL sensing
    function avSense(val) {
        if (val.includes('evo-games.com') || val.includes('crazytime')) {
            showToast('Evolution URL detected — switching to Crazy Time', 'info');
            switchTab('crazyTime');
            document.getElementById('ctWsUrl').value = val;
        }
    }
    if (av.wsUrl) {
        av.wsUrl.addEventListener('input', e => avSense(e.target.value));
        av.wsUrl.addEventListener('paste', e => setTimeout(() => avSense(e.target.value), 10));
        av.wsUrl.addEventListener('change', e => avSense(e.target.value));
    }

    av.btnConn?.addEventListener('click', avConnect);
    av.btnDisc?.addEventListener('click', () => { if (avWs) { avWs.close(); avLog('Manual disconnect.'); } });
    av.btnClear?.addEventListener('click', () => {
        av.signals.innerHTML = '<div class="text-center text-gray-500 py-4 text-sm h-full flex items-center justify-center">Awaiting incoming signals…</div>';
        avLog('Cleared.');
    });
    av.btnPause?.addEventListener('click', () => {
        avPaused = !avPaused;
        av.btnPause.textContent = avPaused ? 'Resume' : 'Pause';
        av.btnPause.className = avPaused
            ? 'px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 text-yellow-500 rounded text-sm transition-colors'
            : 'px-3 py-1 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded text-sm transition-colors';
        avLog(avPaused ? 'Feed paused.' : 'Feed resumed.');
    });
    av.btnCopy?.addEventListener('click', () => {
        if (avLatestSignal) { copyToClipboard(avLatestSignal); showToast('Aviator signal copied!', 'success'); }
        else showToast('No signal yet', 'warning');
    });

    // ── Aviator Demo Loop (only when no live WS) ──────────────────────────────
    avLog('[System] Aviator telemetry engine ready. Demo signals active.');
    setInterval(() => {
        if (avWs) return;  // stop demo when live
        const sides = ['cashout', 'cashout', 'auto', 'stop', 'win'];
        const s = sides[Math.floor(Math.random() * sides.length)];
        const v = parseFloat((Math.random() * 18 + 1.10).toFixed(2));
        avRenderSignal({ type: 'signal', side: s, value: v, ts: Math.floor(Date.now() / 1000), note: 'demo', source: 'cv666' });
    }, 8000);


    // ─────────────────────────────────────────────────────────────────────────
    //  CRAZY TIME ENGINE  (Evolution Gaming / KG Time)
    // ─────────────────────────────────────────────────────────────────────────
    const ct = {
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
    };

    // State lives here — NEVER wiped on tab switch
    let ctState = {
        gameId: '', gameNumber: '', result: '', multiplier: '',
        status: '', bonusResult: '', winners: [],
        totalWinners: 0, totalAmount: 0,
        spinHistory: [], betsOpenTime: 0, resultTime: 0
    };

    let ctWs = null;
    let ctConnected = false;
    let ctSimulating = false;
    let ctPredInterval = null;
    let ctCountInterval = null;
    let ctRoundDuration = 35000;
    let ctPredicted = '';
    let ctLatestSignal = '';
    let ctReconAttempts = 0;
    const CT_MAX_RECON = 5;

    // ── Logging ───────────────────────────────────────────────────────────────
    function ctLog(msg) {
        if (!ct.debugLog) return;
        const t = new Date().toLocaleTimeString();
        const d = document.createElement('div');
        d.className = 'mb-1 pb-1 border-b border-white/5';
        d.innerHTML = `<span class="text-purple-500">[${t}]</span> ${msg}`;
        ct.debugLog.prepend(d);
        if (ct.debugLog.children.length > 60) ct.debugLog.removeChild(ct.debugLog.lastChild);
    }

    function ctSetStatus(text, ok, err = false) {
        if (!ct.connStatus) return;
        ct.connStatus.textContent = text;
        ct.connStatus.className = `mt-3 text-center text-sm font-medium ${err ? 'text-red-400' : ok ? 'text-green-400' : 'text-yellow-400'}`;
    }

    // ── Simulated data (loops forever) ────────────────────────────────────────
    const ctSimData = [
        { type: 'crazytime.newGame', args: { gameId: 'DEMO-KG-001', gameNumber: '00:00:00', version: 1 } },
        { type: 'crazytime.betsOpen', args: { gameId: 'DEMO-KG-001', status: 'open' } },
        {
            type: 'crazytime.spinHistory', args: {
                results: [
                    { result: '2' }, { result: '1' }, { result: '2' },
                    { result: 'b3', details: { result: 'Tails' } },
                    { result: 'b1' }, { result: '5' }, { result: '1' }, { result: '10' }
                ], newResult: false, version: 1
            }
        },
        { type: 'crazytime.betsClosed', args: { gameId: 'DEMO-KG-001', status: 'closed' } },
        { type: 'crazytime.result', args: { gameId: 'DEMO-KG-001', gameNumber: '00:00:00', result: '10', totalMultiplier: 10, version: 2 } },
        {
            type: 'crazytime.gameWinners', args: {
                gameId: 'DEMO-KG-001', totalWinners: 5297, totalAmount: 951052.56, currency: 'BDT', winners: [
                    { screenName: 'Indibet_saksham', winnings: 21313.07 },
                    { screenName: 'CV666_Lakshmi', winnings: 17050.45 },
                    { screenName: 'XSFPX2834252', winnings: 16534.69 }
                ]
            }
        },
        { type: 'crazytime.newGame', args: { gameId: 'DEMO-KG-002', gameNumber: '00:01:00', version: 3 } },
        { type: 'crazytime.betsOpen', args: { gameId: 'DEMO-KG-002', status: 'open' } },
        {
            type: 'crazytime.spinHistory', args: {
                results: [
                    { result: 'b4' }, { result: '2' }, { result: '1' },
                    { result: 'b1', details: { result: 'Blue' } },
                    { result: '5' }, { result: '10' }, { result: '2' }, { result: 'b2' }
                ], newResult: false, version: 3
            }
        },
        { type: 'crazytime.betsClosed', args: { gameId: 'DEMO-KG-002', status: 'closed' } },
        { type: 'crazytime.result', args: { gameId: 'DEMO-KG-002', gameNumber: '00:01:00', result: 'b4', totalMultiplier: 0, version: 4 } },
        { type: 'crazytime.crazybonus.result', args: { gameId: 'DEMO-KG-002', flappers: { Top: '100x', Left: '50x', Right: '25x' } } },
        {
            type: 'crazytime.gameWinners', args: {
                gameId: 'DEMO-KG-002', totalWinners: 7812, totalAmount: 2100341.88, currency: 'BDT', winners: [
                    { screenName: 'BigWinner_BD', winnings: 55000.00 },
                    { screenName: 'CV666_Player2', winnings: 38200.00 },
                    { screenName: 'GhostPlayer99', winnings: 21000.00 }
                ]
            }
        },
    ];

    function ctStartSimulation() {
        if (ctConnected || ctSimulating) return;
        ctSimulating = true;
        ctSetStatus('Simulation Mode (Demo)', false);
        ctLog('KG Time demo stream started.');

        let i = 0;
        function runNext() {
            if (ctConnected) { ctSimulating = false; return; }
            ctHandleMsg(ctSimData[i % ctSimData.length]);
            i++;
            setTimeout(runNext, 6500);
        }
        setTimeout(runNext, 500);
    }

    // ── WebSocket connect ─────────────────────────────────────────────────────
    function ctDoConnect(url) {
        try {
            ctWs = new WebSocket(url);
            ctConnected = false;
            ctReconAttempts = 0;
            ctSetStatus('Connecting…', false);
            ctLog(`Connecting → ${url.split('?')[0]}…`);

            ctWs.onopen = () => {
                ctConnected = true;
                ctSimulating = false;
                ctReconAttempts = 0;
                ctSetStatus('Connected (Live)', true);
                ctLog('Connected to Evolution stream ✓');
                showToast('Crazy Time stream connected!', 'success');
                let channel = 'CrazyTime0000001';
                const m = url.match(/game\/([^/]+)/);
                if (m?.[1]) channel = m[1];
                ctWs.send(JSON.stringify({ subscribe: { channel } }));
            };

            ctWs.onmessage = e => {
                try { ctHandleMsg(JSON.parse(e.data)); }
                catch { if (e.data !== 'pong' && e.data !== 'ping') ctLog(`Raw: ${String(e.data).slice(0, 60)}`); }
            };

            ctWs.onerror = () => { ctLog('WebSocket error.'); ctSetStatus('Error', false, true); };

            ctWs.onclose = () => {
                ctConnected = false;
                ctSetStatus('Disconnected', false, true);
                ctLog('Closed — attempting reconnect…');
                if (ctPredInterval) clearInterval(ctPredInterval);
                ctReconnect(url);
            };
        } catch (err) {
            ctLog(`Error: ${err.message}`);
            ctSetStatus('Error', false, true);
        }
    }

    function ctReconnect(url) {
        if (ctReconAttempts < CT_MAX_RECON) {
            const delay = Math.min(1000 * Math.pow(2, ctReconAttempts), 30000);
            ctReconAttempts++;
            ctLog(`Reconnect ${ctReconAttempts}/${CT_MAX_RECON} in ${delay}ms`);
            setTimeout(() => ctDoConnect(url), delay);
        } else {
            ctLog('Max reconnects — running simulation.');
            ctStartSimulation();
        }
    }

    ct.btnConn?.addEventListener('click', () => {
        let url = ct.wsUrl.value.trim();
        if (!url) return showToast('Please enter Evolution WebSocket URL', 'error');

        const token = ct.token?.value.trim();
        if (token) {
            const sep = url.includes('?') ? '&' : '?';
            // Smart: Evolution session token
            if (token.startsWith('sbmo') && !token.includes('=')) url += `${sep}EVOSESSIONID=${token}`;
            else if (!token.includes('=')) url += `${sep}token=${encodeURIComponent(token)}`;
            else url += `${sep}${token}`;
        }

        if (ctWs && ctConnected) ctWs.close();
        ctSimulating = false; // stop sim so live can take over
        ctDoConnect(url);
    });

    ct.btnDisc?.addEventListener('click', () => {
        if (ctWs) { ctWs.close(); ctLog('Manual disconnect.'); }
        if (ctPredInterval) clearInterval(ctPredInterval);
    });

    ct.btnCopy?.addEventListener('click', () => {
        if (ctLatestSignal) { copyToClipboard(ctLatestSignal); showToast('KG Time Signal Copied! ৳', 'success'); }
        else showToast('Awaiting next KG signal…', 'warning');
    });

    // ── Message handler ───────────────────────────────────────────────────────
    function ctHandleMsg(data) {
        if (!data?.type) return;
        if (ctSimulating && ctConnected) { ctSimulating = false; ctLog('Live stream active — simulation stopped.'); }
        if (data.type !== 'crazytime.spinHistory') ctLog(`Event: ${data.type}`);

        const now = Date.now();

        switch (data.type) {
            case 'crazytime.newGame':
                ctState.gameId = data.args.gameId || '';
                ctState.gameNumber = data.args.gameNumber || '';
                ctState.status = 'New Game';
                ctState.betsOpenTime = 0;
                ctState.bonusResult = '';
                // Gently clear only signal highlights; preserve history & prediction
                ctClearBoxHighlights();
                setTimeout(() => { if (ctState.spinHistory.length > 0) ctShowEarlyPrediction(); }, 900);
                ctUpdateDisplay();
                break;

            case 'crazytime.betsOpen':
                ctState.status = 'BETS OPEN ✅';
                ctState.betsOpenTime = now;
                ct.lblStatus.className = 'text-green-400 font-bold mb-4 text-lg animate-pulse';
                ctStartPredLoop();
                ctStartCountdown(15);
                ctUpdateDisplay();
                break;

            case 'crazytime.betsClosed':
                ctState.status = 'Bets Closed — Spinning';
                ct.lblStatus.className = 'text-yellow-400 font-bold mb-4 text-lg';
                if (ctPredInterval) clearInterval(ctPredInterval);
                if (ct.earlySig) {
                    ct.earlySig.innerHTML = '⏳ Wait for result…';
                    ct.earlySig.className = 'text-center text-yellow-400 font-bold text-xl py-2 px-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 w-full flex items-center justify-center min-h-[50px]';
                }
                ctUpdateDisplay();
                break;

            case 'crazytime.result':
                ctState.result = data.args.result || '';
                ctState.multiplier = data.args.totalMultiplier || 0;
                ctState.status = `Round Done — Result: ${ctState.result}`;
                ct.lblStatus.className = 'text-blue-400 font-bold mb-4 text-lg';
                ctState.resultTime = now;
                if (ctState.betsOpenTime > 0)
                    ctRoundDuration = Math.max(20000, Math.min(60000, now - ctState.betsOpenTime));
                ctUpdateDisplay();
                ctLatestSignal = `🎯 [KG SIGNAL] RESULT: ${ctState.result.toUpperCase()} | Multiplier: ${ctState.multiplier}x | Game: ${ctState.gameId}`;
                break;

            case 'crazytime.gameWinners':
                ctState.winners = data.args.winners || [];
                ctState.totalWinners = data.args.totalWinners || 0;
                ctState.totalAmount = data.args.totalAmount || 0;
                ctUpdateWinners(data.args.currency || 'BDT');
                break;

            case 'crazytime.spinHistory':
                ctState.spinHistory = data.args.results || [];
                ctUpdateHistory();
                break;

            case 'crazytime.slot.result':
                ctState.result = data.args.result || '';
                ctState.multiplier = data.args.multiplier || 0;
                ctState.status = 'Top Slot Win!';
                ctUpdateDisplay();
                break;

            case 'crazytime.crazybonus.result':
                if (data.args.flappers) {
                    const f = data.args.flappers;
                    ctState.bonusResult = `Crazy Bonus: Top=${f.Top || '?'} Left=${f.Left || '?'} Right=${f.Right || '?'}`;
                }
                ctState.status = '🎉 Bonus Completed!';
                ctUpdateDisplay();
                break;

            case 'connection.kickout':
                ctLog(`Kicked: ${data.args?.reason}. Reconnecting…`);
                if (ctWs) ctWs.close();
                break;

            default:
                ctLog(`Unknown: ${data.type}`);
        }
    }

    // ── Display updaters ──────────────────────────────────────────────────────
    function ctUpdateDisplay() {
        if (ct.lblStatus) ct.lblStatus.textContent = ctState.status || '…';
        if (ct.lblId) ct.lblId.textContent = ctState.gameId || '--';
        if (ct.lblNum) ct.lblNum.textContent = ctState.gameNumber || '--';
        let res = ctState.result || '--';
        if (ctState.bonusResult) res += ` | ${ctState.bonusResult}`;
        if (ct.lblRes) ct.lblRes.textContent = res;
        if (ct.lblMult) ct.lblMult.textContent = ctState.multiplier ? ctState.multiplier + 'x' : '--';
    }

    function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

    function ctUpdateWinners(currency) {
        if (ct.totalWins) ct.totalWins.textContent = `Active: ${fmt(ctState.totalWinners)} Players`;
        if (ct.totalAmt) ct.totalAmt.textContent = `Pool: ৳ ${fmt(Math.round(ctState.totalAmount))} ${currency}`;
        if (!ct.winList) return;
        const tops = ctState.winners.slice(0, 10);
        if (!tops.length) {
            ct.winList.innerHTML = '<li class="p-4 text-gray-600 text-xs text-center italic">Observing next round payouts…</li>';
            return;
        }
        const rankCls = ['rank-1', 'rank-2', 'rank-3'];
        ct.winList.innerHTML = tops.map((w, i) => `
          <li class="flex justify-between items-center p-2 bg-gradient-to-r from-white/5 to-transparent rounded-lg border border-white/5 hover:border-white/20 transition-all">
            <div class="flex items-center gap-3">
              <div class="rank-badge ${rankCls[i] || 'bg-white/5 border border-white/10 text-gray-400'} text-[10px] font-black">${i + 1}</div>
              <span class="text-white text-xs font-semibold truncate w-24">${w.screenName || 'Ghost_Player'}</span>
            </div>
            <div class="text-right">
              <span class="text-emerald-400 font-bold text-xs">৳ ${fmt(Math.round(w.winnings))}</span>
              <span class="block text-[8px] text-gray-500 uppercase">${currency}</span>
            </div>
          </li>`).join('');
    }

    function ctUpdateHistory() {
        if (!ctState.spinHistory.length || !ct.histDiv) return;
        const colors = {
            '1': 'bg-blue-500', '2': 'bg-yellow-500', '5': 'bg-pink-500', '10': 'bg-purple-500',
            'b1': 'bg-red-500 ring-2 ring-red-400', 'b2': 'bg-emerald-500 ring-2 ring-emerald-400',
            'b3': 'bg-fuchsia-500 ring-2 ring-fuchsia-400', 'b4': 'bg-rose-500 ring-2 ring-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.8)]'
        };
        const labels = { b1: 'CF', b2: 'CH', b3: 'PA', b4: 'CT' };
        ct.histDiv.innerHTML = ctState.spinHistory.slice(0, 15).map(item => {
            const v = item.result;
            return `<div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-md ${colors[v] || 'bg-gray-600'}" title="${item.details ? item.details.result : v}">${labels[v] || v}</div>`;
        }).join('');
    }

    // ── Signal boxes — only clear highlights, never remove the boxes ──────────
    function ctClearBoxHighlights() {
        document.querySelectorAll('#ctSignalBoxes > div').forEach(el => el.classList.remove('ct-signal-active'));
    }

    function ctActivateBox(signal) {
        ctClearBoxHighlights();
        const el = document.getElementById('ct-sig-' + signal);
        if (el) el.classList.add('ct-signal-active');
    }

    // ── Countdown ────────────────────────────────────────────────────────────
    function ctStartCountdown(secs) {
        const cont = document.getElementById('ctTimeSignalCountdown');
        const valEl = document.getElementById('ctTimerVal');
        if (!cont || !valEl) return;
        if (ctCountInterval) clearInterval(ctCountInterval);
        cont.classList.remove('hidden'); cont.classList.add('flex');
        let rem = secs;
        valEl.textContent = rem.toFixed(1) + 's';
        ctCountInterval = setInterval(() => {
            rem -= 0.1;
            if (rem <= 0) { clearInterval(ctCountInterval); cont.classList.add('hidden'); }
            else valEl.textContent = Math.max(0, rem).toFixed(1) + 's';
        }, 100);
    }

    // ── Prediction ────────────────────────────────────────────────────────────
    function ctAnalyzePatterns(hist) {
        if (hist.length < 3) return { mostLikely: null };
        const last3 = hist.slice(-3).map(r => r.result);
        const nums = ['1', '2', '5', '10'], bons = ['b1', 'b2', 'b3', 'b4'];
        if (last3.filter(r => nums.includes(r)).length >= 2 && !last3.some(r => bons.includes(r))) return { mostLikely: 'b1' };
        if (last3.filter(r => bons.includes(r)).length >= 2 && !last3.some(r => nums.includes(r))) return { mostLikely: '2' };
        const l2 = hist.slice(-2).map(r => r.result);
        if (l2[0] === l2[1]) { const diff = nums.concat(bons).filter(r => r !== l2[0]); return { mostLikely: diff[Math.floor(Math.random() * diff.length)] }; }
        return { mostLikely: null };
    }

    function ctPredict() {
        if (!ctState.spinHistory.length || !ctState.betsOpenTime) return;
        const probs = { '1': .28, '2': .26, '5': .13, '10': .07, 'b1': .13, 'b2': .07, 'b3': .04, 'b4': .02 };
        const rc = {};
        const recent = ctState.spinHistory.slice(-10);
        recent.forEach((r, i) => {
            const w = i + 1;
            rc[r.result] = (rc[r.result] || 0) + w * (probs[r.result] || 0.1);
        });
        const pat = ctAnalyzePatterns(recent);
        if (pat.mostLikely) rc[pat.mostLikely] = (rc[pat.mostLikely] || 0) + 15;

        let best = '', bestN = 0;
        for (const k in rc) if (rc[k] > bestN) { bestN = rc[k]; best = k; }

        const conf = Math.min(95, (bestN / recent.length * 100)).toFixed(1);
        const confCls = conf > 80 ? 'text-emerald-400' : conf > 60 ? 'text-yellow-400' : 'text-blue-400';
        const remaining = Math.max(0, ctRoundDuration - (Date.now() - ctState.betsOpenTime));

        if (best) {
            ctPredicted = best;
            ctLatestSignal = `🔮 [KG SIGNAL] NEXT: ${ctPredicted.toUpperCase()} | Game: ${ctState.gameId}`;
            ctActivateBox(ctPredicted);

            if (ct.predStatus) ct.predStatus.innerHTML = `Prediction: <span class="text-white">${ctPredicted.toUpperCase()}</span> &nbsp;(Confidence: <span class="${confCls}">${conf}%</span>)`;

            if (ct.earlySig) {
                const sec = Math.floor(remaining / 1000);
                ct.earlySig.innerHTML = `
                  <div class="flex flex-col items-center">
                    <div class="flex items-center gap-3 mb-2">
                      <span class="text-3xl">🔮</span>
                      <span class="text-2xl text-emerald-400 font-bold">${ctPredicted.toUpperCase()}</span>
                      ${remaining > 5000 ? `<span class="text-xs text-white/30 font-mono">(${sec}s)</span>` : ''}
                    </div>
                    <div class="text-[12px] text-emerald-400 font-bold">🎯 NEXT ROUND: BET ON ${ctPredicted.toUpperCase()} — ৳ BDT</div>
                  </div>`;
                ct.earlySig.className = 'text-center font-bold py-4 px-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 w-full flex items-center justify-center min-h-[90px] shadow-[0_0_30px_rgba(16,185,129,0.2)]';
            }
        }
    }

    function ctShowEarlyPrediction() {
        if (!ctState.spinHistory.length) return;
        const probs = { '1': .28, '2': .26, '5': .13, '10': .07, 'b1': .13, 'b2': .07, 'b3': .04, 'b4': .02 };
        const rc = {};
        const recent = ctState.spinHistory.slice(-10);
        recent.forEach((r, i) => { const w = i + 1; rc[r.result] = (rc[r.result] || 0) + w * (probs[r.result] || 0.1); });
        const pat = ctAnalyzePatterns(recent);
        if (pat.mostLikely) rc[pat.mostLikely] = (rc[pat.mostLikely] || 0) + 15;
        let best = '', bestN = 0;
        for (const k in rc) if (rc[k] > bestN) { bestN = rc[k]; best = k; }
        if (!best) return;

        ctPredicted = best;
        ctLatestSignal = `🔮 [KG EARLY SIGNAL] NEXT: ${ctPredicted.toUpperCase()}!`;
        ctActivateBox(ctPredicted);
        const conf = Math.min(95, (bestN / recent.length * 100)).toFixed(1);
        if (ct.predStatus) ct.predStatus.innerHTML = `Early Prediction: <span class="text-white font-bold">${ctPredicted.toUpperCase()}</span> (Conf: <span class="text-emerald-400">${conf}%</span>)`;
        if (ct.earlySig) {
            ct.earlySig.innerHTML = `🔮 EARLY TARGET: ${ctPredicted.toUpperCase()} — ৳ BDT`;
            ct.earlySig.className = 'text-center text-blue-400 font-bold text-2xl py-2 px-4 rounded-xl bg-blue-500/10 border border-blue-500/20 w-full flex items-center justify-center min-h-[50px]';
        }
    }

    function ctStartPredLoop() {
        if (ctPredInterval) clearInterval(ctPredInterval);
        ctPredict();
        ctPredInterval = setInterval(ctPredict, 5000);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  INITIALIZATION — runs after DOM is ready
    // ─────────────────────────────────────────────────────────────────────────
    setTimeout(() => {
        // Start on Aviator tab
        switchTab('aviator');

        // ── Crazy Time: auto-simulation starts immediately in background ──────
        ctLog('KG Time (Crazy Time) engine initialized — starting demo stream…');
        ctStartSimulation();

        // ── Crazy Time: also attempt live connection if URL is pre-filled ─────
        if (ct.wsUrl?.value.trim()) {
            setTimeout(() => {
                ctLog('Attempting live Evolution connection…');
                ct.btnConn?.click();
            }, 1500);
        }
    }, 500);

});
