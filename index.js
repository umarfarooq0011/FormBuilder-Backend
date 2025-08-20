import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/connectDB.js";
import cors from "cors";
import morgan from "morgan";
import rateLimit from 'express-rate-limit';
import formRoutes from './Routes/formRoutes.js';
import publicRoutes from './Routes/publicRoutes.js';

import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const PORT = process.env.PORT || 5000;

// Connect to the database immediately
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(morgan('dev'));

const submitLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Setup for production - serve frontend
app.use(express.static(path.resolve(__dirname, "dist")));
app.use('/api/forms', formRoutes);
app.use('/api/public', submitLimiter, publicRoutes);

app.get("/*", (_, res) => {
  res.sendFile(path.resolve(__dirname, "dist", "index.html"));
});

app.get('/', (req, res) => {
    res.send("FORM BUILDER PROJECT");
});

// For local development, you can still use app.listen
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`SERVER is running on http://localhost:${PORT}`);
  });
}

export default app;