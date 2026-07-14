"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("./lib/auth");
const db_1 = require("./lib/db");
const node_1 = require("better-auth/node");
const admin_1 = __importDefault(require("./routes/admin"));
const public_1 = __importDefault(require("./routes/public"));
const user_1 = __importDefault(require("./routes/user"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const allowedOrigins = [
    "https://libray-client.vercel.app",
    "http://localhost:3000",
    ...((process.env.CLIENT_URL || "").split(",").map((o) => o.trim()).filter(Boolean)),
];
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }
    else if (!origin) {
        res.setHeader("Access-Control-Allow-Origin", allowedOrigins[0]);
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,Cookie");
    if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
    }
    next();
});
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "public", "uploads")));
let authReady = false;
async function ensureAuth() {
    if (!authReady) {
        await (0, db_1.connectToDatabase)();
        await (0, auth_1.initializeAuth)();
        authReady = true;
    }
}
app.all("/api/auth/*", async (req, res) => {
    try {
        await ensureAuth();
        const auth = (0, auth_1.getAuthInstance)();
        const handler = (0, node_1.toNodeHandler)(auth.handler);
        return handler(req, res);
    }
    catch (error) {
        console.error("Auth handler error:", error);
        res.status(500).json({ error: "Auth error" });
    }
});
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.get("/", (_req, res) => {
    res.json({ message: "Server is running", timestamp: new Date().toISOString() });
});
app.get("/api/user/session", async (req, res) => {
    try {
        await ensureAuth();
        const auth = (0, auth_1.getAuthInstance)();
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
            return res.status(401).json({ error: "No active session" });
        }
        res.json({ user: session.user, session: session.session });
    }
    catch (error) {
        console.error("Session error:", error);
        res.status(500).json({ error: "Failed to get session" });
    }
});
app.get("/api/user", async (req, res) => {
    try {
        await ensureAuth();
        const auth = (0, auth_1.getAuthInstance)();
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        res.json({ user: session.user });
    }
    catch (error) {
        console.error("User error:", error);
        res.status(500).json({ error: "Failed to get user" });
    }
});
app.put("/api/user/profile", async (req, res) => {
    try {
        await ensureAuth();
        const auth = (0, auth_1.getAuthInstance)();
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { name, image } = req.body;
        const updateData = {};
        if (name)
            updateData.name = name;
        if (image !== undefined)
            updateData.image = image;
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }
        await auth.api.updateUser({ body: updateData, headers: req.headers });
        res.json({ success: true });
    }
    catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
});
app.put("/api/user/password", async (req, res) => {
    try {
        await ensureAuth();
        const auth = (0, auth_1.getAuthInstance)();
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Current and new password are required" });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ error: "New password must be at least 8 characters" });
        }
        const result = await auth.api.changePassword({
            body: { currentPassword, newPassword },
            headers: req.headers,
        });
        res.json({ success: true, user: result.user });
    }
    catch (error) {
        console.error("Password change error:", error);
        res.status(500).json({ error: "Failed to change password" });
    }
});
app.use("/api", public_1.default);
app.use("/api", user_1.default);
app.use("/api/admin", admin_1.default);
app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
});
if (!process.env.VERCEL) {
    ensureAuth().then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    }).catch((err) => {
        console.error("Failed to start server:", err);
        process.exit(1);
    });
}
module.exports = app;
//# sourceMappingURL=index.js.map