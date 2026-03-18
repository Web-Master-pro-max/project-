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

// Trust proxy - important for Vercel and nginx (MUST be set before rate limiter)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));

// Rate limiting - Updated to handle X-Forwarded-For headers properly
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX, 10) || (process.env.NODE_ENV === 'production' ? 1000 : 5000);

const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
    // Proper key generator for proxied requests (Vercel/nginx)
    keyGenerator: (req) => {
        // For Vercel/nginx, use X-Forwarded-For header
        const forwarded = req.headers['x-forwarded-for'];
        const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip || req.socket.remoteAddress;
        return ip;
    },
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
    },
    // Skip rate limiting for authenticated users and order creation
    skip: (req) => {
        if (req.method === 'POST' && req.path === '/orders') return true;
        // Allow all authenticated users (session or JWT) to bypass limit
        if (req.session && req.session.user) return true;
        if (req.user) return true;
        return false;
    }
});
app.use('/api', limiter);

/// In your CORS configuration, update the allowed origins
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }

        if (origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        // Add your new IP
        if (origin === 'http://13.62.153.215:3000') {
            return callback(null, true);
        }

        // Also keep the old one temporarily if needed
        if (origin === 'http://13.62.223.231:3000') {
            return callback(null, true);
        }

        console.log('CORS rejected origin:', origin);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, 'frontend', 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'frontend', 'uploads')));

// Session configuration with memory storage
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

// Session configuration with proper cookie settings for Vercel
app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: true,
    saveUninitialized: false,
    proxy: true, // Trust proxy for Vercel
    cookie: {
        secure: process.env.NODE_ENV === 'production', // true on Vercel (HTTPS)
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // 'none' for cross-site requests
    }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// Frontend Routes - Serve HTML files (for when accessing EC2 directly)
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
            console.log(`CORS enabled for: .vercel.app domains`);
            console.log(`Trust proxy enabled for X-Forwarded-* headers`);
            console.log(`Server ready to accept requests from Vercel`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

initializeServer();