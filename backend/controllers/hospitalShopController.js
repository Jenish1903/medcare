const Store = require("../models/storeModel");
const FilterCategory = require("../models/filterCategoryModel");
const Product = require("../models/productModel");
const ProductReview = require("../models/productReviewModel");
const Cart = require("../models/cartModel");
const HospitalProduct = require("../models/HospitalProductModel");
const { Op, Sequelize } = require("sequelize");

// GET all active stores  
const getAllStores = async (req, res) => {
  try {
    const stores = await Store.findAll({
      where: { status_flag: 1 },
    });

    res.status(200).json({
      success: true,
      message: "Stores fetched successfully",
      result: stores.length,
      data: stores,
    });
  } catch (error) {
    console.error("Error fetching stores:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch stores",
      error: error.message,
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
  const { id, role } = req.user; // from auth middleware
  try {
    const { name, logo, create_user } = req.body;

    // Input validation
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Store name is required and must be a valid string.",
      });
    }
    if (!logo || typeof logo !== "string" || logo.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Store logo is required and must be a valid string.",
      });
    }
    if (!create_user || typeof create_user !== "number") {
      return res.status(400).json({
        success: false,
        message: "create_user is required and must be a number.",
      });
    }

    const userRoleField =
      role === "admin"
        ? { admin_id: id }
        : role === "doctor"
        ? { doctor_id: id }
        : { patient_id: id };

    const newStore = await Store.create({
      name,
      logo,
      create_user,
      update_user: create_user,
      create_date: new Date(),
      update_date: new Date(),
      status_flag: 1,
      ...userRoleField,
    });

    res.status(201).json({
      success: true,
      message: "Store created successfully",
      result: 1,
      data: newStore,
    });
  } catch (err) {
    console.error("Error creating store:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error while creating store",
      error: err.message,
    });
  }
};

// GET store by ID
const getStoreById = async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid store ID",
      });
    }

    const store = await Store.findByPk(id);

    if (!store || store.status_flag !== 1) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Store fetched successfully",
      result: 1,
      data: store,
    });
  } catch (err) {
    console.error("Error fetching store:", err.message);
    res.status(500).json({
      success: false,
      message: "Error fetching store",
      error: err.message,
    });
  }
};

// UPDATE store
const updateStore = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, logo, update_user } = req.body;

    if (isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid store ID",
      });
    }

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Store name is required and must be a valid string.",
      });
    }

    if (!logo || typeof logo !== "string" || logo.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Store logo is required and must be a valid string.",
      });
    }

    if (!update_user || typeof update_user !== "number") {
      return res.status(400).json({
        success: false,
        message: "update_user is required and must be a number.",
      });
    }

    const store = await Store.findByPk(id);
    if (!store || store.status_flag !== 1) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    await store.update({
      name,
      logo,
      update_user,
      update_date: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Store updated successfully",
      result: 1,
      data: store,
    });
  } catch (err) {
    console.error("Error updating store:", err.message);
    res.status(500).json({
      success: false,
      message: "Error updating store",
      error: err.message,
    });
  }
};

// DELETE store (soft delete)
const deleteStore = async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid store ID",
      });
    }

    const store = await Store.findByPk(id);
    if (!store || store.status_flag !== 1) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    store.status_flag = 0;
    store.update_date = new Date();
    await store.save();

    res.status(200).json({
      success: true,
      message: "Store deleted (soft) successfully",
      result: 1,
      data: { id },
    });
  } catch (err) {
    console.error("Error deleting store:", err.message);
    res.status(500).json({
      success: false,
      message: "Error deleting store",
      error: err.message,
    });
  }
};

// -------------------- hospitalShop PRODUCT CONTROLLERS --------------------

