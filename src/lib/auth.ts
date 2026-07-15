import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { connectToDatabase } from "./db";
import type { BetterAuthOptions } from "better-auth";

let authInstance: ReturnType<typeof betterAuth> | null = null;

export async function initializeAuth() {
  if (authInstance) return authInstance;

  const { db } = await connectToDatabase();

  const options: BetterAuthOptions = {
    database: mongodbAdapter(db),

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

    trustedOrigins: (
      process.env.CLIENT_URL || "http://localhost:3000"
    )
      .split(",")
      .map((o) => o.trim()),

    advanced: {
      useSecureCookies: true,

      defaultCookieAttributes: {
        secure: true,
        sameSite: "none",
      },

      database: {
        generateId: () => crypto.randomUUID(),
      },
    },
  };

  authInstance = betterAuth(options);

  return authInstance;
}

export function getAuthInstance() {
  if (!authInstance) {
    throw new Error("Auth not initialized. Call initializeAuth() first.");
  }
  return authInstance;
}