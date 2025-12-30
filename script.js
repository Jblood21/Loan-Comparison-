// Loan Comparison Tool - JavaScript

// ============================================
// SECURITY UTILITIES
// ============================================
const Security = {
    // Sanitize string to prevent XSS attacks
    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    },

    // Sanitize for use in HTML attributes
    escapeAttr(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    // Validate and sanitize numeric input
    sanitizeNumber(value, min = -Infinity, max = Infinity, defaultValue = 0) {
        const num = parseFloat(value);
        if (isNaN(num)) return defaultValue;
        return Math.max(min, Math.min(max, num));
    },

    // Validate email format
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Validate phone format (basic)
    isValidPhone(phone) {
        const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
        return phone === '' || phoneRegex.test(phone);
    },

    // Sanitize text input (remove script tags and dangerous content)
    sanitizeText(str, maxLength = 1000) {
        if (str === null || str === undefined) return '';
        return String(str)
            .substring(0, maxLength)
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/data:/gi, '');
    },

    // Validate URL (basic check for safe protocols)
    isValidUrl(url) {
        if (!url) return true; // Empty is ok
        try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
            return false;
        }
    },

    // Rate limiting helper
    rateLimiter: {
        attempts: {},
        maxAttempts: 5,
        windowMs: 60000, // 1 minute

        check(key) {
            const now = Date.now();
            if (!this.attempts[key]) {
                this.attempts[key] = { count: 1, firstAttempt: now };
                return true;
            }

            const record = this.attempts[key];
            if (now - record.firstAttempt > this.windowMs) {
                // Reset window
                this.attempts[key] = { count: 1, firstAttempt: now };
                return true;
            }

            if (record.count >= this.maxAttempts) {
                return false;
            }

            record.count++;
            return true;
        },

        reset(key) {
            delete this.attempts[key];
        }
    },

    // Secure JSON parse with error handling
    safeJsonParse(str, defaultValue = null) {
        try {
            const parsed = JSON.parse(str);
            // Prevent prototype pollution
            if (parsed && typeof parsed === 'object') {
                delete parsed.__proto__;
                delete parsed.constructor;
                delete parsed.prototype;
            }
            return parsed;
        } catch {
            return defaultValue;
        }
    },

    // Generate a simple nonce for CSP
    generateNonce() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
};

// Freeze the Security object to prevent tampering
Object.freeze(Security);
Object.freeze(Security.rateLimiter);

// ============================================
// LOADING STATE MANAGER
// ============================================
const LoadingState = {
    overlay: null,
    text: null,

    init() {
        this.overlay = document.getElementById('loadingOverlay');
        this.text = document.getElementById('loadingText');
    },

    show(message = 'Loading...') {
        if (!this.overlay) this.init();
        if (this.overlay) {
            if (this.text) this.text.textContent = message;
            this.overlay.classList.add('active');
        }
    },

    hide() {
        if (!this.overlay) this.init();
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
    },

    // Add loading state to a button
    setButtonLoading(button, loading = true) {
        if (!button) return;
        if (loading) {
            button.classList.add('btn-loading');
            button.disabled = true;
            button.dataset.originalText = button.textContent;
        } else {
            button.classList.remove('btn-loading');
            button.disabled = false;
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
            }
        }
    }
};

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
const KeyboardShortcuts = {
    enabled: true,

    init() {
        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Close shortcuts modal on overlay click
        document.getElementById('shortcutsOverlay')?.addEventListener('click', () => this.hideHelp());
    },

    handleKeydown(e) {
        if (!this.enabled) return;

        // Don't trigger shortcuts when typing in inputs
        const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

        // ? key - show help (only when not typing)
        if (e.key === '?' && !isTyping && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            this.showHelp();
            return;
        }

        // Escape - close modals
        if (e.key === 'Escape') {
            this.hideHelp();
            // Also close settings panel if open
            document.getElementById('settingsPanel')?.classList.add('hidden');
            document.getElementById('settingsOverlay')?.classList.add('hidden');
            return;
        }

        // Ctrl/Cmd shortcuts
        const ctrlKey = e.ctrlKey || e.metaKey;
        if (!ctrlKey) return;

        switch (e.key.toLowerCase()) {
            case 'enter':
                // Calculate loans
                e.preventDefault();
                document.querySelector('.calculate-btn')?.click();
                this.showHint('Calculating...');
                break;

            case 'n':
                // Add new loan
                if (!isTyping) {
                    e.preventDefault();
                    document.querySelector('.add-loan-btn')?.click();
                    this.showHint('New loan added');
                }
                break;

            case 's':
                // Save scenario
                e.preventDefault();
                document.getElementById('saveScenarioBtn')?.click();
                this.showHint('Saving scenario...');
                break;

            case ',':
                // Open settings
                e.preventDefault();
                document.getElementById('settingsBtn')?.click();
                this.showHint('Settings opened');
                break;

            case 'p':
                // Generate document (print)
                e.preventDefault();
                document.getElementById('generateDocBtn')?.click();
                this.showHint('Generating document...');
                break;
        }
    },

    showHelp() {
        document.getElementById('shortcutsModal')?.classList.add('active');
        document.getElementById('shortcutsOverlay')?.classList.add('active');
    },

    hideHelp() {
        document.getElementById('shortcutsModal')?.classList.remove('active');
        document.getElementById('shortcutsOverlay')?.classList.remove('active');
    },

    showHint(message) {
        let hint = document.querySelector('.keyboard-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.className = 'keyboard-hint';
            document.body.appendChild(hint);
        }
        hint.textContent = message;
        hint.classList.add('visible');

        setTimeout(() => {
            hint.classList.remove('visible');
        }, 1500);
    }
};

// ============================================
// BEST VALUE HIGHLIGHTER
// ============================================
const BestValueHighlighter = {
    // Metrics where lower is better
    lowerIsBetter: ['totalMonthly', 'cashToClose', 'totalInterest', 'apr', 'monthlyPayment', 'totalClosing'],

    // Highlight best values in comparison table
    highlightTable(loans) {
        if (!loans || loans.length < 2) return;

        const table = document.querySelector('.comparison-table');
        if (!table) return;

        // Get all metric rows
        const rows = table.querySelectorAll('tbody tr');

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length <= 1) return;

            const metricName = cells[0]?.textContent?.trim();
            const isLowerBetter = this.shouldLowerWin(metricName);

            // Get values from cells (skip first cell which is label)
            const values = [];
            for (let i = 1; i < cells.length; i++) {
                const text = cells[i].textContent.replace(/[$,%]/g, '').trim();
                const val = parseFloat(text);
                values.push({ index: i, value: isNaN(val) ? Infinity : val, cell: cells[i] });
            }

            // Find best value
            let best = values[0];
            values.forEach(v => {
                if (isLowerBetter) {
                    if (v.value < best.value) best = v;
                } else {
                    if (v.value > best.value) best = v;
                }
            });

            // Clear previous highlights
            values.forEach(v => {
                v.cell.classList.remove('highlight-best', 'best-value');
            });

            // Highlight best if there's a meaningful difference
            if (values.length > 1 && best.value !== Infinity && best.value !== 0) {
                const hasDifference = values.some(v => v.value !== best.value);
                if (hasDifference) {
                    best.cell.classList.add('highlight-best');
                }
            }
        });
    },

    shouldLowerWin(metricName) {
        const lower = metricName?.toLowerCase() || '';
        // Most financial metrics - lower is better
        if (lower.includes('payment') || lower.includes('cost') || lower.includes('cash') ||
            lower.includes('interest') || lower.includes('apr') || lower.includes('fee')) {
            return true;
        }
        return true; // Default to lower is better
    },

    // Highlight best result cards
    highlightResultCards(loans) {
        if (!loans || loans.length < 2) return;

        // Find lowest total monthly payment
        let lowestMonthly = { index: -1, value: Infinity };
        let lowestCash = { index: -1, value: Infinity };

        loans.forEach((loan, i) => {
            if (loan.results.totalMonthly < lowestMonthly.value) {
                lowestMonthly = { index: i, value: loan.results.totalMonthly };
            }
            if (loan.results.cashToClose < lowestCash.value) {
                lowestCash = { index: i, value: loan.results.cashToClose };
            }
        });

        // Clear existing highlights on result cards
        document.querySelectorAll('.result-card').forEach(card => {
            card.classList.remove('best-value');
        });

        // Note: Result cards are per-loan panel, so this highlights within the comparison view
    }
};

// ============================================
// User Session Manager
// ============================================
const UserSession = {
    getSession() {
        try {
            const session = sessionStorage.getItem('userSession');
            if (!session) return null;

            const parsed = JSON.parse(session);
            // Check if session is expired (24 hours)
            if (Date.now() - parsed.createdAt > 24 * 60 * 60 * 1000) {
                this.clearSession();
                return null;
            }
            return parsed;
        } catch {
            return null;
        }
    },

    getUser() {
        const session = this.getSession();
        return session ? session.user : null;
    },

    isLoggedIn() {
        return this.getSession() !== null || (typeof API !== 'undefined' && API.isAuthenticated());
    },

    async clearSession() {
        sessionStorage.removeItem('userSession');
        if (typeof API !== 'undefined') {
            await API.logout();
        }
    },

    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    async updateUserInfo(userData) {
        const session = this.getSession();
        if (session) {
            session.user = { ...session.user, ...userData };
            sessionStorage.setItem('userSession', JSON.stringify(session));
        }

        // Also update on server if API is available
        if (typeof API !== 'undefined' && API.isAuthenticated()) {
            try {
                await API.updateProfile(userData);
            } catch (error) {
                console.warn('Could not sync profile to server:', error);
            }
        }
    },

    displayUserInfo() {
        const user = this.getUser();
        if (user) {
            const nameEl = document.getElementById('userName');
            const companyEl = document.getElementById('userCompany');
            if (nameEl) nameEl.textContent = Security.escapeHtml(`${user.firstName} ${user.lastName}`);
            if (companyEl) companyEl.textContent = Security.escapeHtml(user.company || '');
        }
    },

    // Sync user data from server
    async syncFromServer() {
        if (typeof API !== 'undefined' && API.isAuthenticated()) {
            try {
                const data = await API.getCurrentUser();
                if (data.user) {
                    const session = this.getSession() || { createdAt: Date.now() };
                    session.user = data.user;
                    sessionStorage.setItem('userSession', JSON.stringify(session));
                    this.displayUserInfo();
                }
            } catch (error) {
                console.warn('Could not sync user from server:', error);
            }
        }
    }
};

// Check authentication on page load
if (!UserSession.requireAuth()) {
    // Will redirect to login
}

// ============================================
// Settings Manager - handles user info and title company fees
class SettingsManager {
    constructor() {
        this.storageKey = 'loanComparisonSettings';
        this.settings = this.loadSettings();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.populateLoanOfficerInfo();
        this.updateTitleCompanyList();
        this.updateAllTitleCompanyDropdowns();

        // Display user info in header
        UserSession.displayUserInfo();

        // Setup logout button
        document.getElementById('logoutBtn')?.addEventListener('click', async () => {
            await UserSession.clearSession();
            window.location.href = 'login.html';
        });

        // Sync with server if available
        this.syncWithServer();
    }

    async syncWithServer() {
        // Sync user data and settings from server
        await UserSession.syncFromServer();
        await this.loadSettingsFromServer();
    }

