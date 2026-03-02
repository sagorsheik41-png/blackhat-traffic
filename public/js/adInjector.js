/**
 * Ad Injector - Dynamically fetches and displays ads on user dashboard
 * Includes: Timing control, tier filtering, session tracking
 */

(function() {
    // Fetch ads configuration from admin and inject into page
    async function initializeAdInjector() {
        try {
            // Fetch all active ads
            const response = await fetch('/admin/ad-manager');
            if (!response.ok) return; // Silently fail if not available
            
            const data = await response.json();
            if (!data.success || !data.ads) return;

            // Get current user tier (should be set globally by dashboard)
            const userTier = typeof window.userTier !== 'undefined' ? window.userTier : 'free';

            // Filter ads based on user tier and status
            const activeAds = data.ads.filter(ad => {
                // Only show active ads
                if (!ad.status) return false;

                // Check tier targeting
                if (ad.targetUsers !== 'all' && ad.targetUsers !== userTier) {
                    return false;
                }

                return true;
            });

            // Process each ad with its specific timing
            activeAds.forEach(ad => {
                scheduleAdDisplay(ad);
            });

        } catch (error) {
            console.error('Ad injection error:', error);
            // Silently fail - don't break the page
        }
    }

    function scheduleAdDisplay(ad) {
        // Convert displayDelay to milliseconds
        let delayMs = ad.displayDelay;
        
        switch (ad.displayDelayUnit) {
            case 'minutes':
                delayMs = ad.displayDelay * 60 * 1000;
                break;
            case 'hours':
                delayMs = ad.displayDelay * 60 * 60 * 1000;
                break;
            default: // seconds
                delayMs = ad.displayDelay * 1000;
        }

        // Check if ad should only show once per session
        if (ad.displayOnce) {
            const sessionKey = `ad_shown_${ad._id}`;
            if (sessionStorage.getItem(sessionKey)) {
                return; // Already shown in this session
            }
        }

        // Schedule display with setTimeout
        setTimeout(() => {
            displayAd(ad);
            
            // Mark as shown in this session
            if (ad.displayOnce) {
                sessionStorage.setItem(`ad_shown_${ad._id}`, 'true');
            }

            // Track impression
            trackAdImpression(ad._id);
        }, delayMs);
    }

    function displayAd(ad) {
        // Create container for the ad if it doesn't exist
        let container = document.getElementById('admin-ad-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'admin-ad-container';
            container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9998; pointer-events: none;';
            document.body.appendChild(container);
        }

        // Create ad popup wrapper
        const adWrapper = document.createElement('div');
        adWrapper.className = 'admin-ad-popup-wrapper';
        adWrapper.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            pointer-events: auto;
            backdrop-filter: blur(4px);
        `;

        // Create ad content container
        const adContent = document.createElement('div');
        adContent.className = 'admin-ad-content';
        adContent.style.cssText = `
            background: white;
            border-radius: 12px;
            max-width: 90%;
            max-height: 90vh;
            overflow: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            position: relative;
            animation: slideUp 0.3s ease-out;
        `;

        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'admin-ad-close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.5);
            color: white;
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            transition: background 0.2s;
        `;

        closeBtn.addEventListener('mouseover', () => {
            closeBtn.style.background = 'rgba(0, 0, 0, 0.7)';
        });

        closeBtn.addEventListener('mouseout', () => {
            closeBtn.style.background = 'rgba(0, 0, 0, 0.5)';
        });

        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            adWrapper.remove();
        });

        // Close when clicking outside the ad
        adWrapper.addEventListener('click', (e) => {
            if (e.target === adWrapper) {
                adWrapper.remove();
            }
        });

        // Inject HTML content
        if (ad.htmlContent) {
            // Replace [ADMIN_DEFINED_LINK] with actual iframe URL if provided
            let htmlContent = ad.htmlContent;
            if (ad.iframeUrl) {
                htmlContent = htmlContent.replace(/\[ADMIN_DEFINED_LINK\]/g, ad.iframeUrl);
            }
            adContent.innerHTML = htmlContent;
        } else if (ad.iframeUrl) {
            // Fallback: create an iframe
            const iframe = document.createElement('iframe');
            iframe.src = ad.iframeUrl;
            iframe.style.cssText = 'width: 100%; height: 100%; border: none; border-radius: 12px;';
            iframe.frameBorder = '0';
            adContent.appendChild(iframe);
        }

        // Add CSS animation
        if (!document.getElementById('admin-ad-styles')) {
            const style = document.createElement('style');
            style.id = 'admin-ad-styles';
            style.textContent = `
                @keyframes slideUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        adContent.appendChild(closeBtn);
        adWrapper.appendChild(adContent);
        document.body.appendChild(adWrapper);
    }

    function trackAdImpression(adId) {
        // Optional: Send analytics
        // This could be enhanced to track clicks and impressions
        navigator.sendBeacon('/admin/ad-manager/track', JSON.stringify({
            adId,
            event: 'impression',
            timestamp: new Date()
        }));
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAdInjector);
    } else {
        initializeAdInjector();
    }
})();
