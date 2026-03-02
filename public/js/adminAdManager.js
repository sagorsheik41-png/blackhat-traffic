/**
 * Admin Ad Manager - Dynamic Ad & Smartlink Injection Control
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Only run on admin page
    if (!document.getElementById('pane-ad-manager')) return;

    let ads = [];
    let analyticsData = { impressions: 0, clicks: 0 };

    // Create Ad Button (Attach BEFORE await to guarantee it works)
    const createAdBtn = document.getElementById('createAdBtn');
    if (createAdBtn) {
        createAdBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[Ad Manager] Create Ad button clicked');
            openCreateAdModal();
        });
    } else {
        console.error('[Ad Manager] Create Ad button not found!');
    }

    // Load ads on page load
    await loadAds();

    async function loadAds() {
        try {
            // Fetch Ads
            const response = await fetch('/admin/ad-manager');
            const data = await response.json();

            // Fetch Analytics
            try {
                const analyticsRes = await fetch('/api/ads/analytics');
                const analyticsJson = await analyticsRes.json();
                if (analyticsJson.success) analyticsData = analyticsJson.analytics;
            } catch (e) { console.error('Failed to load analytics', e); }

            if (data.success) {
                ads = data.ads || [];
                console.log('[Ad Manager] Ads loaded:', ads.length);
                renderAdsTable();
            } else {
                console.error('[Ad Manager] Failed to load ads:', data.error);
            }
        } catch (error) {
            console.error('Failed to load ads:', error);
            document.getElementById('adManagerTable').innerHTML =
                '<p class="text-red-400 py-4">Error loading ads</p>';
        }
    }

    function renderAdsTable() {
        const container = document.getElementById('adManagerTable');

        console.log('[Ad Manager] Rendering table with analytics:', analyticsData);
        // Render basic Analytics Dashboard Banner
        const analyticsHtml = `
            <div class="flex gap-4 mb-6">
                <div class="flex-1 bg-black/40 rounded-xl p-4 border border-white/5 flex items-center gap-4">
                    <div class="h-10 w-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400"><i class="fas fa-eye"></i></div>
                    <div>
                        <div class="text-[10px] text-gray-500 uppercase font-black tracking-widest">Total Impressions</div>
                        <div class="text-xl font-black text-white">${analyticsData.impressions.toLocaleString()}</div>
                    </div>
                </div>
                <div class="flex-1 bg-black/40 rounded-xl p-4 border border-white/5 flex items-center gap-4">
                    <div class="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400"><i class="fas fa-mouse-pointer"></i></div>
                    <div>
                        <div class="text-[10px] text-gray-500 uppercase font-black tracking-widest">Total Clicks</div>
                        <div class="text-xl font-black text-white">${analyticsData.clicks.toLocaleString()}</div>
                    </div>
                </div>
            </div>
        `;

        if (ads.length === 0) {
            container.innerHTML = analyticsHtml + `
                <div class="text-center py-12 bg-black/20 rounded-xl border border-white/5 mt-4">
                    <i class="fas fa-inbox text-4xl text-gray-700 mb-3"></i>
                    <p class="text-gray-400">No ads created yet. Create your first ad to get started!</p>
                </div>
            `;
            return;
        }

        const table = analyticsHtml + `
            <table class="w-full text-sm text-gray-300">
                <thead>
                    <tr class="border-b border-white/10 text-[10px] text-gray-500 uppercase tracking-widest">
                        <th class="py-3 px-4 text-left">Title</th>
                        <th class="py-3 px-4 text-left">Type</th>
                        <th class="py-3 px-4 text-center">Delay</th>
                        <th class="py-3 px-4 text-center">Target</th>
                        <th class="py-3 px-4 text-center">Status</th>
                        <th class="py-3 px-4 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-white/10">
                    ${ads.map(ad => `
                        <tr class="hover:bg-white/5 transition">
                            <td class="py-3 px-4 font-medium">${ad.title}</td>
                            <td class="py-3 px-4 text-xs">
                                <span class="px-2 py-1 rounded-full ${ad.iframeUrl ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}">
                                    ${ad.iframeUrl ? 'Iframe' : 'HTML'}
                                </span>
                            </td>
                            <td class="py-3 px-4 text-center text-xs">
                                ${ad.displayDelay} ${ad.displayDelayUnit}
                            </td>
                            <td class="py-3 px-4 text-center text-xs capitalize">
                                ${ad.targetUsers}
                            </td>
                            <td class="py-3 px-4 text-center">
                                <button class="toggle-ad-btn" data-id="${ad._id}" data-status="${ad.status}">
                                    ${ad.status ?
                '<span class="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400">ON</span>' :
                '<span class="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400">OFF</span>'
            }
                                </button>
                            </td>
                            <td class="py-3 px-4 text-center">
                                <button class="edit-ad-btn text-blue-400 hover:text-blue-300 mr-3" data-id="${ad._id}" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="delete-ad-btn text-red-400 hover:text-red-300" data-id="${ad._id}" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = table;

        // Add event listeners
        document.querySelectorAll('.toggle-ad-btn').forEach(btn => {
            btn.addEventListener('click', (e) => toggleAdStatus(e.target.closest('button').dataset.id));
        });

        document.querySelectorAll('.edit-ad-btn').forEach(btn => {
            btn.addEventListener('click', (e) => editAd(e.target.closest('button').dataset.id));
        });

        document.querySelectorAll('.delete-ad-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (confirm('Are you sure you want to delete this ad?')) {
                    deleteAd(e.target.closest('button').dataset.id);
                }
            });
        });
    }

    function openCreateAdModal() {
        const modal = createAdModal(null);
        document.body.appendChild(modal);
        modal.classList.remove('hidden');
    }

    function createAdModal(adData = null) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4';

        const isEdit = !!adData;
        const titleText = isEdit ? 'Edit Ad' : 'Create New Ad';

        console.log('[Ad Manager] Opening ' + (isEdit ? 'Edit' : 'Create') + ' Ad modal');

        modal.innerHTML = `
            <div class="bg-gray-900 rounded-2xl border border-white/10 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-white">${titleText}</h2>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>

                <form id="adForm" class="space-y-4">
                    <!-- Title -->
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Ad Title *</label>
                        <input type="text" name="title" placeholder="e.g., Summer Promo Popup"
                            value="${adData?.title || ''}"
                            class="w-full bg-black/40 border border-white/10 text-white px-4 py-2 rounded-lg focus:border-green-500 outline-none" required>
                    </div>

                    <!-- Description -->
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Description</label>
                        <textarea name="description" placeholder="Optional description..."
                            class="w-full bg-black/40 border border-white/10 text-white px-4 py-2 rounded-lg focus:border-green-500 outline-none" rows="2">${adData?.description || ''}</textarea>
                    </div>

                    <!-- HTML/Iframe Selection -->
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Content Type *</label>
                        <div class="flex gap-4">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" id="contentTypeHtml" name="contentType" value="html" 
                                    ${!adData?.iframeUrl ? 'checked' : ''}
                                    class="w-4 h-4 rounded border-gray-700 bg-black/50 text-green-500">
                                <span class="text-sm text-gray-300">Custom HTML</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" id="contentTypeIframe" name="contentType" value="iframe"
                                    ${adData?.iframeUrl ? 'checked' : ''}
                                    class="w-4 h-4 rounded border-gray-700 bg-black/50 text-green-500">
                                <span class="text-sm text-gray-300">Iframe/Embed</span>
                            </label>
                        </div>
                    </div>

                    <!-- HTML Content -->
                    <div id="htmlContentField">
                        <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">HTML Content *</label>
                        <textarea name="htmlContent" placeholder='<div class="popup">...</div>'
                            class="w-full bg-black/40 border border-white/10 text-white px-4 py-2 rounded-lg focus:border-green-500 outline-none font-mono text-xs" rows="6">${adData?.htmlContent || ''}</textarea>
                        <p class="text-[10px] text-gray-500 mt-1">Reference: [ADMIN_DEFINED_LINK] will be replaced with iframe URL</p>
                    </div>

                    <!-- Iframe URL -->
                    <div id="iframeUrlField" class="hidden">
                        <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Iframe URL *</label>
                        <input type="url" name="iframeUrl" placeholder="https://example.com/popup"
                            value="${adData?.iframeUrl || ''}"
                            class="w-full bg-black/40 border border-white/10 text-white px-4 py-2 rounded-lg focus:border-green-500 outline-none">
                    </div>

                    <!-- Display Timing -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Delay Value</label>
                            <input type="number" name="displayDelay" min="0"
                                value="${adData?.displayDelay || 0}"
                                class="w-full bg-black/40 border border-white/10 text-white px-4 py-2 rounded-lg focus:border-green-500 outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Time Unit</label>
                            <select name="displayDelayUnit"
                                class="w-full bg-black/40 border border-white/10 text-white px-4 py-2 rounded-lg focus:border-green-500 outline-none">
                                <option value="seconds" ${adData?.displayDelayUnit === 'seconds' ? 'selected' : ''}>Seconds</option>
                                <option value="minutes" ${adData?.displayDelayUnit === 'minutes' ? 'selected' : ''}>Minutes</option>
                                <option value="hours" ${adData?.displayDelayUnit === 'hours' ? 'selected' : ''}>Hours</option>
                            </select>
                        </div>
                    </div>

                    <!-- Targeting -->
                    <div class="border-t border-gray-700 pt-4">
                        <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Target Audience</label>
                        <select name="targetUsers"
                            class="w-full bg-black/40 border border-white/10 text-white px-4 py-2 rounded-lg focus:border-green-500 outline-none">
                            <option value="all" ${adData?.targetUsers === 'all' ? 'selected' : ''}>All Users</option>
                            <option value="free" ${adData?.targetUsers === 'free' ? 'selected' : ''}>Free Tier Only</option>
                            <option value="pro" ${adData?.targetUsers === 'pro' ? 'selected' : ''}>Pro Tier Only</option>
                            <option value="ultimate" ${adData?.targetUsers === 'ultimate' ? 'selected' : ''}>Ultimate Tier Only</option>
                        </select>
                    </div>

                    <!-- Visibility & Type Settings -->
                    <div class="grid grid-cols-2 gap-3">
                        <div class="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/5">
                            <input type="checkbox" id="status" name="status"
                                ${adData?.status !== false ? 'checked' : ''}
                                class="w-4 h-4 rounded border-gray-700 bg-black/50 text-green-500">
                            <label for="status" class="text-sm text-gray-300 cursor-pointer">
                                Ad Enabled (ON)
                            </label>
                        </div>
                        <div class="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/5">
                            <input type="checkbox" id="isSidebarAd" name="isSidebarAd"
                                ${adData?.isSidebarAd ? 'checked' : ''}
                                class="w-4 h-4 rounded border-gray-700 bg-black/50 text-green-500">
                            <label for="isSidebarAd" class="text-sm text-gray-300 cursor-pointer text-indigo-400 font-bold">
                                Use in Sidebar
                            </label>
                        </div>
                    </div>

                    <!-- Options -->
                    <div class="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/5">
                        <input type="checkbox" id="displayOnce" name="displayOnce"
                            ${adData?.displayOnce ? 'checked' : ''}
                            class="w-4 h-4 rounded border-gray-700 bg-black/50 text-green-500">
                        <label for="displayOnce" class="text-sm text-gray-300 cursor-pointer">
                            Show Only Once Per Session
                        </label>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-3 pt-4 border-t border-gray-700">
                        <button type="submit" class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg transition">
                            ${isEdit ? '<i class="fas fa-save mr-2"></i> Update Ad' : '<i class="fas fa-plus mr-2"></i> Create Ad'}
                        </button>
                        <button type="button" onclick="this.closest('.fixed').remove()"
                            class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Toggle visibility based on content type selection
        const toggleContentFields = () => {
            const isHtml = modal.querySelector('input[name="contentType"]:checked').value === 'html';
            modal.querySelector('#htmlContentField').classList.toggle('hidden', !isHtml);
            modal.querySelector('#iframeUrlField').classList.toggle('hidden', isHtml);
        };

        modal.querySelectorAll('input[name="contentType"]').forEach(radio => {
            radio.addEventListener('change', toggleContentFields);
        });

        // Form submission
        modal.querySelector('#adForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitAdForm(e.target, isEdit ? adData._id : null, modal);
        });

        // Start with correct visibility
        setTimeout(toggleContentFields, 100);

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        return modal;
    }

    async function submitAdForm(form, adId = null, modal) {
        const formData = new FormData(form);
        const contentType = formData.get('contentType');

        const payload = {
            title: formData.get('title'),
            description: formData.get('description'),
            displayDelay: parseInt(formData.get('displayDelay')) || 0,
            displayDelayUnit: formData.get('displayDelayUnit'),
            targetUsers: formData.get('targetUsers'),
            displayOnce: form.querySelector('input[name="displayOnce"]').checked,
            status: form.querySelector('input[name="status"]').checked,
            isSidebarAd: form.querySelector('input[name="isSidebarAd"]').checked
        };

        // Ensure sidebarAdStatus stays in sync with general status if it exists
        payload.sidebarAdStatus = payload.status;

        if (contentType === 'html') {
            payload.htmlContent = formData.get('htmlContent');
            payload.iframeUrl = '';
        } else {
            payload.iframeUrl = formData.get('iframeUrl');
            payload.htmlContent = `<div class='popup' id='custom-ad-popup'><div class='popup-content'><button class='popup-close' onclick='document.getElementById("custom-ad-popup").style.display="none"'>&#215;</button><iframe class='popup-iframe' frameborder='0' src='${formData.get('iframeUrl')}'></iframe></div></div>`;
        }

        console.log('[Ad Manager] Submitting ad:', { adId, isEdit: !!adId, payload });

        try {
            const method = adId ? 'PUT' : 'POST';
            const url = adId ? `/admin/ad-manager/${adId}` : '/admin/ad-manager';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('[Ad Manager] API Error:', response.status, errorData);
                showToast(errorData.error || 'Failed to save ad', 'error');
                return;
            }

            const data = await response.json();
            console.log('[Ad Manager] API Response:', data);

            if (data.success) {
                await loadAds();
                modal?.remove();
                showToast(adId ? 'Ad updated successfully!' : 'Ad created successfully!', 'success');
            } else {
                console.warn('[Ad Manager] Response indicated failure:', data);
                showToast(data.error || 'Failed to save ad', 'error');
            }
        } catch (error) {
            console.error('[Ad Manager] Error saving ad:', error.message || error);
            showToast('Error saving ad: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    async function toggleAdStatus(adId) {
        try {
            const response = await fetch(`/admin/ad-manager/${adId}/toggle`, {
                method: 'POST'
            });
            const data = await response.json();
            if (data.success) {
                await loadAds();
                showToast(data.status ? 'Ad enabled' : 'Ad disabled', 'success');
            }
        } catch (error) {
            showToast('Error toggling ad status', 'error');
        }
    }

    async function editAd(adId) {
        const ad = ads.find(a => a._id === adId);
        if (!ad) return;
        const modal = createAdModal(ad);
        document.body.appendChild(modal);
        modal.classList.remove('hidden');
    }

    async function deleteAd(adId) {
        try {
            const response = await fetch(`/admin/ad-manager/${adId}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                await loadAds();
                showToast('Ad deleted', 'success');
            }
        } catch (error) {
            showToast('Error deleting ad', 'error');
        }
    }

    // Helper function to show toast (if not already defined)
    if (typeof showToast === 'undefined') {
        window.showToast = (message, type = 'info') => {
            const toast = document.createElement('div');
            toast.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg text-white text-sm z-50 animate-in fade-in slide-in-from-bottom-2 duration-300
                ${type === 'success' ? 'bg-green-600' : ''}
                ${type === 'error' ? 'bg-red-600' : ''}
                ${type === 'info' ? 'bg-blue-600' : ''}`;
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        };
    }
});
