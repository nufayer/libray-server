"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../lib/db");
const auth_1 = require("../lib/auth");
const mongodb_1 = require("mongodb");
const router = (0, express_1.Router)();
async function requireAuth(req, res) {
    try {
        const auth = (0, auth_1.getAuthInstance)();
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
            res.status(401).json({ error: "Unauthorized" });
            return null;
        }
        return { userId: session.user.id, email: session.user.email };
    }
    catch {
        res.status(401).json({ error: "Unauthorized" });
        return null;
    }
}
// ==================== CART ====================
// Get cart items
router.get("/cart", async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth)
        return;
    try {
        const { db } = await (0, db_1.connectToDatabase)();
        const cart = await db.collection("cart").findOne({ userId: auth.userId });
        res.json({ items: cart?.items || [] });
    }
    catch (error) {
        console.error("Get cart error:", error);
        res.status(500).json({ error: "Failed to get cart" });
    }
});
// Add to cart
router.post("/cart", async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth)
        return;
    try {
        const { db } = await (0, db_1.connectToDatabase)();
        const { bookId, quantity = 1 } = req.body;
        if (!bookId) {
            return res.status(400).json({ error: "bookId is required" });
        }
        const book = await db.collection("book").findOne({ _id: new mongodb_1.ObjectId(bookId) });
        if (!book) {
            return res.status(404).json({ error: "Book not found" });
        }
        const cart = await db.collection("cart").findOne({ userId: auth.userId });
        if (cart) {
            const existingItem = cart.items.find((item) => item.bookId === bookId);
            if (existingItem) {
                await db.collection("cart").updateOne({ userId: auth.userId, "items.bookId": bookId }, { $inc: { "items.$.quantity": quantity } });
            }
            else {
                await db.collection("cart").updateOne({ userId: auth.userId }, {
                    $push: {
                        items: {
                            bookId,
                            title: book.title,
                            author: book.author,
                            price: book.price,
                            cover: book.cover,
                            quantity,
                        },
                    },
                });
            }
        }
        else {
            await db.collection("cart").insertOne({
                userId: auth.userId,
                items: [
                    {
                        bookId,
                        title: book.title,
                        author: book.author,
                        price: book.price,
                        cover: book.cover,
                        quantity,
                    },
                ],
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
        const updatedCart = await db.collection("cart").findOne({ userId: auth.userId });
        res.json({ items: updatedCart?.items || [] });
    }
    catch (error) {
        console.error("Add to cart error:", error);
        res.status(500).json({ error: "Failed to add to cart" });
    }
});
// Update cart item quantity
router.put("/cart/:bookId", async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth)
        return;
    try {
        const { db } = await (0, db_1.connectToDatabase)();
        const { quantity } = req.body;
        const { bookId } = req.params;
        if (quantity < 1) {
            return res.status(400).json({ error: "Quantity must be at least 1" });
        }
        await db.collection("cart").updateOne({ userId: auth.userId, "items.bookId": bookId }, { $set: { "items.$.quantity": quantity } });
        const updatedCart = await db.collection("cart").findOne({ userId: auth.userId });
        res.json({ items: updatedCart?.items || [] });
    }
    catch (error) {
        console.error("Update cart error:", error);
        res.status(500).json({ error: "Failed to update cart" });
    }
});
// Remove from cart
router.delete("/cart/:bookId", async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth)
        return;
    try {
        const { db } = await (0, db_1.connectToDatabase)();
        const { bookId } = req.params;
        await db.collection("cart").updateOne({ userId: auth.userId }, { $pull: { items: { bookId } } });
        const updatedCart = await db.collection("cart").findOne({ userId: auth.userId });
        res.json({ items: updatedCart?.items || [] });
    }
    catch (error) {
        console.error("Remove from cart error:", error);
        res.status(500).json({ error: "Failed to remove from cart" });
    }
});
// Clear cart
router.delete("/cart", async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth)
        return;
    try {
        const { db } = await (0, db_1.connectToDatabase)();
        await db.collection("cart").updateOne({ userId: auth.userId }, { $set: { items: [], updatedAt: new Date() } });
        res.json({ items: [] });
    }
    catch (error) {
        console.error("Clear cart error:", error);
        res.status(500).json({ error: "Failed to clear cart" });
    }
});
// ==================== ORDERS ====================
// Create order from selected cart items
router.post("/orders", async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth)
        return;
    try {
        const { db } = await (0, db_1.connectToDatabase)();
        const { bookIds } = req.body;
        if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
            return res.status(400).json({ error: "bookIds array is required" });
        }
        const cart = await db.collection("cart").findOne({ userId: auth.userId });
        if (!cart) {
            return res.status(400).json({ error: "Cart is empty" });
        }
        const selectedItems = cart.items.filter((item) => bookIds.includes(item.bookId));
        if (selectedItems.length === 0) {
            return res.status(400).json({ error: "No valid items selected" });
        }
        const totalAmount = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const order = {
            userId: auth.userId,
            email: auth.email,
            items: selectedItems.map((item) => ({
                bookId: item.bookId,
                title: item.title,
                author: item.author,
                price: item.price,
                cover: item.cover,
                quantity: item.quantity,
            })),
            totalAmount,
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const result = await db.collection("order").insertOne(order);
        // Remove ordered items from cart
        await db.collection("cart").updateOne({ userId: auth.userId }, { $pull: { items: { bookId: { $in: bookIds } } } });
        res.status(201).json({ order: { ...order, _id: result.insertedId } });
    }
    catch (error) {
        console.error("Create order error:", error);
        res.status(500).json({ error: "Failed to create order" });
    }
});
// Get user orders
router.get("/orders", async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth)
        return;
    try {
        const { db } = await (0, db_1.connectToDatabase)();
        const orders = await db
            .collection("order")
            .find({ userId: auth.userId })
            .sort({ createdAt: -1 })
            .toArray();
        res.json({ orders });
    }
    catch (error) {
        console.error("Get orders error:", error);
        res.status(500).json({ error: "Failed to get orders" });
    }
});
// Cancel order
router.patch("/orders/:id/cancel", async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth)
        return;
    try {
        const { db } = await (0, db_1.connectToDatabase)();
        const { id } = req.params;
        const order = await db.collection("order").findOne({
            _id: new mongodb_1.ObjectId(id),
            userId: auth.userId,
        });
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        if (order.status !== "pending") {
            return res.status(400).json({ error: "Only pending orders can be cancelled" });
        }
        await db.collection("order").updateOne({ _id: new mongodb_1.ObjectId(id) }, { $set: { status: "cancelled", updatedAt: new Date() } });
        res.json({ success: true });
    }
    catch (error) {
        console.error("Cancel order error:", error);
        res.status(500).json({ error: "Failed to cancel order" });
    }
});
exports.default = router;
//# sourceMappingURL=user.js.map