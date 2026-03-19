const { User, Order } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all users (Admin only)
// @route   GET /api/users
const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get user by ID (Admin or self)
// @route   GET /api/users/:id
const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user.role !== 'admin' && req.user.id !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/users/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Update current user profile
// @route   PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Define allowed updates for profile
    const allowedUpdates = ['name', 'phone', 'date_of_birth', 'gender'];

    // If user is updating their email, check if it's already taken
    if (req.body.email && req.body.email !== user.email) {
      const existingUser = await User.findOne({
        where: {
          email: req.body.email,
          id: { [Op.ne]: user.id }
        }
      });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      allowedUpdates.push('email');
    }

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Normalize certain fields for consistent storage
    if (updates.hasOwnProperty('date_of_birth') && updates.date_of_birth) {
      updates.date_of_birth = new Date(updates.date_of_birth);
    }

    // Handle password change separately
    if (req.body.current_password && req.body.new_password) {
      // Verify current password
      const isValidPassword = await user.comparePassword(req.body.current_password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Validate new password
      if (req.body.new_password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }

      updates.password = req.body.new_password;
    }

    await user.update(updates);

    // Return updated user data (exclude password)
    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is updating their own data or is admin
    if (req.user.id !== user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Define allowed updates based on user role
    let allowedUpdates = ['name', 'phone', 'date_of_birth', 'gender'];

    if (req.user.role === 'admin') {
      // Admins can update more fields
      allowedUpdates = ['name', 'email', 'phone', 'date_of_birth', 'gender', 'role', 'is_active'];
    }

    // If user is updating their own email, check if it's already taken
    if (req.body.email && req.body.email !== user.email) {
      const existingUser = await User.findOne({
        where: {
          email: req.body.email,
          id: { [Op.ne]: user.id }
        }
      });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Normalize certain fields for consistent storage
    if (updates.hasOwnProperty('is_active')) {
      updates.is_active = updates.is_active === true || updates.is_active === 'true' || updates.is_active === 1 || updates.is_active === '1';
    }

    if (updates.hasOwnProperty('date_of_birth') && updates.date_of_birth) {
      updates.date_of_birth = new Date(updates.date_of_birth);
    }

    // Handle password change separately
    if (req.body.current_password && req.body.new_password) {
      // Verify current password
      const isValidPassword = await user.comparePassword(req.body.current_password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Validate new password
      if (req.body.new_password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }

      updates.password = req.body.new_password;
    }

    await user.update(updates);

    // Return updated user data (exclude password)
    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't allow deleting yourself
    if (req.user.id === user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await user.destroy();

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get user statistics (Admin only)
// @route   GET /api/users/stats/summary
const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const adminCount = await User.count({ where: { role: 'admin' } });
    const customerCount = await User.count({ where: { role: 'customer' } });
    
    // New users in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newUsers = await User.count({
      where: {
        created_at: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });

    res.json({
      success: true,
      stats: {
        total_users: totalUsers,
        admins: adminCount,
        customers: customerCount,
        new_users_30days: newUsers
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  getProfile,
  updateProfile,
  updateUser,
  deleteUser,
  getUserStats
};