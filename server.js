import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth/authRoutes.js";
import userRoutes from "./routes/user/userRoutes.js";
import { setupSwagger } from "./utils/swagger.js";

dotenv.config();

const app = express();

// Swagger Documentation
setupSwagger(app);

// Middleware
app.use(express.json());

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);

const port = process.env.DEV_PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});