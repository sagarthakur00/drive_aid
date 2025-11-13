import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema(
  {
    problemDescription: { type: String, required: true },
    address: { type: String, required: true },
    userLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: [Number],
    },
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

serviceRequestSchema.index({ userLocation: "2dsphere" });

export default mongoose.model("ServiceRequest", serviceRequestSchema);
