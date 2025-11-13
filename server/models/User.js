import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  phone: String,
  passwordHash: String,
  role: { type: String, enum: ['admin', 'mechanic', 'driver'], default: 'driver' },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
