/**
 * LoanDr. Theme Manager
 * Simple, reliable dark/light mode handling across all pages
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'loanDrTheme';

    // Get saved theme or default to light
    function getTheme() {
        return localStorage.getItem(STORAGE_KEY) || 'light';
    }

    // Save theme
    function saveTheme(theme) {
        localStorage.setItem(STORAGE_KEY, theme);
    }

    // Apply theme to page
    function applyTheme(theme) {
        // Set on html element
        document.documentElement.setAttribute('data-theme', theme);

        // Also set class on body for compatibility
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        // Update all toggle checkboxes
        document.querySelectorAll('#darkModeToggle').forEach(toggle => {
            toggle.checked = (theme === 'dark');
        });

        // Update meta theme color
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.content = theme === 'dark' ? '#1a1a2e' : '#1e3a5f';
        }
    }

    // Toggle theme
    function toggleTheme() {
        const current = getTheme();
        const newTheme = current === 'dark' ? 'light' : 'dark';
        saveTheme(newTheme);
        applyTheme(newTheme);
        return newTheme;
    }

    // Set specific theme
    function setTheme(theme) {
        if (theme === 'dark' || theme === 'light') {
            saveTheme(theme);
            applyTheme(theme);
        }
    }

    // Setup toggle listener
    function setupToggle() {
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) {
            // Remove old listeners by cloning
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);

            // Add fresh listener
            newToggle.addEventListener('change', function() {
                if (this.checked) {
                    setTheme('dark');
                } else {
                    setTheme('light');
                }
            });

            // Sync checkbox with current theme
            newToggle.checked = (getTheme() === 'dark');
        }
    }

    // Initialize
    function init() {
        // Apply saved theme immediately
        const theme = getTheme();

        // Apply to html right away (before body exists)
        document.documentElement.setAttribute('data-theme', theme);

        // When DOM is ready, finish setup
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                applyTheme(theme);
                setupToggle();
            });
        } else {
            applyTheme(theme);
            setupToggle();
        }

        // Re-setup toggle after delay (for dynamically loaded content)
        setTimeout(setupToggle, 1000);
    }

    // Expose global API
    window.ThemeManager = {
        getTheme: getTheme,
        setTheme: setTheme,
        toggleTheme: toggleTheme,
        applyTheme: applyTheme,
        setupToggle: setupToggle,
        init: init
    };

    // Auto-initialize
    init();

})();
