import { Router, Request, Response } from "express";
import { connectToDatabase } from "../lib/db";
import { ObjectId } from "mongodb";

const router = Router();

// ==================== BOOKS ====================
router.get("/books", async (req: Request, res: Response) => {
  try {
    const { db } = await connectToDatabase();
    const { category, search, sort, limit } = req.query;

    let query: any = {};

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
      cursor = cursor.limit(parseInt(limit as string));
    }

    const books = await cursor.toArray();
    res.json({ books });
  } catch (error) {
    console.error("Get books error:", error);
    res.status(500).json({ error: "Failed to get books" });
  }
});

router.get("/books/featured", async (req: Request, res: Response) => {
  try {
    const { db } = await connectToDatabase();
    const limit = parseInt(req.query.limit as string) || 8;
    const books = await db
      .collection("book")
      .find({ $or: [{ isFeatured: true }, { isBestseller: true }] })
      .sort({ rating: -1 })
      .limit(limit)
      .toArray();
    res.json({ books });
  } catch (error) {
    console.error("Get featured books error:", error);
    res.status(500).json({ error: "Failed to get featured books" });
  }
});

router.get("/books/:id", async (req: Request, res: Response) => {
  try {
    const { db } = await connectToDatabase();
    let book;
    try {
      book = await db.collection("book").findOne({ _id: new ObjectId(req.params.id) });
    } catch {
      book = await db.collection("book").findOne({ id: req.params.id });
    }
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.json({ book });
  } catch (error) {
    console.error("Get book error:", error);
    res.status(500).json({ error: "Failed to get book" });
  }
});

// ==================== CATEGORIES ====================
router.get("/categories", async (_req: Request, res: Response) => {
  try {
    const { db } = await connectToDatabase();
    const categories = await db.collection("category").find().toArray();
    res.json({ categories });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ error: "Failed to get categories" });
  }
});

router.get("/categories/:slug", async (req: Request, res: Response) => {
  try {
    const { db } = await connectToDatabase();
    const category = await db.collection("category").findOne({ slug: req.params.slug });
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json({ category });
  } catch (error) {
    console.error("Get category error:", error);
    res.status(500).json({ error: "Failed to get category" });
  }
});

export default router;
