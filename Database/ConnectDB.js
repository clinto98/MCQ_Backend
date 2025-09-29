import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

// Global cache for MongoDB connection (prevents multiple connections in Vercel)
const cached = global.mongoose || { conn: null, promise: null };

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((value) => value);
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

// Store cache globally (Vercel-specific optimization)
global.mongoose = cached;

export default connectDB;
