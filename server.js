import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth/authRoutes.js";
import userRoutes from "./routes/user/userRoutes.js";
import creatorRoutes from "./routes/creator/creatorRoutes.js";
import categoryRoutes from "./routes/category/categoryRoutes.js";
import jobRoutes from "./routes/job/jobRoutes.js";
import bookingRoutes from "./routes/booking/bookingRoutes.js";
import chatRoutes from "./routes/chat/chatRoutes.js";
import notificationRoutes from "./routes/notification/notificationRoutes.js";
import adminRoutes from "./routes/admin/adminRoutes.js";
import supportRoutes from "./routes/support/supportRoutes.js";
import dashboardRoutes from "./routes/dashboard/dashboardRoutes.js";
import reviewRoutes from "./routes/review/reviewRoutes.js";
import paymentRoutes from "./routes/payment/payRoutes.js";
import walletRoutes from "./routes/wallet/walletRoutes.js";
import { setupSwagger } from "./utils/swagger.js";
import { initSocket } from "./utils/socket.js";
import http from "http";
import helmet from "helmet";
import { globalRateLimiter } from "./middleware/auth/rateLimiter.js";

const app = express();
const server = http.createServer(app);

initSocket(server);
setupSwagger(app);

// Security Middleware
app.use(helmet());
app.set("trust proxy", 1); // Enable if behind a proxy like Nginx/Load Balancer

app.use(cors());
app.use(express.json({ limit: "10kb" })); // Limit JSON payload size
app.use(globalRateLimiter);

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/creators", creatorRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/chats", chatRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/support", supportRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/wallet", walletRoutes);

const port = process.env.DEV_PORT;
server.listen(port, () => {
    console.info(`Server running on port ${port}`);
});