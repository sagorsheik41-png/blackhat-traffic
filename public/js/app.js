/**
 * BlackHat Traffic SaaS — Shared Frontend Utilities
 */

// Toast Notification System
function showToast(message, type = 'info', duration = 3000) {
    const colors = {
        info: 'from-indigo-500 to-purple-600',
        success: 'from-green-500 to-emerald-600',
        error: 'from-red-500 to-rose-600',
        warning: 'from-yellow-500 to-orange-600',
    };
    const icons = {
        info: 'fa-info-circle',
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
    };

    const toast = document.createElement('div');
    toast.className = `fixed top-5 right-5 z-50 px-6 py-4 rounded-xl text-white font-semibold shadow-2xl bg-gradient-to-r ${colors[type]} transform translate-x-full transition-transform duration-300`;
    toast.innerHTML = `<i class="fas ${icons[type]} mr-2"></i>${message}`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Copy to Clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
    } catch (err) {
        showToast('Failed to copy', 'error');
    }
}

// Format numbers with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Fetch wrapper with auth
async function apiFetch(url, options = {}) {
    const defaults = {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
    };
    const merged = { ...defaults, ...options };
    if (options.body && typeof options.body === 'object') {
        merged.body = JSON.stringify(options.body);
    }

    const res = await fetch(url, merged);
    if (res.status === 401) {
        window.location.href = '/auth/login';
        return null;
    }
    return res;
}
