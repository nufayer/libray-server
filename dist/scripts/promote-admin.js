"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongodb_1 = require("mongodb");
async function promoteAdmin() {
    const email = process.argv[2];
    if (!email) {
        console.log("Usage: npx tsx src/scripts/promote-admin.ts <email>");
        process.exit(1);
    }
    const client = new mongodb_1.MongoClient(process.env.MONGO_DB_URI || "");
    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB || "libray");
        const result = await db.collection("user").updateOne({ email }, { $set: { role: "admin" } });
        if (result.matchedCount === 0) {
            console.log(`User with email "${email}" not found`);
        }
        else if (result.modifiedCount === 0) {
            console.log(`User "${email}" is already an admin`);
        }
        else {
            console.log(`User "${email}" has been promoted to admin`);
        }
        // Show all users
        const users = await db.collection("user").find({}, { projection: { email: 1, name: 1, role: 1 } }).toArray();
        console.log("\nAll users:");
        users.forEach((u) => {
            console.log(`  ${u.email} (${u.name || "unnamed"}) -> role: ${u.role || "user"}`);
        });
    }
    finally {
        await client.close();
    }
}
promoteAdmin().catch(console.error);
//# sourceMappingURL=promote-admin.js.map