document.addEventListener('DOMContentLoaded', () => {
    // Only run if we are on the Traffic Pro page
    if (!document.getElementById('taTabNav')) return;

    // --- Tab Navigation Setup ---
    const tabs = document.querySelectorAll('.ta-tab-btn');
    const contents = document.querySelectorAll('.ta-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('active', 'border-green-500', 'text-green-400');
                t.classList.add('border-transparent', 'text-gray-400');
            });
            contents.forEach(c => c.classList.add('hidden'));

            tab.classList.remove('border-transparent', 'text-gray-400');
            tab.classList.add('active', 'border-green-500', 'text-green-400');

            const targetId = tab.getAttribute('data-target');
            document.getElementById(targetId).classList.remove('hidden');
        });
    });

    // --- Global Stats ---
    const stats = {
        visitors: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0
    };

    function updateStatsUI() {
        document.getElementById('statVisitors').textContent = stats.visitors.toLocaleString();
        document.getElementById('statClicks').textContent = stats.clicks.toLocaleString();
        document.getElementById('statConversions').textContent = stats.conversions.toLocaleString();
        document.getElementById('statRevenue').textContent = '$' + stats.revenue.toLocaleString();
    }
    updateStatsUI();

    // --- Traffic Engine Simulator ---
    let engineRunning = false;
    let engineInterval;

    const btnStart = document.getElementById('taStartTrafficBtn');
    const statusText = document.getElementById('taStatusText');
    const pulseOuter = document.getElementById('taPulseOuter');
    const pulseInner = document.getElementById('taPulseInner');
    const logTerminal = document.getElementById('taLogTerminal');
    const statusOverlay = document.getElementById('taStatusOverlay');

    function addLog(msg, isError = false) {
        const div = document.createElement('div');
        div.className = isError ? 'text-red-400' : 'text-green-400';
        div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        logTerminal.appendChild(div);
        logTerminal.scrollTop = logTerminal.scrollHeight;

        // Keep log small
        while (logTerminal.children.length > 50) {
            logTerminal.removeChild(logTerminal.firstChild);
        }
    }

    const volumeSlider = document.getElementById('taVolumeSlider');
    const volumeDisplay = document.getElementById('taVolumeDisplay');

    if (volumeSlider && volumeDisplay) {
        volumeSlider.addEventListener('input', (e) => {
            volumeDisplay.textContent = `${e.target.value} /hr`;
        });
    }

    if (btnStart) {
        btnStart.addEventListener('click', () => {
            // Check tier
            if (typeof userTier !== 'undefined' && userTier === 'free') {
                return showToast('Upgrade to Pro to use the Automated Engine', 'error');
            }

            const url = document.getElementById('taTargetUrl').value;
            if (!url) return showToast('Please enter a Target URL', 'warning');

            engineRunning = !engineRunning;

            if (engineRunning) {
                // Start
                btnStart.innerHTML = '<i class="fas fa-stop-circle mr-2"></i> Stop Traffic Engine';
                btnStart.classList.replace('from-green-500', 'from-red-500');
                btnStart.classList.replace('to-emerald-600', 'to-red-600');
                btnStart.classList.replace('hover:from-green-600', 'hover:from-red-600');
                btnStart.classList.replace('hover:to-emerald-700', 'hover:to-red-700');
                btnStart.classList.replace('focus:ring-green-300', 'focus:ring-red-300');
                btnStart.classList.replace('shadow-green-500/30', 'shadow-red-500/30');

                statusText.textContent = 'Engine Active & Routing';
                pulseOuter.classList.replace('bg-red-400', 'bg-green-400');
                pulseInner.classList.replace('bg-red-500', 'bg-green-500');

                statusOverlay.style.opacity = '0';
                setTimeout(() => statusOverlay.classList.add('hidden'), 300);

                addLog(`Engine started. Target: ${url}`);
                addLog('Initializing proxy rotation... OK');

                engineInterval = setInterval(() => {
                    const rate = parseInt(volumeSlider.value) || 50;
                    // Scale interval based on rate. If 50/hr, one hit every 72s.
                    // For simulation, we'll just random chance it.
                    const chance = rate / 3600; // hits per second

                    if (Math.random() < (chance * 2)) { // *2 because interval is 2s
                        const incV = Math.floor(Math.random() * 3) + 1;

                        // Limit enforcement
                        if (typeof userTier !== 'undefined' && userTier === 'pro') {
                            if (stats.visitors + incV >= 1000) {
                                btnStart.click(); // Stop engine
                                return showToast('Pro Tier Limit Reached (1k Visitors). Upgrade to Ultimate for unlimited traffic.', 'warning');
                            }
                        }

                        stats.visitors += incV;

                        if (Math.random() > 0.7) {
                            stats.clicks += 1;
                            addLog(`Route hit from IP ${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}...`);
                        }
                        if (Math.random() > 0.95) {
                            stats.conversions += 1;
                            stats.revenue += Math.floor(Math.random() * 50) + 10;
                            addLog(`Conversion detected! Revenue tracked.`, false);
                        }
                        updateStatsUI();
                    }
                }, 2000);

            } else {
                // Stop
                btnStart.innerHTML = '<i class="fas fa-satellite-dish mr-2"></i> Start Traffic Engine';
                btnStart.classList.replace('from-red-500', 'from-green-500');
                btnStart.classList.replace('to-red-600', 'to-emerald-600');
                btnStart.classList.replace('hover:from-red-600', 'hover:from-green-600');
                btnStart.classList.replace('hover:to-red-700', 'hover:to-emerald-700');
                btnStart.classList.replace('focus:ring-red-300', 'focus:ring-green-300');
                btnStart.classList.replace('shadow-red-500/30', 'shadow-green-500/30');

                statusText.textContent = 'System Idle';
                pulseOuter.classList.replace('bg-green-400', 'bg-red-400');
                pulseInner.classList.replace('bg-green-500', 'bg-red-500');

                clearInterval(engineInterval);
                statusOverlay.classList.remove('hidden');
                setTimeout(() => statusOverlay.style.opacity = '1', 10);

                addLog('Engine stopped.', true);
            }
        });
    }

    // Chart.js init for traffic
    const ctxTraffic = document.getElementById('taTrafficChart');
    if (ctxTraffic) {
        // Needs Chart.js in layout
        if (typeof Chart !== 'undefined') {
            new Chart(ctxTraffic.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ['10m', '20m', '30m', '40m', '50m', '60m'],
                    datasets: [{
                        label: 'Traffic Volume',
                        data: [65, 59, 80, 81, 56, 120],
                        fill: true,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderColor: '#10b981',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#9ca3af' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#9ca3af' }
                        }
                    }
                }
            });
        }
    }


    // --- SEO Optimizer ---
    const btnAnalyzeSeo = document.getElementById('taAnalyzeSeoBtn');
    const btnGenKw = document.getElementById('taGenKeywordsBtn');

    if (btnAnalyzeSeo) {
        btnAnalyzeSeo.addEventListener('click', () => {
            const kw = document.getElementById('taSeoKeyword').value;
            const url = document.getElementById('taSeoUrl').value;

            if (!kw || !url) return showToast('Enter Keyword and URL to analyze', 'warning');

            btnAnalyzeSeo.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btnAnalyzeSeo.disabled = true;

            setTimeout(() => {
                const score = Math.floor(Math.random() * 40) + 50; // 50-90

                const bar = document.getElementById('taSeoScoreBar');
                const text = document.getElementById('taSeoScoreText');

                bar.style.width = `${score}%`;
                text.textContent = `${score}%`;

                if (score > 80) text.className = 'font-bold text-xl text-green-400';
                else if (score > 60) text.className = 'font-bold text-xl text-yellow-400';
                else text.className = 'font-bold text-xl text-red-400';

                // Gen Tips
                const tips = [
                    `<li class="flex items-start"><i class="fas fa-check-circle text-green-500 mt-1 flex-shrink-0 mr-2"></i> Keyword found in Title Tag</li>`,
                    `<li class="flex items-start"><i class="fas fa-exclamation-triangle text-yellow-500 mt-1 flex-shrink-0 mr-2"></i> Meta description is too short</li>`,
                    `<li class="flex items-start"><i class="fas fa-times-circle text-red-500 mt-1 flex-shrink-0 mr-2"></i> H1 tag missing the target keyword</li>`,
                    `<li class="flex items-start"><i class="fas fa-check-circle text-green-500 mt-1 flex-shrink-0 mr-2"></i> Image alt attributes are optimized</li>`,
                    `<li class="flex items-start"><i class="fas fa-info-circle text-blue-500 mt-1 flex-shrink-0 mr-2"></i> Consider adding LSI keywords to content body</li>`
                ];

                // random subset
                tips.sort(() => 0.5 - Math.random());
                document.getElementById('taSeoTipsOutput').innerHTML = tips.slice(0, 4).join('');

                btnAnalyzeSeo.innerHTML = '<i class="fas fa-chart-line mr-1"></i> Analyze';
                btnAnalyzeSeo.disabled = false;
                showToast('Analysis Complete', 'success');

            }, 1500);
        });
    }

    if (btnGenKw) {
        btnGenKw.addEventListener('click', () => {
            const kw = document.getElementById('taSeoKeyword').value;
            if (!kw) return showToast('Enter Target Keyword first', 'warning');

            btnGenKw.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            setTimeout(() => {
                const words = kw.split(' ');
                const prefixes = ['best', 'top', 'guide to', 'how to', 'cheap'];
                const suffixes = ['tips', 'tricks', '2024', 'for beginners', 'software', 'tools'];

                let res = [];
                for (let i = 0; i < 8; i++) {
                    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
                    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
                    res.push(`<span class="bg-gray-700 px-2 py-1 rounded text-gray-200 text-xs">${p} ${kw} ${s}</span>`);
                }

                document.getElementById('taSeoKeywordsOutput').innerHTML = res.join('');

                btnGenKw.innerHTML = '<i class="fas fa-key mr-1"></i> Gen Keywords';
            }, 800);
        });
    }

    // --- Social Automation ---
    const socialBtns = document.querySelectorAll('.ta-net-btn');
    socialBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const net = btn.getAttribute('data-net');
            // toggle specific class based on net
            if (net === 'facebook') btn.classList.toggle('active-fb');
            if (net === 'twitter') btn.classList.toggle('active-tw');
            if (net === 'instagram') btn.classList.toggle('active-ig');
            if (net === 'pinterest') btn.classList.toggle('active-pi');
        });
    });

    // Browser selection logic
    const browserBtns = document.querySelectorAll('.browser-btn');
    browserBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            btn.classList.toggle('bg-white/5');
            btn.classList.toggle('bg-green-600/20');
            btn.classList.toggle('border-green-500/50');
            btn.classList.toggle('text-white');
        });
    });

    const btnSchedule = document.getElementById('taSchedulePostBtn');
    let qCount = 0;
    if (btnSchedule) {
        btnSchedule.addEventListener('click', () => {
            const content = document.getElementById('taSocialContent').value;
            const time = document.getElementById('taScheduleTime').value;

            // Collect active networks
            const activeNets = [];
            socialBtns.forEach(btn => {
                const t = btn.getAttribute('data-net');
                if (
                    (t === 'facebook' && btn.classList.contains('active-fb')) ||
                    (t === 'twitter' && btn.classList.contains('active-tw')) ||
                    (t === 'instagram' && btn.classList.contains('active-ig')) ||
                    (t === 'pinterest' && btn.classList.contains('active-pi'))
                ) {
                    activeNets.push(t);
                }
            });

            if (!content) return showToast('Please enter post content', 'warning');
            if (!time) return showToast('Please select schedule time', 'warning');
            if (activeNets.length === 0) return showToast('Select at least one network', 'warning');

            // Clear empty message if any
            const list = document.getElementById('taSocialQueueList');
            if (qCount === 0) list.innerHTML = '';

            // Add item
            const div = document.createElement('div');
            div.className = 'bg-black/40 p-3 rounded-lg border border-gray-700 mb-2 fade-in';
            div.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div class="flex gap-1 text-xs">
                        ${activeNets.map(n => {
                if (n === 'facebook') return '<span class="text-blue-500"><i class="fab fa-facebook"></i></span>';
                if (n === 'twitter') return '<span class="text-sky-400"><i class="fab fa-twitter"></i></span>';
                if (n === 'instagram') return '<span class="text-pink-500"><i class="fab fa-instagram"></i></span>';
                if (n === 'pinterest') return '<span class="text-red-500"><i class="fab fa-pinterest"></i></span>';
            }).join('')}
                    </div>
                    <span class="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/20"><i class="fas fa-clock mr-1"></i>${new Date(time).toLocaleString()}</span>
                </div>
                <p class="text-sm text-gray-300 line-clamp-2">${content}</p>
            `;

            list.prepend(div);

            qCount++;
            document.getElementById('taQueueCount').textContent = `${qCount} items`;

            // Reset form
            document.getElementById('taSocialContent').value = '';
            document.getElementById('taScheduleTime').value = '';
            showToast('Post added to queue!', 'success');
        });
    }

    // --- AI Content Creator ---
    const btnGenAi = document.getElementById('taGenAiBtn');
    if (btnGenAi) {
        btnGenAi.addEventListener('click', () => {
            const topic = document.getElementById('taAiTopic').value;
            const type = document.getElementById('taAiType').value;

            if (!topic) return showToast('Enter a Topic to generate content', 'warning');

            btnGenAi.disabled = true;
            btnGenAi.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Synthesizing...';

            document.getElementById('taAiOutput').value = '';

            setTimeout(() => {
                let out = '';
                if (type === 'blog') {
                    out = `# The Ultimate Guide to ${topic}\n\n## Introduction\nIn today's fast-paced digital landscape, mastering ${topic} is more critical than ever. Whether you are a beginner or looking to scale, this comprehensive post will walk you through the core principles.\n\n## Key Strategies\n1. **Define Your Audience**: Before executing on ${topic}, understand who you are talking to.\n2. **Leverage Right Tools**: Automation and analytics are your best friends.\n3. **Consistency is Key**: Algorithms favor steady, quality application.\n\n## Conclusion\nStart implementing these steps today and watch your engagement soar.`;
                } else if (type === 'email') {
                    out = `Subject: Welcome to the inner circle! 🚀\n\nHey there,\n\nI'm so glad you decided to join us to learn about ${topic}. Over the next few days, I'm going to send you some of my best, unpublished strategies.\n\nTomorrow, keep an eye on your inbox for "The #1 Mistake Beginners Make".\n\nTalk soon,\n- The Team`;
                } else if (type === 'social') {
                    out = `🚀 How I scaled my knowledge in ${topic} in 30 days:\n\n1️⃣ Stopped focusing on vanity metrics.\n2️⃣ Read top 3 industry blogs daily.\n3️⃣ Automated repetitive tasks.\n\n🧵 Thread below covers the exact tools I used... 👇\n\n#${topic.replace(/\s+/g, '')} #Growth #Tips`;
                } else {
                    out = `**Product Review: Ultimate ${topic} Toolkit**\n\nWe tested the newest toolkit designed for ${topic}, and the results were incredible.\n\n✅ Pros:\n- Easy setup\n- Cloud integration\n\n❌ Cons:\n- Requires basic knowledge\n\nRating: 4.8/5`;
                }

                typeWriterEffect('taAiOutput', out, 10, () => {
                    btnGenAi.disabled = false;
                    btnGenAi.innerHTML = '<i class="fas fa-brain mr-2"></i> Synthesize Content';
                    showToast('Content Generated', 'success');
                });

            }, 1200);

        });
    }

    document.getElementById('taCopyAiBtn')?.addEventListener('click', () => {
        const text = document.getElementById('taAiOutput').value;
        if (!text) return;
        navigator.clipboard.writeText(text);
        showToast('Copied to clipboard', 'info');
    });

    // Helper for typewriter effect
    function typeWriterEffect(elementId, text, speed, callback) {
        const el = document.getElementById(elementId);
        let i = 0;

        function type() {
            if (i < text.length) {
                el.value += text.charAt(i);
                el.scrollTop = el.scrollHeight; // scroll to bottom
                i++;
                setTimeout(type, speed);
            } else if (callback) {
                callback();
            }
        }
        type();
    }
});
