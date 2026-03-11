import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import mechanicRoutes from './routes/mechanics.js';
import requestRoutes from './routes/serviceRequests.js';
import chatRoutes from './routes/chat.js';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// MongoDB connect + one-time geo field cleanup
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
      console.log('✅ MongoDB connected');
      // Clean up existing documents that have malformed geo fields (empty/missing coordinates).
      // These cause 2dsphere index failures on any write to that document.
      // We use the native driver directly so Mongoose schema validation is bypassed entirely.
      try {
        const db = mongoose.connection.db;
        const badGeoFilter = {
          $or: [
            { coordinates: { $size: 0 } },
            { type: { $exists: true }, coordinates: { $exists: false } },
          ],
        };
        const [mechRes, srRes] = await Promise.all([
          db.collection('mechanics').updateMany(
            { $or: [{ 'location.coordinates': { $size: 0 } }, { 'location.type': { $exists: true }, 'location.coordinates': { $exists: false } }] },
            { $unset: { location: '' } }
          ),
          db.collection('servicerequests').updateMany(
            { $or: [{ 'userLocation.coordinates': { $size: 0 } }, { 'userLocation.type': { $exists: true }, 'userLocation.coordinates': { $exists: false } }] },
            { $unset: { userLocation: '' } }
          ),
        ]);
        if (mechRes.modifiedCount > 0) console.log(`🧹 Fixed ${mechRes.modifiedCount} mechanic(s) with bad location`);
        if (srRes.modifiedCount > 0) console.log(`🧹 Fixed ${srRes.modifiedCount} service request(s) with bad userLocation`);
      } catch (cleanupErr) {
        console.warn('⚠️ Geo cleanup warning:', cleanupErr.message);
      }
    })
    .catch((err) => console.warn('⚠️ MongoDB connection failed:', err.message));
} else {
  console.warn('⚠️ No MONGO_URI provided — running without MongoDB connection');
}

// HTTP + Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Track userId → socketId mapping for targeted delivery
const userSockets = new Map(); // userId -> socket.id
const socketUsers = new Map(); // socket.id -> userId

// ── Surveillance: active streamer registry ──
const activeSurveillance = new Map(); // userId -> { socketId, role, name }
const adminSockets = new Set(); // socket.ids of logged-in admins

