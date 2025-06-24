const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.post('/create_products', productController.createProduct);
router.get('/products', productController.getAllProducts);
router.get('/products/:id', productController.getProductById);
router.get('/products/:id', productController.getProductById);

module.exports = router;
