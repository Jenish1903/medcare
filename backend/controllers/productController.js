const Product = require('../models/productModel');
const ProductReview = require('../models/productReviewModel');

// CREATE Product + Optional Reviews
const createProduct = (req, res) => {
  const product = req.body.product;
  const reviews = req.body.reviews || [];

  Product.create(product)
    .then(result => {
      const productId = result.id;

      // Insert all reviews
      const reviewPromises = reviews.map(review =>
        ProductReview.create({ ...review, product_id: productId })
      );

      Promise.all(reviewPromises)
        .then(() => {
          res.status(201).json({ message: 'Product created successfully', productId });
        })
        .catch(err => {
          console.error('Review insert error:', err);
          res.status(500).json({ message: 'Error inserting reviews', error: err });
        });
    })
    .catch(err => {
      res.status(500).json({ message: 'Product creation failed', error: err });
    });
};

// GET ALL Products in Nested Format
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [{ model: ProductReview, as: 'reviews' }]
    });

    const formatted = products.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
      
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
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving products', error: err.message });
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

module.exports = {
  createProduct,
  getAllProducts,
  getProductById
};
