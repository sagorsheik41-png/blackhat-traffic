/**
 * video-player.js
 * Controls the preview video player + TeraBox redirect popup
 */
(function () {
    const PREVIEW_DURATION = 15; // seconds before popup appears

    const video = document.getElementById('preview-video');
    const popup = document.getElementById('terabox-popup');
    const continueBtn = document.getElementById('continue-btn');
    const closeBtn = document.getElementById('popup-close-btn');
    const countdownEl = document.getElementById('popup-countdown');
    const videoId = document.body.dataset.videoId;
    const teraboxLink = document.body.dataset.teraboxLink;

    if (!video) return;

    let popupShown = false;
    let countdownInterval = null;

    // Track page view
    function trackEvent(event) {
        if (!videoId) return;
        fetch(`/videos/api/track/${videoId}/${event}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        }).catch(() => {});
    }

    // Show popup
    function showPopup() {
        if (popupShown) return;
        popupShown = true;
        video.pause();
        popup.classList.remove('hidden');
        popup.classList.add('flex');
        trackEvent('popup_click');

        // Optional: countdown auto-redirect (disabled by default)
        // let secs = 10;
        // if (countdownEl) countdownEl.textContent = secs;
        // countdownInterval = setInterval(() => {
        //     secs--;
        //     if (countdownEl) countdownEl.textContent = secs;
        //     if (secs <= 0) { clearInterval(countdownInterval); doRedirect(); }
        // }, 1000);
    }

    // Do the TeraBox redirect
    function doRedirect() {
        if (countdownInterval) clearInterval(countdownInterval);
        trackEvent('redirect_click');
        setTimeout(() => {
            window.open(teraboxLink, '_blank', 'noopener,noreferrer');
        }, 200);
    }

    // Close popup (let user watch preview again)
    function closePopup() {
        popup.classList.add('hidden');
        popup.classList.remove('flex');
        popupShown = false;
        video.currentTime = 0;
        video.play();
    }

    // Trigger popup after PREVIEW_DURATION seconds
    video.addEventListener('timeupdate', function () {
        if (video.currentTime >= PREVIEW_DURATION && !popupShown) {
            showPopup();
        }
    });

    // Trigger popup if video ended
    video.addEventListener('ended', showPopup);

    // Continue Watching button
    if (continueBtn) continueBtn.addEventListener('click', doRedirect);

    // Close popup button
    if (closeBtn) closeBtn.addEventListener('click', closePopup);

    // Close popup on backdrop click
    popup.addEventListener('click', function (e) {
        if (e.target === popup) closePopup();
    });

    // Track initial view on page load
    trackEvent('view');

    // Keyboard ESC to close popup
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !popup.classList.contains('hidden')) {
            closePopup();
        }
    });
})();
