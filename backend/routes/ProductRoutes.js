const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authenticate = require('../middleware/authMiddleware');
const authocrizeRoles = require('../middleware/roleMiddleware');


router.post('/create_products', authenticate, productController.createProduct);
router.get('/products', authenticate, productController.getAllProducts);
router.get('/products/:id', authenticate, productController.getProductById);

router.put('/update/:id', authenticate, authocrizeRoles('admin', 'doctor'), productController.updateProduct);

router.delete('/delete/:id', authenticate, authocrizeRoles('admin', 'doctor'), productController.deleteProduct);

router.get('/edit/:id', authenticate, authocrizeRoles('admin', 'doctor'), productController.editProduct);

module.exports = router;
