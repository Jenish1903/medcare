const Product = require('../models/productModel');
const ProductReview = require('../models/productReviewModel');

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

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  editProduct
};