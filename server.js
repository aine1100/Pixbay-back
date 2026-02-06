import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth/authRoutes.js";
import userRoutes from "./routes/user/userRoutes.js";
import creatorRoutes from "./routes/creator/creatorRoutes.js";
import categoryRoutes from "./routes/category/categoryRoutes.js";
import jobRoutes from "./routes/job/jobRoutes.js";
import bookingRoutes from "./routes/booking/bookingRoutes.js";
import chatRoutes from "./routes/chat/chatRoutes.js";
import { setupSwagger } from "./utils/swagger.js";
import { initSocket } from "./utils/socket.js";
import http from 'http';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Swagger Documentation
setupSwagger(app);

// Middleware
app.use(express.json());

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/creators", creatorRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/chats", chatRoutes);

const port = process.env.DEV_PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});