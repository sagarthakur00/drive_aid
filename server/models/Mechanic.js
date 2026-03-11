import mongoose from 'mongoose';

const mechanicSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  shopName: String,
  services: [String],
  // Mixed type prevents Mongoose from injecting defaults (empty array for coordinates)
  // that would break MongoDB's 2dsphere index validation on documents without a location.
  location: { type: mongoose.Schema.Types.Mixed, default: undefined },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

// sparse: true skips documents where location is null/absent
mechanicSchema.index({ location: '2dsphere' }, { sparse: true });
export default mongoose.model('Mechanic', mechanicSchema);