// CREATE Product + Optional Reviews
const createProduct = async (req, res) => {
  try {
    const { product, product_description } = req.body;

    if (!product || typeof product !== "object") {
      return res.status(400).json({
        success: false,
        message: "Product data is required and must be an object.",
      });
    }

    const { name, price, image, create_user } = product;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Product name is required." });
    }

    if (price === undefined || isNaN(Number(price))) {
      return res.status(400).json({
        success: false,
        message: "Product price is required and must be a number.",
      });
    }

    if (!create_user || typeof create_user !== "number") {
      return res.status(400).json({
        success: false,
        message: "create_user must be a valid number.",
      });
    }

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
      manufacturer: detailFields.manufacturer || null,
      create_date: new Date(),
      update_date: new Date(),
      status_flag: 1,
    };

    const newProduct = await Product.create(fullProduct);
    const productId = newProduct.id;

    let insertedReviews = 0;
    if (Array.isArray(reviews) && reviews.length > 0) {
      const reviewData = reviews
        .filter((r) => r.user_name && typeof r.rating === "number")
        .map((r) => ({ ...r, product_id: productId }));
      await ProductReview.bulkCreate(reviewData);
      insertedReviews = reviewData.length;
    }

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      result: 1,
      data: { product_id: productId, reviews_inserted: insertedReviews },
    });
  } catch (error) {
    console.error("Error creating product:", error.message);
    res.status(500).json({
      success: false,
      message: "Product creation failed",
      error: error.message,
    });
  }
};

// GET ALL Products
const getAllProducts = async (req, res) => {
  try {
    const { id, role } = req.user;

    const products = await Product.findAll({
      where: { status_flag: 1 },
      include: [{ model: ProductReview, as: "reviews" }],
    });

    const formatted = products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      type:product.type,
      image: product.image,
      reviews: product.reviews || [],
    }));

    const userRoleField =
      role === "admin"
        ? { admin_id: id }
        : role === "doctor"
        ? { doctor_id: id }
        : { patient_id: id };

    res.status(200).json({
      success: true,
      ...userRoleField,
      message: "Products fetched successfully",
      result: formatted.length,
      data: formatted,
    });
  } catch (err) {
    console.error("Error fetching products:", err.message);
    res.status(500).json({
      success: false,
      message: "Error retrieving products",
      error: err.message,
    });
  }
};

// GET Product by ID
const getProductById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findByPk(id, {
      include: [{ model: ProductReview, as: "reviews" }],
    });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const formatted = {
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
      },
      product_description: [
        {
          description: {
            description: product.description,
            benefit: product.benefit,
          },
          details: {
            ingredients: product.ingredients,
            how_to_use: product.how_to_use,
            warnings: product.warnings,
            storage: product.storage,
            manufacturer: product.manufacturer,
          },
          review: product.reviews || [],
        },
      ],
    };

    res.status(200).json({
      success: true,
      message: "Product retrieved successfully",
      result: 1,
      data: formatted,
    });
  } catch (err) {
    console.error("Error fetching product:", err.message);
    res.status(500).json({
      success: false,
      message: "Error retrieving product",
      error: err.message,
    });
  }
};

// UPDATE Product
const updateProduct = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { product, product_description } = req.body;

    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product ID" });
    }

    if (!product || typeof product !== "object") {
      return res
        .status(400)
        .json({ success: false, message: "Product data must be provided" });
    }

    const existingProduct = await Product.findByPk(id);
    if (!existingProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
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
      update_date: new Date(),
    };

    await existingProduct.update(updateData);

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      result: 1,
      data: { updated_product: existingProduct },
    });
  } catch (err) {
    console.error("Error updating product:", err.message);
    res.status(500).json({
      success: false,
      message: "Error updating product",
      error: err.message,
    });
  }
};

// DELETE Product
const deleteProduct = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findByPk(id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    await ProductReview.destroy({ where: { product_id: id } });
    await product.destroy();

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: { product_id: id },
    });
  } catch (err) {
    console.error("Error deleting product:", err.message);
    res.status(500).json({
      success: false,
      message: "Error deleting product",
      error: err.message,
    });
  }
};

// EDIT Product (Get for update)
const editProduct = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      success: true,
      message: "Product data fetched successfully",
      data: product,
    });
  } catch (err) {
    console.error("Error fetching product for edit:", err.message);
    res.status(500).json({
      message: "Error retrieving product for edit",
      error: err.message,
    });
  }
};

