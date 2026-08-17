import mongoose from 'mongoose';

// Keep track of connection promise in serverless environment to prevent concurrent connection attempts
let cachedConnection: Promise<typeof mongoose> | null = null;

export const connectDB = async () => {
  // If we already have an active connection, return it
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  // If a connection attempt is already in progress, wait for it
  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    const connString = process.env.MONGODB_URI;
    if (!connString) {
      throw new Error('MONGODB_URI environment variable is missing.');
    }

    console.log(`Connecting to MongoDB...`);
    
    // Configure connection options for serverless environment
    const options = {
      serverSelectionTimeoutMS: 5000, // Fail fast (5 seconds) instead of waiting 30 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    cachedConnection = mongoose.connect(connString, options);
    const conn = await cachedConnection;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error: any) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    cachedConnection = null; // Reset cache on failure so next request can retry
    throw error;
  }
};
