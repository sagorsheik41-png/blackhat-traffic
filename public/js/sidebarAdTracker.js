/**
 * Sidebar Ad Injector & Duration Tracker
 * Features:
 * - Only shows to normal users (not admins)
 * - Tracks view count and duration spent viewing
 * - Sends analytics to backend
 */

(function () {
    let adStartTime = null;
    let adDurationAccumulated = 0;
    let currentAdId = null;
    let sessionId = generateSessionId();

    function generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Initialize sidebar ad on page load
    async function initializeSidebarAd() {
        try {
            // Only show to non-admin users
            const userRole = typeof window.userRole !== 'undefined' ? window.userRole : 'user';
            if (userRole === 'admin') {
                console.log('[AdTracker] Admin detected - sidebar ad hidden');
                return;
            }

            // Fetch the active sidebar ad
            const response = await fetch('/api/ads/sidebar');
            const data = await response.json();

            if (!data.success || !data.ad) {
                console.log('[AdTracker] No active sidebar ad');
                return;
            }

            const ad = data.ad;
            currentAdId = ad._id;

            // Find sidebar container
            let container = document.getElementById('sidebar-ad-container');
            if (!container) {
                container = createSidebarAdContainer();
                const sidebar = document.querySelector('[data-sidebar]') ||
                    document.querySelector('.sidebar') ||
                    document.querySelector('[class*="sidebar"]');

                if (!sidebar) {
                    console.warn('[AdTracker] Sidebar container not found');
                    return;
                }

                // Append to bottom of sidebar
                sidebar.appendChild(container);
            }

            // Inject ad content
            if (ad.htmlContent) {
                container.innerHTML = ad.htmlContent;
            } else if (ad.iframeUrl) {
                container.innerHTML = `<iframe src="${ad.iframeUrl}" style="width: 100%; height: 300px; border: none; border-radius: 8px;"></iframe>`;
            }

            container.style.display = 'block';

            // Track both global impression and user-specific view
            await trackGlobalImpression(ad._id);
            await trackAdView(ad._id);

            // Start duration tracking
            startDurationTracking(ad._id);

        } catch (error) {
            console.error('[AdTracker] Error initializing sidebar ad:', error);
        }
    }

    function createSidebarAdContainer() {
        const container = document.createElement('div');
        container.id = 'sidebar-ad-container';
        container.style.cssText = `
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 16px;
            margin: 16px;
            margin-top: auto;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        // Add global style for the ad content to prevent overflow
        if (!document.getElementById('sidebar-ad-styles')) {
            const style = document.createElement('style');
            style.id = 'sidebar-ad-styles';
            style.textContent = `
                #sidebar-ad-container img,
                #sidebar-ad-container video,
                #sidebar-ad-container iframe {
                    max-width: 100%;
                    height: auto;
                    object-fit: contain;
                    border-radius: 8px;
                }
            `;
            document.head.appendChild(style);
        }

        return container;
    }

    async function trackAdView(adId) {
        try {
            const response = await fetch('/api/ads/track-view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adId })
            });
            console.log('[AdTracker] View tracked for ad:', adId);
        } catch (error) {
            console.error('[AdTracker] Error tracking view:', error);
        }
    }

    async function trackGlobalImpression(adId) {
        try {
            await fetch('/api/ads/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adId })
            });
            console.log('[AdTracker] Global impression tracked:', adId);
        } catch (error) {
            console.error('[AdTracker] Error tracking global impression:', error);
        }
    }

    function startDurationTracking(adId) {
        adStartTime = Date.now();

        // Track duration on page unload/beforeunload
        function trackDuration() {
            if (adStartTime && currentAdId) {
                const duration = Date.now() - adStartTime;
                adDurationAccumulated += duration;

                // Send to backend
                sendDurationToBackend(currentAdId, adDurationAccumulated);
            }
        }

        // Listen for page unload
        window.addEventListener('beforeunload', trackDuration);

        // Also track every 30 seconds while user is on page
        const durationInterval = setInterval(() => {
            if (adStartTime && currentAdId && document.hidden !== true) {
                const intervalDuration = 30000; // 30 seconds
                adDurationAccumulated += intervalDuration;
            }
        }, 30000);

        // Clean up on page unload
        window.addEventListener('unload', () => {
            clearInterval(durationInterval);
        });

        // Track when page becomes visible/hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page hidden - pause tracking
                if (adStartTime) {
                    const pausedDuration = Date.now() - adStartTime;
                    adDurationAccumulated += pausedDuration;
                    adStartTime = null;
                }
            } else {
                // Page visible - resume tracking
                adStartTime = Date.now();
            }
        });
    }

    async function sendDurationToBackend(adId, durationMs) {
        try {
            const response = await fetch('/api/ads/track-duration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adId,
                    durationMs
                })
            });
            const result = await response.json();
            if (result.success) {
                console.log('[AdTracker] Duration tracked:', durationMs + 'ms');
            }
        } catch (error) {
            console.error('[AdTracker] Error tracking duration:', error);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSidebarAd);
    } else {
        initializeSidebarAd();
    }
})();
