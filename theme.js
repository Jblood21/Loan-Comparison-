/**
 * LoanDr. Unified Theme System
 * This module handles dark/light mode consistently across ALL pages
 * Storage Key: 'loanDrTheme' (standardized)
 */

const ThemeManager = (function() {
    'use strict';

    // Single source of truth for theme storage
    const STORAGE_KEY = 'loanDrTheme';
    const THEME_DARK = 'dark';
    const THEME_LIGHT = 'light';

    // Theme change event for components that need to react
    const THEME_CHANGE_EVENT = 'loandr-theme-change';

    /**
     * Get current theme from storage or system preference
     */
    function getCurrentTheme() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === THEME_DARK || stored === THEME_LIGHT) {
            return stored;
        }
        // Fall back to system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return THEME_DARK;
        }
        return THEME_LIGHT;
    }

    /**
     * Apply theme to document
     */
    function applyTheme(theme) {
        const isDark = theme === THEME_DARK;

        // Apply to document
        document.documentElement.setAttribute('data-theme', theme);
        document.body.classList.toggle('dark-mode', isDark);

        // Update all toggle checkboxes on the page
        const toggles = document.querySelectorAll('#darkModeToggle, .dark-mode-toggle, [data-theme-toggle]');
        toggles.forEach(toggle => {
            if (toggle.type === 'checkbox') {
                toggle.checked = isDark;
            }
        });

        // Dispatch custom event for components that need to react (e.g., charts)
        window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
            detail: { theme, isDark }
        }));

        // Store preference
        localStorage.setItem(STORAGE_KEY, theme);

        // Update meta theme-color for mobile browsers
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.setAttribute('content', isDark ? '#1a1a2e' : '#ffffff');
        }
    }

    /**
     * Toggle between dark and light themes
     */
    function toggleTheme() {
        const current = getCurrentTheme();
        const newTheme = current === THEME_DARK ? THEME_LIGHT : THEME_DARK;
        applyTheme(newTheme);
        return newTheme;
    }

    /**
     * Set specific theme
     */
    function setTheme(theme) {
        if (theme === THEME_DARK || theme === THEME_LIGHT) {
            applyTheme(theme);
        }
    }

    /**
     * Check if current theme is dark
     */
    function isDarkMode() {
        return getCurrentTheme() === THEME_DARK;
    }

    /**
     * Bind toggle listeners - can be called multiple times safely
     */
    function bindToggleListeners() {
        const toggles = document.querySelectorAll('#darkModeToggle, .dark-mode-toggle, [data-theme-toggle]');
        toggles.forEach(toggle => {
            // Mark as bound to prevent duplicate listeners
            if (!toggle.hasAttribute('data-theme-bound')) {
                toggle.setAttribute('data-theme-bound', 'true');
                toggle.addEventListener('change', handleToggleChange);

                // Also listen for click on the parent label for better reliability
                const label = toggle.closest('label');
                if (label && !label.hasAttribute('data-theme-bound')) {
                    label.setAttribute('data-theme-bound', 'true');
                    label.addEventListener('click', (e) => {
                        // Small delay to let the checkbox state update
                        setTimeout(() => {
                            const isDark = toggle.checked;
                            setTheme(isDark ? THEME_DARK : THEME_LIGHT);
                        }, 10);
                    });
                }
            }
            // Sync checkbox state with current theme
            toggle.checked = getCurrentTheme() === THEME_DARK;
        });
    }

    /**
     * Initialize theme system - call this on every page load
     */
    function init() {
        // Apply saved theme immediately (before DOM fully loaded to prevent flash)
        const theme = getCurrentTheme();

        // Apply theme as soon as possible
        if (document.documentElement) {
            document.documentElement.setAttribute('data-theme', theme);
        }

        // Setup when DOM is ready
        const setupTheme = () => {
            applyTheme(theme);

            // Bind all theme toggles on the page
            bindToggleListeners();

            // Listen for system theme changes
            if (window.matchMedia) {
                const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                mediaQuery.removeEventListener('change', handleSystemThemeChange);
                mediaQuery.addEventListener('change', handleSystemThemeChange);
            }

            // Listen for storage changes (sync across tabs)
            window.removeEventListener('storage', handleStorageChange);
            window.addEventListener('storage', handleStorageChange);
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupTheme);
        } else {
            setupTheme();
        }

        // Also re-bind after a short delay to catch dynamically loaded elements
        setTimeout(bindToggleListeners, 500);
        setTimeout(bindToggleListeners, 1500);
    }

    /**
     * Handle toggle checkbox change
     */
    function handleToggleChange(e) {
        const isDark = e.target.checked;
        setTheme(isDark ? THEME_DARK : THEME_LIGHT);
    }

    /**
     * Handle system theme preference change
     */
    function handleSystemThemeChange(e) {
        // Only apply system preference if user hasn't set a preference
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            applyTheme(e.matches ? THEME_DARK : THEME_LIGHT);
        }
    }

    /**
     * Handle storage changes (for cross-tab sync)
     */
    function handleStorageChange(e) {
        if (e.key === STORAGE_KEY && e.newValue) {
            applyTheme(e.newValue);
        }
    }

    /**
     * Migrate from old storage keys (cleanup legacy)
     */
    function migrateOldSettings() {
        const oldKeys = ['loanComparisonDarkMode', 'darkMode', 'theme', 'dark-mode'];
        let migratedValue = null;

        oldKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value !== null && migratedValue === null) {
                // Convert various formats to standard
                if (value === 'true' || value === '1' || value === 'dark') {
                    migratedValue = THEME_DARK;
                } else if (value === 'false' || value === '0' || value === 'light') {
                    migratedValue = THEME_LIGHT;
                }
            }
            // Remove old key
            localStorage.removeItem(key);
        });

        // If we found an old setting, migrate it
        if (migratedValue && !localStorage.getItem(STORAGE_KEY)) {
            localStorage.setItem(STORAGE_KEY, migratedValue);
        }
    }

    // Run migration on load
    migrateOldSettings();

    // Public API
    return {
        init,
        getCurrentTheme,
        setTheme,
        toggleTheme,
        isDarkMode,
        bindToggleListeners,
        THEME_DARK,
        THEME_LIGHT,
        THEME_CHANGE_EVENT
    };
})();

// Auto-initialize when script loads
ThemeManager.init();

// Also export for ES modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}
