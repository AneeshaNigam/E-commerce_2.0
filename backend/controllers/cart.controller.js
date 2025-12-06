import Product from "../models/product.model.js";

function normalizeUserCartItems(user) {
  if (!user.cartItems || !Array.isArray(user.cartItems)) {
    user.cartItems = [];
    return user.cartItems;
  }

  const normalized = user.cartItems
    .map((it) =>
      typeof it === "string" || typeof it === "number"
        ? { id: String(it), quantity: 1 }
        : it && (it.id || it._id)
        ? { id: String(it.id ?? it._id), quantity: Number(it.quantity) || 1 }
        : null
    )
    .filter(Boolean);

  user.cartItems = normalized;
  return user.cartItems;
}

export const getCartProducts = async (req, res) => {
  try {
    const user = req.user;
    normalizeUserCartItems(user);

    const ids = user.cartItems.map((ci) => ci.id);
    if (!ids.length) return res.json([]);

    const products = await Product.find({ _id: { $in: ids } }).lean().exec();

    const out = products.map((p) => {
      const pid = p._id.toString();
      const ci = user.cartItems.find((x) => x.id === pid);
      return { ...p, quantity: ci ? Number(ci.quantity) : 1 };
    });

    res.json(out);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const user = req.user;
    const { productId } = req.body;

    normalizeUserCartItems(user);

    const existing = user.cartItems.find((x) => x.id === String(productId));
    if (existing) {
      existing.quantity = Number(existing.quantity || 0) + 1;
    } else {
      user.cartItems.push({ id: String(productId), quantity: 1 });
    }

    await user.save();
    res.json(user.cartItems);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
};

export const removeAllFromCart = async (req, res) => {
  try {
    const user = req.user;
    const { productId } = req.body;

    normalizeUserCartItems(user);

    if (!productId) {
      user.cartItems = [];
    } else {
      user.cartItems = user.cartItems.filter((x) => x.id !== String(productId));
    }

    await user.save();
    res.json(user.cartItems);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
};

export const updateQuantity = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { quantity } = req.body;

    normalizeUserCartItems(user);

    const item = user.cartItems.find((x) => x.id === String(id));
    if (!item) return res.status(404).json({ message: "Product not found" });

    const q = Number(quantity);
    if (!Number.isFinite(q) || q < 0) return res.status(400).json({ message: "Invalid quantity" });

    if (q === 0) {
      user.cartItems = user.cartItems.filter((x) => x.id !== String(id));
    } else {
      item.quantity = q;
    }

    await user.save();
    res.json(user.cartItems);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
};
