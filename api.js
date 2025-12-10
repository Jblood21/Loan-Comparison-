// API Client for Loan Comparison Tool
const API = {
    baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `${window.location.protocol}//${window.location.hostname}:3000/api`
        : '/api',

    token: null,

    // Initialize - load token from storage
    init() {
        this.token = localStorage.getItem('authToken');
    },

    // Set auth token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    },

    // Get auth headers
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    },

    // Generic request handler
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            if (error.message === 'Failed to fetch') {
                throw new Error('Unable to connect to server. Please check if the server is running.');
            }
            throw error;
        }
    },

    // ============================================
    // Auth Endpoints
    // ============================================

    async register(userData) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        this.setToken(data.token);
        return data;
    },

    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        this.setToken(data.token);
        return data;
    },

    async logout() {
        this.setToken(null);
        sessionStorage.removeItem('userSession');
    },

    async getCurrentUser() {
        return await this.request('/auth/me');
    },

    async updateProfile(profileData) {
        return await this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    },

    async changePassword(currentPassword, newPassword) {
        return await this.request('/auth/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    },

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token;
    },

    // ============================================
    // Settings Endpoints
    // ============================================

    async getSettings() {
        return await this.request('/settings');
    },

    async saveSettings(settings) {
        return await this.request('/settings', {
            method: 'PUT',
            body: JSON.stringify({ settings })
        });
    },

    // ============================================
    // Scenarios Endpoints
    // ============================================

    async getScenarios() {
        return await this.request('/scenarios');
    },

    async saveScenario(name, data) {
        return await this.request('/scenarios', {
            method: 'POST',
            body: JSON.stringify({ name, data })
        });
    },

    async updateScenario(id, name, data) {
        return await this.request(`/scenarios/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, data })
        });
    },

    async deleteScenario(id) {
        return await this.request(`/scenarios/${id}`, {
            method: 'DELETE'
        });
    },

    // ============================================
    // Admin Endpoints
    // ============================================

    async adminLogin(password) {
        const data = await this.request('/admin/login', {
            method: 'POST',
            body: JSON.stringify({ password })
        });
        sessionStorage.setItem('adminToken', data.token);
        return data;
    },

    async getAdminStats() {
        const adminToken = sessionStorage.getItem('adminToken');
        return await this.request('/admin/stats', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
    },

    async getAdminUsers() {
        const adminToken = sessionStorage.getItem('adminToken');
        return await this.request('/admin/users', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
    },

    // ============================================
    // Health Check
    // ============================================

    async healthCheck() {
        try {
            const data = await this.request('/health');
            return { online: true, ...data };
        } catch {
            return { online: false };
        }
    }
};

// Initialize on load
API.init();
