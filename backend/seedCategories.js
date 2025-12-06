import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import Category from "./models/category.model.js";

dotenv.config({ path: path.resolve(process.cwd(), "backend", ".env") });

const CATS = [
  { name: "Jeans", description: "Denim jeans in various fits and washes", image: "" },
  { name: "Glasses", description: "Sunglasses and optical frames", image: "" },
  { name: "T-shirts", description: "Casual and graphic tees", image: "" },
  { name: "Jackets", description: "Light and heavy jackets, outerwear", image: "" },
  { name: "Shoes", description: "Sneakers, formal shoes and sandals", image: "" },
  { name: "Suits", description: "Formal suits and blazers", image: "" },
  { name: "Bags", description: "Backpacks, handbags, and travel bags", image: "" }
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DBNAME || undefined });
  console.log("DB connected");

  for (const cat of CATS) {
    await Category.findOneAndUpdate(
      { name: cat.name },
      { $set: { description: cat.description, image: cat.image } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log("Ensured category:", cat.name);
  }

  console.log("All categories ensured.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
