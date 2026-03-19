const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Verify authentication (session or JWT)
const authenticate = async (req, res, next) => {
  try {
    // Check if user is in session
    if (req.session && req.session.user) {
      const user = await User.findByPk(req.session.user.id);
      if (user) {
        req.user = user;
        // Refresh session expiration on activity
        req.session.touch();
        return next();
      } else {
        // User not found in database, clear session
        delete req.session.user;
      }
    }

    // Check for JWT token
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Please authenticate' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Please authenticate' });
  }
};

// Check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    // Check session first
    if (req.session && req.session.user) {
      if (req.session.user.role === 'admin') {
        return next();
      }
    }

    // Check JWT token user
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    res.status(403).json({ error: 'Access denied. Admin only.' });
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(403).json({ error: 'Access denied. Admin only.' });
  }
};

module.exports = { authenticate, isAdmin, protect: authenticate };