io.on('connection', (socket) => {
  console.log('🟢 Socket connected:', socket.id);

  // ── Register user identity ──
  socket.on('register_user', (userId) => {
    if (!userId) return;
    userSockets.set(userId, socket.id);
    socketUsers.set(socket.id, userId);
    console.log(`👤 User ${userId} registered with socket ${socket.id}`);
  });

  // ── Admin registers for surveillance feed ──
  socket.on('surveillance:admin_join', () => {
    adminSockets.add(socket.id);
    // Send the full list of currently active streamers to this admin
    const active = [];
    activeSurveillance.forEach((info, userId) => active.push({ userId, ...info }));
    socket.emit('surveillance:active_list', active);
    console.log(`🖥️  Admin joined surveillance: ${socket.id}`);
  });

  // ── Driver/Mechanic starts streaming (camera on) ──
  socket.on('surveillance:start', ({ userId, role, name }) => {
    if (!userId) return;
    activeSurveillance.set(userId, { socketId: socket.id, role, name });
    console.log(`📸 Surveillance live: ${name} (${role})`);
    // Notify all admin viewers
    adminSockets.forEach((adminSocketId) => {
      io.to(adminSocketId).emit('surveillance:user_online', { userId, role, name, socketId: socket.id });
    });
  });

  // ── Driver/Mechanic stops streaming ──
  socket.on('surveillance:stop', ({ userId }) => {
    activeSurveillance.delete(userId);
    adminSockets.forEach((adminSocketId) => {
      io.to(adminSocketId).emit('surveillance:user_offline', { userId });
    });
  });

  // ── Admin requests to watch a specific user ──
  socket.on('surveillance:request', ({ targetUserId }) => {
    const target = activeSurveillance.get(targetUserId);
    if (target) {
      io.to(target.socketId).emit('surveillance:watch_request', { adminSocketId: socket.id });
    }
  });

  // ── User sends WebRTC offer to admin ──
  socket.on('surveillance:offer', ({ toSocketId, offer }) => {
    if (!toSocketId || !offer) return;
    io.to(toSocketId).emit('surveillance:offer', { offer, fromSocketId: socket.id });
  });

  // ── Admin sends WebRTC answer back to user ──
  socket.on('surveillance:answer', ({ toSocketId, answer }) => {
    if (!toSocketId || !answer) return;
    // Forward fromSocketId so the user can match it to the correct PeerConnection
    io.to(toSocketId).emit('surveillance:answer', { answer, fromSocketId: socket.id });
  });

  // ── ICE candidates (bidirectional) ──
  socket.on('surveillance:ice', ({ toSocketId, candidate }) => {
    if (!toSocketId || !candidate) return;
    // Forward fromSocketId so the receiver can route ICE to the correct PeerConnection
    io.to(toSocketId).emit('surveillance:ice', { candidate, fromSocketId: socket.id });
  });

  // ── Join a chat/call room for a service request ──
  socket.on('join_room', (requestId) => {
    if (!requestId) return;
    socket.join(`room:${requestId}`);
    console.log(`📦 Socket ${socket.id} joined room:${requestId}`);
  });

  // ── Text chat (broadcast to peers in room) ──
  socket.on('send_message', ({ requestId, message, tempId }) => {
    if (!requestId || !message) return;
    socket.to(`room:${requestId}`).emit('receive_message', {
      requestId,
      message,
      tempId,
      optimistic: true,
    });
  });

  // ──────────────────────────────────────────
  //  WebRTC Video Call Signaling
  // ──────────────────────────────────────────

  // Caller initiates: sends offer to everyone else in the room
  socket.on('video:offer', ({ requestId, offer }) => {
    if (!requestId || !offer) return;
    console.log(`📹 video:offer in room ${requestId}`);
    socket.to(`room:${requestId}`).emit('video:offer', {
      offer,
      from: socket.id,
    });
  });

  // Callee responds with answer
  socket.on('video:answer', ({ requestId, answer }) => {
    if (!requestId || !answer) return;
    console.log(`📹 video:answer in room ${requestId}`);
    socket.to(`room:${requestId}`).emit('video:answer', { answer });
  });

  // ICE candidates exchange
  socket.on('video:ice', ({ requestId, candidate }) => {
    if (!requestId || !candidate) return;
    socket.to(`room:${requestId}`).emit('video:ice', { candidate });
  });

  // Caller signals incoming call before sending offer
  socket.on('video:ring', ({ requestId }) => {
    if (!requestId) return;
    console.log(`🔔 video:ring in room ${requestId}`);
    socket.to(`room:${requestId}`).emit('video:ring', { from: socket.id, requestId });
  });

  // Either party ends the call
  socket.on('video:end', ({ requestId }) => {
    if (!requestId) return;
    console.log(`📵 video:end in room ${requestId}`);
    socket.to(`room:${requestId}`).emit('video:end');
  });

  // Callee rejects incoming call
  socket.on('video:reject', ({ requestId }) => {
    if (!requestId) return;
    socket.to(`room:${requestId}`).emit('video:reject');
  });

  socket.on('disconnect', () => {
    const userId = socketUsers.get(socket.id);
    if (userId) {
      userSockets.delete(userId);
      // Clean up surveillance if this was an active streamer
      if (activeSurveillance.has(userId)) {
        activeSurveillance.delete(userId);
        adminSockets.forEach((adminSocketId) => {
          io.to(adminSocketId).emit('surveillance:user_offline', { userId });
        });
      }
    }
    socketUsers.delete(socket.id);
    adminSockets.delete(socket.id); // no-op if not an admin socket
    console.log('🔴 Socket disconnected:', socket.id);
  });
});

app.set('io', io);
app.set('userSockets', userSockets);

app.use('/auth', authRoutes);
app.use('/mechanics', mechanicRoutes);
app.use('/service-requests', requestRoutes);
app.use('/chat', chatRoutes);

app.get('/', (_, res) => res.send('DriveAid API running 🚗'));

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

