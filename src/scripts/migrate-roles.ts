import "dotenv/config";
import { MongoClient } from "mongodb";

async function migrateRoles() {
  const client = new MongoClient(process.env.MONGO_DB_URI || "");
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || "libray");
    
    // Update all users without a role field to have role: "user"
    const result = await db.collection("user").updateMany(
      { role: { $exists: false } },
      { $set: { role: "user" } }
    );
    
    console.log(`Updated ${result.modifiedCount} users with default role: "user"`);
    
    // Verify
    const users = await db.collection("user").find({}, { projection: { email: 1, role: 1 } }).toArray();
    console.log("Current users:");
    users.forEach((u: any) => {
      console.log(`  ${u.email} -> role: ${u.role || "(missing)"}`);
    });
  } finally {
    await client.close();
  }
}

migrateRoles().catch(console.error);
