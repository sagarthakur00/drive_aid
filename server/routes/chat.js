import express from "express";
import { auth } from "../middleware/auth.js";
import ChatMessage from "../models/ChatMessage.js";
import ServiceRequest from "../models/ServiceRequest.js";

const router = express.Router();

// helper: ensure the user participates in the request
async function ensureParticipant(user, requestId) {
  const reqDoc = await ServiceRequest.findById(requestId).select("driverId mechanicId");
  if (!reqDoc) return false;
  if (user.role === "admin") return true; // allow admins for support/debug

  // Driver owns the request
  if (user.role === "driver" && reqDoc.driverId?.toString() === user.id) return true;

  // Mechanic participation: mechanicId on ServiceRequest stores the Mechanic._id (not the User._id)
  if (user.role === "mechanic") {
    // Find the mechanic profile for this user and compare
    const mechProfile = await Mechanic.findOne({ userId: user.id }).select("_id");
    if (!mechProfile) return false;
    if (reqDoc.mechanicId?.toString() === mechProfile._id.toString()) return true;
  }

  return false;
}

// GET chat history
router.get("/:requestId", auth(), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    
    // basic guard: permit driver (owner), mechanic (assigned), or admin
    const ok = await ensureParticipant(req.user, requestId);
    if (!ok) return res.status(403).json({ message: "Forbidden" });

    const messages = await ChatMessage.find({ requestId })
      .sort({ createdAt: 1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    res.json(messages);
  } catch (err) {
    console.error("Error fetching chat:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST message (also emits via socket)
router.post("/:requestId", auth(), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "message required" });

    const ok = await ensureParticipant(req.user, requestId);
    if (!ok) return res.status(403).json({ message: "Forbidden" });

    const doc = await ChatMessage.create({ requestId, senderId: req.user.id, message });

    const io = req.app.get("io");
    io.to(`room:${requestId}`).emit("receive_message", doc);

    res.status(201).json(doc);
  } catch (err) {
    console.error("Error sending chat:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
