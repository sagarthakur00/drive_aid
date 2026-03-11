import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema(
  {
    problemDescription: { type: String, required: true },
    address: { type: String, required: true },
    // Mixed type prevents Mongoose from injecting empty-array/string defaults that
    // would break MongoDB's 2dsphere index validation on documents without a real location.
    userLocation: { type: mongoose.Schema.Types.Mixed, default: undefined },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    mechanicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mechanic",
      default: null,
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Completed"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

serviceRequestSchema.index({ userLocation: "2dsphere" }, { sparse: true });

export default mongoose.model("ServiceRequest", serviceRequestSchema);
