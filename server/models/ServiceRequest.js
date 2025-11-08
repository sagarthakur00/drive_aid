import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema(
  {
    problemDescription: { type: String, required: true },
    address: { type: String, required: true },
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

export default mongoose.model("ServiceRequest", serviceRequestSchema);
