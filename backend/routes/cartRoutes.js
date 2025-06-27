const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authenticate = require('../middleware/authMiddleware');

router.post('/add', authenticate, cartController.addToCart);
router.get('/all', authenticate, cartController.getCart);
router.put('/update', authenticate, cartController.updateCartItem);
router.delete('/:id', authenticate, cartController.deleteCartItem);

module.exports = router;