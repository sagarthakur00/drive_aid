import express from 'express';
import Mechanic from '../models/Mechanic.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Get my mechanic profile
router.get('/me', auth('mechanic'), async (req, res) => {
  const mech = await Mechanic.findOne({ userId: req.user.id });
  res.json(mech);
});

// Upsert my mechanic profile
router.put('/me', auth('mechanic'), async (req, res) => {
  const update = { ...req.body, userId: req.user.id };
  const mech = await Mechanic.findOneAndUpdate(
    { userId: req.user.id },
    update,
    { new: true, upsert: true }
  );
  res.json(mech);
});

// Admin verify toggle
router.put('/:id/verify', auth('admin'), async (req, res) => {
  const mech = await Mechanic.findByIdAndUpdate(
    req.params.id,
    { isVerified: !!req.body.isVerified },
    { new: true }
  );
  res.json(mech);
});

// List mechanics (admin)
router.get('/', auth('admin'), async (req, res) => {
  const { verified } = req.query;
  const filter = verified === undefined ? {} : { isVerified: verified === 'true' };
  const list = await Mechanic.find(filter).limit(100);
  res.json(list);
});

export default router;
