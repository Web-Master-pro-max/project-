const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getUsers,
  getUserById,
  getProfile,
  updateProfile,
  updateUser,
  deleteUser,
  getUserStats,
  uploadProfilePhoto
} = require('../controllers/userController');

router.use(authenticate); // All user routes require authentication

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/upload-photo', upload.single('photo'), uploadProfilePhoto);
router.get('/', isAdmin, getUsers);
router.get('/stats/summary', isAdmin, getUserStats);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', isAdmin, deleteUser);

module.exports = router;