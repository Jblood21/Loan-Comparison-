/**
 * LoanDr. Security Module
 * Provides XSS protection, input validation, and security utilities
 */

const Security = (function() {
    'use strict';

    /**
     * HTML Entity Map for escaping
     */
    const HTML_ENTITIES = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    /**
     * Escape HTML to prevent XSS attacks
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    function escapeHtml(str) {
        if (typeof str !== 'string') {
            return String(str || '');
        }
        return str.replace(/[&<>"'`=\/]/g, char => HTML_ENTITIES[char]);
    }

    /**
     * Sanitize user input - removes potentially dangerous content
     * @param {string} input - User input to sanitize
     * @returns {string} Sanitized input
     */
    function sanitizeInput(input) {
        if (typeof input !== 'string') {
            return String(input || '');
        }

        // Remove script tags and their content
        let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

        // Remove event handlers
        sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
        sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

        // Remove javascript: URLs
        sanitized = sanitized.replace(/javascript:/gi, '');

        // Remove data: URLs (except images)
        sanitized = sanitized.replace(/data:(?!image\/)/gi, '');

        // Remove vbscript: URLs
        sanitized = sanitized.replace(/vbscript:/gi, '');

        // Escape remaining HTML
        return escapeHtml(sanitized);
    }

    /**
     * Validate and sanitize numeric input
     * @param {any} value - Value to validate
     * @param {object} options - Validation options
     * @returns {object} { valid: boolean, value: number, error: string }
     */
    function validateNumber(value, options = {}) {
        const {
            min = -Infinity,
            max = Infinity,
            allowDecimal = true,
            allowNegative = false,
            required = false,
            fieldName = 'Value'
        } = options;

        // Handle empty/null/undefined
        if (value === null || value === undefined || value === '') {
            if (required) {
                return { valid: false, value: null, error: `${fieldName} is required` };
            }
            return { valid: true, value: null, error: null };
        }

        // Parse the number
        let num = allowDecimal ? parseFloat(value) : parseInt(value, 10);

        // Check if it's a valid number
        if (isNaN(num) || !isFinite(num)) {
            return { valid: false, value: null, error: `${fieldName} must be a valid number` };
        }

        // Check negative
        if (!allowNegative && num < 0) {
            return { valid: false, value: null, error: `${fieldName} cannot be negative` };
        }

        // Check range
        if (num < min) {
            return { valid: false, value: null, error: `${fieldName} must be at least ${min}` };
        }
        if (num > max) {
            return { valid: false, value: null, error: `${fieldName} must be at most ${max}` };
        }

        return { valid: true, value: num, error: null };
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {object} { valid: boolean, error: string }
     */
    function validateEmail(email) {
        if (!email || typeof email !== 'string') {
            return { valid: false, error: 'Email is required' };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return { valid: false, error: 'Please enter a valid email address' };
        }

        return { valid: true, error: null };
    }

    /**
     * Validate phone number format
     * @param {string} phone - Phone to validate
     * @returns {object} { valid: boolean, formatted: string, error: string }
     */
    function validatePhone(phone) {
        if (!phone || typeof phone !== 'string') {
            return { valid: false, formatted: null, error: 'Phone number is required' };
        }

        // Remove all non-numeric characters
        const digits = phone.replace(/\D/g, '');

        if (digits.length < 10) {
            return { valid: false, formatted: null, error: 'Phone number must have at least 10 digits' };
        }

        if (digits.length > 11) {
            return { valid: false, formatted: null, error: 'Phone number is too long' };
        }

        // Format as (XXX) XXX-XXXX
        const formatted = digits.length === 11
            ? `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
            : `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;

        return { valid: true, formatted, error: null };
    }

    /**
     * Validate loan amount
     * @param {any} amount - Amount to validate
     * @returns {object} { valid: boolean, value: number, error: string }
     */
    function validateLoanAmount(amount) {
        return validateNumber(amount, {
            min: 1000,
            max: 100000000, // $100 million max
            allowDecimal: true,
            allowNegative: false,
            required: true,
            fieldName: 'Loan amount'
        });
    }

    /**
     * Validate interest rate
     * @param {any} rate - Rate to validate
     * @returns {object} { valid: boolean, value: number, error: string }
     */
    function validateInterestRate(rate) {
        return validateNumber(rate, {
            min: 0,
            max: 30, // 30% max
            allowDecimal: true,
            allowNegative: false,
            required: true,
            fieldName: 'Interest rate'
        });
    }

    /**
     * Validate loan term
     * @param {any} term - Term in years
     * @returns {object} { valid: boolean, value: number, error: string }
     */
    function validateLoanTerm(term) {
        return validateNumber(term, {
            min: 1,
            max: 50, // 50 years max
            allowDecimal: false,
            allowNegative: false,
            required: true,
            fieldName: 'Loan term'
        });
    }

    /**
     * Validate credit score
     * @param {any} score - Credit score to validate
     * @returns {object} { valid: boolean, value: number, error: string }
     */
    function validateCreditScore(score) {
        return validateNumber(score, {
            min: 300,
            max: 850,
            allowDecimal: false,
            allowNegative: false,
            required: true,
            fieldName: 'Credit score'
        });
    }

    /**
     * Validate percentage (0-100)
     * @param {any} percentage - Percentage to validate
     * @param {string} fieldName - Name for error messages
     * @returns {object} { valid: boolean, value: number, error: string }
     */
    function validatePercentage(percentage, fieldName = 'Percentage') {
        return validateNumber(percentage, {
            min: 0,
            max: 100,
            allowDecimal: true,
            allowNegative: false,
            required: true,
            fieldName
        });
    }

    /**
     * Create safe innerHTML - use this instead of directly setting innerHTML
     * @param {HTMLElement} element - Element to update
     * @param {string} html - HTML content (will be escaped unless trusted)
     * @param {boolean} trusted - If true, HTML won't be escaped (use with caution)
     */
    function setSafeHTML(element, html, trusted = false) {
        if (!element) return;

        if (trusted) {
            // Still sanitize even for trusted content
            element.innerHTML = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        } else {
            element.textContent = html;
        }
    }

    /**
     * Safely bind event handlers (use instead of inline onclick)
     * @param {string|HTMLElement} selector - Element or selector
     * @param {string} event - Event type (click, change, etc.)
     * @param {function} handler - Event handler function
     * @param {object} options - addEventListener options
     */
    function bindEvent(selector, event, handler, options = {}) {
        const elements = typeof selector === 'string'
            ? document.querySelectorAll(selector)
            : [selector];

        elements.forEach(element => {
            if (element) {
                element.addEventListener(event, handler, options);
            }
        });
    }

    /**
     * Rate limiting for form submissions
     */
    const rateLimiters = new Map();

    function rateLimit(key, limitMs = 1000) {
        const now = Date.now();
        const lastCall = rateLimiters.get(key) || 0;

        if (now - lastCall < limitMs) {
            return false; // Rate limited
        }

        rateLimiters.set(key, now);
        return true; // Allowed
    }

    /**
     * Secure hash function for non-critical uses (NOT for passwords in production)
     * @param {string} str - String to hash
     * @returns {string} Hashed string
     */
    function simpleHash(str) {
        let hash = 0;
        const salt = 'LoanDr2024SecureSalt';
        const salted = salt + str + salt;

        for (let i = 0; i < salted.length; i++) {
            const char = salted.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }

        return Math.abs(hash).toString(36);
    }

    /**
     * Generate CSRF-like token for forms
     * @returns {string} Token
     */
    function generateToken() {
        const array = new Uint32Array(4);
        crypto.getRandomValues(array);
        return Array.from(array, x => x.toString(16).padStart(8, '0')).join('');
    }

    /**
     * Check if element exists safely
     * @param {string} selector - CSS selector
     * @returns {HTMLElement|null}
     */
    function safeQuerySelector(selector) {
        try {
            return document.querySelector(selector);
        } catch (e) {
            console.warn('Invalid selector:', selector);
            return null;
        }
    }

    /**
     * Initialize global error handler
     */
    function initErrorHandler() {
        window.onerror = function(message, source, lineno, colno, error) {
            console.error('Global error:', { message, source, lineno, colno, error });
            // Could send to error reporting service
            return false; // Let default handler run too
        };

        window.onunhandledrejection = function(event) {
            console.error('Unhandled promise rejection:', event.reason);
        };
    }

    // Initialize error handler
    initErrorHandler();

    // Public API
    return {
        escapeHtml,
        sanitizeInput,
        validateNumber,
        validateEmail,
        validatePhone,
        validateLoanAmount,
        validateInterestRate,
        validateLoanTerm,
        validateCreditScore,
        validatePercentage,
        setSafeHTML,
        bindEvent,
        rateLimit,
        simpleHash,
        generateToken,
        safeQuerySelector
    };
})();

// Export for ES modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Security;
}
