import mongoose from "mongoose";

// Use the same env var as your app if available
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/test";

async function dropIndex() {
  try {
    console.log("Connecting to:", mongoUri);
    await mongoose.connect(mongoUri, { autoIndex: false });

    const db = mongoose.connection.db;
    const collection = db.collection("practiceplans");

    const indexes = await collection.indexes();
    console.log("Existing indexes:", indexes.map(i => i.name));

    const targetIndexName = "planId_1";
    const hasIndex = indexes.some(i => i.name === targetIndexName);

    if (!hasIndex) {
      console.log(`Index ${targetIndexName} not found. Nothing to drop.`);
    } else {
      await collection.dropIndex(targetIndexName);
      console.log(`Dropped index ${targetIndexName}.`);
    }

    await mongoose.disconnect();
    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error("Failed to drop index:", err.message);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
}

dropIndex();


