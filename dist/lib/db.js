"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = connectToDatabase;
exports.getDb = getDb;
exports.closeDatabaseConnection = closeDatabaseConnection;
const mongodb_1 = require("mongodb");
let cachedClient = null;
let cachedDb = null;
async function connectToDatabase() {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }
    const MONGODB_URI = process.env.MONGO_DB_URI || "";
    const MONGODB_DB = process.env.MONGODB_DB || "libray";
    if (!MONGODB_URI) {
        throw new Error("Please define the MONGO_DB_URI environment variable");
    }
    const client = new mongodb_1.MongoClient(MONGODB_URI, {
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
        w: "majority",
    });
    await client.connect();
    const db = client.db(MONGODB_DB);
    cachedClient = client;
    cachedDb = db;
    console.log("Connected to MongoDB");
    return { client, db };
}
function getDb() {
    if (!cachedDb) {
        throw new Error("Database not initialized. Call connectToDatabase first.");
    }
    return cachedDb;
}
async function closeDatabaseConnection() {
    if (cachedClient) {
        await cachedClient.close();
        cachedClient = null;
        cachedDb = null;
        console.log("MongoDB connection closed");
    }
}
//# sourceMappingURL=db.js.map