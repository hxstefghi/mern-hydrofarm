const User = require('../models/User');
const bcrypt = require('bcryptjs');

// require admin role helper
function requireAdmin(req, res) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin privileges required' });
    return false;
  }
  return true;
}

exports.listUsers = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error('listUsers error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createUser = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already in use' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = new User({ email, password: hash, role: role && ['user','admin'].includes(role) ? role : 'user' });
    await user.save();
    const out = user.toObject();
    delete out.password;
    res.status(201).json(out);
  } catch (err) {
    console.error('createUser error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUser = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('getUser error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { email, password, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (email && email !== user.email) {
      // check uniqueness
      const exists = await User.findOne({ email });
      if (exists && String(exists._id) !== String(user._id)) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      user.email = email;
    }

    if (typeof role === 'string' && ['user','admin'].includes(role)) {
      user.role = role;
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    const out = user.toObject();
    delete out.password;
    res.json(out);
  } catch (err) {
    console.error('updateUser error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    // prevent admins from deleting themselves
    const requesterId = req.user && (req.user.id || req.user._id || (req.user._doc && req.user._doc._id));
    if (requesterId && String(requesterId) === String(req.params.id)) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('deleteUser error', { id: req.params.id, err });
    res.status(500).json({ message: 'Server error' });
  }
};