// SEARCH Products by product name or store name
const searchStoreAndProduct = async (req, res) => {
  try {
    const { keyword } = req.query;

    if (!keyword || keyword.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search keyword is required.",
      });
    }

    // Search stores
    const stores = await Store.findAll({
      where: {
        status_flag: 1,
        name: { [Op.like]: `%${keyword}%` },
      },
    });

    // Search products
    const products = await Product.findAll({
      where: {
        status_flag: 1,
        name: { [Op.like]: `%${keyword}%` },
      },
      include: [{ model: ProductReview, as: "reviews" }],
    });

    let responseData = {};

    if (stores.length > 0 && products.length === 0) {
      responseData = {
        stores,
        result: stores.length,
        message: "Store search result",
      };
    } else if (products.length > 0 && stores.length === 0) {
      responseData = {
        products,
        result: products.length,
        message: "Product search result",
      };
    } else if (products.length > 0 && stores.length > 0) {
      responseData = {
        stores,
        products,
        result: {
          stores: stores.length,
          products: products.length,
        },
        message: "Store and Product search result",
      };
    } else {
      return res.status(404).json({
        success: false,
        message: "No matching store or product found",
      });
    }

    return res.status(200).json({
      success: true,
      ...responseData,
    });
  } catch (error) {
    console.error("Search error:", error.message);
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message,
    });
  }
};

// both result show in respone
// const searchStoreAndProduct = async (req, res) => {
//   try {
//     const { keyword } = req.query;

//     if (!keyword || keyword.trim() === "") {
//       return res.status(400).json({
//         success: false,
//         message: "Search keyword is required.",
//       });
//     }

//     // Search stores
//     const stores = await Store.findAll({
//       where: {
//         status_flag: 1,
//         name: { [Op.like]: `%${keyword}%` },
//       },
//     });

//     // Search products
//     const products = await Product.findAll({
//       where: {
//         status_flag: 1,
//         name: { [Op.like]: `%${keyword}%` },
//       },
//       include: [{ model: ProductReview, as: "reviews" }],
//     });

//     res.status(200).json({
//       success: true,
//       message: "Search results fetched successfully",
//       result: {
//         stores: stores.length,
//         products: products.length,
//       },
//       data: {
//         stores,
//         products,
//       },
//     });
//   } catch (error) {
//     console.error("Search error:", error.message);
//     res.status(500).json({
//       success: false,
//       message: "Search failed",
//       error: error.message,
//     });
//   }
// };
// -------------------- AddTOCart CONTROLLERS --------------------

// ADD or UPDATE item in cart

const getAllProductTypes = async (req, res) => {
  try {
    const types = await Product.findAll({
      where: { status_flag: 1 },
      attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("type")), "type"]],
      raw: true,
    });

    const formatted = types.map((t) => t.type).filter(Boolean);

    res.status(200).json({
      success: true,
      message: "Product types fetched",
      result: formatted.length,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch product types",
      error: error.message,
    });
  }
};

