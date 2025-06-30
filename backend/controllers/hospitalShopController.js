const Store = require("../models/storeModel");
const FilterCategory = require("../models/filterCategoryModel"); 
const Product = require('../models/productModel');
const ProductReview = require('../models/productReviewModel');
const Cart = require("../models/cartModel");
const HospitalProduct = require('../models/HospitalProductModel');

// GET all active stores
const getAllStores = async (req, res) => {
  try {
    const stores = await Store.findAll({
      where: { status_flag: 1 }
    });

    res.status(200).json({
      success: true,
      message: "Stores fetched successfully",
      result: stores.length,
      data: stores
    });
  } catch (error) {
    console.error("Error fetching stores:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch stores",
      error: error.message
    });
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
      return res.status(400).json({
        success: false,
        message: "Name and logo are required"
      });
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

    res.status(201).json({
      success: true,
      message: "Store created successfully",
      result: 1,
      data: newStore
    });
  } catch (err) {
    console.error("Error creating store:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error while creating store",
      error: err.message
    });
  }
};


// GET single store (edit)
const getStoreById = async (req, res) => {
  try {
    const { id } = req.params;

    const store = await Store.findByPk(id);

    if (!store || store.status_flag !== 1) {
      return res.status(404).json({
        success: false,
        message: "Store not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Store fetched successfully",
      result: 1,
      data: store
    });
  } catch (err) {
    console.error("Error fetching store:", err.message);
    res.status(500).json({
      success: false,
      message: "Error fetching store",
      error: err.message
    });
  }
};

// UPDATE store
const updateStore = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, logo, update_user } = req.body;

    const store = await Store.findByPk(id);
    if (!store || store.status_flag !== 1) {
      return res.status(404).json({
        success: false,
        message: "Store not found"
      });
    }

    await store.update({
      name,
      logo,
      update_user,
      update_date: new Date()
    });

    res.status(200).json({
      success: true,
      message: "Store updated successfully",
      result: 1,
      data: store
    });
  } catch (err) {
    console.error("Error updating store:", err.message);
    res.status(500).json({
      success: false,
      message: "Error updating store",
      error: err.message
    });
  }
};

// DELETE store (soft delete)
const deleteStore = async (req, res) => {
  try {
    const { id } = req.params;

    const store = await Store.findByPk(id);
    if (!store || store.status_flag !== 1) {
      return res.status(404).json({
        success: false,
        message: "Store not found"
      });
    }

    store.status_flag = 0;
    store.update_date = new Date();
    await store.save();

    res.status(200).json({
      success: true,
      message: "Store deleted (soft) successfully",
      result: 1,
      data: { id }
    });
  } catch (err) {
    console.error("Error deleting store:", err.message);
    res.status(500).json({
      success: false,
      message: "Error deleting store",
      error: err.message
    });
  }
};

// -------------------- hospitalShop PRODUCT CONTROLLERS --------------------

// CREATE Product + Optional Reviews
const createProduct = async (req, res) => {
  try {
    const { product, product_description } = req.body;

    if (!product || !product.name || !product.price) {
      return res.status(400).json({
        success: false,
        message: "Product name and price are required."
      });
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
    let insertedReviews = 0;
    if (reviews.length > 0) {
      const reviewData = reviews.map(r => ({
        ...r,
        product_id: productId
      }));

      await ProductReview.bulkCreate(reviewData);
      insertedReviews = reviews.length;
    }

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      result: 1,
      data: {
        product_id: productId,
        reviews_inserted: insertedReviews
      }
    });
  } catch (error) {
    console.error("Error creating product:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors.map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: "Product creation failed",
      error: error.message
    });
  }
};



// GET ALL Products in Nested Format
const getAllProducts = async (req, res) => {
  try {
    const { id, role } = req.user; // from authenticate middleware

    const products = await Product.findAll({
      include: [{ model: ProductReview, as: 'reviews' }]
    });

    const formatted = products.map((product) => {
      const userRoleField =
        role === 'admin' ? { admin_id: id } :
        role === 'doctor' ? { doctor_id: id } :
        { patient_id: id };

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        ...userRoleField,
        reviews: product.reviews || []
      };
    });

    res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      result: formatted.length,
      data: formatted
    });
  } catch (err) {
    console.error("Error fetching products:", err.message);

    res.status(500).json({
      success: false,
      message: "Error retrieving products",
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
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
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
          review: product.reviews || []
        }
      ]
    };

    res.status(200).json({
      success: true,
      message: "Product retrieved successfully",
      result: 1,
      data: formatted
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error retrieving product",
      error: err.message
    });
  }
};

// UPDATE Product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { product, product_description } = req.body;

    if (!product) {
      return res.status(400).json({
        success: false,
        message: 'Missing product data'
      });
    }

    const existingProduct = await Product.findByPk(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
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

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      result: 1,
      data: {
        updated_product: existingProduct
      }
    });

  } catch (err) {
    console.error("Error updating product:", err.message);
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: err.message
    });
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

    // res.json({ message: 'Product deleted successfully' });
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: {
        product_id: id,
      }
    });
  } catch (err) {
    console.error('Error deleting product:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: err.message
    });
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

      return res.status(200).json({
        success: true,
        message: "Cart item updated",
        result: 1,
        data: existingItem
      });
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

    res.status(201).json({
      success: true,
      message: "Item added to cart",
      result: 1,
      data: newItem
    });
  } catch (err) {
    console.error("Add to cart error:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to add item to cart",
      error: err.message
    });
  }
};

// Get all cart items for the authenticated user
const getCart = async (req, res) => {
  try {
    const user_id = req.user.id;

    const cartItems = await Cart.findAll({
      where: {
        user_id,
        status_flag: 1
      }
    });

    res.status(200).json({
      success: true,
      message: "Cart items fetched successfully",
      result: cartItems.length,
      data: cartItems
    });
  } catch (err) {
    console.error("Error fetching cart:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart items",
      error: err.message
    });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  const { id, quantity, update_user } = req.body;

  try {
    const item = await Cart.findByPk(id);

    if (!item || item.status_flag !== 1) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found"
      });
    }

    item.quantity = quantity;
    item.update_user = update_user;
    item.update_date = new Date();
    await item.save();

    res.status(200).json({
      success: true,
      message: "Cart item updated successfully",
      result: 1,
      data: item
    });
  } catch (err) {
    console.error("Error updating cart item:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to update cart item",
      error: err.message
    });
  }
};

// Soft delete cart item
const deleteCartItem = async (req, res) => {
  const { id } = req.params;

  try {
    const item = await Cart.findByPk(id);

    if (!item || item.status_flag !== 1) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found"
      });
    }

    item.status_flag = 0;
    item.update_date = new Date();
    await item.save();

    res.status(200).json({
      success: true,
      message: "Item removed from cart successfully",
      result: 1,
      data: {
        id: item.id,
        status_flag: item.status_flag,
        update_date: item.update_date
      }
    });
  } catch (err) {
    console.error("Error removing item from cart:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to remove item from cart",
      error: err.message
    });
  }
};

// Get all active products
const getHospitalProducts = async (req, res) => {
  try {
    const products = await HospitalProduct.findAll({
      where: { status_flag: 1 }
    });

    res.status(200).json({
      success: true,
      message: "Hospital products fetched successfully",
      result: products.length,
      data: products
    });
  } catch (err) {
    console.error("Error fetching hospital products:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching hospital products",
      error: err.message
    });
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