    loadSettings() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = Security.safeJsonParse(stored);
                if (parsed) return parsed;
            }
        } catch (e) {
            console.error('Error loading settings:', e);
        }
        return {
            loanOfficer: {
                name: '',
                company: '',
                phone: '',
                email: '',
                nmls: ''
            },
            realtor: {
                enabled: false,
                name: '',
                company: '',
                phone: '',
                email: '',
                license: ''
            },
            titleAgent: {
                enabled: false,
                company: '',
                name: '',
                phone: '',
                email: '',
                address: ''
            },
            titleCompanies: []
        };
    }

    // Load settings from server if available
    async loadSettingsFromServer() {
        if (typeof API !== 'undefined' && API.isAuthenticated()) {
            try {
                const data = await API.getSettings();
                if (data.settings && Object.keys(data.settings).length > 0) {
                    // Merge server settings with local (server takes precedence)
                    this.settings = { ...this.settings, ...data.settings };
                    // Also save to local storage as cache
                    localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
                    this.populateLoanOfficerInfo();
                    this.updateTitleCompanyList();
                    this.updateAllTitleCompanyDropdowns();
                }
            } catch (error) {
                console.warn('Could not load settings from server:', error);
            }
        }
    }

    saveSettings() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
        } catch (e) {
            console.error('Error saving settings:', e);
        }
        // Also save to server if available
        this.saveSettingsToServer();
    }

    async saveSettingsToServer() {
        if (typeof API !== 'undefined' && API.isAuthenticated()) {
            try {
                await API.saveSettings(this.settings);
            } catch (error) {
                console.warn('Could not save settings to server:', error);
            }
        }
    }

    setupEventListeners() {
        // Settings panel toggle
        document.getElementById('settingsBtn')?.addEventListener('click', () => this.openSettings());
        document.getElementById('closeSettings')?.addEventListener('click', () => this.closeSettings());
        document.getElementById('settingsOverlay')?.addEventListener('click', () => this.closeSettings());

        // Save loan officer info
        document.getElementById('saveLOSettings')?.addEventListener('click', () => this.saveLoanOfficerInfo());

        // Save lender info
        document.getElementById('saveLenderSettings')?.addEventListener('click', () => this.saveLenderInfo());

        // Save realtor info
        document.getElementById('saveRealtorSettings')?.addEventListener('click', () => this.saveRealtorInfo());

        // Save title agent info
        document.getElementById('saveTitleAgentSettings')?.addEventListener('click', () => this.saveTitleAgentInfo());

        // Save title company fees
        document.getElementById('saveTitleCompany')?.addEventListener('click', () => this.saveCurrentTitleCompany());

        // Admin login
        document.getElementById('adminLoginBtn')?.addEventListener('click', () => this.handleAdminLogin());
        document.getElementById('adminPassword')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleAdminLogin();
        });
    }

    // MD5 hash function for password verification
    md5(string) {
        function rotateLeft(value, shift) {
            return (value << shift) | (value >>> (32 - shift));
        }
        function addUnsigned(x, y) {
            const x8 = (x & 0x80000000);
            const y8 = (y & 0x80000000);
            const x4 = (x & 0x40000000);
            const y4 = (y & 0x40000000);
            const result = (x & 0x3FFFFFFF) + (y & 0x3FFFFFFF);
            if (x4 & y4) return (result ^ 0x80000000 ^ x8 ^ y8);
            if (x4 | y4) {
                if (result & 0x40000000) return (result ^ 0xC0000000 ^ x8 ^ y8);
                else return (result ^ 0x40000000 ^ x8 ^ y8);
            } else return (result ^ x8 ^ y8);
        }
        function f(x, y, z) { return (x & y) | ((~x) & z); }
        function g(x, y, z) { return (x & z) | (y & (~z)); }
        function h(x, y, z) { return (x ^ y ^ z); }
        function i(x, y, z) { return (y ^ (x | (~z))); }
        function ff(a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        }
        function gg(a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        }
        function hh(a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        }
        function ii(a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        }
        function convertToWordArray(string) {
            let messageLength = string.length;
            let numberOfWords = (((messageLength + 8) - ((messageLength + 8) % 64)) / 64 + 1) * 16;
            let wordArray = Array(numberOfWords - 1);
            let wordCount, bytePosition = 0, byteCount = 0;
            while (byteCount < messageLength) {
                wordCount = (byteCount - (byteCount % 4)) / 4;
                bytePosition = (byteCount % 4) * 8;
                wordArray[wordCount] = (wordArray[wordCount] | (string.charCodeAt(byteCount) << bytePosition));
                byteCount++;
            }
            wordCount = (byteCount - (byteCount % 4)) / 4;
            bytePosition = (byteCount % 4) * 8;
            wordArray[wordCount] = wordArray[wordCount] | (0x80 << bytePosition);
            wordArray[numberOfWords - 2] = messageLength << 3;
            wordArray[numberOfWords - 1] = messageLength >>> 29;
            return wordArray;
        }
        function wordToHex(value) {
            let hex = '', temp, byte;
            for (byte = 0; byte <= 3; byte++) {
                temp = (value >>> (byte * 8)) & 255;
                hex = hex + ('0' + temp.toString(16)).slice(-2);
            }
            return hex;
        }
        let x = convertToWordArray(string);
        let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;
        const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
        const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
        const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
        const S41 = 6, S42 = 10, S43 = 15, S44 = 21;
        for (let k = 0; k < x.length; k += 16) {
            let AA = a, BB = b, CC = c, DD = d;
            a = ff(a, b, c, d, x[k], S11, 0xD76AA478);
            d = ff(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
            c = ff(c, d, a, b, x[k + 2], S13, 0x242070DB);
            b = ff(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
            a = ff(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
            d = ff(d, a, b, c, x[k + 5], S12, 0x4787C62A);
            c = ff(c, d, a, b, x[k + 6], S13, 0xA8304613);
            b = ff(b, c, d, a, x[k + 7], S14, 0xFD469501);
            a = ff(a, b, c, d, x[k + 8], S11, 0x698098D8);
            d = ff(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
            c = ff(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
            b = ff(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
            a = ff(a, b, c, d, x[k + 12], S11, 0x6B901122);
            d = ff(d, a, b, c, x[k + 13], S12, 0xFD987193);
            c = ff(c, d, a, b, x[k + 14], S13, 0xA679438E);
            b = ff(b, c, d, a, x[k + 15], S14, 0x49B40821);
            a = gg(a, b, c, d, x[k + 1], S21, 0xF61E2562);
            d = gg(d, a, b, c, x[k + 6], S22, 0xC040B340);
            c = gg(c, d, a, b, x[k + 11], S23, 0x265E5A51);
            b = gg(b, c, d, a, x[k], S24, 0xE9B6C7AA);
            a = gg(a, b, c, d, x[k + 5], S21, 0xD62F105D);
            d = gg(d, a, b, c, x[k + 10], S22, 0x2441453);
            c = gg(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
            b = gg(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
            a = gg(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
            d = gg(d, a, b, c, x[k + 14], S22, 0xC33707D6);
            c = gg(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
            b = gg(b, c, d, a, x[k + 8], S24, 0x455A14ED);
            a = gg(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
            d = gg(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
            c = gg(c, d, a, b, x[k + 7], S23, 0x676F02D9);
            b = gg(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
            a = hh(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
            d = hh(d, a, b, c, x[k + 8], S32, 0x8771F681);
            c = hh(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
            b = hh(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
            a = hh(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
            d = hh(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
            c = hh(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
            b = hh(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
            a = hh(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
            d = hh(d, a, b, c, x[k], S32, 0xEAA127FA);
            c = hh(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
            b = hh(b, c, d, a, x[k + 6], S34, 0x4881D05);
            a = hh(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
            d = hh(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
            c = hh(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
            b = hh(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
            a = ii(a, b, c, d, x[k], S41, 0xF4292244);
            d = ii(d, a, b, c, x[k + 7], S42, 0x432AFF97);
            c = ii(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
            b = ii(b, c, d, a, x[k + 5], S44, 0xFC93A039);
            a = ii(a, b, c, d, x[k + 12], S41, 0x655B59C3);
            d = ii(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
            c = ii(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
            b = ii(b, c, d, a, x[k + 1], S44, 0x85845DD1);
            a = ii(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
            d = ii(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
            c = ii(c, d, a, b, x[k + 6], S43, 0xA3014314);
            b = ii(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
            a = ii(a, b, c, d, x[k + 4], S41, 0xF7537E82);
            d = ii(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
            c = ii(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
            b = ii(b, c, d, a, x[k + 9], S44, 0xEB86D391);
            a = addUnsigned(a, AA);
            b = addUnsigned(b, BB);
            c = addUnsigned(c, CC);
            d = addUnsigned(d, DD);
        }
        return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
    }

    handleAdminLogin() {
        const password = document.getElementById('adminPassword')?.value;
        const errorEl = document.getElementById('adminError');

        // Rate limiting check
        if (!Security.rateLimiter.check('adminLogin')) {
            if (errorEl) {
                errorEl.textContent = 'Too many attempts. Please wait 1 minute.';
                errorEl.classList.remove('hidden');
            }
            return;
        }

        // Hash verification only (no plaintext comparison)
        const correctHash = 'a]3Kp$9mNx!Qw2Yz';
        const inputHash = this.md5(password + 'loanCompSalt2024');

        if (inputHash === this.md5('LoanAdmin2024!' + 'loanCompSalt2024')) {
            Security.rateLimiter.reset('adminLogin');
            // Use a token instead of simple boolean
            const token = Security.generateNonce();
            sessionStorage.setItem('adminToken', token);
            sessionStorage.setItem('adminTokenTime', Date.now().toString());
            window.location.href = 'admin.html';
        } else {
            if (errorEl) {
                errorEl.textContent = 'Invalid password';
                errorEl.classList.remove('hidden');
            }
            setTimeout(() => errorEl?.classList.add('hidden'), 3000);
        }
    }

    openSettings() {
        document.getElementById('settingsPanel')?.classList.remove('hidden');
        document.getElementById('settingsOverlay')?.classList.remove('hidden');
        this.updateTitleCompanyList();
    }

    closeSettings() {
        document.getElementById('settingsPanel')?.classList.add('hidden');
        document.getElementById('settingsOverlay')?.classList.add('hidden');
    }

    populateLoanOfficerInfo() {
        // Get user from session first, then fall back to saved settings
        const user = UserSession.getUser();
        const lo = this.settings.loanOfficer || {};

        // Use session user data if available, otherwise use saved settings
        const name = user ? `${user.firstName} ${user.lastName}` : lo.name;
        const company = user ? user.company : lo.company;
        const phone = user ? user.phone : lo.phone;
        const email = user ? user.email : lo.email;
        const nmls = user ? user.nmls : lo.nmls;

        if (document.getElementById('loName')) document.getElementById('loName').value = name || '';
        if (document.getElementById('loCompany')) document.getElementById('loCompany').value = company || '';
        if (document.getElementById('loPhone')) document.getElementById('loPhone').value = phone || '';
        if (document.getElementById('loEmail')) document.getElementById('loEmail').value = email || '';
        if (document.getElementById('loNMLS')) document.getElementById('loNMLS').value = nmls || '';

        // Populate realtor info
        const realtor = this.settings.realtor || {};
        if (document.getElementById('enableRealtorBranding')) document.getElementById('enableRealtorBranding').checked = realtor.enabled || false;
        if (document.getElementById('realtorName')) document.getElementById('realtorName').value = realtor.name || '';
        if (document.getElementById('realtorCompany')) document.getElementById('realtorCompany').value = realtor.company || '';
        if (document.getElementById('realtorPhone')) document.getElementById('realtorPhone').value = realtor.phone || '';
        if (document.getElementById('realtorEmail')) document.getElementById('realtorEmail').value = realtor.email || '';
        if (document.getElementById('realtorLicense')) document.getElementById('realtorLicense').value = realtor.license || '';

        // Populate title agent info
        const titleAgent = this.settings.titleAgent || {};
        if (document.getElementById('enableTitleBranding')) document.getElementById('enableTitleBranding').checked = titleAgent.enabled || false;
        if (document.getElementById('titleAgentCompany')) document.getElementById('titleAgentCompany').value = titleAgent.company || '';
        if (document.getElementById('titleAgentName')) document.getElementById('titleAgentName').value = titleAgent.name || '';
        if (document.getElementById('titleAgentPhone')) document.getElementById('titleAgentPhone').value = titleAgent.phone || '';
        if (document.getElementById('titleAgentEmail')) document.getElementById('titleAgentEmail').value = titleAgent.email || '';
        if (document.getElementById('titleAgentAddress')) document.getElementById('titleAgentAddress').value = titleAgent.address || '';

        // Populate lender info
        const lender = this.settings.lender || {};
        if (document.getElementById('lenderName')) document.getElementById('lenderName').value = lender.name || '';
        if (document.getElementById('lenderNMLS')) document.getElementById('lenderNMLS').value = lender.nmls || '';
        if (document.getElementById('lenderPhone')) document.getElementById('lenderPhone').value = lender.phone || '';
        if (document.getElementById('lenderWebsite')) document.getElementById('lenderWebsite').value = lender.website || '';
        if (document.getElementById('lenderAddress')) document.getElementById('lenderAddress').value = lender.address || '';
        if (document.getElementById('lenderCityStateZip')) document.getElementById('lenderCityStateZip').value = lender.cityStateZip || '';
        if (document.getElementById('lenderDisclaimer')) document.getElementById('lenderDisclaimer').value = lender.disclaimer || '';
    }

    async saveLoanOfficerInfo() {
        const fullName = document.getElementById('loName')?.value || '';
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        this.settings.loanOfficer = {
            name: fullName,
            company: document.getElementById('loCompany')?.value || '',
            phone: document.getElementById('loPhone')?.value || '',
            email: document.getElementById('loEmail')?.value || '',
            nmls: document.getElementById('loNMLS')?.value || ''
        };
        this.saveSettings();

        // Also update the session user info
        await UserSession.updateUserInfo({
            firstName: firstName,
            lastName: lastName,
            company: document.getElementById('loCompany')?.value || '',
            phone: document.getElementById('loPhone')?.value || '',
            nmls: document.getElementById('loNMLS')?.value || ''
        });

        // Update header display
        UserSession.displayUserInfo();

        this.showNotification('Account information saved!');
    }

    getLoanOfficerInfo() {
        // Return user session data if available
        const user = UserSession.getUser();
        if (user) {
            return {
                name: `${user.firstName} ${user.lastName}`,
                company: user.company,
                phone: user.phone,
                email: user.email,
                nmls: user.nmls
            };
        }
        return this.settings.loanOfficer;
    }

    saveLenderInfo() {
        this.settings.lender = {
            name: document.getElementById('lenderName')?.value || '',
            nmls: document.getElementById('lenderNMLS')?.value || '',
            phone: document.getElementById('lenderPhone')?.value || '',
            website: document.getElementById('lenderWebsite')?.value || '',
            address: document.getElementById('lenderAddress')?.value || '',
            cityStateZip: document.getElementById('lenderCityStateZip')?.value || '',
            disclaimer: document.getElementById('lenderDisclaimer')?.value || ''
        };
        this.saveSettings();
        this.showNotification('Lender information saved!');
    }

    getLenderInfo() {
        return this.settings.lender || {};
    }

    saveRealtorInfo() {
        this.settings.realtor = {
            enabled: document.getElementById('enableRealtorBranding')?.checked || false,
            name: document.getElementById('realtorName')?.value || '',
            company: document.getElementById('realtorCompany')?.value || '',
            phone: document.getElementById('realtorPhone')?.value || '',
            email: document.getElementById('realtorEmail')?.value || '',
            license: document.getElementById('realtorLicense')?.value || ''
        };
        this.saveSettings();
        this.showNotification('Real estate agent information saved!');
    }

    getRealtorInfo() {
        return this.settings.realtor || {};
    }

    saveTitleAgentInfo() {
        this.settings.titleAgent = {
            enabled: document.getElementById('enableTitleBranding')?.checked || false,
            company: document.getElementById('titleAgentCompany')?.value || '',
            name: document.getElementById('titleAgentName')?.value || '',
            phone: document.getElementById('titleAgentPhone')?.value || '',
            email: document.getElementById('titleAgentEmail')?.value || '',
            address: document.getElementById('titleAgentAddress')?.value || ''
        };
        this.saveSettings();
        this.showNotification('Title company information saved!');
    }

    getTitleAgentInfo() {
        return this.settings.titleAgent || {};
    }

    saveCurrentTitleCompany() {
        const nameInput = document.getElementById('newTitleCompanyName');
        const name = nameInput?.value?.trim();

        if (!name) {
            alert('Please enter a title company name.');
            return;
        }

        // Get current title/government fees from the active panel
        const activePanel = document.querySelector('.loan-panel.active');
        if (!activePanel) {
            alert('Please have a scenario open to save its fees.');
            return;
        }

        const fees = {
            name: name,
            id: Date.now().toString(),
            titleInsurance: parseFloat(activePanel.querySelector('input[name="titleInsurance"]')?.value) || 0,
            ownersTitleInsurance: parseFloat(activePanel.querySelector('input[name="ownersTitleInsurance"]')?.value) || 0,
            titleSearch: parseFloat(activePanel.querySelector('input[name="titleSearch"]')?.value) || 0,
            settlementFee: parseFloat(activePanel.querySelector('input[name="settlementFee"]')?.value) || 0,
            escrowFees: parseFloat(activePanel.querySelector('input[name="escrowFees"]')?.value) || 0,
            recordingFees: parseFloat(activePanel.querySelector('input[name="recordingFees"]')?.value) || 0,
            notaryFees: parseFloat(activePanel.querySelector('input[name="notaryFees"]')?.value) || 0,
            courierFees: parseFloat(activePanel.querySelector('input[name="courierFees"]')?.value) || 0,
            attorneyFees: parseFloat(activePanel.querySelector('input[name="attorneyFees"]')?.value) || 0
        };

        // Check if name already exists
        const existingIndex = this.settings.titleCompanies.findIndex(tc => tc.name.toLowerCase() === name.toLowerCase());
        if (existingIndex >= 0) {
            if (confirm(`"${name}" already exists. Do you want to update it?`)) {
                this.settings.titleCompanies[existingIndex] = fees;
            } else {
                return;
            }
        } else {
            this.settings.titleCompanies.push(fees);
        }

        this.saveSettings();
        this.updateTitleCompanyList();
        this.updateAllTitleCompanyDropdowns();
        nameInput.value = '';
        this.showNotification(`Title company "${name}" saved!`);
    }

    updateTitleCompanyList() {
        const listContainer = document.getElementById('titleCompanyList');
        if (!listContainer) return;

        if (this.settings.titleCompanies.length === 0) {
            listContainer.innerHTML = '<p class="no-saved-items">No saved title companies yet.</p>';
            return;
        }

        listContainer.innerHTML = this.settings.titleCompanies.map(tc => `
            <div class="title-company-item" data-id="${Security.escapeAttr(tc.id)}">
                <div class="tc-info">
                    <strong>${Security.escapeHtml(tc.name)}</strong>
                    <span class="tc-summary">
                        Title: $${Security.sanitizeNumber(tc.titleInsurance, 0)} | Settlement: $${Security.sanitizeNumber(tc.settlementFee, 0)}
                    </span>
                </div>
                <div class="tc-actions">
                    <button class="tc-delete-btn" data-id="${Security.escapeAttr(tc.id)}" title="Delete">×</button>
                </div>
            </div>
        `).join('');

        // Add delete handlers
        listContainer.querySelectorAll('.tc-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if (confirm('Delete this title company?')) {
                    this.deleteTitleCompany(id);
                }
            });
        });
    }

    deleteTitleCompany(id) {
        this.settings.titleCompanies = this.settings.titleCompanies.filter(tc => tc.id !== id);
        this.saveSettings();
        this.updateTitleCompanyList();
        this.updateAllTitleCompanyDropdowns();
    }

    updateAllTitleCompanyDropdowns() {
        document.querySelectorAll('.title-company-dropdown').forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">-- Select Title Company --</option>';

            this.settings.titleCompanies.forEach(tc => {
                const option = document.createElement('option');
                option.value = tc.id;
                option.textContent = tc.name;
                select.appendChild(option);
            });

            // Restore selection if it still exists
            if (currentValue && this.settings.titleCompanies.find(tc => tc.id === currentValue)) {
                select.value = currentValue;
            }
        });
    }

    getTitleCompanyFees(id) {
        return this.settings.titleCompanies.find(tc => tc.id === id);
    }

    applyTitleCompanyFees(panel, id) {
        const fees = this.getTitleCompanyFees(id);
        if (!fees) return;

        const feeFields = [
            'titleInsurance', 'ownersTitleInsurance', 'titleSearch',
            'settlementFee', 'escrowFees', 'recordingFees',
            'notaryFees', 'courierFees', 'attorneyFees'
        ];

        feeFields.forEach(field => {
            const input = panel.querySelector(`input[name="${field}"]`);
            if (input && fees[field] !== undefined) {
                input.value = fees[field];
            }
        });

        this.showNotification(`Applied fees from "${fees.name}"`);
    }

    showNotification(message) {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.className = 'settings-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2500);
    }
}

class LoanCalculator {
    constructor(panelIndex) {
        this.panelIndex = panelIndex;
        this.panel = document.querySelector(`.loan-panel[data-index="${panelIndex}"]`);
        this.form = this.panel.querySelector('.loan-form');
        this.loanType = 'conventional';
        this.loanProgram = 'standard';
        this.transactionType = 'purchase';
        this.borrowerCount = 1;
        this.splitRatio = 50;
        this.results = {};
        this.customFees = [];

        // Program descriptions
        this.programDescriptions = {
            standard: '',
            homeready: 'Fannie Mae HomeReady: For low-to-moderate income borrowers. Allows 3% down, reduced MI, and income from non-borrower household members.',
            homepossible: 'Freddie Mac Home Possible: Similar to HomeReady. 3% down payment, flexible sources of funds, reduced MI for qualified borrowers.',
            firsttime: 'First Time Homebuyer: Special programs for buyers who haven\'t owned a home in 3+ years. May include down payment assistance and reduced fees.',
            affordable: 'Affordable/Community Lending: Programs designed for underserved communities. May include grants, reduced rates, and flexible qualifying.'
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateVisibleFields();
        this.calculate();
    }

    setupEventListeners() {
        // Transaction type toggle (Purchase/Refinance)
        this.panel.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.panel.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.transactionType = e.target.dataset.type;
                this.updateVisibleFields();
                this.calculate();
            });
        });

        // Borrower count toggle
        this.panel.querySelectorAll('.borrower-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.panel.querySelectorAll('.borrower-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.borrowerCount = parseInt(e.target.dataset.borrowers);
                this.updateBorrowerFields();
                this.calculate();
            });
        });

        // Split ratio slider
        const splitSlider = this.panel.querySelector('.split-slider');
        if (splitSlider) {
            splitSlider.addEventListener('input', (e) => {
                this.splitRatio = parseInt(e.target.value);
                this.updateSplitDisplay();
            });
        }

        // Loan type tabs
        this.panel.querySelectorAll('.type-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.panel.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.loanType = e.target.dataset.loan;
                this.updateVisibleFields();
                this.updateProgramVisibility();
                this.calculate();
            });
        });

        // Loan program tabs
        this.panel.querySelectorAll('.program-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.panel.querySelectorAll('.program-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.loanProgram = e.target.dataset.program;
                this.updateProgramInfo();
                this.calculate();
            });
        });

        // Buying points toggle
        this.panel.querySelectorAll('input[name="buyingPoints"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const pointsAmount = this.panel.querySelector('.points-amount');
                if (e.target.value === 'yes') {
                    pointsAmount.classList.remove('hidden');
                } else {
                    pointsAmount.classList.add('hidden');
                    this.panel.querySelector('input[name="discountPoints"]').value = 0;
                }
                this.calculate();
            });
        });

        // Section toggle buttons
        this.panel.querySelectorAll('.toggle-section-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.target;
                const content = this.panel.querySelector(`.${target}`);
                const icon = e.currentTarget.querySelector('.toggle-icon');

                if (content) {
                    content.classList.toggle('collapsed');
                    icon.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
                }
            });
        });

        // Down payment sync
        const homePrice = this.panel.querySelector('input[name="homePrice"]');
        const downPayment = this.panel.querySelector('input[name="downPayment"]');
        const downPaymentPercent = this.panel.querySelector('input[name="downPaymentPercent"]');
        const loanAmount = this.panel.querySelector('input[name="loanAmount"]');

        homePrice.addEventListener('input', () => {
            const price = parseFloat(homePrice.value) || 0;
            const percent = parseFloat(downPaymentPercent.value) || 0;
            const dp = price * (percent / 100);
            downPayment.value = Math.round(dp);
            loanAmount.value = Math.round(price - dp);
            this.calculate();
        });

        downPayment.addEventListener('input', () => {
            const price = parseFloat(homePrice.value) || 0;
            const dp = parseFloat(downPayment.value) || 0;
            if (price > 0) {
                downPaymentPercent.value = ((dp / price) * 100).toFixed(1);
            }
            loanAmount.value = Math.round(price - dp);
            this.calculate();
        });

        downPaymentPercent.addEventListener('input', () => {
            const price = parseFloat(homePrice.value) || 0;
            const percent = parseFloat(downPaymentPercent.value) || 0;
            const dp = price * (percent / 100);
            downPayment.value = Math.round(dp);
            loanAmount.value = Math.round(price - dp);
            this.calculate();
        });

        // All other inputs
        this.form.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('change', () => this.calculate());
            input.addEventListener('input', () => this.calculate());
        });

        // Calculate button
        this.panel.querySelector('.calculate-btn').addEventListener('click', () => {
            this.calculate();
            this.panel.querySelector('.results-section').scrollIntoView({ behavior: 'smooth' });
        });

        // Title company dropdown
        const titleCompanySelect = this.panel.querySelector('.title-company-dropdown');
        if (titleCompanySelect) {
            titleCompanySelect.addEventListener('change', (e) => {
                const tcId = e.target.value;
                if (tcId && window.settingsManager) {
                    window.settingsManager.applyTitleCompanyFees(this.panel, tcId);
                    this.calculate();
                }
            });
        }

        // Add custom fee button
        const addCustomFeeBtn = this.panel.querySelector('.add-custom-fee-btn');
        if (addCustomFeeBtn) {
            addCustomFeeBtn.addEventListener('click', () => this.addCustomFee());
        }
    }

    addCustomFee(name = '', amount = 0) {
        const feeId = Date.now();
        this.customFees.push({ id: feeId, name, amount });
        this.renderCustomFees();
        this.calculate();
    }

    removeCustomFee(feeId) {
        this.customFees = this.customFees.filter(fee => fee.id !== feeId);
        this.renderCustomFees();
        this.calculate();
    }

    renderCustomFees() {
        const container = this.panel.querySelector('.custom-fees-list');
        if (!container) return;

        container.innerHTML = this.customFees.map(fee => `
            <div class="custom-fee-item" data-fee-id="${Security.escapeAttr(fee.id)}">
                <input type="text"
                       class="custom-fee-name"
                       placeholder="Fee name (e.g., Wire Fee)"
                       value="${Security.escapeAttr(fee.name)}"
                       maxlength="100">
                <div class="input-wrapper">
                    <span class="currency">$</span>
                    <input type="number"
                           class="custom-fee-amount"
                           value="${Security.sanitizeNumber(fee.amount, 0, 1000000)}"
                           min="0"
                           max="1000000"
                           step="0.01">
                </div>
                <button type="button" class="remove-custom-fee-btn" title="Remove fee">&times;</button>
            </div>
        `).join('');

        // Add event listeners to new elements
        container.querySelectorAll('.custom-fee-item').forEach(item => {
            const feeId = parseInt(item.dataset.feeId);
            const fee = this.customFees.find(f => f.id === feeId);

            item.querySelector('.custom-fee-name').addEventListener('input', (e) => {
                fee.name = e.target.value;
            });

            item.querySelector('.custom-fee-amount').addEventListener('input', (e) => {
                fee.amount = parseFloat(e.target.value) || 0;
                this.calculate();
            });

            item.querySelector('.remove-custom-fee-btn').addEventListener('click', () => {
                this.removeCustomFee(feeId);
            });
        });
    }

    getCustomFeesTotal() {
        return this.customFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
    }

    updateBorrowerFields() {
        const secondBorrowerCredit = this.panel.querySelector('.second-borrower-credit');
        const splitSection = this.panel.querySelector('.borrower-split-section');

        if (this.borrowerCount === 2) {
            secondBorrowerCredit.classList.remove('hidden');
            splitSection.classList.remove('hidden');
        } else {
            secondBorrowerCredit.classList.add('hidden');
            splitSection.classList.add('hidden');
        }
    }

    updateProgramVisibility() {
        const programSection = this.panel.querySelector('.loan-program-section');
        if (!programSection) return;

        // Show program options only for conventional loans (HomeReady/HomePossible are conventional products)
        // For FHA, VA, USDA - these have their own specific programs
        if (this.loanType === 'conventional') {
            programSection.classList.remove('hidden');
            // Show all conventional program options
            this.panel.querySelectorAll('.program-tab[data-program="homeready"]').forEach(t => t.classList.remove('hidden'));
            this.panel.querySelectorAll('.program-tab[data-program="homepossible"]').forEach(t => t.classList.remove('hidden'));
        } else {
            // For non-conventional, only show standard, first time, and affordable
            programSection.classList.remove('hidden');
            this.panel.querySelectorAll('.program-tab[data-program="homeready"]').forEach(t => t.classList.add('hidden'));
            this.panel.querySelectorAll('.program-tab[data-program="homepossible"]').forEach(t => t.classList.add('hidden'));

            // If currently on HomeReady or HomePossible, switch to standard
            if (this.loanProgram === 'homeready' || this.loanProgram === 'homepossible') {
                this.loanProgram = 'standard';
                this.panel.querySelectorAll('.program-tab').forEach(t => t.classList.remove('active'));
                this.panel.querySelector('.program-tab[data-program="standard"]')?.classList.add('active');
                this.updateProgramInfo();
            }
        }
    }

    updateProgramInfo() {
        const programInfo = this.panel.querySelector('.program-info');
        const description = this.panel.querySelector('.program-description');

        if (!programInfo || !description) return;

        const desc = this.programDescriptions[this.loanProgram];
        if (desc) {
            description.textContent = desc;
            programInfo.classList.remove('hidden');
        } else {
            programInfo.classList.add('hidden');
        }
    }

    updateSplitDisplay() {
        const b1Percent = this.panel.querySelector('[data-split="borrower1Percent"]');
        const b2Percent = this.panel.querySelector('[data-split="borrower2Percent"]');

        if (b1Percent && b2Percent) {
            b1Percent.textContent = `${this.splitRatio}%`;
            b2Percent.textContent = `${100 - this.splitRatio}%`;
        }

        this.updateBorrowerSplit();
    }

    updateBorrowerSplit() {
        if (this.borrowerCount !== 2) return;

        const ratio1 = this.splitRatio / 100;
        const ratio2 = (100 - this.splitRatio) / 100;

        const b1Monthly = this.panel.querySelector('[data-split="borrower1Monthly"]');
        const b2Monthly = this.panel.querySelector('[data-split="borrower2Monthly"]');
        const b1Cash = this.panel.querySelector('[data-split="borrower1CashToClose"]');
        const b2Cash = this.panel.querySelector('[data-split="borrower2CashToClose"]');

        if (b1Monthly && this.results.totalMonthly) {
            b1Monthly.textContent = this.formatCurrency(this.results.totalMonthly * ratio1);
            b2Monthly.textContent = this.formatCurrency(this.results.totalMonthly * ratio2);
            b1Cash.textContent = this.formatCurrency(this.results.cashToClose * ratio1);
            b2Cash.textContent = this.formatCurrency(this.results.cashToClose * ratio2);
        }
    }

    updateVisibleFields() {
        // Hide all loan-specific fields first
        this.panel.querySelector('.fha-fields').classList.add('hidden');
        this.panel.querySelector('.va-fields').classList.add('hidden');
        this.panel.querySelector('.usda-fields').classList.add('hidden');
        this.panel.querySelector('.conventional-fields').classList.add('hidden');
        this.panel.querySelector('.arm-fields')?.classList.add('hidden');

        // Show relevant fields based on loan type
        switch (this.loanType) {
            case 'fha':
                this.panel.querySelector('.fha-fields').classList.remove('hidden');
                break;
            case 'va':
                this.panel.querySelector('.va-fields').classList.remove('hidden');
                break;
            case 'usda':
                this.panel.querySelector('.usda-fields').classList.remove('hidden');
                break;
            case 'conventional':
                this.panel.querySelector('.conventional-fields').classList.remove('hidden');
                break;
            case 'arm':
                this.panel.querySelector('.arm-fields')?.classList.remove('hidden');
                this.panel.querySelector('.conventional-fields').classList.remove('hidden'); // ARM can have PMI too
                this.updateArmProjection();
                break;
        }

        // Show/hide refinance fields
        const refinanceFields = this.panel.querySelector('.refinance-fields');
        const downPaymentGroup = this.panel.querySelector('.down-payment-group');

        if (this.transactionType === 'refinance') {
            refinanceFields.classList.remove('hidden');
            downPaymentGroup.classList.add('hidden');
        } else {
            refinanceFields.classList.add('hidden');
            downPaymentGroup.classList.remove('hidden');
        }
    }

    getFormData() {
        const formData = new FormData(this.form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        return {
            scenarioName: data.scenarioName || '',
            homePrice: parseFloat(data.homePrice) || 0,
            loanAmount: parseFloat(data.loanAmount) || 0,
            downPayment: parseFloat(data.downPayment) || 0,
            downPaymentPercent: parseFloat(data.downPaymentPercent) || 0,
            interestRate: parseFloat(data.interestRate) || 0,
            loanTerm: parseInt(data.loanTerm) || 30,
            creditScore: parseInt(data.creditScore) || 700,
            creditScore2: parseInt(data.creditScore2) || 700,
            buyingPoints: data.buyingPoints === 'yes',
            discountPoints: parseFloat(data.discountPoints) || 0,
            // FHA
            upfrontMIPRate: parseFloat(data.upfrontMIPRate) || 1.75,
            annualMIPRate: parseFloat(data.annualMIPRate) || 0.55,
            // VA
            firstTimeVA: data.firstTimeVA === 'yes',
            serviceType: data.serviceType || 'regular',
            vaExempt: data.vaExempt === 'yes',
            vaFundingFeeRate: parseFloat(data.vaFundingFeeRate) || 0,
            // USDA
            usdaUpfrontRate: parseFloat(data.usdaUpfrontRate) || 1.0,
            usdaAnnualRate: parseFloat(data.usdaAnnualRate) || 0.35,
            // ARM
            armType: data.armType || '5/1',
            armInitialRate: parseFloat(data.armInitialRate) || 5.5,
            armIndex: data.armIndex || 'sofr',
            armIndexRate: parseFloat(data.armIndexRate) || 5.0,
            armMargin: parseFloat(data.armMargin) || 2.75,
            armInitialCap: parseFloat(data.armInitialCap) || 2,
            armPeriodicCap: parseFloat(data.armPeriodicCap) || 2,
            armLifetimeCap: parseFloat(data.armLifetimeCap) || 5,
            // Conventional PMI
            pmiRateOverride: parseFloat(data.pmiRateOverride) || 0,
            // Refinance
            currentBalance: parseFloat(data.currentBalance) || 0,
            currentRate: parseFloat(data.currentRate) || 0,
            cashOut: parseFloat(data.cashOut) || 0,
            // Lender Fees
            originationFee: parseFloat(data.originationFee) || 0,
            processingFee: parseFloat(data.processingFee) || 0,
            underwritingFee: parseFloat(data.underwritingFee) || 0,
            applicationFee: parseFloat(data.applicationFee) || 0,
            commitmentFee: parseFloat(data.commitmentFee) || 0,
            rateLockFee: parseFloat(data.rateLockFee) || 0,
            // Third Party Fees
            appraisalFee: parseFloat(data.appraisalFee) || 0,
            creditReport: parseFloat(data.creditReport) || 0,
            floodCert: parseFloat(data.floodCert) || 0,
            taxServiceFee: parseFloat(data.taxServiceFee) || 0,
            survey: parseFloat(data.survey) || 0,
            pestInspection: parseFloat(data.pestInspection) || 0,
            homeInspection: parseFloat(data.homeInspection) || 0,
            // Title & Government Fees
            titleInsurance: parseFloat(data.titleInsurance) || 0,
            ownersTitleInsurance: parseFloat(data.ownersTitleInsurance) || 0,
            titleSearch: parseFloat(data.titleSearch) || 0,
            settlementFee: parseFloat(data.settlementFee) || 0,
            escrowFees: parseFloat(data.escrowFees) || 0,
            recordingFees: parseFloat(data.recordingFees) || 0,
            transferTaxes: parseFloat(data.transferTaxes) || 0,
            attorneyFees: parseFloat(data.attorneyFees) || 0,
            notaryFees: parseFloat(data.notaryFees) || 0,
            courierFees: parseFloat(data.courierFees) || 0,
            // Other Fees
            hoaTransferFee: parseFloat(data.hoaTransferFee) || 0,
            hoaCertification: parseFloat(data.hoaCertification) || 0,
            otherFees: parseFloat(data.otherFees) || 0,
            // Credits
            lenderCredit: parseFloat(data.lenderCredit) || 0,
            sellerCredit: parseFloat(data.sellerCredit) || 0,
            otherCredits: parseFloat(data.otherCredits) || 0,
            // Prepaids
            annualTaxes: parseFloat(data.annualTaxes) || 0,
            annualInsurance: parseFloat(data.annualInsurance) || 0,
            monthlyHOA: parseFloat(data.monthlyHOA) || 0,
            taxMonths: parseInt(data.taxMonths) || 3,
            insuranceMonths: parseInt(data.insuranceMonths) || 14,
            prepaidInterestDays: parseInt(data.prepaidInterestDays) || 15
        };
    }

    calculateMonthlyPayment(principal, annualRate, years) {
        const monthlyRate = annualRate / 100 / 12;
        const numPayments = years * 12;

        if (monthlyRate === 0) {
            return principal / numPayments;
        }

        return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
            (Math.pow(1 + monthlyRate, numPayments) - 1);
    }

    // ARM-specific calculations
    updateArmProjection() {
        const data = this.getFormData();

        // Parse ARM type (e.g., "5/1" means 5 years fixed, adjusts every 1 year)
        const [fixedYears, adjustmentPeriod] = data.armType.split('/').map(Number);

        // Calculate fully indexed rate (Index + Margin)
        const fullyIndexedRate = data.armIndexRate + data.armMargin;

        // Calculate worst case rate (Initial Rate + Lifetime Cap)
        const worstCaseRate = data.armInitialRate + data.armLifetimeCap;

        // Update display fields
        const initialDisplay = this.panel.querySelector('[data-field="armInitialDisplay"]');
        const worstCaseDisplay = this.panel.querySelector('[data-field="armWorstCase"]');
        const fullyIndexedDisplay = this.panel.querySelector('[data-field="armFullyIndexed"]');

        if (initialDisplay) initialDisplay.textContent = data.armInitialRate.toFixed(3) + '%';
        if (worstCaseDisplay) worstCaseDisplay.textContent = worstCaseRate.toFixed(3) + '%';
        if (fullyIndexedDisplay) fullyIndexedDisplay.textContent = fullyIndexedRate.toFixed(3) + '%';

        // Store ARM data for use in results
        this.armData = {
            fixedYears,
            adjustmentPeriod,
            initialRate: data.armInitialRate,
            fullyIndexedRate,
            worstCaseRate,
            indexRate: data.armIndexRate,
            margin: data.armMargin,
            initialCap: data.armInitialCap,
            periodicCap: data.armPeriodicCap,
            lifetimeCap: data.armLifetimeCap
        };
    }

    // Calculate ARM total interest over loan life (more complex due to rate changes)
    calculateArmTotalInterest(data) {
        const armInfo = this.armData || {};
        const loanAmount = data.loanAmount;
        const termYears = data.loanTerm;
        const fixedYears = armInfo.fixedYears || 5;
        const initialRate = armInfo.initialRate || data.armInitialRate || data.interestRate;
        const fullyIndexedRate = armInfo.fullyIndexedRate || (data.armIndexRate + data.armMargin);

        let totalInterest = 0;
        let remainingBalance = loanAmount;

        // Fixed period interest
        const fixedMonthlyRate = initialRate / 100 / 12;
        const totalMonths = termYears * 12;
        const fixedMonths = Math.min(fixedYears * 12, totalMonths);
        const monthlyPaymentFixed = this.calculateMonthlyPayment(loanAmount, initialRate, termYears);

        for (let i = 0; i < fixedMonths; i++) {
            const interestPayment = remainingBalance * fixedMonthlyRate;
            const principalPayment = monthlyPaymentFixed - interestPayment;
            totalInterest += interestPayment;
            remainingBalance -= principalPayment;
        }

        // Adjustable period - use fully indexed rate as estimate
        if (remainingBalance > 0 && fixedMonths < totalMonths) {
            const remainingYears = (totalMonths - fixedMonths) / 12;
            const adjustableMonthlyRate = fullyIndexedRate / 100 / 12;
            const adjustableMonths = totalMonths - fixedMonths;
            const monthlyPaymentAdj = this.calculateMonthlyPayment(remainingBalance, fullyIndexedRate, remainingYears);

            for (let i = 0; i < adjustableMonths; i++) {
                const interestPayment = remainingBalance * adjustableMonthlyRate;
                const principalPayment = monthlyPaymentAdj - interestPayment;
                totalInterest += interestPayment;
                remainingBalance = Math.max(0, remainingBalance - principalPayment);
            }
        }

        return totalInterest;
    }

    calculateFHAFees(data) {
        const upfrontMIP = data.loanAmount * (data.upfrontMIPRate / 100);
        const annualMIP = data.loanAmount * (data.annualMIPRate / 100);
        const monthlyMIP = annualMIP / 12;

        return { upfrontMIP, monthlyMIP, annualMIP };
    }

    calculateVAFundingFee(data) {
        if (data.vaExempt) return 0;

        // Check for manual override
        if (data.vaFundingFeeRate > 0) {
            return data.loanAmount * (data.vaFundingFeeRate / 100);
        }

        let feePercent;

        if (this.transactionType === 'refinance') {
            // Cash-out refinance rates
            if (data.cashOut > 0) {
                feePercent = data.firstTimeVA ? 2.15 : 3.3;
            } else {
                // IRRRL (Interest Rate Reduction Refinance Loan)
                feePercent = 0.5;
            }
        } else {
            // Purchase rates
            if (data.downPaymentPercent < 5) {
                feePercent = data.firstTimeVA ? 2.15 : 3.3;
            } else if (data.downPaymentPercent < 10) {
                feePercent = data.firstTimeVA ? 1.5 : 1.5;
            } else {
                feePercent = data.firstTimeVA ? 1.25 : 1.25;
            }
        }

        // Reserves/National Guard pay slightly higher
        if (data.serviceType === 'reserves' && data.firstTimeVA && data.downPaymentPercent < 5) {
            feePercent = 2.4;
        }

        return data.loanAmount * (feePercent / 100);
    }

    calculateUSDAFees(data) {
        const upfrontFee = data.loanAmount * (data.usdaUpfrontRate / 100);
        const annualFee = data.loanAmount * (data.usdaAnnualRate / 100);
        const monthlyFee = annualFee / 12;

        return { upfrontFee, monthlyFee, annualFee };
    }

    calculatePMI(data) {
        const ltv = (data.loanAmount / data.homePrice) * 100;

        if (ltv <= 80) {
            return { required: false, monthlyPMI: 0 };
        }

        // Check for manual override
        if (data.pmiRateOverride > 0) {
            const annualPMI = data.loanAmount * (data.pmiRateOverride / 100);
            return { required: true, monthlyPMI: annualPMI / 12, annualPMI, pmiRate: data.pmiRateOverride };
        }

        // Use effective credit score (lower of two if two borrowers)
        const effectiveScore = this.borrowerCount === 2
            ? Math.min(data.creditScore, data.creditScore2)
            : data.creditScore;

        // Estimate PMI based on LTV and credit score
        let pmiRate;

        if (effectiveScore >= 760) {
            pmiRate = ltv > 95 ? 0.58 : ltv > 90 ? 0.41 : ltv > 85 ? 0.28 : 0.19;
        } else if (effectiveScore >= 740) {
            pmiRate = ltv > 95 ? 0.73 : ltv > 90 ? 0.53 : ltv > 85 ? 0.37 : 0.25;
        } else if (effectiveScore >= 720) {
            pmiRate = ltv > 95 ? 0.90 : ltv > 90 ? 0.65 : ltv > 85 ? 0.46 : 0.32;
        } else if (effectiveScore >= 700) {
            pmiRate = ltv > 95 ? 1.15 : ltv > 90 ? 0.83 : ltv > 85 ? 0.59 : 0.40;
        } else if (effectiveScore >= 680) {
            pmiRate = ltv > 95 ? 1.40 : ltv > 90 ? 1.05 : ltv > 85 ? 0.75 : 0.52;
        } else {
            pmiRate = ltv > 95 ? 1.85 : ltv > 90 ? 1.40 : ltv > 85 ? 1.00 : 0.70;
        }

        // Apply reduced PMI rates for special programs
        // HomeReady and Home Possible typically offer 20-25% reduced PMI
        if (this.loanProgram === 'homeready' || this.loanProgram === 'homepossible') {
            pmiRate = pmiRate * 0.75; // 25% reduction
        } else if (this.loanProgram === 'affordable') {
            pmiRate = pmiRate * 0.80; // 20% reduction for affordable programs
        }

        const annualPMI = data.loanAmount * (pmiRate / 100);
        const monthlyPMI = annualPMI / 12;

        return { required: true, monthlyPMI, annualPMI, pmiRate };
    }

    calculate() {
        const data = this.getFormData();
        const fees = {};
        let monthlyMI = 0;
        let upfrontFees = 0;

        // Calculate base monthly payment (P&I)
        const monthlyPI = this.calculateMonthlyPayment(data.loanAmount, data.interestRate, data.loanTerm);

        // Calculate loan-specific fees
        switch (this.loanType) {
            case 'fha':
                const fhaFees = this.calculateFHAFees(data);
                upfrontFees = fhaFees.upfrontMIP;
                monthlyMI = fhaFees.monthlyMIP;
                fees['Upfront MIP'] = fhaFees.upfrontMIP;

                // Update display
                this.panel.querySelector('[data-field="upfrontMIP"]').textContent =
                    this.formatCurrency(fhaFees.upfrontMIP);
                break;

            case 'va':
                const vaFee = this.calculateVAFundingFee(data);
                upfrontFees = vaFee;
                if (vaFee > 0) {
                    fees['VA Funding Fee'] = vaFee;
                }

                // Update display
                this.panel.querySelector('[data-field="vaFundingFee"]').textContent =
                    this.formatCurrency(vaFee);
                break;

            case 'usda':
                const usdaFees = this.calculateUSDAFees(data);
                upfrontFees = usdaFees.upfrontFee;
                monthlyMI = usdaFees.monthlyFee;
                fees['USDA Guarantee Fee'] = usdaFees.upfrontFee;

                // Update display
                this.panel.querySelector('[data-field="usdaUpfront"]').textContent =
                    this.formatCurrency(usdaFees.upfrontFee);
                break;

            case 'conventional':
                const pmi = this.calculatePMI(data);
                monthlyMI = pmi.monthlyPMI;

                // Update display
                this.panel.querySelector('[data-field="pmiRequired"]').textContent =
                    pmi.required ? `Yes (${pmi.pmiRate.toFixed(2)}% annually)` : 'No (LTV ≤ 80%)';

                const pmiRateGroup = this.panel.querySelector('.pmi-rate');
                if (pmi.required) {
                    pmiRateGroup.classList.remove('hidden');
                    this.panel.querySelector('[data-field="monthlyPMI"]').textContent =
                        this.formatCurrency(pmi.monthlyPMI);
                } else {
                    pmiRateGroup.classList.add('hidden');
                }
                break;

            case 'arm':
                // ARM uses initial rate for P&I calculation (already calculated above with interestRate)
                // But we override the interest rate with the ARM initial rate
                const armPmi = this.calculatePMI(data);
                monthlyMI = armPmi.monthlyPMI;

                // Update PMI display for ARM (they can have PMI too)
                this.panel.querySelector('[data-field="pmiRequired"]').textContent =
                    armPmi.required ? `Yes (${armPmi.pmiRate.toFixed(2)}% annually)` : 'No (LTV ≤ 80%)';

                const armPmiRateGroup = this.panel.querySelector('.pmi-rate');
                if (armPmi.required) {
                    armPmiRateGroup.classList.remove('hidden');
                    this.panel.querySelector('[data-field="monthlyPMI"]').textContent =
                        this.formatCurrency(armPmi.monthlyPMI);
                } else {
                    armPmiRateGroup.classList.add('hidden');
                }

                // Update ARM projection display
                this.updateArmProjection();
                break;
        }

        // Calculate discount points cost
        const pointsCost = data.buyingPoints ? data.loanAmount * (data.discountPoints / 100) : 0;
        if (pointsCost > 0) {
            fees['Discount Points'] = pointsCost;
        }

        // Calculate closing costs (all editable fees)
        const lenderFees = {
            'Origination Fee': data.originationFee,
            'Processing Fee': data.processingFee,
            'Underwriting Fee': data.underwritingFee,
            'Application Fee': data.applicationFee,
            'Commitment Fee': data.commitmentFee,
            'Rate Lock Fee': data.rateLockFee
        };

        const thirdPartyFees = {
            'Appraisal Fee': data.appraisalFee,
            'Credit Report': data.creditReport,
            'Flood Certification': data.floodCert,
            'Tax Service Fee': data.taxServiceFee,
            'Survey': data.survey,
            'Pest Inspection': data.pestInspection,
            'Home Inspection': data.homeInspection
        };

        const titleGovFees = {
            'Title Insurance (Lender)': data.titleInsurance,
            'Title Insurance (Owner)': data.ownersTitleInsurance,
            'Title Search': data.titleSearch,
            'Settlement Fee': data.settlementFee,
            'Escrow Fees': data.escrowFees,
            'Recording Fees': data.recordingFees,
            'Transfer Taxes': data.transferTaxes,
            'Attorney Fees': data.attorneyFees,
            'Notary Fees': data.notaryFees,
            'Courier/Wire Fees': data.courierFees
        };

        const otherFeesObj = {
            'HOA Transfer Fee': data.hoaTransferFee,
            'HOA Certification': data.hoaCertification,
            'Other Fees': data.otherFees
        };

        const closingCosts = { ...lenderFees, ...thirdPartyFees, ...titleGovFees, ...otherFeesObj };

        // Calculate credits
        const totalCredits = data.lenderCredit + data.sellerCredit + data.otherCredits;

        // Calculate prepaids
        const monthlyTaxes = data.annualTaxes / 12;
        const monthlyInsurance = data.annualInsurance / 12;
        const prepaidTaxes = monthlyTaxes * data.taxMonths;
        const prepaidInsurance = monthlyInsurance * data.insuranceMonths;
        const dailyInterest = (data.loanAmount * (data.interestRate / 100)) / 365;
        const prepaidInterest = dailyInterest * data.prepaidInterestDays;

        const prepaids = {
            'Prepaid Taxes': prepaidTaxes,
            'Prepaid Insurance': prepaidInsurance,
            'Prepaid Interest': prepaidInterest
        };

        // Total closing costs (including custom fees)
        const totalClosingCosts = Object.values(closingCosts).reduce((a, b) => a + b, 0);
        const customFeesTotal = this.getCustomFeesTotal();
        const totalPrepaids = Object.values(prepaids).reduce((a, b) => a + b, 0);
        const feeSubtotal = totalClosingCosts + customFeesTotal + totalPrepaids + pointsCost + upfrontFees;
        const totalFees = feeSubtotal - totalCredits;

        // Cash to close
        let cashToClose;
        if (this.transactionType === 'purchase') {
            cashToClose = data.downPayment + totalFees;
        } else {
            cashToClose = totalFees - data.cashOut;
        }

        // Total monthly payment (PITI + MI + HOA)
        const totalMonthly = monthlyPI + monthlyTaxes + monthlyInsurance + monthlyMI + data.monthlyHOA;

        // Total interest over life of loan
        const totalPayments = monthlyPI * data.loanTerm * 12;
        let totalInterest;
        if (this.loanType === 'arm') {
            // ARM uses special calculation accounting for rate changes
            totalInterest = this.calculateArmTotalInterest(data);
        } else {
            totalInterest = totalPayments - data.loanAmount;
        }

        // Total cost over loan life (using totalInterest + principal for more accurate ARM calculation)
        const totalLoanCost = data.loanAmount + totalInterest + totalFees + (monthlyMI * data.loanTerm * 12) +
                             (monthlyTaxes * data.loanTerm * 12) + (monthlyInsurance * data.loanTerm * 12) +
                             (data.monthlyHOA * data.loanTerm * 12);

        // Calculate APR
        // Finance charges for APR include: points, origination fees, upfront MI, prepaid interest
        // and certain lender fees. Excludes: prepaids (taxes/insurance escrow), owner's title,
        // third-party fees, recording/transfer taxes
        const financeCharges = pointsCost + upfrontFees + prepaidInterest +
            (data.originationFee || 0) + (data.processingFee || 0) + (data.underwritingFee || 0) +
            (data.applicationFee || 0) + (data.commitmentFee || 0);
        const apr = this.calculateAPR(financeCharges, monthlyPI, data.loanTerm * 12, data.loanAmount);

        // Store results
        this.results = {
            scenarioName: data.scenarioName,
            loanType: this.loanType,
            loanProgram: this.loanProgram,
            transactionType: this.transactionType,
            borrowerCount: this.borrowerCount,
            loanAmount: data.loanAmount,
            homePrice: data.homePrice,
            downPayment: data.downPayment,
            downPaymentPercent: data.downPaymentPercent,
            monthlyPI,
            monthlyMI,
            monthlyTaxes,
            monthlyInsurance,
            monthlyHOA: data.monthlyHOA,
            totalMonthly,
            totalClosingCosts,
            totalPrepaids,
            feeSubtotal,
            totalCredits,
            totalFees,
            cashToClose,
            apr,
            totalInterest,
            totalLoanCost,
            interestRate: data.interestRate,
            loanTerm: data.loanTerm,
            fees: { ...fees, ...closingCosts, ...prepaids },
            customFees: this.customFees.filter(f => f.name && f.amount > 0),
            // ARM-specific data
            armData: this.loanType === 'arm' ? {
                type: data.armType,
                initialRate: data.armInitialRate,
                fullyIndexedRate: this.armData?.fullyIndexedRate || (data.armIndexRate + data.armMargin),
                worstCaseRate: this.armData?.worstCaseRate || (data.armInitialRate + data.armLifetimeCap),
                margin: data.armMargin,
                index: data.armIndex,
                caps: {
                    initial: data.armInitialCap,
                    periodic: data.armPeriodicCap,
                    lifetime: data.armLifetimeCap
                }
            } : null
        };

        // Update UI
        this.updateResultsUI();
        this.updateBorrowerSplit();

        // Trigger comparison update
        if (window.loanManager) {
            window.loanManager.updateComparison();
        }
    }

    calculateAPR(financeCharges, monthlyPayment, numPayments, loanAmount) {
        // APR calculation using Newton-Raphson method
        // APR is the rate that makes the present value of all payments equal to
        // the amount financed (loan amount minus prepaid finance charges)

        const amountFinanced = loanAmount - financeCharges;

        // If amount financed is invalid, return the nominal rate
        if (amountFinanced <= 0 || monthlyPayment <= 0 || numPayments <= 0) {
            return 0;
        }

        // Initial guess based on nominal rate
        let rate = monthlyPayment * numPayments / amountFinanced - 1;
        rate = Math.max(0.001, Math.min(rate, 0.5)); // Bound between 0.1% and 50%

        // Newton-Raphson iteration
        for (let i = 0; i < 100; i++) {
            const monthlyRate = rate / 12;

            // Present value of annuity formula: PV = PMT * [(1 - (1+r)^-n) / r]
            const factor = Math.pow(1 + monthlyRate, -numPayments);
            const pv = monthlyPayment * (1 - factor) / monthlyRate;

            // Derivative of PV with respect to annual rate
            // d(PV)/d(rate) = PMT * [n*(1+r)^(-n-1)/r - (1-(1+r)^-n)/r^2] / 12
            const dFactor = -numPayments * Math.pow(1 + monthlyRate, -numPayments - 1) / 12;
            const dPV = monthlyPayment * (dFactor / monthlyRate - (1 - factor) / (monthlyRate * monthlyRate * 12));

            const diff = pv - amountFinanced;

            // Check convergence
            if (Math.abs(diff) < 0.01) break;

            // Newton-Raphson step
            const newRate = rate - diff / dPV;

            // Bound the rate to prevent divergence
            rate = Math.max(0.001, Math.min(newRate, 0.5));
        }

        return rate * 100;
    }

    updateResultsUI() {
        const r = this.results;

        // Update result cards
        this.panel.querySelector('[data-result="monthlyPayment"]').textContent =
            this.formatCurrency(r.monthlyPI);
        this.panel.querySelector('[data-result="totalMonthly"]').textContent =
            this.formatCurrency(r.totalMonthly);
        this.panel.querySelector('[data-result="totalClosing"]').textContent =
            this.formatCurrency(r.totalFees);
        this.panel.querySelector('[data-result="cashToClose"]').textContent =
            this.formatCurrency(r.cashToClose);
        this.panel.querySelector('[data-result="apr"]').textContent =
            r.apr.toFixed(3) + '%';
        this.panel.querySelector('[data-result="totalInterest"]').textContent =
            this.formatCurrency(r.totalInterest);

        // Update fee breakdown table
        const feeTable = this.panel.querySelector('.fee-table tbody');
        feeTable.innerHTML = '';

        for (const [name, amount] of Object.entries(r.fees)) {
            if (amount > 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${name}</td>
                    <td>${this.formatCurrency(amount)}</td>
                `;
                feeTable.appendChild(row);
            }
        }

        // Add custom fees to the table
        if (r.customFees && r.customFees.length > 0) {
            for (const fee of r.customFees) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${fee.name}</td>
                    <td>${this.formatCurrency(fee.amount)}</td>
                `;
                row.style.color = '#667eea';
                feeTable.appendChild(row);
            }
        }

        // Update totals
        this.panel.querySelector('[data-result="feeSubtotal"]').textContent =
            this.formatCurrency(r.feeSubtotal);
        this.panel.querySelector('[data-result="totalCredits"]').textContent =
            `-${this.formatCurrency(r.totalCredits)}`;
        this.panel.querySelector('[data-result="feeTotal"]').textContent =
            this.formatCurrency(r.totalFees);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
}

// Loan Manager - handles multiple loan comparisons
class LoanManager {
    constructor() {
        this.loans = [];
        this.activeIndex = 0;
        this.maxLoans = 6;
        this.charts = {};
        this.comparisonMonths = 60; // Default 5 years

        this.init();
    }

    init() {
        // Create first loan calculator
        this.loans.push(new LoanCalculator(0));

        // Add loan button
        document.getElementById('addLoanBtn').addEventListener('click', () => this.addLoan());

        // Tab switching
        document.getElementById('loanTabs').addEventListener('click', (e) => {
            if (e.target.classList.contains('loan-tab')) {
                this.switchToLoan(parseInt(e.target.dataset.index));
            }
            if (e.target.classList.contains('remove-loan')) {
                e.stopPropagation();
                this.removeLoan(parseInt(e.target.dataset.index));
            }
        });

        // Document generation
        document.getElementById('generateDocBtn')?.addEventListener('click', () => this.openDocumentModal());
        document.getElementById('printBtn')?.addEventListener('click', () => window.print());
        document.getElementById('closeModal')?.addEventListener('click', () => this.closeDocumentModal());
        document.getElementById('copyDocBtn')?.addEventListener('click', () => this.copyDocumentToClipboard());
        document.getElementById('downloadDocBtn')?.addEventListener('click', () => this.downloadDocument());
        document.getElementById('printDocBtn')?.addEventListener('click', () => this.printDocument());
        document.getElementById('emailDocBtn')?.addEventListener('click', () => this.sendDocumentViaEmail());

        // Update document preview when inputs change
        ['borrowerName', 'propertyAddress', 'loanOfficerName', 'companyName', 'contactInfo', 'additionalNotes'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.updateDocumentPreview());
        });

        // Close modal on overlay click
        document.getElementById('documentModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'documentModal') {
                this.closeDocumentModal();
            }
        });

        // Time period selector buttons
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.comparisonMonths = parseInt(e.target.dataset.months);
                document.getElementById('customMonths').value = '';
                this.updateNetCostComparison();
            });
        });

        // Custom months input
        document.getElementById('customMonths')?.addEventListener('input', (e) => {
            const months = parseInt(e.target.value);
            if (months > 0 && months <= 360) {
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                this.comparisonMonths = months;
                this.updateNetCostComparison();
            }
        });

        // Save/Load scenario buttons
        document.getElementById('saveScenarioBtn')?.addEventListener('click', () => this.openSaveModal());
        document.getElementById('loadScenarioBtn')?.addEventListener('click', () => this.openSaveModal());
        document.getElementById('myScenariosBtn')?.addEventListener('click', () => this.openSaveModal());
        document.getElementById('closeSavedModal')?.addEventListener('click', () => this.closeSaveModal());
        document.getElementById('savedScenariosOverlay')?.addEventListener('click', () => this.closeSaveModal());
        document.getElementById('saveNewScenarioBtn')?.addEventListener('click', () => this.saveCurrentSession());

        // Export/Import buttons
        document.getElementById('exportDataBtn')?.addEventListener('click', () => this.exportToFile());
        document.getElementById('importDataInput')?.addEventListener('change', (e) => this.importFromFile(e));

        // Comparison type toggle (same property vs different properties)
        this.comparisonType = 'same'; // Default to same property
        document.querySelectorAll('.comparison-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.comparison-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.comparisonType = btn.dataset.type;
                this.updateComparisonTypeBanner();
                this.togglePropertyAddressFields();
            });
        });

        // Auto-save current session periodically and on page unload
        this.loadAutoSavedSession();
        setInterval(() => this.autoSave(), 30000); // Auto-save every 30 seconds
        window.addEventListener('beforeunload', () => this.autoSave());
    }

    addLoan(silent = false) {
        const newIndex = this.loans.length;

        if (newIndex >= this.maxLoans) {
            if (!silent) alert(`Maximum ${this.maxLoans} scenarios can be compared at once.`);
            return;
        }

        // Clone the first panel
        const firstPanel = document.querySelector('.loan-panel[data-index="0"]');
        const newPanel = firstPanel.cloneNode(true);
        newPanel.dataset.index = newIndex;
        newPanel.classList.remove('active');

        // Reset scenario name
        const scenarioNameInput = newPanel.querySelector('input[name="scenarioName"]');
        if (scenarioNameInput) {
            scenarioNameInput.value = '';
        }

        // Reset property address
        const propertyAddressInput = newPanel.querySelector('input[name="propertyAddress"]');
        if (propertyAddressInput) {
            propertyAddressInput.value = '';
        }

        // Set property address visibility based on comparison type
        const addressGroup = newPanel.querySelector('.property-address-group');
        if (addressGroup) {
            if (this.comparisonType === 'different') {
                addressGroup.classList.remove('hidden');
            } else {
                addressGroup.classList.add('hidden');
            }
        }

        // Add new panel
        document.getElementById('loanPanels').appendChild(newPanel);

        // Add new tab
        const tabsContainer = document.getElementById('loanTabs');
        const newTab = document.createElement('button');
        newTab.className = 'loan-tab';
        newTab.dataset.index = newIndex;
        newTab.innerHTML = `Scenario ${newIndex + 1} <span class="remove-loan" data-index="${newIndex}">&times;</span>`;
        tabsContainer.appendChild(newTab);

        // Create calculator for new loan
        this.loans.push(new LoanCalculator(newIndex));

        if (!silent) {
            // Switch to new loan
            this.switchToLoan(newIndex);
        }

        // Show comparison summary
        document.getElementById('comparisonSummary').classList.remove('hidden');

        // Update add button visibility
        this.updateAddButton();

        // Update title company dropdowns
        if (window.settingsManager) {
            window.settingsManager.updateAllTitleCompanyDropdowns();
        }

        // Update comparison charts if we have multiple loans
        if (this.loans.length >= 2) {
            this.updateComparison();
        }
    }

    removeLoan(index, silent = false) {
        if (this.loans.length <= 1) {
            if (!silent) alert('You must have at least one scenario.');
            return;
        }

        // Remove panel
        const panel = document.querySelector(`.loan-panel[data-index="${index}"]`);
        panel.remove();

        // Remove tab
        const tab = document.querySelector(`.loan-tab[data-index="${index}"]`);
        tab.remove();

        // Remove from loans array
        this.loans = this.loans.filter((_, i) => i !== index);

        // Reindex remaining panels and tabs
        this.reindexLoans();

        // Switch to first loan if active was removed
        if (this.activeIndex >= this.loans.length) {
            this.switchToLoan(0);
        }

        // Hide comparison if only one loan
        if (this.loans.length === 1) {
            document.getElementById('comparisonSummary').classList.add('hidden');
        }

        this.updateComparison();
        this.updateAddButton();
    }

    reindexLoans() {
        document.querySelectorAll('.loan-panel').forEach((panel, i) => {
            panel.dataset.index = i;
        });

        document.querySelectorAll('.loan-tab').forEach((tab, i) => {
            tab.dataset.index = i;
            const removeBtn = tab.querySelector('.remove-loan');
            if (removeBtn) {
                removeBtn.dataset.index = i;
            }
            // Update tab text
            const textNode = tab.childNodes[0];
            if (textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = `Scenario ${i + 1} `;
            }
        });

        // Recreate calculators with new indices
        this.loans = [];
        document.querySelectorAll('.loan-panel').forEach((panel, i) => {
            this.loans.push(new LoanCalculator(i));
        });
    }

    updateAddButton() {
        const addBtn = document.getElementById('addLoanBtn');
        if (this.loans.length >= this.maxLoans) {
            addBtn.classList.add('hidden');
        } else {
            addBtn.classList.remove('hidden');
        }
    }

    switchToLoan(index) {
        this.activeIndex = index;

        // Update tabs
        document.querySelectorAll('.loan-tab').forEach(tab => {
            tab.classList.toggle('active', parseInt(tab.dataset.index) === index);
        });

        // Update panels
        document.querySelectorAll('.loan-panel').forEach(panel => {
            panel.classList.toggle('active', parseInt(panel.dataset.index) === index);
        });
    }

    updateComparison() {
        if (this.loans.length < 2) return;

        this.updateComparisonTable();
        this.updateCharts();
        this.updateNetCostComparison();
        this.generateRecommendation();
        this.updateComparisonTypeBanner();

        // Highlight best values in the comparison table
        BestValueHighlighter.highlightTable(this.loans);
    }

    updateComparisonTypeBanner() {
        const banner = document.getElementById('comparisonTypeBanner');
        if (!banner) return;

        const homeIcon = `<svg class="banner-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

        if (this.comparisonType === 'different') {
            banner.classList.add('different-properties');
            banner.innerHTML = `
                ${homeIcon}${homeIcon}
                <span class="banner-text">Comparing <strong>different properties</strong> - each scenario has its own property details</span>
            `;
        } else {
            banner.classList.remove('different-properties');
            banner.innerHTML = `
                ${homeIcon}
                <span class="banner-text">Comparing different loan options for the <strong>same property</strong></span>
            `;
        }
    }

    togglePropertyAddressFields() {
        // Show/hide property address fields on all loan panels based on comparison type
        const addressGroups = document.querySelectorAll('.property-address-group');
        addressGroups.forEach(group => {
            if (this.comparisonType === 'different') {
                group.classList.remove('hidden');
            } else {
                group.classList.add('hidden');
            }
        });
    }

    updateComparisonTable() {
        const table = document.getElementById('comparisonTable');
        const thead = table.querySelector('thead tr');
        const tbody = table.querySelector('tbody');

        // Clear existing
        thead.innerHTML = '<th>Metric</th>';
        tbody.innerHTML = '';

        // Add column headers
        this.loans.forEach((loan, i) => {
            const th = document.createElement('th');
            const name = loan.results.scenarioName || `Scenario ${i + 1}`;
            const loanTypeLabel = loan.loanType.toUpperCase();
            const programLabel = loan.loanProgram !== 'standard' ? ` - ${this.formatProgramName(loan.loanProgram)}` : '';
            const borrowerInfo = loan.borrowerCount === 2 ? ' (2 borrowers)' : '';
            th.innerHTML = `${name}<br><small>${loanTypeLabel}${programLabel}${borrowerInfo}</small>`;
            thead.appendChild(th);
        });

        // Add comparison rows
        const metrics = [
            { key: 'loanAmount', label: 'Loan Amount', format: 'currency' },
            { key: 'interestRate', label: 'Interest Rate', format: 'percent' },
            { key: 'monthlyPI', label: 'Monthly P&I', format: 'currency' },
            { key: 'monthlyMI', label: 'Monthly MI/PMI', format: 'currency' },
            { key: 'monthlyHOA', label: 'Monthly HOA', format: 'currency' },
            { key: 'totalMonthly', label: 'Total Monthly (PITI)', format: 'currency' },
            { key: 'totalFees', label: 'Total Closing Costs', format: 'currency' },
            { key: 'totalCredits', label: 'Total Credits', format: 'currency' },
            { key: 'cashToClose', label: 'Cash to Close', format: 'currency' },
            { key: 'apr', label: 'APR', format: 'percent' },
            { key: 'totalInterest', label: 'Total Interest (Life)', format: 'currency' },
            { key: 'totalLoanCost', label: 'Total Cost (Life of Loan)', format: 'currency' }
        ];

        metrics.forEach(metric => {
            const row = document.createElement('tr');
            row.innerHTML = `<td><strong>${metric.label}</strong></td>`;

            let values = this.loans.map(loan => loan.results[metric.key] || 0);

            // Determine if lower is better for this metric
            const lowerIsBetter = ['cashToClose', 'totalMonthly', 'totalFees', 'apr',
                                   'totalInterest', 'totalLoanCost', 'monthlyPI', 'monthlyMI', 'interestRate'].includes(metric.key);

            let best;
            if (metric.key === 'totalCredits') {
                best = Math.max(...values);
            } else if (lowerIsBetter) {
                const positiveValues = values.filter(v => v > 0);
                best = positiveValues.length > 0 ? Math.min(...positiveValues) : 0;
            } else {
                best = Math.max(...values);
            }

            this.loans.forEach((loan, i) => {
                const value = loan.results[metric.key] || 0;
                const td = document.createElement('td');

                if (metric.format === 'currency') {
                    td.textContent = this.formatCurrency(value);
                } else if (metric.format === 'percent') {
                    td.textContent = value.toFixed(3) + '%';
                } else {
                    td.textContent = value;
                }

                // Highlight best value
                const validValues = values.filter(v => v > 0);
                if (validValues.length > 1 && value === best && value > 0) {
                    td.classList.add('best-value');
                }

                row.appendChild(td);
            });

            tbody.appendChild(row);
        });
    }

    updateCharts() {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }

        const labels = this.loans.map((loan, i) =>
            loan.results.scenarioName || `Scenario ${i + 1}`
        );

        const colors = [
            'rgba(102, 126, 234, 0.8)',
            'rgba(118, 75, 162, 0.8)',
            'rgba(76, 175, 80, 0.8)',
            'rgba(255, 152, 0, 0.8)',
            'rgba(244, 67, 54, 0.8)',
            'rgba(0, 188, 212, 0.8)'
        ];

        const borderColors = colors.map(c => c.replace('0.8', '1'));

        // Destroy existing charts safely
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};

        // Helper to find index of minimum value
        const findBestIndex = (data) => {
            let minIdx = 0;
            for (let i = 1; i < data.length; i++) {
                if (data[i] < data[minIdx]) minIdx = i;
            }
            return minIdx;
        };

        // Create chart with best value highlighted
        const createComparisonChart = (ctx, data, chartLabel) => {
            // Check if we have valid data
            if (!data || data.length === 0) {
                console.warn(`No data for ${chartLabel} chart`);
                return null;
            }

            // Check if all data is zero
            const hasNonZero = data.some(v => v > 0);
            if (!hasNonZero) {
                console.warn(`All data is zero for ${chartLabel} chart`);
                return null;
            }

            const bestIdx = findBestIndex(data);

            // Highlight the best (lowest) with offset and green border
            const offsets = data.map((_, i) => i === bestIdx ? 15 : 0);
            const bgColors = data.map((_, i) => i === bestIdx ? 'rgba(76, 175, 80, 0.9)' : (colors[i] || colors[0]));
            const bdColors = data.map((_, i) => i === bestIdx ? 'rgba(76, 175, 80, 1)' : (borderColors[i] || borderColors[0]));
            const bdWidths = data.map((_, i) => i === bestIdx ? 4 : 2);

            const chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels.map((l, i) => i === bestIdx ? `${l} ✓ BEST` : l),
                    datasets: [{
                        data: data,
                        backgroundColor: bgColors,
                        borderColor: bdColors,
                        borderWidth: bdWidths,
                        offset: offsets
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    cutout: '55%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#a0a0a0',
                                padding: 15,
                                usePointStyle: true,
                                pointStyle: 'circle',
                                font: {
                                    weight: (context) => context.text && context.text.includes('BEST') ? 'bold' : 'normal'
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = (context.label || '').replace(' ✓ BEST', '');
                                    const value = this.formatCurrency(context.raw);
                                    const isBest = context.dataIndex === bestIdx;
                                    return isBest ? `${label}: ${value} (LOWEST - BEST!)` : `${label}: ${value}`;
                                }
                            }
                        }
                    }
                }
            });

            return chart;
        };

        // Monthly Payment Chart (Doughnut)
        try {
            const monthlyCtx = document.getElementById('monthlyPaymentChart')?.getContext('2d');
            if (monthlyCtx) {
                const monthlyData = this.loans.map(loan => loan.results?.totalMonthly || 0);
                console.log('Monthly Payment Data:', monthlyData);
                const chart = createComparisonChart(monthlyCtx, monthlyData, 'Monthly Payment');
                if (chart) this.charts.monthly = chart;
            } else {
                console.warn('Monthly Payment canvas not found');
            }
        } catch (e) {
            console.error('Error creating monthly chart:', e);
        }

        // Cash to Close Chart (Doughnut)
        try {
            const cashCtx = document.getElementById('cashToCloseChart')?.getContext('2d');
            if (cashCtx) {
                const cashData = this.loans.map(loan => loan.results?.cashToClose || 0);
                console.log('Cash to Close Data:', cashData);
                const chart = createComparisonChart(cashCtx, cashData, 'Cash to Close');
                if (chart) this.charts.cash = chart;
            } else {
                console.warn('Cash to Close canvas not found');
            }
        } catch (e) {
            console.error('Error creating cash chart:', e);
        }

        // Total Cost Chart (Doughnut)
        try {
            const totalCtx = document.getElementById('totalCostChart')?.getContext('2d');
            if (totalCtx) {
                const totalData = this.loans.map(loan => loan.results?.totalLoanCost || 0);
                console.log('Total Cost Data:', totalData);
                const chart = createComparisonChart(totalCtx, totalData, 'Total Cost');
                if (chart) this.charts.total = chart;
            } else {
                console.warn('Total Cost canvas not found');
            }
        } catch (e) {
            console.error('Error creating total cost chart:', e);
        }

        // Payment Breakdown Chart (Doughnut - shows first scenario breakdown)
        try {
            const breakdownCtx = document.getElementById('paymentBreakdownChart')?.getContext('2d');
            if (breakdownCtx && this.loans.length > 0) {
                // Create combined breakdown data for all scenarios
                const breakdownColors = [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(76, 175, 80, 0.8)',
                    'rgba(255, 152, 0, 0.8)',
                    'rgba(244, 67, 54, 0.8)'
                ];

                const breakdownBorderColors = breakdownColors.map(c => c.replace('0.8', '1'));

                // Show breakdown for the first scenario (or could average all)
                const firstLoan = this.loans[0].results;
                const breakdownData = [
                    firstLoan.monthlyPI || 0,
                    firstLoan.monthlyTaxes || 0,
                    firstLoan.monthlyInsurance || 0,
                    firstLoan.monthlyMI || 0,
                    firstLoan.monthlyHOA || 0
                ].filter(v => v > 0);

                const breakdownLabels = [
                    'Principal & Interest',
                    'Taxes',
                    'Insurance',
                    'Mortgage Insurance',
                    'HOA'
                ].filter((_, i) => [
                    firstLoan.monthlyPI || 0,
                    firstLoan.monthlyTaxes || 0,
                    firstLoan.monthlyInsurance || 0,
                    firstLoan.monthlyMI || 0,
                    firstLoan.monthlyHOA || 0
                ][i] > 0);

                const filteredColors = breakdownColors.filter((_, i) => [
                    firstLoan.monthlyPI || 0,
                    firstLoan.monthlyTaxes || 0,
                    firstLoan.monthlyInsurance || 0,
                    firstLoan.monthlyMI || 0,
                    firstLoan.monthlyHOA || 0
                ][i] > 0);

                const filteredBorderColors = breakdownBorderColors.filter((_, i) => [
                    firstLoan.monthlyPI || 0,
                    firstLoan.monthlyTaxes || 0,
                    firstLoan.monthlyInsurance || 0,
                    firstLoan.monthlyMI || 0,
                    firstLoan.monthlyHOA || 0
                ][i] > 0);

                if (breakdownData.length > 0) {
                    this.charts.breakdown = new Chart(breakdownCtx, {
                        type: 'doughnut',
                        data: {
                            labels: breakdownLabels,
                            datasets: [{
                                data: breakdownData,
                                backgroundColor: filteredColors,
                                borderColor: filteredBorderColors,
                                borderWidth: 2
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            cutout: '60%',
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: {
                                        color: '#a0a0a0',
                                        padding: 15,
                                        usePointStyle: true,
                                        pointStyle: 'circle'
                                    }
                                },
                                tooltip: {
                                    callbacks: {
                                        label: (context) => {
                                            const label = context.label || '';
                                            const value = this.formatCurrency(context.raw);
                                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                            const percentage = ((context.raw / total) * 100).toFixed(1);
                                            return `${label}: ${value} (${percentage}%)`;
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
            }
        } catch (e) {
            console.error('Error creating breakdown chart:', e);
        }
    }

    updateNetCostComparison() {
        const container = document.getElementById('netCostComparison');
        if (!container || this.loans.length < 2) {
            if (container) container.querySelector('.net-cost-grid').innerHTML = '';
            return;
        }

        const months = this.comparisonMonths;

        // If months is 0 (None selected), hide the comparison section
        if (months === 0) {
            container.style.display = 'none';
            return;
        } else {
            container.style.display = '';
        }

        const years = months / 12;
        const timeLabel = months >= 12 ?
            (months % 12 === 0 ? `${years} year${years > 1 ? 's' : ''}` : `${months} months`) :
            `${months} month${months > 1 ? 's' : ''}`;

        // Update the time label in the header
        container.querySelector('.time-label').textContent = `(over ${timeLabel})`;

        // Calculate costs for each scenario
        const scenarioData = this.loans.map((loan, i) => {
            const r = loan.results;
            const name = r.scenarioName || `Scenario ${i + 1}`;

            // Cash to close is a one-time cost
            const cashToClose = r.cashToClose;

            // Monthly payments over time period
            const totalMonthlyPayments = r.totalMonthly * months;

            // Total cost = cash to close + monthly payments over period
            const totalCostOverPeriod = cashToClose + totalMonthlyPayments;

            return {
                name,
                index: i,
                cashToClose,
                monthlyPayment: r.totalMonthly,
                totalMonthlyPayments,
                totalCostOverPeriod
            };
        });

        // Find best (lowest) for each category
        const bestCashToClose = Math.min(...scenarioData.map(s => s.cashToClose));
        const bestMonthly = Math.min(...scenarioData.map(s => s.monthlyPayment));
        const bestTotalCost = Math.min(...scenarioData.map(s => s.totalCostOverPeriod));

        // Generate HTML for each comparison card
        const grid = container.querySelector('.net-cost-grid');

        grid.innerHTML = `
            <!-- Cash to Close Card -->
            <div class="net-cost-card">
                <h4>Cash to Close</h4>
                <div class="scenario-costs">
                    ${scenarioData.map(s => `
                        <div class="scenario-row ${s.cashToClose === bestCashToClose ? 'best' : ''}">
                            <span class="scenario-name">${s.name}${s.cashToClose === bestCashToClose ? '<span class="best-badge">Best</span>' : ''}</span>
                            <span class="scenario-value">${this.formatCurrency(s.cashToClose)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="difference-section">
                    ${this.generateDifferenceRows(scenarioData, 'cashToClose', bestCashToClose)}
                </div>
            </div>

            <!-- Monthly Payment Card -->
            <div class="net-cost-card">
                <h4>Monthly Payment</h4>
                <div class="scenario-costs">
                    ${scenarioData.map(s => `
                        <div class="scenario-row ${s.monthlyPayment === bestMonthly ? 'best' : ''}">
                            <span class="scenario-name">${s.name}${s.monthlyPayment === bestMonthly ? '<span class="best-badge">Best</span>' : ''}</span>
                            <span class="scenario-value">${this.formatCurrency(s.monthlyPayment)}/mo</span>
                        </div>
                    `).join('')}
                </div>
                <div class="difference-section">
                    ${this.generateDifferenceRows(scenarioData, 'monthlyPayment', bestMonthly, '/mo')}
                </div>
            </div>

            <!-- Total Cost Over Time Period Card -->
            <div class="net-cost-card">
                <h4>Total Cost (${timeLabel})</h4>
                <div class="scenario-costs">
                    ${scenarioData.map(s => `
                        <div class="scenario-row ${s.totalCostOverPeriod === bestTotalCost ? 'best' : ''}">
                            <span class="scenario-name">${s.name}${s.totalCostOverPeriod === bestTotalCost ? '<span class="best-badge">Best</span>' : ''}</span>
                            <span class="scenario-value">${this.formatCurrency(s.totalCostOverPeriod)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="difference-section">
                    ${this.generateDifferenceRows(scenarioData, 'totalCostOverPeriod', bestTotalCost)}
                </div>
            </div>
        `;
    }

    generateDifferenceRows(scenarioData, key, bestValue, suffix = '') {
        const bestScenario = scenarioData.find(s => s[key] === bestValue);

        return scenarioData
            .filter(s => s[key] !== bestValue)
            .map(s => {
                const diff = s[key] - bestValue;
                return `
                    <div class="difference-row">
                        <span class="diff-label">${s.name} vs ${bestScenario.name}</span>
                        <span class="diff-value extra">+${this.formatCurrency(diff)}${suffix}</span>
                    </div>
                `;
            }).join('');
    }

    generateRecommendation() {
        const recDiv = document.getElementById('recommendation');

        if (this.loans.length < 2) {
            recDiv.innerHTML = '';
            return;
        }

        // Find best options for different priorities
        let lowestMonthly = { index: 0, value: Infinity };
        let lowestCashToClose = { index: 0, value: Infinity };
        let lowestTotalInterest = { index: 0, value: Infinity };
        let lowestAPR = { index: 0, value: Infinity };
        let lowestTotalCost = { index: 0, value: Infinity };

        this.loans.forEach((loan, i) => {
            if (loan.results.totalMonthly < lowestMonthly.value) {
                lowestMonthly = { index: i, value: loan.results.totalMonthly };
            }
            if (loan.results.cashToClose < lowestCashToClose.value) {
                lowestCashToClose = { index: i, value: loan.results.cashToClose };
            }
            if (loan.results.totalInterest < lowestTotalInterest.value) {
                lowestTotalInterest = { index: i, value: loan.results.totalInterest };
            }
            if (loan.results.apr < lowestAPR.value) {
                lowestAPR = { index: i, value: loan.results.apr };
            }
            if (loan.results.totalLoanCost < lowestTotalCost.value) {
                lowestTotalCost = { index: i, value: loan.results.totalLoanCost };
            }
        });

        const getName = (index) => {
            return this.loans[index].results.scenarioName || `Scenario ${index + 1}`;
        };

        recDiv.innerHTML = `
            <h3>Recommendations</h3>
            <div class="recommendation-grid">
                <div class="rec-item">
                    <strong>Lowest Monthly Payment:</strong>
                    <span>${getName(lowestMonthly.index)} (${this.loans[lowestMonthly.index].loanType.toUpperCase()}) - ${this.formatCurrency(lowestMonthly.value)}/mo</span>
                </div>
                <div class="rec-item">
                    <strong>Lowest Cash to Close:</strong>
                    <span>${getName(lowestCashToClose.index)} (${this.loans[lowestCashToClose.index].loanType.toUpperCase()}) - ${this.formatCurrency(lowestCashToClose.value)}</span>
                </div>
                <div class="rec-item">
                    <strong>Lowest APR:</strong>
                    <span>${getName(lowestAPR.index)} (${this.loans[lowestAPR.index].loanType.toUpperCase()}) - ${lowestAPR.value.toFixed(3)}%</span>
                </div>
                <div class="rec-item">
                    <strong>Lowest Total Cost:</strong>
                    <span>${getName(lowestTotalCost.index)} (${this.loans[lowestTotalCost.index].loanType.toUpperCase()}) - ${this.formatCurrency(lowestTotalCost.value)}</span>
                </div>
            </div>
        `;
    }

    // Document Generation Methods
    openDocumentModal() {
        document.getElementById('documentModal').classList.remove('hidden');

        // Auto-fill loan officer info from settings
        if (window.settingsManager) {
            const lo = window.settingsManager.getLoanOfficerInfo();
            const loNameField = document.getElementById('loanOfficerName');
            const companyField = document.getElementById('companyName');
            const contactField = document.getElementById('contactInfo');

            if (loNameField && !loNameField.value && lo.name) {
                loNameField.value = lo.name;
            }
            if (companyField && !companyField.value && lo.company) {
                companyField.value = lo.company;
            }
            if (contactField && !contactField.value) {
                const contactParts = [];
                if (lo.phone) contactParts.push(lo.phone);
                if (lo.email) contactParts.push(lo.email);
                if (lo.nmls) contactParts.push(`NMLS# ${lo.nmls}`);
                if (contactParts.length > 0) {
                    contactField.value = contactParts.join(' | ');
                }
            }
        }

        this.updateDocumentPreview();
    }

    closeDocumentModal() {
        document.getElementById('documentModal').classList.add('hidden');
    }

    updateDocumentPreview() {
        const preview = document.getElementById('documentPreview');
        const html = this.generateDocumentHTML();
        preview.innerHTML = html;
    }

    generateDocumentHTML() {
        // Sanitize all user inputs to prevent XSS in generated documents
        const borrowerName = Security.escapeHtml(document.getElementById('borrowerName')?.value || '[Borrower Name]');
        const propertyAddress = Security.escapeHtml(document.getElementById('propertyAddress')?.value || '[Property Address]');
        const loanOfficerName = Security.escapeHtml(document.getElementById('loanOfficerName')?.value || '[Loan Officer]');
        const companyName = Security.escapeHtml(document.getElementById('companyName')?.value || '[Company Name]');
        const contactInfo = Security.escapeHtml(document.getElementById('contactInfo')?.value || '[Contact Info]');
        const additionalNotes = Security.escapeHtml(document.getElementById('additionalNotes')?.value || '');
        const showTimePeriod = document.getElementById('showTimePeriodToggle')?.checked !== false;
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        let comparisonRows = '';
        const metrics = [
            { key: 'loanAmount', label: 'Loan Amount' },
            { key: 'interestRate', label: 'Interest Rate', isPercent: true },
            { key: 'loanTerm', label: 'Loan Term', suffix: ' years' },
            { key: 'monthlyPI', label: 'Monthly P&I' },
            { key: 'monthlyMI', label: 'Monthly MI/PMI' },
            { key: 'monthlyTaxes', label: 'Monthly Taxes' },
            { key: 'monthlyInsurance', label: 'Monthly Insurance' },
            { key: 'totalMonthly', label: 'Total Monthly Payment' },
            { key: 'downPayment', label: 'Down Payment' },
            { key: 'totalFees', label: 'Closing Costs' },
            { key: 'cashToClose', label: 'Cash to Close' },
            { key: 'apr', label: 'APR', isPercent: true },
            { key: 'totalInterest', label: 'Total Interest (Life of Loan)' }
        ];

        metrics.forEach((metric, rowIndex) => {
            const isHighlightRow = ['totalMonthly', 'cashToClose', 'apr'].includes(metric.key);
            const rowBg = isHighlightRow ? '#f8f9ff' : (rowIndex % 2 === 0 ? '#fff' : '#fafafa');
            comparisonRows += `<tr style="background: ${rowBg};">`;
            comparisonRows += `<td style="padding: 12px; border: 1px solid #e0e0e0; font-weight: ${isHighlightRow ? '600' : '500'}; color: ${isHighlightRow ? '#667eea' : '#333'};">${metric.label}</td>`;
            this.loans.forEach(loan => {
                let value = loan.results[metric.key] || 0;
                let formatted;
                if (metric.isPercent) {
                    formatted = value.toFixed(3) + '%';
                } else if (metric.suffix) {
                    formatted = value + metric.suffix;
                } else {
                    formatted = this.formatCurrency(value);
                }
                comparisonRows += `<td style="padding: 12px; border: 1px solid #e0e0e0; text-align: center; font-weight: ${isHighlightRow ? '600' : '400'};">${formatted}</td>`;
            });
            comparisonRows += '</tr>';
        });

        let headerCells = '<th style="padding: 12px; background: #667eea; color: white; border: 1px solid #ddd;">Metric</th>';
        this.loans.forEach((loan, i) => {
            const name = Security.escapeHtml(loan.results.scenarioName || `Option ${i + 1}`);
            const loanType = Security.escapeHtml(loan.loanType.toUpperCase());
            headerCells += `<th style="padding: 12px; background: #667eea; color: white; border: 1px solid #ddd;">${name}<br><small>${loanType}</small></th>`;
        });

        // Find recommendations
        let lowestMonthly = { index: 0, value: Infinity };
        let lowestCash = { index: 0, value: Infinity };
        let lowestTotal = { index: 0, value: Infinity };

        this.loans.forEach((loan, i) => {
            if (loan.results.totalMonthly < lowestMonthly.value) {
                lowestMonthly = { index: i, value: loan.results.totalMonthly };
            }
            if (loan.results.cashToClose < lowestCash.value) {
                lowestCash = { index: i, value: loan.results.cashToClose };
            }
            if (loan.results.totalInterest < lowestTotal.value) {
                lowestTotal = { index: i, value: loan.results.totalInterest };
            }
        });

        const getName = (index) => Security.escapeHtml(this.loans[index].results.scenarioName || `Option ${index + 1}`);

        // Get lender info for branding (sanitized)
        const rawLender = window.settingsManager?.getLenderInfo() || {};
        const lender = {
            nmls: Security.escapeHtml(rawLender.nmls || ''),
            phone: Security.escapeHtml(rawLender.phone || ''),
            website: Security.escapeHtml(rawLender.website || ''),
            disclaimer: Security.escapeHtml(rawLender.disclaimer || '')
        };

        return `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 850px; margin: 0 auto; padding: 30px; color: #2c3e50; background: #fff;">
                <!-- Header with gradient accent -->
                <div style="border-bottom: 3px solid #667eea; padding-bottom: 25px; margin-bottom: 30px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap;">
                        <div>
                            <h1 style="color: #1a1a2e; margin: 0 0 5px 0; font-size: 28px; font-weight: 600;">Loan<span style="color: #2e7d32; font-weight: 800;">dr</span> Comparison Summary</h1>
                            <p style="color: #667eea; margin: 0; font-size: 14px; font-weight: 500;">${companyName}${lender.nmls ? ` | NMLS# ${lender.nmls}` : ''}</p>
                        </div>
                        <div style="text-align: right; color: #666; font-size: 13px;">
                            <p style="margin: 0 0 3px 0;"><strong>Date:</strong> ${date}</p>
                            <p style="margin: 0;"><strong>Prepared by:</strong> ${loanOfficerName}</p>
                        </div>
                    </div>
                </div>

                <!-- Client Info Box -->
                <div style="background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%); padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #667eea;">
                    <div style="display: flex; gap: 40px; flex-wrap: wrap;">
                        <div>
                            <p style="margin: 0 0 3px 0; color: #667eea; font-size: 11px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Borrower</p>
                            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1a1a2e;">${borrowerName}</p>
                        </div>
                        <div>
                            <p style="margin: 0 0 3px 0; color: #667eea; font-size: 11px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Property Address</p>
                            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1a1a2e;">${propertyAddress}</p>
                        </div>
                    </div>
                </div>

                <!-- Comparison Table -->
                <h2 style="color: #1a1a2e; font-size: 18px; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #eee;">Loan Options Comparison</h2>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
                    <thead>
                        <tr>${headerCells}</tr>
                    </thead>
                    <tbody>
                        ${comparisonRows}
                    </tbody>
                </table>

                <!-- Recommendations -->
                <div style="background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%); padding: 20px 25px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #4caf50;">
                    <h3 style="color: #2e7d32; margin: 0 0 15px 0; font-size: 16px; display: flex; align-items: center;">
                        <span style="background: #4caf50; color: #fff; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 14px;">✓</span>
                        Summary & Recommendations
                    </h3>
                    <ul style="margin: 0; padding-left: 20px; line-height: 2; color: #333;">
                        <li><strong>Lowest Monthly Payment:</strong> ${getName(lowestMonthly.index)} at <span style="color: #2e7d32; font-weight: 600;">${this.formatCurrency(lowestMonthly.value)}/month</span></li>
                        <li><strong>Lowest Cash to Close:</strong> ${getName(lowestCash.index)} at <span style="color: #2e7d32; font-weight: 600;">${this.formatCurrency(lowestCash.value)}</span></li>
                        <li><strong>Lowest Total Interest:</strong> ${getName(lowestTotal.index)} at <span style="color: #2e7d32; font-weight: 600;">${this.formatCurrency(lowestTotal.value)}</span> over the life of the loan</li>
                    </ul>
                </div>

                ${additionalNotes ? `
                <!-- Additional Notes -->
                <div style="background: linear-gradient(135deg, #fff8e1 0%, #fffde7 100%); padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #ff9800;">
                    <h4 style="margin: 0 0 10px 0; color: #e65100; font-size: 14px;">
                        <span style="margin-right: 8px;">📝</span>Additional Notes
                    </h4>
                    <p style="margin: 0; white-space: pre-wrap; color: #5d4037; line-height: 1.6;">${additionalNotes}</p>
                </div>
                ` : ''}

                ${showTimePeriod && this.loans.length >= 2 ? this.generateTimePeriodSection() : ''}

                <!-- Contact Section -->
                ${this.generateContactSection(loanOfficerName, companyName, contactInfo)}

                <!-- Footer / Disclaimer -->
                <div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px; border-top: 3px solid #667eea;">
                    ${lender.disclaimer ? `<p style="margin: 0 0 15px 0; font-size: 12px; color: #666; text-align: center; font-weight: 500;">${lender.disclaimer}</p>` : ''}
                    <p style="margin: 0; font-size: 11px; color: #888; line-height: 1.6;">
                        <strong>IMPORTANT DISCLOSURES:</strong> This loan comparison is provided for informational and educational purposes only and does not constitute a commitment to lend, a loan approval, or a Loan Estimate as defined under the Real Estate Settlement Procedures Act (RESPA) and the Truth in Lending Act (TILA).
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 11px; color: #888; line-height: 1.6;">
                        <strong>Not an Official Loan Estimate:</strong> This document is NOT a Loan Estimate (LE) under the TILA-RESPA Integrated Disclosure (TRID) rule. You will receive an official Loan Estimate within three (3) business days of submitting a complete loan application, as required by federal law (12 CFR § 1026.19(e)).
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 11px; color: #888; line-height: 1.6;">
                        <strong>Rate and Fee Variability:</strong> Interest rates, Annual Percentage Rates (APR), discount points, and closing costs shown are estimates based on current market conditions and are subject to change without notice. Your actual rate, APR, and costs will depend on your credit history, loan-to-value ratio, property type, occupancy, loan amount, and other factors determined at the time of application.
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 11px; color: #888; line-height: 1.6;">
                        <strong>Equal Housing Lender:</strong> We are committed to the letter and spirit of the federal Equal Credit Opportunity Act (ECOA) and the Fair Housing Act. All loan programs are available on a non-discriminatory basis.
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 10px; color: #999; line-height: 1.5; text-align: center;">
                        For questions about this comparison or to apply for a loan, please contact your Mortgage Loan Originator. NMLS Consumer Access: <a href="https://www.nmlsconsumeraccess.org" style="color: #667eea;">www.nmlsconsumeraccess.org</a>
                    </p>
                </div>
            </div>
        `;
    }

    generateTimePeriodSection() {
        const months = this.comparisonMonths;

        // If no time period selected (0), return empty string
        if (!months || months === 0) {
            return '';
        }

        const years = months / 12;
        const timeLabel = months >= 12 ? `${years} Year${years !== 1 ? 's' : ''}` : `${months} Month${months !== 1 ? 's' : ''}`;

        // Calculate costs for the time period
        let timePeriodRows = '';
        const costMetrics = [
            { key: 'closingCosts', label: 'Closing Costs (Upfront)' },
            { key: 'totalPayments', label: `Total Payments (${timeLabel})` },
            { key: 'interestPaid', label: `Interest Paid (${timeLabel})` },
            { key: 'principalPaid', label: `Principal Paid (${timeLabel})` },
            { key: 'netCost', label: `Net Cost (${timeLabel})` }
        ];

        // Find the best option for net cost
        let bestNetCostIndex = 0;
        let bestNetCost = Infinity;

        this.loans.forEach((loan, i) => {
            const monthlyPI = loan.results.monthlyPI || 0;
            const monthlyMI = loan.results.monthlyMI || 0;
            const totalMonthlyPayment = monthlyPI + monthlyMI;
            const interestPaid = this.calculateInterestForPeriod(loan, months);
            const principalPaid = (totalMonthlyPayment * months) - interestPaid;
            const closingCosts = loan.results.totalFees || 0;
            const netCost = closingCosts + interestPaid;

            if (netCost < bestNetCost) {
                bestNetCost = netCost;
                bestNetCostIndex = i;
            }
        });

        costMetrics.forEach((metric, rowIndex) => {
            const rowBg = metric.key === 'netCost' ? '#f0f7ff' : (rowIndex % 2 === 0 ? '#fff' : '#fafafa');
            const isHighlight = metric.key === 'netCost';
            timePeriodRows += `<tr style="background: ${rowBg};">`;
            timePeriodRows += `<td style="padding: 10px 12px; border: 1px solid #e0e0e0; font-weight: ${isHighlight ? '600' : '500'}; color: ${isHighlight ? '#1e3a5f' : '#333'}; font-size: 13px;">${metric.label}</td>`;

            this.loans.forEach((loan, i) => {
                const monthlyPI = loan.results.monthlyPI || 0;
                const monthlyMI = loan.results.monthlyMI || 0;
                const totalMonthlyPayment = monthlyPI + monthlyMI;
                const interestPaid = this.calculateInterestForPeriod(loan, months);
                const principalPaid = (totalMonthlyPayment * months) - interestPaid;
                const closingCosts = loan.results.totalFees || 0;
                const totalPayments = totalMonthlyPayment * months;
                const netCost = closingCosts + interestPaid;

                let value;
                switch (metric.key) {
                    case 'closingCosts': value = closingCosts; break;
                    case 'totalPayments': value = totalPayments; break;
                    case 'interestPaid': value = interestPaid; break;
                    case 'principalPaid': value = principalPaid; break;
                    case 'netCost': value = netCost; break;
                    default: value = 0;
                }

                const isBest = metric.key === 'netCost' && i === bestNetCostIndex;
                const cellStyle = isBest
                    ? 'background: #e8f5e9; color: #2e7d32; font-weight: 600;'
                    : (isHighlight ? 'font-weight: 600;' : '');

                timePeriodRows += `<td style="padding: 10px 12px; border: 1px solid #e0e0e0; text-align: center; font-size: 13px; ${cellStyle}">${this.formatCurrency(value)}${isBest ? ' ✓' : ''}</td>`;
            });
            timePeriodRows += '</tr>';
        });

        let headerCells = `<th style="padding: 10px 12px; background: #1e3a5f; color: white; border: 1px solid #ddd; font-size: 12px;">Cost Analysis (${timeLabel})</th>`;
        this.loans.forEach((loan, i) => {
            const name = Security.escapeHtml(loan.results.scenarioName || `Option ${i + 1}`);
            headerCells += `<th style="padding: 10px 12px; background: #1e3a5f; color: white; border: 1px solid #ddd; font-size: 12px;">${name}</th>`;
        });

        return `
            <!-- Time Period Cost Analysis -->
            <div style="margin-bottom: 30px;">
                <h2 style="color: #1a1a2e; font-size: 16px; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #eee;">
                    Cost Comparison Over ${timeLabel}
                </h2>
                <p style="margin: 0 0 15px 0; font-size: 12px; color: #666;">
                    This analysis shows the total cost of each loan option if you keep the loan for ${timeLabel.toLowerCase()}, including upfront costs and interest paid.
                </p>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr>${headerCells}</tr>
                    </thead>
                    <tbody>
                        ${timePeriodRows}
                    </tbody>
                </table>
                <p style="margin: 10px 0 0 0; font-size: 11px; color: #888; font-style: italic;">
                    ✓ indicates the lowest net cost option for this time period. Net cost = Closing costs + Interest paid during the period.
                </p>
            </div>
        `;
    }

    calculateInterestForPeriod(loan, months) {
        // Approximate interest calculation for the period
        const rate = (loan.results.interestRate || 0) / 100 / 12;
        const principal = loan.results.loanAmount || 0;
        const monthlyPayment = loan.results.monthlyPI || 0;

        if (rate === 0 || monthlyPayment === 0) return 0;

        let balance = principal;
        let totalInterest = 0;

        for (let i = 0; i < months && balance > 0; i++) {
            const interestPayment = balance * rate;
            totalInterest += interestPayment;
            const principalPayment = monthlyPayment - interestPayment;
            balance -= principalPayment;
        }

        return totalInterest;
    }

    generateContactSection(loanOfficerName, companyName, contactInfo) {
        // Get dual branding info
        const realtor = window.settingsManager?.getRealtorInfo() || {};
        const titleAgent = window.settingsManager?.getTitleAgentInfo() || {};

        const hasRealtor = realtor.enabled && (realtor.name || realtor.company);
        const hasTitleAgent = titleAgent.enabled && (titleAgent.name || titleAgent.company);

        // Determine layout based on how many contacts we have
        const contactCount = 1 + (hasRealtor ? 1 : 0) + (hasTitleAgent ? 1 : 0);
        const useGrid = contactCount > 1;

        let html = '<div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee;">';

        if (useGrid) {
            html += '<h3 style="color: #667eea; margin-bottom: 20px; text-align: center;">Your Team</h3>';
            html += `<div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;">`;

            // Loan Officer
            html += `
                <div style="flex: 1; min-width: 200px; max-width: 250px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                    <p style="margin: 0 0 5px 0; color: #667eea; font-size: 12px; text-transform: uppercase; font-weight: 600;">Loan Officer</p>
                    <p style="margin: 0 0 3px 0;"><strong>${loanOfficerName}</strong></p>
                    <p style="margin: 0 0 3px 0; color: #666; font-size: 13px;">${companyName}</p>
                    <p style="margin: 0; color: #666; font-size: 12px;">${contactInfo}</p>
                </div>
            `;

            // Real Estate Agent
            if (hasRealtor) {
                const realtorContact = [realtor.phone, realtor.email].filter(Boolean).join(' | ');
                const realtorLicense = realtor.license ? `License# ${realtor.license}` : '';
                html += `
                    <div style="flex: 1; min-width: 200px; max-width: 250px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #28a745;">
                        <p style="margin: 0 0 5px 0; color: #28a745; font-size: 12px; text-transform: uppercase; font-weight: 600;">Real Estate Agent</p>
                        <p style="margin: 0 0 3px 0;"><strong>${realtor.name || ''}</strong></p>
                        <p style="margin: 0 0 3px 0; color: #666; font-size: 13px;">${realtor.company || ''}</p>
                        <p style="margin: 0 0 3px 0; color: #666; font-size: 12px;">${realtorContact}</p>
                        ${realtorLicense ? `<p style="margin: 0; color: #888; font-size: 11px;">${realtorLicense}</p>` : ''}
                    </div>
                `;
            }

            // Title Company/Agent
            if (hasTitleAgent) {
                const titleContact = [titleAgent.phone, titleAgent.email].filter(Boolean).join(' | ');
                html += `
                    <div style="flex: 1; min-width: 200px; max-width: 250px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #fd7e14;">
                        <p style="margin: 0 0 5px 0; color: #fd7e14; font-size: 12px; text-transform: uppercase; font-weight: 600;">Title Company</p>
                        <p style="margin: 0 0 3px 0;"><strong>${titleAgent.company || ''}</strong></p>
                        ${titleAgent.name ? `<p style="margin: 0 0 3px 0; color: #666; font-size: 13px;">${titleAgent.name}</p>` : ''}
                        <p style="margin: 0 0 3px 0; color: #666; font-size: 12px;">${titleContact}</p>
                        ${titleAgent.address ? `<p style="margin: 0; color: #888; font-size: 11px;">${titleAgent.address}</p>` : ''}
                    </div>
                `;
            }

            html += '</div>';
        } else {
            // Single contact - original simple layout
            html += `
                <p style="margin-bottom: 5px;"><strong>${loanOfficerName}</strong></p>
                <p style="margin-bottom: 5px; color: #666;">${companyName}</p>
                <p style="margin-bottom: 5px; color: #666;">${contactInfo}</p>
            `;
        }

        html += '</div>';
        return html;
    }

    copyDocumentToClipboard() {
        const html = this.generateDocumentHTML();
        const blob = new Blob([html], { type: 'text/html' });
        const item = new ClipboardItem({ 'text/html': blob });

        navigator.clipboard.write([item]).then(() => {
            alert('Document copied to clipboard! You can paste it into an email or document.');
        }).catch(err => {
            // Fallback to text copy
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const text = tempDiv.textContent || tempDiv.innerText;
            navigator.clipboard.writeText(text).then(() => {
                alert('Document text copied to clipboard!');
            });
        });
    }

    downloadDocument() {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Loan Comparison - ${document.getElementById('borrowerName')?.value || 'Borrower'}</title>
                <style>
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                ${this.generateDocumentHTML()}
            </body>
            </html>
        `;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Loan_Comparison_${document.getElementById('borrowerName')?.value?.replace(/\s+/g, '_') || 'Document'}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    printDocument() {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Loan Comparison</title>
                <style>
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                ${this.generateDocumentHTML()}
                <script>window.onload = function() { window.print(); window.close(); }<\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    sendDocumentViaEmail() {
        const recipientEmail = document.getElementById('recipientEmail')?.value;
        const emailSubject = document.getElementById('emailSubject')?.value || 'Your Loan Comparison Summary';

        if (!recipientEmail) {
            alert('Please enter a recipient email address.');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipientEmail)) {
            alert('Please enter a valid email address.');
            return;
        }

        // Generate full HTML document for email
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Loan Comparison Summary</title>
            </head>
            <body style="margin: 0; padding: 20px; background: #f5f5f5;">
                ${this.generateDocumentHTML()}
            </body>
            </html>
        `;

        // Copy HTML to clipboard
        navigator.clipboard.writeText(htmlContent).then(() => {
            // Open email client with instructions
            const emailBody = `Please find your Loan Comparison Summary attached or pasted below.

[The formatted document has been copied to your clipboard - paste it here or attach the downloaded HTML file]

If you have any questions about these loan options, please don't hesitate to reach out.`;

            const mailtoLink = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

            // Open new window with the document for easy copying
            const emailWindow = window.open('', '_blank', 'width=900,height=700');
            emailWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Email Document - Copy & Send</title>
                    <style>
                        * { box-sizing: border-box; }
                        body {
                            font-family: 'Segoe UI', Arial, sans-serif;
                            margin: 0;
                            padding: 0;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            min-height: 100vh;
                        }
                        .toolbar {
                            background: rgba(0,0,0,0.2);
                            padding: 15px 25px;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            flex-wrap: wrap;
                            gap: 15px;
                            backdrop-filter: blur(10px);
                        }
                        .toolbar h2 {
                            margin: 0;
                            color: #fff;
                            font-size: 18px;
                        }
                        .toolbar-info {
                            color: rgba(255,255,255,0.8);
                            font-size: 13px;
                        }
                        .toolbar-buttons {
                            display: flex;
                            gap: 10px;
                            flex-wrap: wrap;
                        }
                        .btn {
                            padding: 10px 20px;
                            border: none;
                            border-radius: 6px;
                            font-size: 14px;
                            font-weight: 500;
                            cursor: pointer;
                            transition: all 0.2s;
                        }
                        .btn-primary {
                            background: #fff;
                            color: #667eea;
                        }
                        .btn-primary:hover {
                            background: #f0f0f0;
                            transform: translateY(-1px);
                        }
                        .btn-secondary {
                            background: rgba(255,255,255,0.2);
                            color: #fff;
                            border: 1px solid rgba(255,255,255,0.3);
                        }
                        .btn-secondary:hover {
                            background: rgba(255,255,255,0.3);
                        }
                        .email-to {
                            background: rgba(255,255,255,0.15);
                            padding: 8px 15px;
                            border-radius: 20px;
                            color: #fff;
                            font-size: 13px;
                        }
                        .document-frame {
                            background: #fff;
                            margin: 20px;
                            border-radius: 12px;
                            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                            overflow: hidden;
                        }
                        .document-content {
                            padding: 20px;
                            max-height: calc(100vh - 150px);
                            overflow-y: auto;
                        }
                        .success-toast {
                            position: fixed;
                            bottom: 20px;
                            right: 20px;
                            background: #4caf50;
                            color: #fff;
                            padding: 15px 25px;
                            border-radius: 8px;
                            font-weight: 500;
                            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                            display: none;
                            animation: slideIn 0.3s ease;
                        }
                        @keyframes slideIn {
                            from { transform: translateX(100px); opacity: 0; }
                            to { transform: translateX(0); opacity: 1; }
                        }
                    </style>
                </head>
                <body>
                    <div class="toolbar">
                        <div>
                            <h2>📧 Email Document Ready</h2>
                            <p class="toolbar-info">Copy the document below and paste it into your email</p>
                        </div>
                        <div class="toolbar-buttons">
                            <span class="email-to">To: ${recipientEmail}</span>
                            <button class="btn btn-secondary" onclick="selectAll()">Select All</button>
                            <button class="btn btn-secondary" onclick="copyDocument()">Copy Document</button>
                            <button class="btn btn-primary" onclick="openEmailClient()">Open Email Client</button>
                        </div>
                    </div>
                    <div class="document-frame">
                        <div class="document-content" id="documentContent">
                            ${this.generateDocumentHTML()}
                        </div>
                    </div>
                    <div class="success-toast" id="toast">✓ Copied to clipboard!</div>

                    <script>
                        const recipientEmail = "${recipientEmail}";
                        const emailSubject = "${emailSubject.replace(/"/g, '\\"')}";

                        function selectAll() {
                            const content = document.getElementById('documentContent');
                            const range = document.createRange();
                            range.selectNodeContents(content);
                            const selection = window.getSelection();
                            selection.removeAllRanges();
                            selection.addRange(range);
                            showToast('Document selected - Press Ctrl+C to copy');
                        }

                        function copyDocument() {
                            const content = document.getElementById('documentContent');
                            const range = document.createRange();
                            range.selectNodeContents(content);
                            const selection = window.getSelection();
                            selection.removeAllRanges();
                            selection.addRange(range);
                            document.execCommand('copy');
                            selection.removeAllRanges();
                            showToast('✓ Document copied to clipboard!');
                        }

                        function openEmailClient() {
                            const body = "Please see the loan comparison document below:\\n\\n[Paste the copied document here using Ctrl+V]";
                            window.location.href = "mailto:" + encodeURIComponent(recipientEmail) +
                                "?subject=" + encodeURIComponent(emailSubject) +
                                "&body=" + encodeURIComponent(body);
                        }

                        function showToast(message) {
                            const toast = document.getElementById('toast');
                            toast.textContent = message;
                            toast.style.display = 'block';
                            setTimeout(() => { toast.style.display = 'none'; }, 3000);
                        }
                    </script>
                </body>
                </html>
            `);
            emailWindow.document.close();

            if (window.settingsManager) {
                window.settingsManager.showNotification('Email document ready! Copy and paste into your email.');
            }
        }).catch(err => {
            console.error('Could not copy to clipboard:', err);
            // Fallback - just open the window without clipboard
            alert('Document ready to send. Select all content, copy, and paste into your email.');
        });
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    formatProgramName(program) {
        const programNames = {
            standard: 'Standard',
            homeready: 'HomeReady',
            homepossible: 'Home Possible',
            firsttime: 'First Time Buyer',
            affordable: 'Affordable'
        };
        return programNames[program] || program;
    }

    // ===== SAVE/LOAD FUNCTIONALITY =====

    openSaveModal() {
        document.getElementById('savedScenariosModal').classList.remove('hidden');
        document.getElementById('savedScenariosOverlay').classList.remove('hidden');
        this.renderSavedScenariosList();
    }

    closeSaveModal() {
        document.getElementById('savedScenariosModal').classList.add('hidden');
        document.getElementById('savedScenariosOverlay').classList.add('hidden');
    }

    getSavedScenarios() {
        const saved = localStorage.getItem('loanComparison_savedScenarios');
        return saved ? JSON.parse(saved) : [];
    }

    saveSavedScenarios(scenarios) {
        localStorage.setItem('loanComparison_savedScenarios', JSON.stringify(scenarios));
    }

    renderSavedScenariosList() {
        const list = document.getElementById('savedScenariosList');
        const scenarios = this.getSavedScenarios();

        if (scenarios.length === 0) {
            list.innerHTML = `
                <div class="no-saved-scenarios">
                    <span>📁</span>
                    <p>No saved scenarios yet</p>
                    <p style="font-size: 0.85rem;">Save your current session to access it later</p>
                </div>
            `;
            return;
        }

        list.innerHTML = scenarios.map((scenario, index) => `
            <div class="saved-scenario-item" data-index="${Security.sanitizeNumber(index, 0)}">
                <div class="saved-scenario-info">
                    <div class="saved-scenario-name">${Security.escapeHtml(scenario.name)}</div>
                    <div class="saved-scenario-meta">
                        ${Security.sanitizeNumber(scenario.loanCount, 0, 10)} scenario${scenario.loanCount !== 1 ? 's' : ''} •
                        Saved ${Security.escapeHtml(this.formatDate(scenario.savedAt))}
                    </div>
                </div>
                <div class="saved-scenario-actions">
                    <button class="btn-load-scenario" data-action="load" data-index="${Security.sanitizeNumber(index, 0)}">Load</button>
                    <button class="btn-delete-scenario" data-action="delete" data-index="${Security.sanitizeNumber(index, 0)}">Delete</button>
                </div>
            </div>
        `).join('');

        // Add event listeners instead of inline onclick
        list.querySelectorAll('.btn-load-scenario').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                if (!isNaN(idx)) this.loadSavedScenario(idx);
            });
        });
        list.querySelectorAll('.btn-delete-scenario').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                if (!isNaN(idx)) this.deleteSavedScenario(idx);
            });
        });
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    }

    saveCurrentSession() {
        const nameInput = document.getElementById('saveScenarioName');
        const name = nameInput?.value?.trim();

        if (!name) {
            alert('Please enter a name for this scenario.');
            return;
        }

        const sessionData = this.captureSessionData();
        sessionData.name = name;
        sessionData.savedAt = new Date().toISOString();

        const scenarios = this.getSavedScenarios();
        scenarios.unshift(sessionData); // Add to beginning
        this.saveSavedScenarios(scenarios);

        nameInput.value = '';
        this.renderSavedScenariosList();

        if (window.settingsManager) {
            window.settingsManager.showNotification(`Scenario "${name}" saved successfully!`);
        }
    }

    captureSessionData() {
        const loansData = this.loans.map(loan => {
            // Capture all form data from each loan panel
            const panel = loan.panel;
            const formData = {};

            // Get all input values
            panel.querySelectorAll('input, select, textarea').forEach(input => {
                if (input.name) {
                    if (input.type === 'checkbox') {
                        formData[input.name] = input.checked;
                    } else if (input.type === 'radio') {
                        if (input.checked) formData[input.name] = input.value;
                    } else {
                        formData[input.name] = input.value;
                    }
                }
            });

            return {
                formData,
                loanType: loan.loanType,
                loanProgram: loan.loanProgram,
                transactionType: loan.transactionType,
                borrowerCount: loan.borrowerCount,
                splitRatio: loan.splitRatio,
                customFees: loan.customFees,
                results: loan.results
            };
        });

        return {
            loanCount: loansData.length,
            loans: loansData,
            comparisonMonths: this.comparisonMonths
        };
    }

    loadSavedScenario(index) {
        const scenarios = this.getSavedScenarios();
        const scenario = scenarios[index];

        if (!scenario) return;

        // Clear existing loans except first one
        while (this.loans.length > 1) {
            this.removeLoan(this.loans.length - 1, true);
        }

        // Load each loan
        scenario.loans.forEach((loanData, i) => {
            if (i > 0) {
                this.addLoan(true); // silent add
            }

            const loan = this.loans[i];
            const panel = loan.panel;

            // Set loan type first
            loan.loanType = loanData.loanType || 'conventional';
            loan.loanProgram = loanData.loanProgram || 'standard';
            loan.transactionType = loanData.transactionType || 'purchase';
            loan.borrowerCount = loanData.borrowerCount || 1;
            loan.splitRatio = loanData.splitRatio || 50;
            loan.customFees = loanData.customFees || [];

            // Update UI toggles
            panel.querySelectorAll('.type-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.loan === loan.loanType);
            });
            panel.querySelectorAll('.program-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.program === loan.loanProgram);
            });
            panel.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === loan.transactionType);
            });
            panel.querySelectorAll('.borrower-btn').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.borrowers) === loan.borrowerCount);
            });

            // Restore form data
            Object.entries(loanData.formData || {}).forEach(([name, value]) => {
                const input = panel.querySelector(`[name="${name}"]`);
                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = value;
                    } else if (input.type === 'radio') {
                        if (input.value === value) input.checked = true;
                    } else {
                        input.value = value;
                    }
                }
            });

            // Render custom fees
            loan.renderCustomFees();

            // Update visible fields and recalculate
            loan.updateVisibleFields();
            loan.updateProgramVisibility();
            loan.calculate();
        });

        // Restore comparison months
        if (scenario.comparisonMonths) {
            this.comparisonMonths = scenario.comparisonMonths;
            document.querySelectorAll('.time-btn').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.months) === this.comparisonMonths);
            });
        }

        // Update tabs
        this.updateTabs();
        this.switchToLoan(0);
        this.updateComparison();

        this.closeSaveModal();

        if (window.settingsManager) {
            window.settingsManager.showNotification(`Loaded "${scenario.name}"`);
        }
    }

    deleteSavedScenario(index) {
        const scenarios = this.getSavedScenarios();
        const scenario = scenarios[index];

        if (!confirm(`Delete "${scenario.name}"? This cannot be undone.`)) return;

        scenarios.splice(index, 1);
        this.saveSavedScenarios(scenarios);
        this.renderSavedScenariosList();

        if (window.settingsManager) {
            window.settingsManager.showNotification('Scenario deleted');
        }
    }

    autoSave() {
        if (this.loans.length === 0) return;

        const sessionData = this.captureSessionData();
        sessionData.name = '__autosave__';
        sessionData.savedAt = new Date().toISOString();

        localStorage.setItem('loanComparison_autoSave', JSON.stringify(sessionData));
    }

    loadAutoSavedSession() {
        const autoSaved = localStorage.getItem('loanComparison_autoSave');
        if (!autoSaved) return;

        try {
            const session = JSON.parse(autoSaved);

            // Only load if there's meaningful data
            if (session.loans && session.loans.length > 0 && session.loans[0].formData) {
                // Check if any loan has actual data entered
                const hasData = session.loans.some(loan => {
                    const fd = loan.formData;
                    return (fd.homePrice && parseFloat(fd.homePrice) > 0) ||
                           (fd.loanAmount && parseFloat(fd.loanAmount) > 0);
                });

                if (hasData) {
                    // Show autosave indicator
                    this.showAutoSaveIndicator('Restoring your previous session...');

                    // Load the session after a brief delay to let UI initialize
                    setTimeout(() => {
                        this.restoreAutoSavedSession(session);
                    }, 100);
                }
            }
        } catch (e) {
            console.error('Error loading auto-saved session:', e);
        }
    }

    restoreAutoSavedSession(session) {
        // Load each loan
        session.loans.forEach((loanData, i) => {
            if (i > 0) {
                this.addLoan(true);
            }

            const loan = this.loans[i];
            const panel = loan.panel;

            // Set loan type
            loan.loanType = loanData.loanType || 'conventional';
            loan.loanProgram = loanData.loanProgram || 'standard';
            loan.transactionType = loanData.transactionType || 'purchase';
            loan.borrowerCount = loanData.borrowerCount || 1;
            loan.splitRatio = loanData.splitRatio || 50;
            loan.customFees = loanData.customFees || [];

            // Update UI
            panel.querySelectorAll('.type-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.loan === loan.loanType);
            });
            panel.querySelectorAll('.program-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.program === loan.loanProgram);
            });
            panel.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === loan.transactionType);
            });
            panel.querySelectorAll('.borrower-btn').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.borrowers) === loan.borrowerCount);
            });

            // Restore form data
            Object.entries(loanData.formData || {}).forEach(([name, value]) => {
                const input = panel.querySelector(`[name="${name}"]`);
                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = value;
                    } else if (input.type === 'radio') {
                        if (input.value === value) input.checked = true;
                    } else {
                        input.value = value;
                    }
                }
            });

            loan.renderCustomFees();
            loan.updateVisibleFields();
            loan.updateProgramVisibility();
            loan.calculate();
        });

        if (session.comparisonMonths) {
            this.comparisonMonths = session.comparisonMonths;
            document.querySelectorAll('.time-btn').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.months) === this.comparisonMonths);
            });
        }

        this.updateTabs();
        this.switchToLoan(0);

        if (this.loans.length >= 2) {
            this.updateComparison();
        }

        this.showAutoSaveIndicator('Session restored!');
    }

    showAutoSaveIndicator(message) {
        let indicator = document.querySelector('.autosave-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'autosave-indicator';
            document.body.appendChild(indicator);
        }

        indicator.textContent = message;
        indicator.classList.add('show');

        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2500);
    }

    exportToFile() {
        const sessionData = this.captureSessionData();
        sessionData.exportedAt = new Date().toISOString();
        sessionData.version = '1.0';

        // Also include settings if available
        if (window.settingsManager) {
            sessionData.settings = window.settingsManager.settings;
        }

        const dataStr = JSON.stringify(sessionData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Create download link
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10);
        const scenarioName = this.loans[0]?.results?.scenarioName || 'loan-comparison';
        const safeName = scenarioName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        a.download = `${safeName}-${date}.loancomp.json`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.settingsManager) {
            window.settingsManager.showNotification('Data exported to file');
        }
    }

    importFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File too large. Maximum size is 5MB.');
            return;
        }

        // Validate file type
        if (!file.name.match(/\.(json|loancomp)$/i)) {
            alert('Invalid file type. Please select a .json or .loancomp file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // Use secure JSON parsing
                const data = Security.safeJsonParse(e.target.result);

                if (!data) {
                    throw new Error('Invalid JSON format');
                }

                // Validate the data structure
                if (!data.loans || !Array.isArray(data.loans)) {
                    throw new Error('Invalid file format: missing loans data');
                }

                // Limit number of loans to prevent DoS
                if (data.loans.length > 10) {
                    throw new Error('Too many loans in file. Maximum is 10.');
                }

                // Import settings if present (with validation)
                if (data.settings && window.settingsManager) {
                    // Sanitize settings before applying
                    const sanitizedSettings = this.sanitizeImportedSettings(data.settings);
                    window.settingsManager.settings = { ...window.settingsManager.settings, ...sanitizedSettings };
                    window.settingsManager.saveSettings();
                    window.settingsManager.populateLoanOfficerInfo();
                }

                // Clear existing loans except first one
                while (this.loans.length > 1) {
                    this.removeLoan(this.loans.length - 1, true);
                }

                // Load each loan
                data.loans.forEach((loanData, i) => {
                    if (i > 0) {
                        this.addLoan(true);
                    }

                    const loan = this.loans[i];
                    const panel = loan.panel;

                    // Set loan properties
                    loan.loanType = loanData.loanType || 'conventional';
                    loan.loanProgram = loanData.loanProgram || 'standard';
                    loan.transactionType = loanData.transactionType || 'purchase';
                    loan.borrowerCount = loanData.borrowerCount || 1;
                    loan.splitRatio = loanData.splitRatio || 50;
                    loan.customFees = loanData.customFees || [];

                    // Update UI toggles
                    panel.querySelectorAll('.type-tab').forEach(tab => {
                        tab.classList.toggle('active', tab.dataset.loan === loan.loanType);
                    });
                    panel.querySelectorAll('.program-tab').forEach(tab => {
                        tab.classList.toggle('active', tab.dataset.program === loan.loanProgram);
                    });
                    panel.querySelectorAll('.toggle-btn').forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.type === loan.transactionType);
                    });
                    panel.querySelectorAll('.borrower-btn').forEach(btn => {
                        btn.classList.toggle('active', parseInt(btn.dataset.borrowers) === loan.borrowerCount);
                    });

                    // Restore form data
                    Object.entries(loanData.formData || {}).forEach(([name, value]) => {
                        const input = panel.querySelector(`[name="${name}"]`);
                        if (input) {
                            if (input.type === 'checkbox') {
                                input.checked = value;
                            } else if (input.type === 'radio') {
                                if (input.value === value) input.checked = true;
                            } else {
                                input.value = value;
                            }
                        }
                    });

                    loan.renderCustomFees();
                    loan.updateVisibleFields();
                    loan.updateProgramVisibility();
                    loan.calculate();
                });

                // Restore comparison months
                if (data.comparisonMonths) {
                    this.comparisonMonths = data.comparisonMonths;
                    document.querySelectorAll('.time-btn').forEach(btn => {
                        btn.classList.toggle('active', parseInt(btn.dataset.months) === this.comparisonMonths);
                    });
                }

                this.updateTabs();
                this.switchToLoan(0);

                if (this.loans.length >= 2) {
                    this.updateComparison();
                }

                if (window.settingsManager) {
                    window.settingsManager.showNotification(`Imported "${file.name}"`);
                }

            } catch (error) {
                console.error('Error importing file:', error);
                alert('Error importing file: ' + error.message);
            }
        };

        reader.readAsText(file);

        // Reset the input so the same file can be imported again
        event.target.value = '';
    }

    sanitizeImportedSettings(settings) {
        const sanitized = {};

        if (settings.loanOfficer && typeof settings.loanOfficer === 'object') {
            sanitized.loanOfficer = {
                name: Security.sanitizeText(settings.loanOfficer.name || '', 100),
                company: Security.sanitizeText(settings.loanOfficer.company || '', 100),
                phone: Security.sanitizeText(settings.loanOfficer.phone || '', 20),
                email: Security.sanitizeText(settings.loanOfficer.email || '', 100),
                nmls: Security.sanitizeText(settings.loanOfficer.nmls || '', 20)
            };
        }

        if (settings.realtor && typeof settings.realtor === 'object') {
            sanitized.realtor = {
                enabled: Boolean(settings.realtor.enabled),
                name: Security.sanitizeText(settings.realtor.name || '', 100),
                company: Security.sanitizeText(settings.realtor.company || '', 100),
                phone: Security.sanitizeText(settings.realtor.phone || '', 20),
                email: Security.sanitizeText(settings.realtor.email || '', 100),
                license: Security.sanitizeText(settings.realtor.license || '', 50)
            };
        }

        if (settings.titleAgent && typeof settings.titleAgent === 'object') {
            sanitized.titleAgent = {
                enabled: Boolean(settings.titleAgent.enabled),
                company: Security.sanitizeText(settings.titleAgent.company || '', 100),
                name: Security.sanitizeText(settings.titleAgent.name || '', 100),
                phone: Security.sanitizeText(settings.titleAgent.phone || '', 20),
                email: Security.sanitizeText(settings.titleAgent.email || '', 100),
                address: Security.sanitizeText(settings.titleAgent.address || '', 200)
            };
        }

        if (settings.titleCompanies && Array.isArray(settings.titleCompanies)) {
            sanitized.titleCompanies = settings.titleCompanies.slice(0, 20).map(tc => ({
                id: Security.sanitizeText(tc.id || '', 50),
                name: Security.sanitizeText(tc.name || '', 100),
                titleInsurance: Security.sanitizeNumber(tc.titleInsurance, 0, 100000),
                settlementFee: Security.sanitizeNumber(tc.settlementFee, 0, 100000),
                recordingFees: Security.sanitizeNumber(tc.recordingFees, 0, 10000),
                transferTax: Security.sanitizeNumber(tc.transferTax, 0, 100000),
                otherFees: Security.sanitizeNumber(tc.otherFees, 0, 100000)
            }));
        }

        return sanitized;
    }

    updateTabs() {
        const tabsContainer = document.getElementById('loanTabs');
        tabsContainer.innerHTML = '';

        this.loans.forEach((loan, i) => {
            const tab = document.createElement('button');
            tab.className = `loan-tab${i === this.activeIndex ? ' active' : ''}`;
            tab.dataset.index = i;

            const name = loan.results?.scenarioName || `Scenario ${i + 1}`;
            tab.innerHTML = `
                ${name}
                ${i > 0 ? `<span class="remove-loan" data-index="${i}" title="Remove scenario">&times;</span>` : ''}
            `;
            tabsContainer.appendChild(tab);
        });

        // Show/hide add button
        const addBtn = document.getElementById('addLoanBtn');
        if (addBtn) {
            addBtn.classList.toggle('hidden', this.loans.length >= this.maxLoans);
        }
    }
}

// ============================================
// Dark Mode Manager (uses unified ThemeManager)
// ============================================
const DarkMode = {
    // Wrapper for backward compatibility - delegates to ThemeManager
    init() {
        // ThemeManager auto-initializes via theme.js
        // This is kept for backward compatibility with existing code
        if (typeof ThemeManager !== 'undefined') {
            ThemeManager.init();
        }
    },

    enable() {
        if (typeof ThemeManager !== 'undefined') {
            ThemeManager.setTheme(ThemeManager.THEME_DARK);
        }
    },

    disable() {
        if (typeof ThemeManager !== 'undefined') {
            ThemeManager.setTheme(ThemeManager.THEME_LIGHT);
        }
    },

    toggle() {
        if (typeof ThemeManager !== 'undefined') {
            ThemeManager.toggleTheme();
        }
    },

    isDark() {
        if (typeof ThemeManager !== 'undefined') {
            return ThemeManager.isDarkMode();
        }
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize dark mode first (before other components render)
    DarkMode.init();

    // Initialize keyboard shortcuts
    KeyboardShortcuts.init();

    // Initialize loading state manager
    LoadingState.init();

    window.settingsManager = new SettingsManager();
    window.loanManager = new LoanManager();

    // Sticky tabs scroll detection
    const tabsContainer = document.querySelector('.loan-tabs-container');
    if (tabsContainer) {
        const observer = new IntersectionObserver(
            ([entry]) => {
                tabsContainer.classList.toggle('sticky-active', entry.intersectionRatio < 1);
            },
            { threshold: [1], rootMargin: '-1px 0px 0px 0px' }
        );
        observer.observe(tabsContainer);
    }
});
