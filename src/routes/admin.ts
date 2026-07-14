import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { connectToDatabase } from "../lib/db";
import { getAuthInstance } from "../lib/auth";
import { ObjectId } from "mongodb";

const router = Router();

// Image upload config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), "public", "uploads"));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpeg, jpg, png, gif, webp) are allowed"));
    }
  },
});

// Middleware to check admin role
async function requireAdmin(req: Request, res: Response, next: Function) {
  try {
    const auth = getAuthInstance();
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "admin") {
      res.status(403).json({ error: "Forbidden: Admin access required" });
      return;
    }
    next();
  } catch (error) {
    console.error("Admin auth error:", error);
    res.status(500).json({ error: "Auth check failed" });
  }
}

// ==================== UPLOAD ====================
router.post("/upload", requireAdmin, upload.single("image"), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided" });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// ==================== BOOKS ====================
router.get("/books", async (_req: Request, res: Response) => {
  try {
    const { db } = await connectToDatabase();
    const books = await db.collection("book").find().toArray();
    res.json({ books });
  } catch (error) {
    console.error("Get books error:", error);
    res.status(500).json({ error: "Failed to get books" });
  }
});

router.get("/books/:id", async (req: Request, res: Response) => {
  try {
    const { db } = await connectToDatabase();
    const book = await db.collection("book").findOne({ _id: new ObjectId(req.params.id) });
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.json({ book });
  } catch (error) {
    console.error("Get book error:", error);
    res.status(500).json({ error: "Failed to get book" });
  }
});

router.post("/books", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { db } = await connectToDatabase();
    const book = {
      ...req.body,
      price: parseFloat(req.body.price),
      originalPrice: req.body.originalPrice ? parseFloat(req.body.originalPrice) : null,
      rating: parseFloat(req.body.rating) || 0,
      reviewCount: parseInt(req.body.reviewCount) || 0,
      pages: parseInt(req.body.pages) || null,
      inStock: req.body.inStock !== false,
      isNew: req.body.isNew || false,
      isBestseller: req.body.isBestseller || false,
      isFeatured: req.body.isFeatured || false,
      tags: req.body.tags ? (typeof req.body.tags === "string" ? req.body.tags.split(",").map((t: string) => t.trim()) : req.body.tags) : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection("book").insertOne(book);
    res.status(201).json({ book: { ...book, _id: result.insertedId } });
  } catch (error) {
    console.error("Create book error:", error);
    res.status(500).json({ error: "Failed to create book" });
  }
});

router.put("/books/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { db } = await connectToDatabase();
    const updateData = {
      ...req.body,
      price: req.body.price ? parseFloat(req.body.price) : undefined,
      originalPrice: req.body.originalPrice ? parseFloat(req.body.originalPrice) : undefined,
      rating: req.body.rating ? parseFloat(req.body.rating) : undefined,
      pages: req.body.pages ? parseInt(req.body.pages) : undefined,
      tags: req.body.tags ? (typeof req.body.tags === "string" ? req.body.tags.split(",").map((t: string) => t.trim()) : req.body.tags) : undefined,
      updatedAt: new Date(),
    };
    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);
    await db.collection("book").updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });
    res.json({ success: true });
  } catch (error) {
    console.error("Update book error:", error);
    res.status(500).json({ error: "Failed to update book" });
  }
});

router.delete("/books/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { db } = await connectToDatabase();
    await db.collection("book").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete book error:", error);
    res.status(500).json({ error: "Failed to delete book" });
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

router.post("/categories", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { db } = await connectToDatabase();
    const { name, description, icon, image } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required" });

    const existing = await db.collection("category").findOne({ name });
    if (existing) return res.status(400).json({ error: "Category already exists" });

    const category = {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      description: description || "",
      icon: icon || "BookOpen",
      image: image || null,
      bookCount: 0,
      createdAt: new Date(),
    };
    const result = await db.collection("category").insertOne(category);
    res.status(201).json({ category: { ...category, _id: result.insertedId } });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

router.delete("/categories/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { db } = await connectToDatabase();
    await db.collection("category").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// ==================== ORDERS ====================
router.get("/orders", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const { db } = await connectToDatabase();
    const orders = await db.collection("order").find().sort({ createdAt: -1 }).toArray();
    res.json({ orders });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ error: "Failed to get orders" });
  }
});

// ==================== USERS ====================
router.get("/users", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const { db } = await connectToDatabase();
    const users = await db.collection("user").find({}, { projection: { password: 0 } }).toArray();
    res.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to get users" });
  }
});

router.patch("/users/:id/role", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { db } = await connectToDatabase();
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    await db.collection("user").updateOne({ _id: new ObjectId(req.params.id) }, { $set: { role, updatedAt: new Date() } });
    res.json({ success: true });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
});

router.patch("/users/:id/status", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { db } = await connectToDatabase();
    const { blocked } = req.body;
    await db.collection("user").updateOne({ _id: new ObjectId(req.params.id) }, { $set: { blocked: !!blocked, updatedAt: new Date() } });
    res.json({ success: true });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({ error: "Failed to update user status" });
  }
});

// ==================== STATS ====================
router.get("/stats", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const { db } = await connectToDatabase();
    const [totalUsers, totalBooks, totalCategories, totalOrders] = await Promise.all([
      db.collection("user").countDocuments(),
      db.collection("book").countDocuments(),
      db.collection("category").countDocuments(),
      db.collection("order").countDocuments(),
    ]);

    const orders = await db.collection("order").find().toArray();
    const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);

    // Monthly sales data for chart
    const monthlySales = orders.reduce((acc: Record<string, number>, order: any) => {
      const date = order.createdAt ? new Date(order.createdAt) : new Date();
      const month = date.toLocaleString("default", { month: "short", year: "numeric" });
      acc[month] = (acc[month] || 0) + (order.total || 0);
      return acc;
    }, {});

    const chartData = Object.entries(monthlySales).map(([month, revenue]) => ({
      month,
      revenue,
    }));

    res.json({
      totalUsers,
      totalBooks,
      totalCategories,
      totalOrders,
      totalRevenue,
      chartData,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

export default router;
