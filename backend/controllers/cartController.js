const Cart = require("../models/cartModel");

// Add or update item in cart
const addToCart = async (req, res) => {
  const { user_id, product_id, name, image, price, quantity, create_user } = req.body;

  try {
    const existingItem = await Cart.findOne({
      where: { user_id, product_id, status_flag: 1 }
    });

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.update_user = create_user;
      existingItem.update_date = new Date();
      await existingItem.save();

      return res.json({ message: "Cart item updated", data: existingItem });
    }

    const newItem = await Cart.create({
      user_id,
      product_id,
      name,
      image,
      price,
      quantity,
      create_user,
      update_user: create_user,
      create_date: new Date(),
      update_date: new Date(),
      status_flag: 1
    });

    res.status(201).json({ message: "Item added to cart", data: newItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all cart items for a user
const getCart = async (req, res) => {
  try {
    const user_id = req.params.user_id;

    const cartItems = await Cart.findAll({
      where: { user_id, status_flag: 1 }
    });

    res.json(cartItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  const { id, quantity, update_user } = req.body;

  try {
    const item = await Cart.findByPk(id);
    if (!item || item.status_flag !== 1) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    item.quantity = quantity;
    item.update_user = update_user;
    item.update_date = new Date();
    await item.save();

    res.json({ message: "Cart item updated", data: item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Soft delete cart item
const deleteCartItem = async (req, res) => {
  const { id } = req.params;

  try {
    const item = await Cart.findByPk(id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.status_flag = 0;
    await item.save();

    res.json({ message: "Item removed from cart" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Export all functions
module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  deleteCartItem
};