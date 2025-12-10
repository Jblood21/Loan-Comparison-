// Loan Comparison Tool - Backend Server
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-key';

// ============================================
// Database (JSON file-based for simplicity)
// ============================================
const DB_PATH = path.join(__dirname, 'database.json');

function loadDatabase() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading database:', error);
    }
    return { users: {}, scenarios: {}, settings: {} };
}

function saveDatabase(db) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    } catch (error) {
        console.error('Error saving database:', error);
    }
}

let database = loadDatabase();

// ============================================
// Middleware
// ============================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: false, // We handle CSP in frontend
    crossOriginEmbedderPolicy: false
}));

// CORS - allow frontend origin
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    credentials: true
}));

// Parse JSON bodies
app.use(express.json({ limit: '5mb' }));

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
    message: { error: 'Too many attempts. Please wait 1 minute.' }
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100, // 100 requests per minute
    message: { error: 'Too many requests. Please slow down.' }
});

// Apply rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', apiLimiter);

// Serve static files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// ============================================
// Authentication Middleware
// ============================================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// ============================================
// Utility Functions
// ============================================
function sanitizeText(str, maxLength = 100) {
    if (!str) return '';
    return String(str)
        .substring(0, maxLength)
        .replace(/<[^>]*>/g, '')
        .trim();
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain a number';
    return null;
}

// ============================================
// Auth Routes
// ============================================

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { firstName, lastName, company, email, phone, nmls, password } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ error: 'First name, last name, email, and password are required' });
        }

        // Validate email format
        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate password
        const passwordError = validatePassword(password);
        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }

        // Check if user already exists
        const normalizedEmail = email.toLowerCase();
        if (database.users[normalizedEmail]) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const userId = uuidv4();
        const user = {
            id: userId,
            firstName: sanitizeText(firstName, 50),
            lastName: sanitizeText(lastName, 50),
            company: sanitizeText(company, 100),
            email: normalizedEmail,
            phone: sanitizeText(phone, 20),
            nmls: sanitizeText(nmls, 20),
            passwordHash,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        database.users[normalizedEmail] = user;
        saveDatabase(database);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: process.env.SESSION_EXPIRY || '24h' }
        );

        // Return user data (without password)
        const { passwordHash: _, ...userWithoutPassword } = user;
        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const normalizedEmail = email.toLowerCase();
        const user = database.users[normalizedEmail];

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: process.env.SESSION_EXPIRY || '24h' }
        );

        // Return user data (without password)
        const { passwordHash: _, ...userWithoutPassword } = user;
        res.json({
            message: 'Login successful',
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Verify token and get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
    const user = database.users[req.user.email];
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
});

// Update user profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const { firstName, lastName, company, phone, nmls } = req.body;
        const user = database.users[req.user.email];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update fields
        if (firstName) user.firstName = sanitizeText(firstName, 50);
        if (lastName) user.lastName = sanitizeText(lastName, 50);
        if (company !== undefined) user.company = sanitizeText(company, 100);
        if (phone !== undefined) user.phone = sanitizeText(phone, 20);
        if (nmls !== undefined) user.nmls = sanitizeText(nmls, 20);
        user.updatedAt = new Date().toISOString();

        database.users[req.user.email] = user;
        saveDatabase(database);

        const { passwordHash: _, ...userWithoutPassword } = user;
        res.json({
            message: 'Profile updated successfully',
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Server error updating profile' });
    }
});

// Change password
app.put('/api/auth/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = database.users[req.user.email];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Validate new password
        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }

        // Hash and save new password
        const salt = await bcrypt.genSalt(12);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        user.updatedAt = new Date().toISOString();

        database.users[req.user.email] = user;
        saveDatabase(database);

        res.json({ message: 'Password changed successfully' });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Server error changing password' });
    }
});

// ============================================
// User Settings Routes
// ============================================

// Get user settings
app.get('/api/settings', authenticateToken, (req, res) => {
    const settings = database.settings[req.user.userId] || {};
    res.json({ settings });
});

// Save user settings
app.put('/api/settings', authenticateToken, (req, res) => {
    try {
        const { settings } = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'Invalid settings data' });
        }

        database.settings[req.user.userId] = {
            ...settings,
            updatedAt: new Date().toISOString()
        };
        saveDatabase(database);

        res.json({
            message: 'Settings saved successfully',
            settings: database.settings[req.user.userId]
        });

    } catch (error) {
        console.error('Settings save error:', error);
        res.status(500).json({ error: 'Server error saving settings' });
    }
});

