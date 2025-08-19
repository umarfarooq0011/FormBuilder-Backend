import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/connectDB.js";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from 'express-rate-limit';
import formRoutes from './Routes/formRoutes.js';
import publicRoutes from './Routes/publicRoutes.js';

// Import necessary Node.js and Socket.IO modules
import { createServer } from 'http';
import { Server } from 'socket.io';

import path from 'path';
import { fileURLToPath } from 'url';




dotenv.config();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Create an HTTP server from the Express app
const httpServer = createServer(app);

// Create a Socket.IO server and attach it to the HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", // Ensure this matches your frontend URL
    methods: ["GET", "POST"]
  }
});

// Middleware to attach the `io` instance to the request object
// This makes it accessible in your route controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(helmet({
  contentSecurityPolicy:{
    directives:{
       ...helmet.contentSecurityPolicy.getDefaultDirectives(),
       "connect-src": ["'self'", "https://generativelanguage.googleapis.com"],
    }
  }
}));



app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(morgan('dev'));

const submitLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

app.use('/api/forms', formRoutes);
app.use('/api/public', submitLimiter, publicRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Socket.IO connection logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Setup for production - serve frontend
app.use(express.static(path.resolve(__dirname, "dist")));

app.get("/*", (_, res) => {
  res.sendFile(path.resolve(__dirname, "dist", "index.html"));
});

app.get('/', (req, res) => {
    res.send("FORM BUILDER PROJECT");
});


httpServer.listen(PORT, async()=>{
    connectDB();
    console.log(`SERVER is running on http://localhost:${PORT}`);
})