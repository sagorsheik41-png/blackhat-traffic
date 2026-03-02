/**
 * Admin Panel Event Handlers
 * Removes CSP violations by replacing inline onclick/onsubmit with proper event listeners
 */

document.addEventListener('DOMContentLoaded', () => {
    // ============================================================
    // TAB SWITCHING
    // ============================================================
    
    function switchTab(tabId) {
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
        document.getElementById(`pane-${tabId}`).classList.remove('hidden');
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active', 'text-white', 'bg-indigo-600');
            b.classList.add('text-gray-500');
        });
        const activeBtn = document.getElementById(`tab-${tabId}`);
        if (activeBtn) {
            activeBtn.classList.add('active', 'text-white', 'bg-indigo-600');
            activeBtn.classList.remove('text-gray-500');
        }
        localStorage.setItem('adminActiveTab', tabId);
    }

    // Attach tab buttons
    document.getElementById('tab-overview')?.addEventListener('click', () => switchTab('overview'));
    document.getElementById('tab-users')?.addEventListener('click', () => switchTab('users'));
    document.getElementById('tab-payments')?.addEventListener('click', () => switchTab('payments'));
    document.getElementById('tab-settings')?.addEventListener('click', () => switchTab('settings'));

    // Initialize active tab from localStorage
    const savedTab = localStorage.getItem('adminActiveTab') || 'overview';
    switchTab(savedTab);

    // ============================================================
    // PAGE RELOAD BUTTON
    // ============================================================
    
    document.querySelectorAll('button[data-action="reload"]').forEach(btn => {
        btn.addEventListener('click', () => location.reload());
    });

    // ============================================================
    // MODAL FUNCTIONS
    // ============================================================
    
    function openEditModal(encodedUser) {
        const u = JSON.parse(decodeURIComponent(encodedUser));
        document.getElementById('editUserId').value = u._id;
        document.getElementById('editUserName').value = u.name;
        document.getElementById('editUserEmail').value = u.email;
        document.getElementById('editUserPhone').value = u.phone || '';
        document.getElementById('editUserModal').classList.remove('hidden');
        document.getElementById('editUserModal').classList.add('flex');
    }

    function closeEditModal() {
        document.getElementById('editUserModal').classList.add('hidden');
        document.getElementById('editUserModal').classList.remove('flex');
    }

    // Attach modal buttons
    document.querySelectorAll('[data-open-edit-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const encodedUser = e.currentTarget.getAttribute('data-user');
            openEditModal(encodedUser);
        });
    });

    document.getElementById('closeEditModalBtn')?.addEventListener('click', closeEditModal);

    // ============================================================
    // FORM SUBMISSIONS
    // ============================================================
    
    async function updateSettings(e, type) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const body = { [type]: Object.fromEntries(formData.entries()) };
        
        console.log('[Admin Settings] Updating', type, ':', body);
        
        try {
            const res = await fetch('/admin/settings/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            if (!res.ok) {
                console.error('[Admin Settings] API Error:', res.status);
                const errorData = await res.json();
                if (typeof showToast !== 'undefined') showToast(errorData.error || 'Failed to update settings', 'error');
                else alert(errorData.error || 'Failed to update settings');
                return;
            }
            
            const data = await res.json();
            console.log('[Admin Settings] Response:', data);
            
            if (data.success) {
                if (typeof showToast !== 'undefined') showToast(data.message || 'Settings saved successfully!', 'success');
                else alert(data.message || 'Settings saved successfully!');
            } else {
                console.warn('[Admin Settings] Unexpected response:', data);
                if (typeof showToast !== 'undefined') showToast(data.error || 'Settings update failed', 'error');
                else alert(data.error || 'Settings update failed');
            }
        } catch (err) {
            console.error('[Admin Settings] Error:', err.message || err);
            if (typeof showToast !== 'undefined') showToast('Error saving settings: ' + (err.message || 'Unknown error'), 'error');
            else alert('Error: ' + (err.message || 'Unknown error'));
        }
    }

    // Attach forms
    document.querySelectorAll('form[data-update-settings]').forEach(form => {
        const type = form.getAttribute('data-update-settings');
        form.addEventListener('submit', (e) => updateSettings(e, type));
    });

    // ============================================================
    // USER MANAGEMENT ACTIONS
    // ============================================================
    
    async function approvePayment(id) {
        if (!confirm('Approve payment and upgrade user?')) return;
        try {
            const res = await fetch(`/admin/payments/${id}/approve`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                if (typeof showToast !== 'undefined') showToast(data.message, 'success');
                location.reload();
            } else {
                if (typeof showToast !== 'undefined') showToast(data.error || 'Update failed', 'error');
                else alert(data.error);
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function rejectPayment(id) {
        const note = prompt('Rejection reason (optional):');
        if (note === null) return;
        try {
            const res = await fetch(`/admin/payments/${id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note })
            });
            const data = await res.json();
            if (data.success) location.reload();
        } catch (err) {
            console.error(err);
        }
    }

    // Attach payment action buttons
    document.querySelectorAll('[data-action="approve-payment"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const paymentId = e.currentTarget.getAttribute('data-id');
            approvePayment(paymentId);
        });
    });

    document.querySelectorAll('[data-action="reject-payment"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const paymentId = e.currentTarget.getAttribute('data-id');
            rejectPayment(paymentId);
        });
    });

    // ============================================================
    // TIER MANAGEMENT
    // ============================================================
    
    async function updateTier(id, tier) {
        try {
            await fetch(`/admin/users/${id}/tier`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tier })
            });
            location.reload();
        } catch (err) {
            console.error(err);
        }
    }

    // Attach tier dropdowns
    document.querySelectorAll('select[data-action="update-tier"]').forEach(select => {
        select.addEventListener('change', (e) => {
            const userId = e.currentTarget.getAttribute('data-user-id');
            const tier = e.currentTarget.value;
            updateTier(userId, tier);
        });
    });

    // ============================================================
    // USER TOGGLE (ACTIVE/INACTIVE)
    // ============================================================
    
    async function toggleUser(id) {
        try {
            await fetch(`/admin/users/${id}/toggle`, { method: 'POST' });
            location.reload();
        } catch (err) {
            console.error(err);
        }
    }

    document.querySelectorAll('[data-action="toggle-user"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = e.currentTarget.getAttribute('data-user-id');
            toggleUser(userId);
        });
    });

    // ============================================================
    // USER DELETION
    // ============================================================
    
    async function deleteUser(id) {
        if (confirm('Delete user?')) {
            try {
                await fetch(`/admin/users/${id}`, { method: 'DELETE' });
                location.reload();
            } catch (err) {
                console.error(err);
            }
        }
    }

    document.querySelectorAll('[data-action="delete-user"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = e.currentTarget.getAttribute('data-user-id');
            deleteUser(userId);
        });
    });

    // ============================================================
    // CURRENCY TOGGLE
    // ============================================================
    
    async function toggleCurrency() {
        const isBdtActive = (document.querySelector('[data-currency-toggle]').textContent.includes('ENABLED'));
        const switchBdtTo = !isBdtActive;
        try {
            const res = await fetch('/admin/settings/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ useBDT: switchBdtTo })
            });
            const data = await res.json();
            if (data.success) location.reload();
        } catch (err) {
            console.error(err);
        }
    }

    document.querySelector('[data-action="toggle-currency"]')?.addEventListener('click', toggleCurrency);

    // ============================================================
    // GLOBAL SIDEBAR ADS TOGGLE
    // ============================================================
    
    async function toggleGlobalSidebarAds() {
        try {
            const res = await fetch('/admin/settings/ad-toggle', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                const toggle = document.getElementById('global-ad-toggle');
                if (toggle) {
                    const isEnabled = data.enabled;
                    toggle.textContent = isEnabled ? 'ENABLED' : 'DISABLED';
                    toggle.className = isEnabled ? 
                        'px-6 py-2.5 rounded-xl text-xs font-bold transition-all bg-green-600 text-white' :
                        'px-6 py-2.5 rounded-xl text-xs font-bold transition-all bg-gray-600 text-gray-300';
                }
                if (typeof showToast !== 'undefined') showToast(data.enabled ? 'Sidebar ads enabled' : 'Sidebar ads disabled', 'success');
            }
        } catch (err) {
            console.error(err);
            if (typeof showToast !== 'undefined') showToast('Error toggling sidebar ads', 'error');
        }
    }

    // Attach global ads toggle
    document.getElementById('global-ad-toggle')?.addEventListener('click', toggleGlobalSidebarAds);

    // ============================================================
    // EDIT USER MODAL
    // ============================================================
    
    function openEditModal(encodedUser) {
        const u = JSON.parse(decodeURIComponent(encodedUser));
        document.getElementById('editUserId').value = u._id;
        document.getElementById('editUserName').value = u.name;
        document.getElementById('editUserEmail').value = u.email;
        document.getElementById('editUserPhone').value = u.phone || '';
        document.getElementById('editUserModal').classList.remove('hidden');
        document.getElementById('editUserModal').classList.add('flex');
    }

    function closeEditModal() {
        document.getElementById('editUserModal').classList.add('hidden');
        document.getElementById('editUserModal').classList.remove('flex');
    }

    document.getElementById('closeEditModalBtn')?.addEventListener('click', closeEditModal);

    // Make functions globally available for inline onclick
    window.openEditModal = openEditModal;
    window.closeEditModal = closeEditModal;
    window.toggleGlobalSidebarAds = toggleGlobalSidebarAds;
    window.updateTier = updateTier;
    window.toggleUser = toggleUser;
    window.deleteUser = deleteUser;
    window.resetTrafficStats = resetTrafficStats;
    window.approvePayment = approvePayment;
    window.rejectPayment = rejectPayment;
    window.updateSettings = updateSettings;
    window.switchTab = switchTab;

    // ============================================================
    // TRAFFIC STATS RESET
    // ============================================================
    
    async function resetTrafficStats(id) {
        if (!confirm('Are you sure you want to reset all Traffic Pro stats for this user?')) return;
        try {
            const res = await fetch(`/admin/user/${id}/reset-traffic-pro`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                if (typeof showToast !== 'undefined') showToast('Traffic stats reset to zero', 'success');
                else alert('Stats reset successfully');
                location.reload();
            }
        } catch (err) {
            console.error(err);
        }
    }

    // ============================================================
    // EDIT USER FORM SUBMISSION
    // ============================================================
    
    document.getElementById('editUserForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editUserId').value;
        const body = {
            name: document.getElementById('editUserName').value,
            email: document.getElementById('editUserEmail').value,
            phone: document.getElementById('editUserPhone').value
        };
        try {
            const res = await fetch(`/admin/users/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.success) {
                if (typeof showToast !== 'undefined') showToast('User node updated successfully', 'success');
                location.reload();
            } else {
                if (typeof showToast !== 'undefined') showToast(data.error || 'Update failed', 'error');
            }
        } catch (err) {
            console.error(err);
        }
    });

    // ============================================================
    // USER SEARCH / FILTER
    // ============================================================
    
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('.user-row').forEach(row => {
                row.style.display = row.innerText.toLowerCase().includes(query) ? '' : 'none';
            });
        });
    }

});
