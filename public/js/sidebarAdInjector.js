/**
 * Sidebar Ad Injector - Global Ad System for All Users
 * Handles fetching, displaying, and cycling through sidebar ads
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Only run if not in admin dashboard
    if (window.location.pathname.includes('/admin')) return;

    await loadAndInjectSidebarAds();

    async function loadAndInjectSidebarAds() {
        try {
            // Use the public API endpoint (no admin auth required)
            const response = await fetch('/api/ads/sidebar', {
                credentials: 'include'
            });
            if (!response.ok) return;

            const data = await response.json();
            if (!data.success || !data.ad) return;

            // Create sidebar container if it doesn't exist
            let sidebarContainer = document.getElementById('global-sidebar-ads');
            if (!sidebarContainer) {
                sidebarContainer = document.createElement('div');
                sidebarContainer.id = 'global-sidebar-ads';
                sidebarContainer.className = 'fixed right-4 bottom-4 z-40 space-y-4 max-w-xs';
                document.body.appendChild(sidebarContainer);
            }

            displaySidebarAd(data.ad, sidebarContainer);

        } catch (error) {
            console.error('Error loading sidebar ads:', error);
        }
    }

    function displaySidebarAd(ad, container) {
        if (!ad) return;

        container.innerHTML = '';

        const adWrapper = document.createElement('div');
        adWrapper.className = 'glass p-4 rounded-2xl border border-white/10 shadow-2xl relative';

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.className = 'absolute top-2 right-3 text-gray-400 hover:text-white text-xl leading-none z-10';
        closeBtn.onclick = () => container.remove();
        adWrapper.appendChild(closeBtn);

        // Inject HTML content directly
        if (ad.htmlContent) {
            const contentDiv = document.createElement('div');
            contentDiv.innerHTML = ad.htmlContent;
            adWrapper.appendChild(contentDiv);
        }

        container.appendChild(adWrapper);

        // Track impression
        trackAdImpression(ad._id);
    }

    async function trackAdImpression(adId) {
        try {
            await fetch('/api/ads/track', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adId })
            });
        } catch (error) {
            // Silent fail for tracking
        }
    }
});
