import mongoose from 'mongoose';

const mechanicSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  shopName: String,
  services: [String],
  location: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: [Number] },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

mechanicSchema.index({ location: '2dsphere' });
export default mongoose.model('Mechanic', mechanicSchema);
