import Category from "../models/category.model.js";

function slugify(name = "") {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")    
    .replace(/\s+/g, "-")        
    .replace(/-+/g, "-")         
    .replace(/^-+|-+$/g, "");    
}

export const getCategories = async (req, res) => {
  try {
    const cats = await Category.find().sort({ name: 1 }).lean();

    const formatted = cats.map((c) => {
      const name = c?.name ?? "";

      return {
        _id: c?._id ?? null,
        name,
        description: c?.description ?? "",
        imageUrl: c?.image ?? "",      
        slug: slugify(name),          
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("Error in getCategories", err?.message || err);
    res.status(500).json({ message: "Server error" });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;

    const exists = await Category.findOne({ name });
    if (exists) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const c = await Category.create({ name, description, image });
    res.status(201).json(c);
  } catch (err) {
    console.error("Error in createCategory", err?.message || err);
    res.status(500).json({ message: "Server error" });
  }
};
export const getProductsByCategorySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const categoryDocs = await Category.find().lean(); 
    const match = categoryDocs.find((c) => {
      const s = String(c.name || "")
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      return s === slug;
    });

    let categoryName = slug;
    if (match && match.name) categoryName = match.name;

    const products = await Product.find({ category: categoryName });

    return res.json({ products });
  } catch (error) {
    console.log("Error in getProductsByCategorySlug controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};