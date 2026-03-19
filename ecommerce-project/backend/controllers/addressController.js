const { Address } = require('../models');

// @desc    Get all addresses for authenticated user
// @route   GET /api/addresses
const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.findAll({
      where: { user_id: req.user.id },
      order: [['is_default', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({ success: true, addresses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Create new address
// @route   POST /api/addresses
const createAddress = async (req, res) => {
  try {
    const { name, phone, address_line, landmark, city, state, postal_code, type, is_default } = req.body;

    // If this is set as default, unset other defaults
    if (is_default) {
      await Address.update(
        { is_default: false },
        { where: { user_id: req.user.id } }
      );
    }

    const address = await Address.create({
      user_id: req.user.id,
      name,
      phone,
      address_line,
      landmark,
      city,
      state,
      postal_code,
      type: type || 'home',
      is_default: is_default || false
    });

    res.status(201).json({ success: true, address });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Update address
// @route   PUT /api/addresses/:id
const updateAddress = async (req, res) => {
  try {
    const address = await Address.findByPk(req.params.id);

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Check ownership
    if (address.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, phone, address_line, landmark, city, state, postal_code, type, is_default } = req.body;

    // If this is set as default, unset other defaults
    if (is_default && !address.is_default) {
      await Address.update(
        { is_default: false },
        { where: { user_id: req.user.id } }
      );
    }

    await address.update({
      name,
      phone,
      address_line,
      landmark,
      city,
      state,
      postal_code,
      type,
      is_default
    });

    res.json({ success: true, address });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Delete address
// @route   DELETE /api/addresses/:id
const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findByPk(req.params.id);

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Check ownership
    if (address.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await address.destroy();

    res.json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Set default address
// @route   PATCH /api/addresses/:id/default
const setDefaultAddress = async (req, res) => {
  try {
    const address = await Address.findByPk(req.params.id);

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Check ownership
    if (address.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Unset all defaults for this user
    await Address.update(
      { is_default: false },
      { where: { user_id: req.user.id } }
    );

    // Set this address as default
    await address.update({ is_default: true });

    res.json({ success: true, address });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};