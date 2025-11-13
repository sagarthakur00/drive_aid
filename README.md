# 🚗 DriveAid - Roadside Assistance Platform

A full-stack MERN web application connecting drivers with mechanics for real-time roadside assistance.

## 🎯 Features

### Driver Features
- Create service requests with problem description and address
- Track request status (Pending → Accepted → Completed)
- Real-time chat with assigned mechanic
- View all personal service requests

### Mechanic Features
- View pending service requests
- Accept requests and update status
- Real-time chat with drivers
- Manage accepted requests

### Admin Features
- Create test service requests
- Manage and verify mechanics
- View all service requests and mechanics
- Oversee platform operations

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO (real-time chat)
- JWT Authentication
- OpenStreetMap Nominatim (address geocoding)

**Frontend:**
- React + Vite
- Tailwind CSS
- Socket.IO Client
- Axios
- React Router

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- MongoDB Atlas account (or local MongoDB)
- Git

### 1. Clone & Install

```bash
cd /Users/sagarsingh/Desktop/drive_beta

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Environment

Create `server/.env`:
```env
MONGO_URI=mongodb+srv://your-user:your-password@cluster0.mongodb.net/driveaid
JWT_SECRET=your_secure_jwt_secret_here
PORT=5001
```

### 3. Run the Application

**Terminal 1 - Backend:**
```bash
cd server
npm start
# Should see: 🚀 Server running on 5001
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
# Should see: Local: http://localhost:5173
```

### 4. Access the App

Open http://localhost:5173 in your browser.

## 👤 Test Users

Create test users via API:

**Admin:**
```bash
curl -X POST http://localhost:5001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Admin User",
    "email": "admin@driveaid.test",
    "phone": "1234567890",
    "password": "admin123",
    "role": "admin"
  }'
```

**Mechanic:**
```bash
curl -X POST http://localhost:5001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Mechanic",
    "email": "mechanic@driveaid.test",
    "phone": "9876543210",
    "password": "mech123",
    "role": "mechanic"
  }'
```

**Driver:**
```bash
curl -X POST http://localhost:5001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Driver",
    "email": "driver@driveaid.test",
    "phone": "5555555555",
    "password": "driver123",
    "role": "driver"
  }'
```

## 🔐 Authentication Flow

1. User registers with role (admin/mechanic/driver)
2. User logs in → receives JWT token
3. Token stored in localStorage
4. All API requests include: `Authorization: Bearer <token>`
5. Routes protected with role-based middleware

## 💬 Chat System

- **Real-time:** Socket.IO for instant message delivery
- **Persistent:** MongoDB stores chat history
- **Optimistic UI:** Messages appear instantly, confirmed by server
- **Pagination:** Supports limit/skip for loading older messages

## 🗺️ Geocoding

- Addresses automatically converted to coordinates using OpenStreetMap Nominatim
- Enables future location-based mechanic matching
- Coordinates stored as GeoJSON Point with 2dsphere index

## 📂 Project Structure

```
drive_beta/
├── server/
│   ├── models/
│   │   ├── User.js
│   │   ├── Mechanic.js
│   │   ├── ServiceRequest.js
│   │   └── ChatMessage.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── mechanics.js
│   │   ├── serviceRequests.js
│   │   └── chat.js
│   ├── middleware/
│   │   └── auth.js
│   ├── index.js
│   └── package.json
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── MechanicDashboard.jsx
│   │   │   └── DriverDashboard.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

## 🚀 API Endpoints

### Auth
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

### Service Requests
- `GET /service-requests` - List requests (filtered by role)
- `POST /service-requests` - Create request (driver/admin)
- `POST /service-requests/:id/accept` - Accept request (mechanic)
- `POST /service-requests/:id/status` - Update status (mechanic)

### Chat
- `GET /chat/:requestId?limit=50&skip=0` - Get chat history
- `POST /chat/:requestId` - Send message

### Mechanics
- `GET /mechanics` - List mechanics (admin)
- `GET /mechanics/me` - Get my profile (mechanic)
- `PUT /mechanics/me` - Update my profile (mechanic)
- `PUT /mechanics/:id/verify` - Verify mechanic (admin)

## 🎨 UI Design

- **Modern gradient backgrounds** for each role
- **Responsive tables** with hover effects
- **Status badges** with color coding
- **Real-time chat** with message bubbles
- **Logout buttons** on all dashboards
- **Professional forms** with validation

## 🔧 Troubleshooting

**MongoDB connection failed:**
- Verify MONGO_URI in `.env`
- Check IP whitelist in MongoDB Atlas (Network Access)
- Ensure password has no special characters requiring URL encoding

**Port 5000 already in use:**
- Change PORT in `.env` to 5001 (already done)
- Update client API URLs if needed

**Tailwind not working:**
- Ensure `tailwind.config.js` exists
- Check `index.css` has `@tailwind` directives
- Restart dev server after Tailwind installation

## 📝 Future Enhancements

- [ ] WebRTC video calls between driver and mechanic
- [ ] Push notifications for new requests
- [ ] Location tracking with maps (Google Maps / Mapbox)
- [ ] Payment integration
- [ ] Mechanic ratings and reviews
- [ ] Mobile app (React Native / Expo)
- [ ] Advanced search and filtering
- [ ] Analytics dashboard for admins

## 📄 License

MIT

## 👥 Contributors

Built with ❤️ by the DriveAid team
