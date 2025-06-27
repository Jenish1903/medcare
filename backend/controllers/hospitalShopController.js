const Store = require("../models/storeModel");
const FilterCategory = require("../models/filterCategoryModel"); 
const Product = require('../models/productModel');
const ProductReview = require('../models/productReviewModel');
const Cart = require("../models/cartModel");
const HospitalProduct = require('../models/HospitalProductModel');

// GET all stores
const getAllStores = async (req, res) => {
  try {
    const stores = await Store.findAll({
      where: { status_flag: 1 } // ✅ Only active stores
    });
    res.json(stores);
  } catch (error) {
    console.error("Error fetching stores:", error);
    res.status(500).json({ error: "Server error" });
  }
};


// Get all filter categories
const getAllFilterCategories = async (req, res) => {
  try {
    const filters = await FilterCategory.findAll();
    res.json(filters);
  } catch (error) {
    console.error("❌ Error fetching filter categories:", error);
    res.status(500).json({ error: "Server error" });
  }
};


// CREATE store
const createStore = async (req, res) => {
  try {
    const { name, logo, create_user } = req.body;

    if (!name || !logo) {
      return res.status(400).json({ message: "Name and logo are required." });
    }

    const newStore = await Store.create({
      name,
      logo,
      create_user,
      update_user: create_user,
      create_date: new Date(),
      update_date: new Date(),
      status_flag: 1
    });

    res.status(201).json({ message: "Store created successfully", data: newStore });
  } catch (err) {
    console.error("Error creating store:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET single store (edit)
const getStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await Store.findByPk(id);

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    res.json(store);
  } catch (err) {
    res.status(500).json({ message: "Error fetching store", error: err.message });
  }
};

// UPDATE store
const updateStore = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, logo, update_user } = req.body;

    const store = await Store.findByPk(id);
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    await store.update({
      name,
      logo,
      update_user,
      update_date: new Date()
    });

    res.json({ message: "Store updated successfully", data: store });
  } catch (err) {
    res.status(500).json({ message: "Error updating store", error: err.message });
  }
};

// DELETE store (soft delete)
const deleteStore = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await Store.findByPk(id);

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    store.status_flag = 0;
    store.update_date = new Date();
    await store.save();

    res.json({ message: "Store deleted (soft) successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting store", error: err.message });
  }
};

// -------------------- hospitalShop PRODUCT CONTROLLERS --------------------

// CREATE Product + Optional Reviews
const createProduct = async (req, res) => {
  try {
    const { product, product_description } = req.body;

    if (!product || !product.name || !product.price) {
      return res.status(400).json({ message: "Product name and price are required." });
    }

    // Flatten description + details
    const details = product_description?.[0] || {};
    const descriptionData = details.description || {};
    const detailFields = details.details || {};
    const reviews = details.review || [];

    const fullProduct = {
      ...product,
      description: descriptionData.description || null,
      benefit: descriptionData.benefit || null,
      ingredients: detailFields.ingredients || null,
      how_to_use: detailFields.how_to_use || null,
      warnings: detailFields.warnings || null,
      storage: detailFields.storage || null,
      manufacturer: detailFields.manufacturer || null
    };

    // Insert product
    const newProduct = await Product.create(fullProduct);
    const productId = newProduct.id;

    // Insert reviews (if any)
    if (reviews.length > 0) {
      const reviewData = reviews.map(r => ({
        ...r,
        product_id: productId
      }));

      await ProductReview.bulkCreate(reviewData);
    }

    res.status(201).json({
      message: "Product created successfully",
      productId
    });
  } catch (error) {
    console.error("Error creating product:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors.map(e => e.message)
      });
    }

    res.status(500).json({
      message: "Product creation failed",
      error: error.message
    });
  }
};


// GET ALL Products in Nested Format
const getAllProducts = async (req, res) => {
  try {
    const { id, role } = req.user; // <-- comes from authenticate middleware

    const products = await Product.findAll({
      include: [{ model: ProductReview, as: 'reviews' }]
    });

    const formatted = products.map((product) => {
      const userRoleField =
        role === 'admin' ? { admin_id: id } :
        role === 'doctor' ? { doctor_id: id } :
        { patient_id: id }; // fallback to patient

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        ...userRoleField, // dynamically added here
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({
      message: 'Error retrieving products',
      error: err.message
    });
  }
};

// GET Product By ID in Nested Format
const getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: ProductReview, as: 'reviews' }]
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const formatted = {
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image
      },
      product_description: [
        {
          description: {
            description: product.description,
            benefit: product.benefit
          },
          details: {
            ingredients: product.ingredients,
            how_to_use: product.how_to_use,
            warnings: product.warnings,
            storage: product.storage,
            manufacturer: product.manufacturer
          },
          review: product.reviews
        }
      ]
    };

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving product', error: err.message });
  }
};

// UPDATE Product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { product, product_description } = req.body;

    if (!product) {
      return res.status(400).json({ message: 'Missing product data' });
    }

    const existingProduct = await Product.findByPk(id);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const desc = product_description?.[0]?.description || {};
    const details = product_description?.[0]?.details || {};

    const updateData = {
      ...product,
      description: desc.description || null,
      benefit: desc.benefit || null,
      ingredients: details.ingredients || null,
      how_to_use: details.how_to_use || null,
      warnings: details.warnings || null,
      storage: details.storage || null,
      manufacturer: details.manufacturer || null,
      update_date: new Date()
    };

    await existingProduct.update(updateData);

    res.json({
      message: 'Product updated successfully',
      product: existingProduct
    });

  } catch (err) {
    res.status(500).json({ message: 'Error updating product', error: err.message });
  }
};



// DELETE Product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await ProductReview.destroy({ where: { product_id: id } }); // Delete associated reviews
    await product.destroy(); // Delete the product

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting product', error: err.message });
  }
};

// EDIT Product - Get product for editing
const editProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving product for edit', error: err.message });
  }
};

// -------------------- AddTOCart CONTROLLERS --------------------

// Add or update item in cart
const addToCart = async (req, res) => {
  const user_id = req.user.id; // From token
  const { product_id, name, image, price, quantity, create_user } = req.body;

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

// Get all cart items for the authenticated user
const getCart = async (req, res) => {
  try {
     const user_id = req.user.id;

    const cartItems = await Cart.findAll({
      where: { status_flag: 1 }
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
    item.update_date = new Date();
    await item.save();

    res.json({ message: "Item removed from cart" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all active products
const getHospitalProducts = async (req, res) => {
  try {
    const products = await HospitalProduct.findAll({ where: { status_flag: 1 } });
    res.json({ success: true, data: products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


module.exports = {
  getAllStores,
  getAllFilterCategories,
  createStore,
  getStoreById,
  updateStore,
  deleteStore,
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  editProduct,
  addToCart,
  getCart,
  updateCartItem,
  deleteCartItem,
   getHospitalProducts
};
