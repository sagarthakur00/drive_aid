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

// MongoDB connect
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch((err) => console.warn('⚠️ MongoDB connection failed:', err.message));
} else {
  console.warn('⚠️ No MONGO_URI provided — running without MongoDB connection');
}

// HTTP + Socket.IO
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log('🟢 Socket connected:', socket.id);

  // Join a chat room for a given service request
  socket.on('join_room', (requestId) => {
    if (!requestId) return;
    socket.join(`room:${requestId}`);
  });

  // Optimistic outgoing message (canonical message persisted via REST POST /chat/:requestId)
  socket.on('send_message', ({ requestId, message, tempId }) => {
    if (!requestId || !message) return;
    socket.to(`room:${requestId}`).emit('receive_message', { requestId, message, tempId, optimistic: true });
  });

  socket.on('disconnect', () => console.log('🔴 Socket disconnected'));
});

app.set('io', io); // make available in routes

app.use('/auth', authRoutes);
app.use('/mechanics', mechanicRoutes);
app.use('/service-requests', requestRoutes);
app.use('/chat', chatRoutes);

app.get('/', (_, res) => res.send('DriveAid API running 🚗'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
