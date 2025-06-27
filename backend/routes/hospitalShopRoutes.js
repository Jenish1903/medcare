const express = require("express");
const router = express.Router();
const controller = require("../controllers/hospitalShopController");
const productController = require('../controllers/productController');
const cartController = require('../controllers/cartController');
const hospitalProductController = require("../controllers/hospitalProductController");
const authenticate = require('../middleware/authMiddleware');
const authocrizeRoles = require('../middleware/roleMiddleware');

// ---------- HosptitalShop STORE ROUTES ----------
// Everyone authenticated can view stores
router.get('/stores', authenticate, controller.getAllStores);

// Only admin can create/update/delete stores
router.post('/stores/create', authenticate, authocrizeRoles(['doctor']), controller.createStore);
router.get('/stores/:id', authenticate, authocrizeRoles(['doctor']), controller.getStoreById);
router.put('/stores/:id', authenticate, authocrizeRoles(['doctor']), controller.updateStore);
router.delete('/stores/:id', authenticate, authocrizeRoles(['doctor']), controller.deleteStore);
router.get("/filters", authenticate, controller.getAllFilterCategories);

// ---------- HOSPITAL PRODUCTS ----------
// Patient
router.post('/create_products', authenticate, controller.createProduct);
router.get('/products', authenticate, controller.getAllProducts);
router.get('/products/:id', authenticate, controller.getProductById);

// Admin and Doctor
router.put('/update/:id', authenticate, authocrizeRoles(['admin', 'doctor']), controller.updateProduct);
router.delete('/delete/:id', authenticate, authocrizeRoles(['admin', 'doctor']), controller.deleteProduct);
router.get('/edit/:id', authenticate, authocrizeRoles(['admin', 'doctor']), controller.editProduct);

// ---------- CART ROUTES ----------
// Patient
router.post('/cart/add', authenticate, controller.addToCart);
router.get('/cart', authenticate, controller.getCart);
router.put('/cart/update', authenticate, controller.updateCartItem);
router.delete('/cart/:id', authenticate, controller.deleteCartItem);

// ---------- hospitalShop Product ROUTES ----------
router.get("/products", controller.getHospitalProducts);

module.exports = router;
