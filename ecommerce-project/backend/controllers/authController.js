const jwt = require('jsonwebtoken');
const models = require('../models');
const { User } = models;

// Global counter for active users
let activeUserCount = 0;
const MAX_CONCURRENT_USERS = 30;

// Check if User model is loaded
if (!User) {
  console.error('WARNING: User model is not properly loaded!');
  console.error('Available models:', Object.keys(models));
}

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Register user
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!User) {
      throw new Error('User model is not initialized');
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password
    });

    // Store user in session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Session save failed' });
      }

      res.status(201).json({
        success: true,
        user: req.session.user
      });
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check concurrent user limit
    if (activeUserCount >= MAX_CONCURRENT_USERS) {
      return res.status(429).json({
        error: 'Server is at maximum capacity. Please try again later.',
        retryAfter: 300 // 5 minutes in seconds
      });
    }

    // Debug logging
    console.log('Login attempt:', { email, userModel: !!User });

    if (!User) {
      throw new Error('User model is not initialized');
    }

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Store user in session (include avatar for UI)
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role
    };

    // Increment active user count
    activeUserCount++;
    console.log(`User logged in. Active users: ${activeUserCount}/${MAX_CONCURRENT_USERS}`);

    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        activeUserCount--; // Decrement on failure
        return res.status(500).json({ error: 'Session save failed' });
      }

      res.json({
        success: true,
        user: req.session.user
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    // First check if user is in session
    if (req.session && req.session.user) {
      const user = await User.findByPk(req.session.user.id, {
        attributes: { exclude: ['password'] }
      });
      if (user) {
        return res.json({ success: true, user });
      }
    }

    // Fallback to JWT authentication
    if (req.user) {
      return res.json({
        success: true,
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          avatar: req.user.avatar,
          role: req.user.role
        }
      });
    }

    res.status(401).json({ error: 'Not authenticated' });
  } catch (error) {
    console.error('Error in getMe:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Check authentication status
// @route   GET /api/auth/check
const checkAuth = (req, res) => {
  try {
    if (req.session && req.session.user) {
      // Refresh session expiration on each check
      req.session.touch();
      return res.json({
        authenticated: true,
        user: req.session.user
      });
    }
    res.json({
      authenticated: false,
      user: null
    });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({
      error: 'Authentication check failed',
      authenticated: false,
      user: null
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
const logout = (req, res) => {
  try {
    if (req.session && req.session.user) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          // Still return success as session data is cleared from client side
          return res.json({
            success: true,
            message: 'Logged out successfully',
            note: 'Session cleanup in progress'
          });
        }

        // Decrement active user count
        if (activeUserCount > 0) {
          activeUserCount--;
          console.log(`User logged out. Active users: ${activeUserCount}/${MAX_CONCURRENT_USERS}`);
        }

        res.json({ success: true, message: 'Logged out successfully' });
      });
    } else {
      res.json({ success: true, message: 'Logged out successfully' });
    }
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

// @desc    Get active user count (for monitoring)
// @route   GET /api/auth/active-users
const getActiveUserCount = (req, res) => {
  res.json({
    activeUsers: activeUserCount,
    maxUsers: MAX_CONCURRENT_USERS,
    availableSlots: Math.max(0, MAX_CONCURRENT_USERS - activeUserCount)
  });
};

module.exports = {
  register,
  login,
  getMe,
  checkAuth,
  logout,
  getActiveUserCount,
  activeUserCount,
  MAX_CONCURRENT_USERS
};