const getProductsByType = async (req, res) => {
  try {
    const { type } = req.params;

    if (!type || type.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Product type is required in the URL.",
      });
    }

    const products = await Product.findAll({
      where: {
        type: { [Op.eq]: type },
        status_flag: 1,
      },
      include: [{ model: ProductReview, as: "reviews" }],
    });

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No products found for type: ${type}`,
      });
    }

    res.status(200).json({
      success: true,
      message: `Products of type '${type}' fetched successfully`,
      result: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Error fetching by type:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products by type",
      error: error.message,
    });
  }
};

const addToCart = async (req, res) => {
  const user_id = req.user.id;
  const { product_id, name, image, price, quantity, create_user } = req.body;

  try {
    // Validation
    if (!product_id || isNaN(Number(product_id))) {
      return res
        .status(400)
        .json({ success: false, message: "Valid product_id is required." });
    }
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Product name is required." });
    }
    if (price === undefined || isNaN(Number(price))) {
      return res
        .status(400)
        .json({ success: false, message: "Valid price is required." });
    }
    if (
      quantity === undefined ||
      isNaN(Number(quantity)) ||
      Number(quantity) <= 0
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Quantity must be a positive number.",
        });
    }
    if (!create_user || isNaN(Number(create_user))) {
      return res
        .status(400)
        .json({ success: false, message: "Valid create_user is required." });
    }

    const existingItem = await Cart.findOne({
      where: { user_id, product_id, status_flag: 1 },
    });

    if (existingItem) {
      existingItem.quantity += Number(quantity);
      existingItem.update_user = create_user;
      existingItem.update_date = new Date();
      await existingItem.save();

      return res.status(200).json({
        success: true,
        user_id,
        message: "Cart item updated",
        result: 1,
        data: existingItem,
      });
    }

    const newItem = await Cart.create({
      user_id,
      product_id,
      name,
      image: image || null,
      price: Number(price),
      quantity: Number(quantity),
      create_user,
      update_user: create_user,
      create_date: new Date(),
      update_date: new Date(),
      status_flag: 1,
    });

    return res.status(201).json({
      success: true,
      user_id,
      message: "Item added to cart",
      result: 1,
      data: newItem,
    });
  } catch (err) {
    console.error("Add to cart error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to add item to cart",
      error: err.message,
    });
  }
};

// GET all cart items for the authenticated user
const getCart = async (req, res) => {
  try {
    const user_id = req.user.id;

    const cartItems = await Cart.findAll({
      where: { user_id, status_flag: 1 },
    });

    res.status(200).json({
      success: true,
      message: "Cart items fetched successfully",
      result: cartItems.length,
      data: cartItems,
    });
  } catch (err) {
    console.error("Error fetching cart:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart items",
      error: err.message,
    });
  }
};

// UPDATE cart item quantity
const updateCartItem = async (req, res) => {
  const { id, quantity, update_user } = req.body;

  try {
    // Validation
    if (!id || isNaN(Number(id))) {
      return res
        .status(400)
        .json({ success: false, message: "Valid cart item ID is required." });
    }
    if (
      quantity === undefined ||
      isNaN(Number(quantity)) ||
      Number(quantity) <= 0
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Quantity must be a positive number.",
        });
    }
    if (!update_user || isNaN(Number(update_user))) {
      return res
        .status(400)
        .json({ success: false, message: "Valid update_user is required." });
    }

    const item = await Cart.findByPk(id);
    if (!item || item.status_flag !== 1) {
      return res
        .status(404)
        .json({ success: false, message: "Cart item not found" });
    }

    item.quantity = Number(quantity);
    item.update_user = update_user;
    item.update_date = new Date();
    await item.save();

    res.status(200).json({
      success: true,
      message: "Cart item updated successfully",
      result: 1,
      data: item,
    });
  } catch (err) {
    console.error("Error updating cart item:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to update cart item",
      error: err.message,
    });
  }
};

// DELETE (soft delete) cart item
const deleteCartItem = async (req, res) => {
  const { id } = req.params;

  try {
    if (!id || isNaN(Number(id))) {
      return res
        .status(400)
        .json({ success: false, message: "Valid cart item ID is required." });
    }

    const item = await Cart.findByPk(id);
    if (!item || item.status_flag !== 1) {
      return res
        .status(404)
        .json({ success: false, message: "Cart item not found" });
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
        update_date: item.update_date,
      },
    });
  } catch (err) {
    console.error("Error removing item from cart:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to remove item from cart",
      error: err.message,
    });
  }
};

// // Get all active products
// const getHospitalProducts = async (req, res) => {
//   try {
//     const products = await HospitalProduct.findAll({
//       where: { status_flag: 1 },
//     });

//     res.status(200).json({
//       success: true,
//       message: "Hospital products fetched successfully",
//       result: products.length,
//       data: products,
//     });
//   } catch (err) {
//     console.error("Error fetching hospital products:", err.message);
//     res.status(500).json({
//       success: false,
//       message: "Server error while fetching hospital products",
//       error: err.message,
//     });
//   }
// };

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
  searchStoreAndProduct,
  getAllProductTypes,
  getProductsByType,
  addToCart,
  getCart,
  updateCartItem,
  deleteCartItem,
  // getHospitalProducts,
};
