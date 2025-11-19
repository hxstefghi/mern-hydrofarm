const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // attach minimal user
    req.user = { id: decoded.id, email: decoded.email };
    // optionally fetch full user record
    try {
      const full = await User.findById(decoded.id).select('-password');
      if (full) req.user = full;
    } catch (e) {
      // ignore
    }
    next();
  } catch (err) {
    console.error('auth verify error', err);
    return res.status(401).json({ message: 'Invalid token' });
  }
};
