import express from "express";
import { auth } from "../middleware/auth.js";
import ServiceRequest from "../models/ServiceRequest.js";
import Mechanic from "../models/Mechanic.js";

const router = express.Router();

/**
 * ====================================================
 *  GET /service-requests
 *  - Admin: see all requests
 *  - Mechanic: see pending (unassigned) + their own
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
 *  - Admin creates a new service request
 * ====================================================
 */
router.post("/", auth("admin"), async (req, res) => {
  try {
    const { problemDescription, address } = req.body;

    if (!problemDescription || !address) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newRequest = new ServiceRequest({
      problemDescription,
      address,
      status: "Pending",
    });

    const savedRequest = await newRequest.save();
    res.status(201).json(savedRequest);
  } catch (err) {
    console.error("Error creating service request:", err);
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

    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Service request not found" });
    }

    if (request.status !== "Pending") {
      return res
        .status(400)
        .json({ message: "Request already accepted by another mechanic" });
    }

    // Map user -> mechanic profile id
    const mech = await Mechanic.findOne({ userId: userId }).select("_id isVerified");
    if (!mech) {
      return res.status(403).json({ message: "Mechanic profile not found" });
    }

    request.mechanicId = mech._id;
    request.status = "Accepted";
    await request.save();

    res.json(request);
  } catch (err) {
    console.error("Error accepting service request:", err);
    res.status(500).json({ message: "Server error" });
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
