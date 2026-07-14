"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../lib/db");
const mongodb_1 = require("mongodb");
const router = (0, express_1.Router)();
// ==================== BOOKS ====================
router.get("/books", async (req, res) => {
    try {
        const { db } = await (0, db_1.connectToDatabase)();
        const { category, search, sort, limit } = req.query;
        let query = {};
        if (category && category !== "All Categories") {
            query.category = category;
        }
        if (search) {
            const searchRegex = { $regex: search, $options: "i" };
            query.$or = [
                { title: searchRegex },
                { author: searchRegex },
                { description: searchRegex },
                { tags: searchRegex },
            ];
        }
        let cursor = db.collection("book").find(query);
        if (sort) {
            switch (sort) {
                case "price-asc":
                    cursor = cursor.sort({ price: 1 });
                    break;
                case "price-desc":
                    cursor = cursor.sort({ price: -1 });
                    break;
                case "rating":
                    cursor = cursor.sort({ rating: -1 });
                    break;
                case "newest":
                    cursor = cursor.sort({ createdAt: -1 });
                    break;
                case "bestselling":
                    cursor = cursor.sort({ reviewCount: -1 });
                    break;
                case "title-asc":
                    cursor = cursor.sort({ title: 1 });
                    break;
                default:
                    cursor = cursor.sort({ isFeatured: -1, isBestseller: -1 });
            }
        }
        if (limit) {
            cursor = cursor.limit(parseInt(limit));
        }
        const books = await cursor.toArray();
        res.json({ books });
    }
    catch (error) {
        console.error("Get books error:", error);
        res.status(500).json({ error: "Failed to get books" });
    }
});
router.get("/books/featured", async (req, res) => {
    try {
        const { db } = await (0, db_1.connectToDatabase)();
        const limit = parseInt(req.query.limit) || 8;
        const books = await db
            .collection("book")
            .find({ $or: [{ isFeatured: true }, { isBestseller: true }] })
            .sort({ rating: -1 })
            .limit(limit)
            .toArray();
        res.json({ books });
    }
    catch (error) {
        console.error("Get featured books error:", error);
        res.status(500).json({ error: "Failed to get featured books" });
    }
});
router.get("/books/:id", async (req, res) => {
    try {
        const { db } = await (0, db_1.connectToDatabase)();
        let book;
        try {
            book = await db.collection("book").findOne({ _id: new mongodb_1.ObjectId(req.params.id) });
        }
        catch {
            book = await db.collection("book").findOne({ id: req.params.id });
        }
        if (!book)
            return res.status(404).json({ error: "Book not found" });
        res.json({ book });
    }
    catch (error) {
        console.error("Get book error:", error);
        res.status(500).json({ error: "Failed to get book" });
    }
});
// ==================== CATEGORIES ====================
router.get("/categories", async (_req, res) => {
    try {
        const { db } = await (0, db_1.connectToDatabase)();
        const categories = await db.collection("category").find().toArray();
        const categoriesWithCount = await Promise.all(categories.map(async (cat) => {
            const bookCount = await db.collection("book").countDocuments({ category: cat.name });
            return { ...cat, bookCount };
        }));
        res.json({ categories: categoriesWithCount });
    }
    catch (error) {
        console.error("Get categories error:", error);
        res.status(500).json({ error: "Failed to get categories" });
    }
});
router.get("/categories/:slug", async (req, res) => {
    try {
        const { db } = await (0, db_1.connectToDatabase)();
        const category = await db.collection("category").findOne({ slug: req.params.slug });
        if (!category)
            return res.status(404).json({ error: "Category not found" });
        res.json({ category });
    }
    catch (error) {
        console.error("Get category error:", error);
        res.status(500).json({ error: "Failed to get category" });
    }
});
exports.default = router;
//# sourceMappingURL=public.js.map