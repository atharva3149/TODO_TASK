const express = require('express');
const authenticate = require('../middleware/authenticate');
const {
  login,
  logout,
  me,
  refresh,
  register,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);

module.exports = router;
