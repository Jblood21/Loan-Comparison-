/**
 * LoanDr. PWA Manager
 * Handles service worker registration, install prompts, and app updates
 */

const PWAManager = (function() {
    'use strict';

    let deferredPrompt = null;
    let swRegistration = null;

    /**
     * Initialize PWA features
     */
    function init() {
        // Register service worker
        registerServiceWorker();

        // Handle install prompt
        setupInstallPrompt();

        // Handle online/offline status
        setupNetworkStatus();

        // Handle app updates
        setupUpdateHandler();
    }

    /**
     * Register Service Worker
     */
    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.log('[PWA] Service workers not supported');
            return;
        }

        try {
            swRegistration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });

            console.log('[PWA] Service Worker registered:', swRegistration.scope);

            // Check for updates periodically
            setInterval(() => {
                swRegistration.update();
            }, 60 * 60 * 1000); // Every hour

        } catch (error) {
            console.error('[PWA] Service Worker registration failed:', error);
        }
    }

    /**
     * Setup install prompt
     */
    function setupInstallPrompt() {
        // Capture the install prompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('[PWA] Install prompt available');
            e.preventDefault();
            deferredPrompt = e;

            // Show custom install prompt after delay
            setTimeout(() => {
                showInstallPrompt();
            }, 30000); // Show after 30 seconds
        });

        // Handle successful install
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App installed');
            deferredPrompt = null;
            hideInstallPrompt();
            showToast('LoanDr. installed successfully!');
        });
    }

    /**
     * Show install prompt UI
     */
    function showInstallPrompt() {
        if (!deferredPrompt) return;

        // Check if already dismissed
        if (localStorage.getItem('installPromptDismissed')) {
            return;
        }

        // Create prompt if doesn't exist
        let prompt = document.getElementById('installPrompt');
        if (!prompt) {
            prompt = document.createElement('div');
            prompt.id = 'installPrompt';
            prompt.className = 'install-prompt';
            prompt.innerHTML = `
                <div class="install-prompt-header">
                    <img src="icons/icon.svg" alt="LoanDr." class="install-prompt-icon">
                    <div>
                        <div class="install-prompt-title">Install LoanDr.</div>
                        <div class="install-prompt-desc">Add to home screen for the best experience</div>
                    </div>
                </div>
                <div class="install-prompt-actions">
                    <button class="install-prompt-btn secondary" id="installLater">Later</button>
                    <button class="install-prompt-btn primary" id="installNow">Install</button>
                </div>
            `;
            document.body.appendChild(prompt);

            // Bind events
            document.getElementById('installNow').addEventListener('click', triggerInstall);
            document.getElementById('installLater').addEventListener('click', dismissInstallPrompt);
        }

        prompt.classList.add('show');
    }

    /**
     * Hide install prompt
     */
    function hideInstallPrompt() {
        const prompt = document.getElementById('installPrompt');
        if (prompt) {
            prompt.classList.remove('show');
        }
    }

    /**
     * Dismiss install prompt
     */
    function dismissInstallPrompt() {
        hideInstallPrompt();
        localStorage.setItem('installPromptDismissed', Date.now().toString());
    }

    /**
     * Trigger the install flow
     */
    async function triggerInstall() {
        if (!deferredPrompt) {
            console.log('[PWA] No install prompt available');
            return;
        }

        hideInstallPrompt();

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for user response
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] Install prompt outcome:', outcome);

        deferredPrompt = null;
    }

    /**
     * Setup network status monitoring
     */
    function setupNetworkStatus() {
        // Create offline indicator
        const offlineIndicator = document.createElement('div');
        offlineIndicator.className = 'offline-indicator';
        offlineIndicator.textContent = 'You are currently offline';
        document.body.appendChild(offlineIndicator);

        // Update status
        const updateStatus = () => {
            if (navigator.onLine) {
                offlineIndicator.classList.remove('show');
            } else {
                offlineIndicator.classList.add('show');
            }
        };

        window.addEventListener('online', () => {
            updateStatus();
            showToast('Back online');
        });

        window.addEventListener('offline', () => {
            updateStatus();
            showToast('You are offline');
        });

        // Initial check
        updateStatus();
    }

    /**
     * Setup update handler
     */
    function setupUpdateHandler() {
        if (!('serviceWorker' in navigator)) return;

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            showUpdateBanner();
        });
    }

    /**
     * Show update available banner
     */
    function showUpdateBanner() {
        let banner = document.getElementById('updateBanner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'updateBanner';
            banner.className = 'update-banner';
            banner.innerHTML = `
                <span>A new version is available</span>
                <button id="updateNow">Update Now</button>
            `;
            document.body.appendChild(banner);

            document.getElementById('updateNow').addEventListener('click', () => {
                window.location.reload();
            });
        }

        banner.classList.add('show');
    }

    /**
     * Show toast notification
     */
    function showToast(message, duration = 3000) {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Create new toast
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 10);

        // Hide and remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Check if app is installed
     */
    function isInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }

    /**
     * Clear app cache
     */
    async function clearCache() {
        if (swRegistration) {
            swRegistration.active.postMessage({ type: 'CLEAR_CACHE' });
        }

        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));

        showToast('Cache cleared');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        init,
        showInstallPrompt,
        triggerInstall,
        isInstalled,
        clearCache,
        showToast
    };
})();

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.PWAManager = PWAManager;
}
