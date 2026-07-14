"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAuth = initializeAuth;
exports.getAuthInstance = getAuthInstance;
const better_auth_1 = require("better-auth");
const mongodb_1 = require("better-auth/adapters/mongodb");
const db_1 = require("./db");
let authInstance = null;
async function initializeAuth() {
    if (authInstance)
        return authInstance;
    const { db } = await (0, db_1.connectToDatabase)();
    const options = {
        database: (0, mongodb_1.mongodbAdapter)(db),
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: false,
            minPasswordLength: 8,
            maxPasswordLength: 128,
        },
        user: {
            additionalFields: {
                role: {
                    type: "string",
                    input: false,
                    defaultValue: "user",
                },
            },
        },
        session: {
            expiresIn: 60 * 60 * 24 * 7,
            updateAge: 60 * 60 * 24,
            cookieCache: {
                enabled: true,
                maxAge: 60 * 5,
            },
        },
        secret: process.env.BETTER_AUTH_SECRET || "",
        baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
        trustedOrigins: [process.env.CLIENT_URL || "http://localhost:3000"],
        advanced: {
            database: {
                generateId: () => crypto.randomUUID(),
            },
        },
    };
    authInstance = (0, better_auth_1.betterAuth)(options);
    return authInstance;
}
function getAuthInstance() {
    if (!authInstance) {
        throw new Error("Auth not initialized. Call initializeAuth() first.");
    }
    return authInstance;
}
//# sourceMappingURL=auth.js.map