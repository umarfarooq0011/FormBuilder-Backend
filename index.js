import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/connectDB.js";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from 'express-rate-limit';
import formRoutes from './Routes/formRoutes.js';
import publicRoutes from './Routes/publicRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Middleware ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "connect-src": ["'self'", "https://generativelanguage.googleapis.com"],
      "img-src": ["'self'", "data:", "https://www.transparenttextures.com"],
    }
  }
}));
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(morgan('dev'));

// --- Database Connection Middleware ---
// This will run before every API request to ensure the database is connected.
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection error in middleware:", error);
    res.status(500).json({ message: "Database connection failed" });
  }
});

// --- API Routes ---
const submitLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
app.use('/api/forms', formRoutes);
app.use('/api/public', submitLimiter, publicRoutes);

// --- Frontend Serving & Final Catch-all ---
app.use(express.static(path.resolve(__dirname, "dist")));
app.get("/*", (req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ message: 'API route not found' });
  }
  res.sendFile(path.resolve(__dirname, "dist", "index.html"));
});

// Vercel requires a default export for serverless functions
export default app;