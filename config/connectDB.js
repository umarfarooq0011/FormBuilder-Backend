import mongoose  from "mongoose";

import mongoose from "mongoose";

// This object will cache the database connection across function invocations.
let cachedConnection = null;

export const connectDB = async () => {
  // If we already have a connection, reuse it.
  if (cachedConnection) {
    console.log("Using cached MongoDB connection");
    return cachedConnection;
  }

  try {
    // If no cached connection, create a new one.
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`New MongoDB Connected: ${conn.connection.host}`);

    // Cache the connection for future use.
    cachedConnection = conn;

    return conn;
  } catch (error) {
    console.log('Error connecting to MongoDB:', error.message);
    // This will be caught by our error handling in the routes.
    throw new Error("MongoDB connection failed");
  }
};