import { MongoClient, Db } from "mongodb";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const MONGODB_URI = process.env.MONGO_DB_URI || "";
  const MONGODB_DB = process.env.MONGODB_DB || "libray";

  if (!MONGODB_URI) {
    throw new Error("Please define the MONGO_DB_URI environment variable");
  }

  const client = new MongoClient(MONGODB_URI, {
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

export function getDb(): Db {
  if (!cachedDb) {
    throw new Error("Database not initialized. Call connectToDatabase first.");
  }
  return cachedDb;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    console.log("MongoDB connection closed");
  }
}
