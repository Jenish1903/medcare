// server.js
const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const errorHandler = require("./middleware/errorHandler");
const jwt = require("jsonwebtoken");

const http = require("http");
const { Server } = require("socket.io");

const { connectDB } = require("./config/sequelize");

// Load all models
require("./models/userModel");
require("./models/doctorModel");
require("./models/patientModel");
require("./models/chatSessionModel");
require("./models/chatMessageModel");
require("./models/appointmentModel");
require("./models/doctorReviewModel");
require("./models/callModel");
// Add additional models here as needed

const setupAssociations = require("./models/associations");
setupAssociations();
console.log("Sequelize associations have been set up.");

dotenv.config();
const app = express();
app.use(bodyParser.json());

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
  },
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
};

app.use(verifyToken);

// Inject io instance into request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// All routes
const authRoutes = require("./routes/authRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const hospitalshopRoutes = require("./routes/hospitalShopRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const prescriptions = require("./routes/prescriptionRoutes");
const healthHistoryRoutes = require("./routes/healthHistoryRoutes");
// const articleModel = require("./routes/articleRoutes"); // Uncomment when ready

app.use("/api/v1/auth", authRoutes);
app.use("/api/healthshop", hospitalshopRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/v1/chat", doctorRoutes); // used for both chat and call handling
app.use("/api/prescriptions", prescriptions);
app.use("/api/health-history", healthHistoryRoutes);
// app.use("/api/articles", articleModel); // Uncomment when implemented

app.use(errorHandler);

// Socket.IO logic
const CallRepository = require("./models/callModel");

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("joinUserRoom", (userId) => {
    socket.join(userId.toString());
    console.log(`User ${socket.id} joined room ${userId}`);
  });

  socket.on("webrtcOffer", (data) => {
    console.log(`Received WebRTC offer for calleeId: ${data.calleeId}`);
    io.to(data.calleeId.toString()).emit("webrtcOffer", data);
  });

  socket.on("webrtcAnswer", (data) => {
    console.log(`Received WebRTC answer for callerId: ${data.callerId}`);
    io.to(data.callerId.toString()).emit("webrtcAnswer", data);
  });

  socket.on("webrtcCandidate", (data) => {
    console.log(`Received ICE candidate for target: ${data.targetUserId}`);
    io.to(data.targetUserId.toString()).emit("webrtcCandidate", data);
  });

  socket.on("callStatusUpdate", async (data) => {
    const { callId, status, userId } = data;
    try {
      const updated = await CallRepository.updateCallStatus(callId, status, userId);
      if (updated) {
        console.log(`Call ${callId} status updated to ${status}`);
        const call = await CallRepository.getCallById(callId);
        if (call) {
          io.to(call.callerId.toString()).emit("callStatusChanged", call);
          io.to(call.calleeId.toString()).emit("callStatusChanged", call);
        }
      }
    } catch (error) {
      console.error("Error updating call status via socket:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    server.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ Failed to start server due to DB error:", err);
    process.exit(1);
  });