// ============================================
// Scenarios Routes
// ============================================

// Get all user scenarios
app.get('/api/scenarios', authenticateToken, (req, res) => {
    const userScenarios = database.scenarios[req.user.userId] || [];
    res.json({ scenarios: userScenarios });
});

// Save a scenario
app.post('/api/scenarios', authenticateToken, (req, res) => {
    try {
        const { name, data } = req.body;

        if (!name || !data) {
            return res.status(400).json({ error: 'Scenario name and data are required' });
        }

        if (!database.scenarios[req.user.userId]) {
            database.scenarios[req.user.userId] = [];
        }

        const scenario = {
            id: uuidv4(),
            name: sanitizeText(name, 100),
            data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        database.scenarios[req.user.userId].push(scenario);
        saveDatabase(database);

        res.status(201).json({
            message: 'Scenario saved successfully',
            scenario
        });

    } catch (error) {
        console.error('Scenario save error:', error);
        res.status(500).json({ error: 'Server error saving scenario' });
    }
});

// Update a scenario
app.put('/api/scenarios/:id', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const { name, data } = req.body;

        const userScenarios = database.scenarios[req.user.userId] || [];
        const scenarioIndex = userScenarios.findIndex(s => s.id === id);

        if (scenarioIndex === -1) {
            return res.status(404).json({ error: 'Scenario not found' });
        }

        if (name) userScenarios[scenarioIndex].name = sanitizeText(name, 100);
        if (data) userScenarios[scenarioIndex].data = data;
        userScenarios[scenarioIndex].updatedAt = new Date().toISOString();

        database.scenarios[req.user.userId] = userScenarios;
        saveDatabase(database);

        res.json({
            message: 'Scenario updated successfully',
            scenario: userScenarios[scenarioIndex]
        });

    } catch (error) {
        console.error('Scenario update error:', error);
        res.status(500).json({ error: 'Server error updating scenario' });
    }
});

// Delete a scenario
app.delete('/api/scenarios/:id', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;

        const userScenarios = database.scenarios[req.user.userId] || [];
        const scenarioIndex = userScenarios.findIndex(s => s.id === id);

        if (scenarioIndex === -1) {
            return res.status(404).json({ error: 'Scenario not found' });
        }

        userScenarios.splice(scenarioIndex, 1);
        database.scenarios[req.user.userId] = userScenarios;
        saveDatabase(database);

        res.json({ message: 'Scenario deleted successfully' });

    } catch (error) {
        console.error('Scenario delete error:', error);
        res.status(500).json({ error: 'Server error deleting scenario' });
    }
});

// ============================================
// Admin Routes
// ============================================

// Admin login
app.post('/api/admin/login', authLimiter, async (req, res) => {
    try {
        const { password } = req.body;
        const adminPassword = process.env.ADMIN_PASSWORD || 'LoanAdmin2024!';

        if (password !== adminPassword) {
            return res.status(401).json({ error: 'Invalid admin password' });
        }

        const token = jwt.sign(
            { isAdmin: true },
            JWT_SECRET,
            { expiresIn: '30m' }
        );

        res.json({
            message: 'Admin login successful',
            token
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Server error during admin login' });
    }
});

// Get all users (admin only)
app.get('/api/admin/users', authenticateToken, (req, res) => {
    // Verify admin token
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const users = Object.values(database.users).map(user => {
        const { passwordHash: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    });

    res.json({ users, count: users.length });
});

// Get system stats (admin only)
app.get('/api/admin/stats', authenticateToken, (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = {
        totalUsers: Object.keys(database.users).length,
        totalScenarios: Object.values(database.scenarios).reduce((acc, arr) => acc + arr.length, 0),
        totalSettings: Object.keys(database.settings).length
    };

    res.json({ stats });
});

// ============================================
// Health Check
// ============================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ============================================
// Catch-all route - serve index.html for SPA
// ============================================
app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ============================================
// Error Handler
// ============================================
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   Loan Comparison Tool - Backend Server    ║
╠════════════════════════════════════════════╣
║   Server running on: http://localhost:${PORT}  ║
║   API Base URL: http://localhost:${PORT}/api   ║
╚════════════════════════════════════════════╝
    `);
});
