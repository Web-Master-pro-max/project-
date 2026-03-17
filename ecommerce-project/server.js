const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { sequelize, testConnection } = require('./backend/config/database');
const errorHandler = require('./backend/middleware/errorHandler');
const { authenticate } = require('./backend/middleware/auth');

// Import active user counter from auth controller
const { activeUserCount } = require('./backend/controllers/authController');

// Import routes
const authRoutes = require('./backend/routes/authRoutes');
const userRoutes = require('./backend/routes/userRoutes');
const productRoutes = require('./backend/routes/productRoutes');
const cartRoutes = require('./backend/routes/cartRoutes');
const orderRoutes = require('./backend/routes/orderRoutes');

// Import models and associations
require('./backend/models');

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));

// Rate limiting
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX, 10) || (process.env.NODE_ENV === 'production' ? 1000 : 5000);

const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
    },
    // Skip rate limiting for authenticated users to avoid accidental request throttling
    // Also skip on order creation so users don't hit the limiter when placing an order.
    skip: (req, res) => {
        if (req.method === 'POST' && req.path === '/orders') return true;
        // Allow all authenticated users (session or JWT) to bypass limit
        if (req.session && req.session.user) return true;
        if (req.user) return true;
        return false;
    }
});
app.use('/api', limiter);

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'frontend', 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'frontend', 'uploads')));

// Session configuration with memory storage
// Memory storage is sufficient because:
// 1. Sessions are checked/refreshed every 5 minutes from frontend
// 2. Session data is stored in localStorage on client side as backup
// 3. User data survives server restart via localStorage + re-login
const sessionStore = new session.MemoryStore();

// Track active sessions for user limit
sessionStore.destroy = (function(originalDestroy) {
  return function(sid, callback) {
    // Check if this session had a user before destroying
    const sessionData = this.sessions[sid];
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        if (parsed.user) {
          // Decrement counter for session timeout/forced logout
          if (typeof activeUserCount !== 'undefined' && activeUserCount > 0) {
            activeUserCount--;
            console.log(`Session expired/forced logout. Active users: ${activeUserCount}/30`);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    return originalDestroy.call(this, sid, callback);
  };
})(sessionStore.destroy);

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: true,
    saveUninitialized: false,
    proxy: process.env.NODE_ENV === 'production',
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax'
    }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// Frontend Routes - Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'public', 'index.html'));
});

app.get('/products', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'public', 'products.html'));
});

app.get('/products/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'public', 'products.html'));
});

app.get('/cart', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'public', 'cart.html'));
});

app.get('/checkout', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'public', 'checkout.html'));
});

app.get('/order-confirmation', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'public', 'order-confirmation.html'));
});

app.get('/orders', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'public', 'orders.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'public', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'public', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'public', 'admin-dashboard.html'));
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

// Initialize database and start server
const initializeServer = async () => {
    try {
        await testConnection();
        // Sync database models - alter:true will add missing columns
        await sequelize.sync({ alter: true });
        console.log('Database tables synchronized successfully.');
        
        // The session store will create its table automatically on first use
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

initializeServer();