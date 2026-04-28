import express from "express";
import { auth } from "../middleware/auth.js";
import ServiceRequest from "../models/ServiceRequest.js";
import Mechanic from "../models/Mechanic.js";

const router = express.Router();

// Helper: geocode address using Nominatim (OpenStreetMap)
async function geocodeAddress(address) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { "User-Agent": "DriveAid/1.0" } }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        type: "Point",
        coordinates: [parseFloat(data[0].lon), parseFloat(data[0].lat)]
      };
    }
  } catch (err) {
    console.error("Geocoding error:", err);
  }
  return null;
}

/**
 * ====================================================
 *  GET /service-requests
 *  - Admin: see all requests
 *  - Mechanic: see pending (unassigned) + requests assigned to them
 *  - Driver: see their own requests
 * ====================================================
 */
router.get("/", auth(), async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = {};

    if (role === "mechanic") {
      // Find the Mechanic profile for this user
      const mech = await Mechanic.findOne({ userId: id }).select("_id");
      const mechId = mech?._id;

      // Mechanic sees unassigned pending + those assigned to them
      query = {
        $or: [
          { status: "Pending", mechanicId: null },
          ...(mechId ? [{ mechanicId: mechId }] : []),
        ],
      };
    } else if (role === "driver") {
      query = { driverId: id };
    }

    // Admin sees all
    const requests = await ServiceRequest.find(query)
      .populate("mechanicId", "shopName isVerified")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error("Error fetching service requests:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ====================================================
 *  POST /service-requests
 *  - Admin or Driver creates a new service request
 * ====================================================
 */
router.post("/", auth(), async (req, res) => {
  try {
    const { role, id } = req.user;
    if (!(role === "admin" || role === "driver")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { problemDescription, address } = req.body;

    if (!problemDescription || !address) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Geocode address to coordinates
    const userLocation = await geocodeAddress(address);

    const newRequest = new ServiceRequest({
      problemDescription,
      address,
      userLocation,
      driverId: role === "driver" ? id : undefined,
      status: "Pending",
    });

    const savedRequest = await newRequest.save();
    
    // Emit socket event
    const io = req.app.get("io");
    if (io) io.emit("request:new", savedRequest);
    
    res.status(201).json(savedRequest);
  } catch (err) {
    console.error("Error creating service request:", err);
    res.status(500).json({ message: "Server error" });
  }
});


/**
 * ====================================================
 *  DELETE /service-requests/:id
 *  - Driver: can delete their own request (only if Pending)
 *  - Mechanic: can delete a request assigned to them (only if Completed)
 *  - Admin: can delete any request
 * ====================================================
 */
router.delete("/:id", auth(), async (req, res) => {
  try {
    const { role, id: userId } = req.user;

    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Service request not found" });
    }

    if (role === "driver") {
      // Driver can only delete their own Pending requests
      if (request.driverId?.toString() !== userId) {
        return res.status(403).json({ message: "You can only delete your own requests" });
      }
      if (request.status !== "Pending") {
        return res.status(400).json({ message: "Only Pending requests can be deleted" });
      }
    } else if (role === "mechanic") {
      // Mechanic can only delete Completed requests assigned to them
      const mech = await Mechanic.findOne({ userId }).select("_id");
      if (!mech || request.mechanicId?.toString() !== mech._id.toString()) {
        return res.status(403).json({ message: "You can only delete requests assigned to you" });
      }
      if (request.status !== "Completed") {
        return res.status(400).json({ message: "Only Completed requests can be deleted" });
      }
    }
    // Admin can delete any request (no extra checks)

    await ServiceRequest.findByIdAndDelete(req.params.id);

    // Notify all connected clients that the request was removed
    const io = req.app.get("io");
    if (io) io.emit("request:deleted", { id: req.params.id });

    res.json({ message: "Request deleted successfully" });
  } catch (err) {
    console.error("Error deleting service request:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ====================================================
 *  POST /service-requests/:id/accept
 *  - Mechanic accepts a request
 * ====================================================
 */
router.post("/:id/accept", auth("mechanic"), async (req, res) => {
  try {
    const { id: userId } = req.user;

    // Check the request exists and is still Pending
    const existing = await ServiceRequest.findById(req.params.id).select("status");
    if (!existing) {
      return res.status(404).json({ message: "Service request not found" });
    }
    if (existing.status !== "Pending") {
      return res.status(400).json({ message: "Request already accepted by another mechanic" });
    }

    // Map user → mechanic profile (auto-create for legacy accounts)
    let mech = await Mechanic.findOne({ userId: userId }).select("_id");
    if (!mech) {
      mech = await Mechanic.create({ userId: userId, shopName: "Mechanic" });
    }

    // Build update: always set mechanicId + status.
    // Also $unset userLocation if it is malformed (empty/missing coordinates) so MongoDB's
    // 2dsphere index does not reject the write on existing corrupted documents.
    const existingFull = await ServiceRequest.findById(req.params.id).select("userLocation").lean();
    const coords = existingFull?.userLocation?.coordinates;
    const hasBadGeo = !coords || coords.length === 0;

    const updateOp = { $set: { mechanicId: mech._id, status: "Accepted" } };
    if (hasBadGeo) updateOp.$unset = { userLocation: "" };

    const updated = await ServiceRequest.findByIdAndUpdate(
      req.params.id,
      updateOp,
      { new: true, runValidators: false }
    );

    res.json(updated);
  } catch (err) {
    console.error("Error accepting service request:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

/**
 * ====================================================
 *  POST /service-requests/:id/status
 *  - Mechanic updates status (e.g., Completed)
 * ====================================================
 */
router.post("/:id/status", auth("mechanic"), async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { status } = req.body;

    const mech = await Mechanic.findOne({ userId: userId }).select("_id");
    if (!mech) {
      return res.status(403).json({ message: "Mechanic profile not found" });
    }

    const request = await ServiceRequest.findOne({ _id: req.params.id, mechanicId: mech._id });

    if (!request) {
      return res
        .status(404)
        .json({ message: "Request not found or not assigned to you" });
    }

    request.status = status;
    await request.save();

    res.json(request);
  } catch (err) {
    console.error("Error updating service request:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
