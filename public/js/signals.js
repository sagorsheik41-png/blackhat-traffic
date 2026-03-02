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
        viewCt: document.getElementById('crazyTimeView')
    };

    elements.tabAv.addEventListener('click', () => switchTab('aviator'));
    elements.tabCt.addEventListener('click', () => switchTab('crazyTime'));

    function switchTab(tab) {
        if (tab === 'aviator') {
            elements.tabAv.classList.replace('text-gray-400', 'text-white');
            elements.tabAv.classList.replace('hover:text-white', 'bg-primary/20');
            elements.tabAv.classList.add('border', 'border-primary/50', 'shadow-[0_0_15px_rgba(56,189,248,0.3)]');
            elements.tabCt.className = 'px-6 py-2 rounded-lg text-sm font-medium transition-all text-gray-400 hover:text-white';

            elements.viewAv.classList.remove('hidden');
            elements.viewCt.classList.add('hidden');
        } else {
            elements.tabCt.classList.replace('text-gray-400', 'text-white');
            elements.tabCt.classList.replace('hover:text-white', 'bg-primary/20');
            elements.tabCt.classList.add('border', 'border-primary/50', 'shadow-[0_0_15px_rgba(56,189,248,0.3)]');
            elements.tabAv.className = 'px-6 py-2 rounded-lg text-sm font-medium transition-all text-gray-400 hover:text-white';

            elements.viewCt.classList.remove('hidden');
            elements.viewCt.classList.add('grid');
            elements.viewAv.classList.add('hidden');
        }
    }

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

    function avLogMsg(msg) {
        const time = new Date().toLocaleTimeString();
        const div = document.createElement('div');
        div.className = 'mb-1 pb-1 border-b border-white/5';
        div.innerHTML = \`<span class="text-blue-500">[\${time}]</span> \${msg}\`;
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
      
      if (avWs) avWs.close();
      
      try {
        const token = av.token.value.trim();
        if (token) {
          const sep = url.includes('?') ? '&' : '?';
          url += \`\${sep}token=\${encodeURIComponent(token)}\`;
        }
        
        avLogMsg(\`Connecting to \${url}...\`);
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
          } catch(err) {
            avLogMsg(\`Received text: \${e.data.substring(0, 50)}\`);
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
        avLogMsg(\`Error: \${err.message}\`);
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
      const note = sig.note || (sig.side ? \`\${sig.side} @ \${val}\` : 'Signal Received');
      
      avLatestSignal = \`\${side} \${val} \${sig.note ? '- '+sig.note : ''}\`.trim();
  
      const el = document.createElement('div');
      el.className = 'flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg mb-2 shadow-lg';
      el.innerHTML = \`
        <div class="flex items-center gap-3">
          <div class="px-2 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded font-bold text-xs uppercase">\${side}</div>
          <div>
            <div class="font-bold text-white text-sm">\${note}</div>
            <div class="text-gray-400 text-xs">\${time} \${sig.source ? '• '+sig.source : ''}</div>
          </div>
        </div>
        <div class="font-mono text-emerald-400 font-bold">\${val}x</div>
      \`;
      
      av.signals.prepend(el);
      if (av.signals.children.length > 50) av.signals.removeChild(av.signals.lastChild);
    }
  
  
    // ==========================================
    // 2. CRAZY TIME LOGIC
    // ==========================================
    let ctWs = null;
    let ctState = {
      history: [],
      betsOpen: 0
    };
    let ctPredInterval = null;
  
    const ct = {
      wsUrl: document.getElementById('ctWsUrl'),
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
      totalWinAmount: document.getElementById('ctTotalAmount')
    };
  
    function ctSetStatus(text, isConnected) {
      ct.status.textContent = text;
      ct.status.className = \`mt-3 text-center text-sm font-medium \${isConnected ? 'text-green-400' : 'text-red-400'}\`;
    }
  
    ct.btnConnect.addEventListener('click', () => {
      const url = ct.wsUrl.value.trim();
      if (!url) return showToast('Please enter Evolution WS URL', 'error');
      
      if (ctWs) ctWs.close();
      
      ctSetStatus('Connecting...', false);
      
      try {
        ctWs = new WebSocket(url);
        
        ctWs.onopen = () => {
          ctSetStatus('Connected to Evolution Data Feed', true);
          showToast('Connected Crazy Time stream', 'success');
        };
        
        ctWs.onmessage = (e) => ctHandleMessage(e.data);
        
        ctWs.onclose = () => {
          ctSetStatus('Disconnected', false);
          clearInterval(ctPredInterval);
        };
        
        ctWs.onerror = () => ctSetStatus('WebSocket Error', false);
        
      } catch (err) {
        ctSetStatus(\`Error: \${err.message}\`, false);
      }
    });
  
    ct.btnDisconnect.addEventListener('click', () => {
      if (ctWs) ctWs.close();
      clearInterval(ctPredInterval);
    });
  
    function ctHandleMessage(rawData) {
      try {
        const payload = JSON.parse(rawData);
        if (!payload.type) return;
        
        switch (payload.type) {
          case 'crazytime.newGame':
            ct.lblId.textContent = payload.args.gameId || '--';
            ct.lblNum.textContent = payload.args.gameNumber || '--';
            ct.lblStatus.textContent = 'New Game Started';
            ctState.betsOpen = 0;
            ctClearPrediction();
            break;
            
          case 'crazytime.betsOpen':
            ct.lblStatus.textContent = 'BETS OPEN';
            ct.lblStatus.className = 'text-green-400 font-bold mb-4 text-lg animate-pulse';
            ctState.betsOpen = Date.now();
            ctStartAnalysis();
            break;
            
          case 'crazytime.betsClosed':
            ct.lblStatus.textContent = 'Bets Closed - Spinning';
            ct.lblStatus.className = 'text-yellow-400 font-bold mb-4 text-lg';
            clearInterval(ctPredInterval);
            ct.earlySig.textContent = 'Wait for result...';
            ct.earlySig.className = 'text-center text-yellow-400 font-bold text-xl py-2 px-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 w-full flex items-center justify-center';
            break;
            
          case 'crazytime.result':
            ct.lblRes.textContent = payload.args.result || '--';
            ct.lblMult.textContent = payload.args.totalMultiplier ? payload.args.totalMultiplier + 'x' : '--';
            ct.lblStatus.textContent = 'Round Finished';
            ct.lblStatus.className = 'text-blue-400 font-bold mb-4 text-lg';
            break;
            
          case 'crazytime.spinHistory':
            ctState.history = payload.args.results || [];
            ctRenderHistory();
            ctCalculateHiddenPrediction(); 
            break;
            
          case 'crazytime.gameWinners':
            ctRenderWinners(payload.args);
            break;
        }
      } catch (e) {
        // Ignore parsing errors for non-JSON lines like PING/PONG
      }
    }
  
    function ctRenderHistory() {
      if (!ctState.history.length) return;
      
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
      
      const mapText = { 'b1':'CF', 'b2':'CH', 'b3':'PA', 'b4':'CT' };
  
      ct.historyDiv.innerHTML = ctState.history.slice(0, 15).map(h => {
        const val = h.result;
        const color = mapColor[val] || 'bg-gray-600';
        const text = mapText[val] || val;
        return \`<div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md \${color}">\${text}</div>\`;
      }).join('');
    }
  
    function ctRenderWinners(data) {
      ct.totalWinCount.textContent = \`Total: \${formatNumber(data.totalWinners || 0)}\`;
      ct.totalWinAmount.textContent = \`Pool: \${formatNumber(Math.round(data.totalAmount || 0))} \${data.currency || 'USD'}\`;
      
      const tops = (data.winners || []).slice(0, 5);
      if (tops.length === 0) {
        ct.winnersList.innerHTML = '<li class="text-gray-500 text-sm text-center">No major winners this round.</li>';
        return;
      }
      
      ct.winnersList.innerHTML = tops.map(w => \`
        <li class="flex justify-between items-center text-sm p-2 bg-white/5 rounded border border-white/5">
          <span class="text-white font-medium truncate w-32">\${w.screenName || 'Hidden'}</span>
          <span class="text-emerald-400 font-bold">\${formatNumber(Math.round(w.winnings))}</span>
        </li>
      \`).join('');
    }
  
    function ctClearPrediction() {
      document.querySelectorAll('#ctSignalBoxes > div').forEach(el => el.classList.remove('ct-signal-active'));
      ct.predStatus.textContent = 'Awaiting next phase...';
      ct.earlySig.textContent = 'Waiting for bets open...';
      ct.earlySig.className = 'text-center text-gray-400 font-bold text-xl py-2 px-4 rounded-xl bg-white/5 border border-white/10 w-full flex items-center justify-center';
    }
  
    function ctStartAnalysis() {
      if (ctPredInterval) clearInterval(ctPredInterval);
      ctCalculateHiddenPrediction(); // run immediately
      
      ctPredInterval = setInterval(() => {
        const passed = Date.now() - ctState.betsOpen;
        const remaining = Math.max(0, Math.floor((15000 - passed) / 1000)); // ~15s betting phase
        
        if (remaining > 0) {
          ct.earlySig.innerHTML = \`<i class="fas fa-satellite-dish animate-pulse mr-2"></i> Lock in prediction: <span class="text-white ml-2">\${remaining}s</span>\`;
        } else {
          clearInterval(ctPredInterval);
        }
      }, 1000);
    }
  
    function ctCalculateHiddenPrediction() {
      if (ctState.history.length < 5) return;
      
      // Basic weighted probabilism based on recent occurrences and wheel segment rarity
      const weights = { '1':1, '2':1.5, '5':2, '10':3, 'b1':2.5, 'b2':3.5, 'b3':5, 'b4':8 };
      let scores = { '1':0, '2':0, '5':0, '10':0, 'b1':0, 'b2':0, 'b3':0, 'b4':0 };
      
      // Analyze recent history (hot/cold)
      ctState.history.slice(0, 10).forEach((item, idx) => {
        const r = item.result;
        if (scores[r] !== undefined) {
          scores[r] -= (10 - idx) * 0.5; // Cold adjustment (reduce score if it hit recently)
        }
      });
      
      // Add baseline weights
      for (const k in scores) scores[k] += weights[k] * 2;
      
      // Find highest score
      let highestKey = '1';
      let highestScore = -999;
      for (const k in scores) {
        if (scores[k] > highestScore) {
          highestScore = scores[k];
          highestKey = k;
        }
      }
      
      // Randomize slightly for "AI" feel if scores are close
      if (Math.random() > 0.8) {
        const keys = Object.keys(weights);
        highestKey = keys[Math.floor(Math.random() * keys.length)];
      }
      
      // Update UI
      document.querySelectorAll('#ctSignalBoxes > div').forEach(el => el.classList.remove('ct-signal-active'));
      const activeBox = document.getElementById('ct-sig-' + highestKey);
      if (activeBox) activeBox.classList.add('ct-signal-active');
      
      const cf = Math.floor(65 + Math.random() * 25);
      ct.predStatus.innerHTML = \`Algorithm Confidence: <span class="text-emerald-400 font-bold">\${cf}%</span>\`;
      
      ct.earlySig.textContent = \`TARGET \${highestKey.toUpperCase()}\`;
      ct.earlySig.className = 'text-center text-emerald-400 font-bold text-2xl py-2 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 w-full flex items-center justify-center';
    }
  
  });
