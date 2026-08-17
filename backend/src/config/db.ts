import mongoose from 'mongoose';

export const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  try {
    const connString = process.env.MONGODB_URI || 'mongodb://localhost:27017/socialflow';
    console.log(`Connecting to MongoDB...`);
    const conn = await mongoose.connect(connString);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error: any) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    throw error;
  }
};
