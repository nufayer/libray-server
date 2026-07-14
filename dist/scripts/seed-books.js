"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongodb_1 = require("mongodb");
const books = [
    {
        title: "The Midnight Library",
        author: "Matt Haig",
        description: "Between life and death there is a library. When Nora Seed finds herself in the Midnight Library, she has a chance to make things right.",
        fullDescription: "Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived. To see how things would be if you had made other choices... Would you have done anything different, if you had the chance to undo your regrets?\n\nNora Seed finds herself faced with this decision. Faced with the possibility of changing her life for a new one, following a different career, undoing old breakups, realizing her dreams of becoming a glaciologist; she must search within herself as she travels through the Midnight Library to see what is worth living for.",
        cover: "/books/midnight-library.jpg",
        rating: 4.8,
        reviewCount: 12450,
        price: 14.99,
        originalPrice: 19.99,
        category: "Fiction",
        tags: ["Bestseller", "Contemporary", "Philosophical"],
        inStock: true,
        isBestseller: true,
        pages: 304,
        publisher: "Viking",
        publishedDate: "September 29, 2020",
        isbn: "978-0525559474",
        language: "English",
    },
    {
        title: "Atomic Habits",
        author: "James Clear",
        description: "An easy & proven way to build good habits & break bad ones. Tiny changes, remarkable results.",
        fullDescription: "No matter your goals, Atomic Habits offers a proven framework for improving--every day. James Clear, one of the world's leading experts on habit formation, reveals practical strategies that will teach you exactly how to form good habits, break bad ones, and master the tiny behaviors that lead to remarkable results.",
        cover: "/books/atomic-habits.jpg",
        rating: 4.9,
        reviewCount: 45230,
        price: 16.99,
        originalPrice: 22.99,
        category: "Self-Help",
        tags: ["Bestseller", "Productivity", "Psychology"],
        inStock: true,
        isBestseller: true,
        pages: 320,
        publisher: "Avery",
        publishedDate: "October 16, 2018",
        isbn: "978-0735211292",
        language: "English",
    },
    {
        title: "Project Hail Mary",
        author: "Andy Weir",
        description: "A lone astronaut must save humanity from extinction in this brilliant sci-fi adventure.",
        fullDescription: "Ryland Grace is the sole survivor on a desperate, last-chance mission--and if he fails, humanity and the earth itself are finished. Except that right now, he doesn't know that. He can't even remember his own name, let alone the nature of his assignment or how to complete it.",
        cover: "/books/project-hail-mary.jpg",
        rating: 4.7,
        reviewCount: 18760,
        price: 15.99,
        category: "Science Fiction",
        tags: ["New Release", "Space", "Adventure"],
        inStock: true,
        isNew: true,
        pages: 496,
        publisher: "Ballantine Books",
        publishedDate: "May 4, 2021",
        isbn: "978-0593135204",
        language: "English",
    },
    {
        title: "The Psychology of Money",
        author: "Morgan Housel",
        description: "Timeless lessons on wealth, greed, and happiness. Doing well with money isn't about what you know.",
        fullDescription: "Doing well with money isn't necessarily about what you know. It's about how you behave. And behavior is hard to teach, even to really smart people.",
        cover: "/books/psychology-money.jpg",
        rating: 4.8,
        reviewCount: 31450,
        price: 17.99,
        category: "Finance",
        tags: ["Bestseller", "Investing", "Behavioral Economics"],
        inStock: true,
        isBestseller: true,
        pages: 256,
        publisher: "Harriman House",
        publishedDate: "September 8, 2020",
        isbn: "978-0857197696",
        language: "English",
    },
    {
        title: "Where the Crawdads Sing",
        author: "Delia Owens",
        description: "A coming-of-age story and murder mystery set in the marshes of North Carolina.",
        fullDescription: "For years, rumors of the 'Marsh Girl' have haunted Barkley Cove, a quiet town on the North Carolina coast. So in late 1969, when handsome Chase Andrews is found dead, the locals immediately suspect Kya Clark, the so-called Marsh Girl.",
        cover: "/books/crawdads-sing.jpg",
        rating: 4.6,
        reviewCount: 34500,
        price: 13.99,
        originalPrice: 18.99,
        category: "Mystery",
        tags: ["Bestseller", "Nature", "Southern Gothic"],
        inStock: true,
        isBestseller: true,
        pages: 384,
        publisher: "G.P. Putnam's Sons",
        publishedDate: "August 14, 2018",
        isbn: "978-0735219090",
        language: "English",
    },
];
const categories = [
    { name: "Fiction", slug: "fiction", description: "Literary and contemporary fiction", icon: "BookOpen", bookCount: 1 },
    { name: "Self-Help", slug: "self-help", description: "Personal development and growth", icon: "Star", bookCount: 1 },
    { name: "Science Fiction", slug: "science-fiction", description: "Sci-fi and futuristic stories", icon: "Globe", bookCount: 1 },
    { name: "Finance", slug: "finance", description: "Money management and investing", icon: "DollarSign", bookCount: 1 },
    { name: "Mystery", slug: "mystery", description: "Thrillers and mystery novels", icon: "Search", bookCount: 1 },
];
async function seed() {
    const client = new mongodb_1.MongoClient(process.env.MONGO_DB_URI || "");
    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB || "libray");
        // Seed categories
        for (const cat of categories) {
            const existing = await db.collection("category").findOne({ name: cat.name });
            if (!existing) {
                await db.collection("category").insertOne({ ...cat, createdAt: new Date() });
                console.log(`Created category: ${cat.name}`);
            }
            else {
                console.log(`Category already exists: ${cat.name}`);
            }
        }
        // Seed books
        for (const book of books) {
            const existing = await db.collection("book").findOne({ title: book.title });
            if (!existing) {
                await db.collection("book").insertOne({ ...book, createdAt: new Date(), updatedAt: new Date() });
                console.log(`Created book: ${book.title}`);
            }
            else {
                console.log(`Book already exists: ${book.title}`);
            }
        }
        console.log("\nSeeding complete!");
        const bookCount = await db.collection("book").countDocuments();
        const catCount = await db.collection("category").countDocuments();
        console.log(`Total books: ${bookCount}`);
        console.log(`Total categories: ${catCount}`);
    }
    finally {
        await client.close();
    }
}
seed().catch(console.error);
//# sourceMappingURL=seed-books.js.map